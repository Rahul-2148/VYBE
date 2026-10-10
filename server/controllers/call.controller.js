import { CallSession } from "../models/callSession.model.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import crypto from "crypto";
import { createNotificationHelper } from "./notification.controller.js";
import mongoose from "mongoose";
import { io } from "../socket.js";

// Helper to record call logs into conversation messages
export const recordCallLogMessage = async (session) => {
  try {
    if (!session || !session.conversationId) return;

    // Check if a call message was already created for this session
    const existingMsg = await Message.findOne({
      conversation: session.conversationId,
      "systemEventData.metadata.room": session.room,
    });
    if (existingMsg) return;

    const otherParticipant = session.participants?.find(
      (p) => (p.user?._id || p.user)?.toString() !== (session.initiator?._id || session.initiator)?.toString()
    );
    const targetUserId = otherParticipant?.user?._id || otherParticipant?.user || null;

    const hadJoined = session.participants?.some(
      (p) => (p.user?._id || p.user)?.toString() !== (session.initiator?._id || session.initiator)?.toString() && (p.status === "joined" || p.joinedAt)
    );

    const durationSeconds = session.endTime && session.startTime && hadJoined
      ? Math.max(0, Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000))
      : 0;

    const isVoice = session.type === "voice" || session.type === "audio";
    const callType = isVoice ? "voice" : "video";

    let eventType = "call_ended";
    let text = `${isVoice ? "Voice" : "Video"} call ended`;

    if (!hadJoined || durationSeconds === 0) {
      eventType = "call_missed";
      text = `Missed ${isVoice ? "voice" : "video"} call`;
    }

    const message = await Message.create({
      conversation: session.conversationId,
      sender: session.initiator,
      type: "system",
      systemEvent: eventType,
      content: {
        text,
      },
      systemEventData: {
        targetUser: targetUserId,
        metadata: {
          room: session.room,
          callType,
          duration: hadJoined ? durationSeconds : 0,
          status: hadJoined ? "completed" : "missed",
          initiator: session.initiator,
        },
      },
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name userName profileImage")
      .populate("systemEventData.targetUser", "name userName profileImage");

    // Update conversation lastMessage
    await Conversation.findByIdAndUpdate(session.conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    // Broadcast message-received event to conversation participants
    if (io) {
      const conv = await Conversation.findById(session.conversationId).select("participants");
      if (conv) {
        conv.participants.forEach((pid) => {
          io.to(`user_${pid.toString()}`).emit("message-received", {
            conversationId: session.conversationId,
            senderId: session.initiator,
            message: populatedMessage,
            timestamp: new Date(),
          });
        });
      }
    }
  } catch (err) {
    console.warn("[recordCallLogMessage] warning:", err?.message);
  }
};

// Initiate a Call Session (P2P, Group or Channel)
export const initiateCall = async (req, res) => {
  try {
    const { type, room, receiverId, conversationId, channelId } = req.body || {};

    if (typeof type !== "string" || typeof room !== "string" || !room.trim() || room.length > 160) {
      return res.status(400).json({ success: false, message: "A valid call type and room ID are required" });
    }

    // Normalize type to valid enum: "voice", "audio", "video", "group", or "channel".
    const normalizedType = type === "audio" ? "voice" : type;
    if (!["voice", "video", "group", "channel"].includes(normalizedType)) {
      return res.status(400).json({ success: false, message: "Unsupported call type" });
    }

    const cleanRoom = room.trim();
    const validConversationId = conversationId && mongoose.Types.ObjectId.isValid(conversationId)
      ? conversationId
      : null;
    const validChannelId = channelId && mongoose.Types.ObjectId.isValid(channelId)
      ? channelId
      : null;

    if (conversationId && !validConversationId) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }
    if (channelId && !validChannelId) {
      return res.status(400).json({ success: false, message: "Invalid channel ID" });
    }
    if (receiverId && (!mongoose.Types.ObjectId.isValid(receiverId) || String(receiverId) === String(req.userId))) {
      return res.status(400).json({ success: false, message: "Invalid call recipient" });
    }

    if (validConversationId) {
      const conversation = await Conversation.findOne({
        _id: validConversationId,
        participants: req.userId,
      }).select("_id participants");
      if (!conversation) {
        return res.status(403).json({ success: false, message: "You are not a participant in this conversation" });
      }
      if (receiverId && !conversation.participants.some((id) => String(id) === String(receiverId))) {
        return res.status(403).json({ success: false, message: "Call recipient is not in this conversation" });
      }
    }

    // Check if there is already an active session in this room.
    let session = await CallSession.findOne({ room: cleanRoom, status: { $ne: "ended" } });

    if (session) {
      const isParticipant = session.participants.some((p) =>
        String(p.user?._id || p.user) === String(req.userId)
      );
      if (!isParticipant) {
        return res.status(403).json({ success: false, message: "You are not a participant in this call" });
      }
    }

    if (!session) {
      const participants = [
        {
          user: req.userId,
          status: "joined",
          role: "host",
          joinedAt: new Date(),
        },
      ];

      // Add receiver for 1-to-1 call
      const isValidReceiver = Boolean(receiverId && mongoose.Types.ObjectId.isValid(receiverId));
      if (isValidReceiver) {
        participants.push({
          user: receiverId,
          status: "ringing",
          role: "listener",
        });
      }

      session = await CallSession.create({
        room: cleanRoom,
        conversationId: validConversationId,
        channelId: validChannelId,
        type: normalizedType,
        initiator: req.userId,
        status: "ringing",
        participants,
      });

      if (isValidReceiver) {
        try {
          await createNotificationHelper({
            req,
            recipient: receiverId,
            sender: req.userId,
            type: "call",
            commentText: `Incoming ${normalizedType} call`,
          });
        } catch (notifErr) {
          console.warn("createNotificationHelper warning:", notifErr.message);
        }
      }
    }

    const populated = await CallSession.findById(session._id)
      .populate("initiator", "name userName profileImage")
      .populate("participants.user", "name userName profileImage");

    return res.status(201).json({
      success: true,
      message: "Call session initiated",
      session: populated || session,
    });
  } catch (error) {
    console.error("initiateCall error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Respond to Call Invitation (Accept/Reject/Busy)
export const respondToCall = async (req, res) => {
  try {
    const { room, response } = req.body || {};
    const allowedResponses = ["joined", "declined", "busy", "cancelled", "left"];
    if (typeof room !== "string" || !room.trim() || !allowedResponses.includes(response)) {
      return res.status(400).json({ success: false, message: "Valid room and call response are required" });
    }

    const session = await CallSession.findOne({ room: room.trim(), status: { $ne: "ended" } });
    if (!session) {
      return res.status(404).json({ success: false, message: "Active call session not found" });
    }

    const participant = session.participants.find(
      (p) => String(p.user?._id || p.user) === String(req.userId)
    );
    if (!participant) {
      return res.status(403).json({ success: false, message: "You are not a participant in this call" });
    }

    const persistedResponse = response === "cancelled" ? "left" : response;
    participant.status = persistedResponse;
    if (persistedResponse === "joined") {
      participant.joinedAt = new Date();
      participant.leftAt = null;
      session.status = "active";
    } else {
      participant.leftAt = new Date();
    }

    const activeParticipants = session.participants.filter(
      (p) => p.status === "joined" || p.status === "ringing"
    );
    if (activeParticipants.length === 0 && session.type !== "channel") {
      session.status = "ended";
      session.endTime = new Date();
    }

    await session.save();
    if (session.status === "ended") {
      recordCallLogMessage(session).catch(() => null);
    }

    const populated = await CallSession.findById(session._id)
      .populate("initiator", "name userName profileImage")
      .populate("participants.user", "name userName profileImage");

    return res.status(200).json({
      success: true,
      message: `Call response recorded: ${response}`,
      session: populated || session,
    });
  } catch (error) {
    console.error("respondToCall error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get active call session details for recovery (only fresh active sessions)
export const getActiveCall = async (req, res) => {
  try {
    const fortyFiveSecondsAgo = new Date(Date.now() - 45000);

    // 1. Auto-expire stale ringing sessions older than 45 seconds
    await CallSession.updateMany(
      { status: "ringing", createdAt: { $lt: fortyFiveSecondsAgo } },
      { status: "ended", endTime: new Date() }
    );

    // 2. Auto-expire orphan active sessions older than 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    await CallSession.updateMany(
      { status: "active", createdAt: { $lt: fourHoursAgo } },
      { status: "ended", endTime: new Date() }
    );

    // 3. Look for fresh ringing session (last 45s) or active ongoing call (last 4 hours)
    const session = await CallSession.findOne({
      status: { $in: ["active", "ringing"] },
      "participants.user": req.userId,
      $or: [
        { status: "ringing", createdAt: { $gte: fortyFiveSecondsAgo } },
        { status: "active", createdAt: { $gte: fourHoursAgo } },
      ],
    })
      .populate("initiator", "name userName profileImage")
      .populate("participants.user", "name userName profileImage");

    return res.status(200).json({
      success: true,
      session: session || null,
    });
  } catch (error) {
    console.error("getActiveCall error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// End call session manually
export const endCall = async (req, res) => {
  try {
    const { room } = req.body || {};
    if (typeof room !== "string" || !room.trim()) {
      return res.status(400).json({ success: false, message: "Room ID is required" });
    }

    const session = await CallSession.findOne({ room: room.trim(), status: { $ne: "ended" } });
    if (!session) {
      return res.status(200).json({ success: true, message: "Call session already ended or not found" });
    }

    const participant = session.participants.find(
      (p) => String(p.user?._id || p.user) === String(req.userId)
    );
    if (!participant) {
      return res.status(403).json({ success: false, message: "You are not a participant in this call" });
    }

    const isHost = String(session.initiator?._id || session.initiator) === String(req.userId) ||
      participant.role === "host";
    const isGroupCall = ["group", "channel"].includes(session.type);

    // A member can leave a group call; only its host can end it for everyone.
    if (isGroupCall && !isHost) {
      participant.status = "left";
      participant.leftAt = new Date();
      const hasActiveParticipants = session.participants.some(
        (p) => String(p.user?._id || p.user) !== String(req.userId) &&
          (p.status === "joined" || p.status === "ringing")
      );
      if (!hasActiveParticipants) {
        session.status = "ended";
        session.endTime = new Date();
      }
    } else {
      session.status = "ended";
      session.endTime = new Date();
      session.participants.forEach((p) => {
        if (p.status === "joined" || p.status === "ringing") {
          p.status = "left";
          p.leftAt = new Date();
        }
      });
    }

    await session.save();
    if (session.status === "ended") {
      recordCallLogMessage(session).catch(() => null);
    }

    return res.status(200).json({
      success: true,
      message: session.status === "ended" ? "Call session ended" : "You left the call",
    });
  } catch (error) {
    console.error("endCall error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get call logs/history
export const getCallHistory = async (req, res) => {
  try {
    const history = await CallSession.find({ "participants.user": req.userId })
      .populate("initiator participants.user", "name userName profileImage")
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({ success: true, history });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Short-Lived TURN/STUN credentials
export const getTurnCredentials = async (req, res) => {
  try {
    // High-availability global STUN server pool (Google & Cloudflare)
    const defaultStunServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ];

    const iceServers = [...defaultStunServers];

    // If explicit TURN server configured via environment variables (e.g., Metered, Twilio, Coturn)
    if (process.env.TURN_SERVER_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      const urls = process.env.TURN_SERVER_URLS.split(",").map((u) => u.trim());
      iceServers.push({
        urls,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      });
    } else if (process.env.TURN_SERVER_DOMAIN && process.env.TURN_SECRET) {
      const turnSecret = process.env.TURN_SECRET.trim();
      const isPlaceholderSecret =
        /^(vybe_|your-|change.?me|replace.?me|placeholder|example|default)/i.test(turnSecret);
      if (turnSecret.length < 32 || isPlaceholderSecret) {
        console.error(
          "[TURN] TURN_SERVER_DOMAIN is configured, but TURN_SECRET is weak or still a placeholder."
        );
        return res.status(503).json({
          success: false,
          message: "TURN service is misconfigured. Please configure a strong TURN_SECRET.",
        });
      }

      const turnDomain = process.env.TURN_SERVER_DOMAIN;
      const duration = 24 * 60 * 60; // 24 hours validity
      const unixTimestamp = Math.floor(Date.now() / 1000) + duration;
      const username = `${unixTimestamp}:${req.userId || "guest"}`;
      
      const hmac = crypto.createHmac("sha1", turnSecret);
      hmac.update(username);
      const password = hmac.digest("base64");

      iceServers.push(
        {
          urls: `turn:${turnDomain}:3478?transport=udp`,
          username,
          credential: password,
        },
        {
          urls: `turn:${turnDomain}:3478?transport=tcp`,
          username,
          credential: password,
        }
      );
    }

    return res.status(200).json({
      success: true,
      iceServers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

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
    const { type, room, receiverId, conversationId, channelId } = req.body;

    if (!type || !room) {
      return res.status(400).json({ success: false, message: "Type and Room ID are required" });
    }

    // Normalize type to valid enum: "voice", "audio", "video", "group", "channel"
    const normalizedType = type === "audio" ? "voice" : type;

    // Check if there is already an active session in this room
    let session = await CallSession.findOne({ room, status: { $ne: "ended" } });

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
      const isValidReceiver = receiverId && mongoose.Types.ObjectId.isValid(receiverId);
      if (isValidReceiver) {
        participants.push({
          user: receiverId,
          status: "ringing",
          role: "listener",
        });
      }

      const validConversationId = conversationId && mongoose.Types.ObjectId.isValid(conversationId) ? conversationId : null;
      const validChannelId = channelId && mongoose.Types.ObjectId.isValid(channelId) ? channelId : null;

      session = await CallSession.create({
        room,
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
    const { room, response } = req.body; // response: "joined", "declined", "busy"
    if (!room || !response) {
      return res.status(400).json({ success: false, message: "Room and Response are required" });
    }

    let session = await CallSession.findOne({ room, status: { $ne: "ended" } });
    if (!session) {
      session = await CallSession.findOne({ room });
    }

    if (!session) {
      // Auto-create active session if not found so call connects seamlessly
      session = await CallSession.create({
        room,
        type: "video",
        initiator: req.userId,
        status: response === "joined" ? "active" : "ended",
        participants: [
          {
            user: req.userId,
            status: response === "joined" ? "joined" : "declined",
            role: "listener",
            joinedAt: new Date(),
          },
        ],
      });
    } else {
      const participant = session.participants.find(
        (p) => (p.user?._id || p.user)?.toString() === req.userId.toString()
      );
      if (participant) {
        participant.status = response;
        if (response === "joined") {
          participant.joinedAt = new Date();
          session.status = "active"; // transitions from ringing to active
        } else {
          participant.leftAt = new Date();
        }
      } else {
        // If participant wasn't in array, add them
        if (response === "joined") {
          session.participants.push({
            user: req.userId,
            status: "joined",
            role: "listener",
            joinedAt: new Date(),
          });
          session.status = "active";
        }
      }

      // If all participants left or declined, mark ended
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
    const { room } = req.body;
    if (!room) {
      return res.status(400).json({ success: false, message: "Room ID is required" });
    }

    const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
    if (!session) {
      return res.status(200).json({ success: true, message: "Call session already ended or not found" });
    }

    session.status = "ended";
    session.endTime = new Date();

    // Mark all connected participants as left
    session.participants.forEach((p) => {
      if (p.status === "joined" || p.status === "ringing") {
        p.status = "left";
        p.leftAt = new Date();
      }
    });

    await session.save();

    // Record call log to conversation
    recordCallLogMessage(session).catch(() => null);

    return res.status(200).json({
      success: true,
      message: "Call session ended",
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
      const turnSecret = process.env.TURN_SECRET;
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

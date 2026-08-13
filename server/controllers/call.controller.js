import { CallSession } from "../models/callSession.model.js";
import crypto from "crypto";
import { createNotificationHelper } from "./notification.controller.js";
import mongoose from "mongoose";

// Initiate a Call Session (P2P, Group or Channel)
export const initiateCall = async (req, res) => {
  try {
    const { type, room, receiverId, conversationId, channelId } = req.body;

    if (!type || !room) {
      return res.status(400).json({ success: false, message: "Type and Room ID are required" });
    }

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
        type,
        initiator: req.userId,
        status: "ringing",
        participants,
      });

      if (isValidReceiver) {
        await createNotificationHelper({
          req,
          recipient: receiverId,
          sender: req.userId,
          type: "call",
          commentText: `Incoming ${type} call`,
        });
      }
    }

    const populated = await session.populate("initiator participants.user", "name userName profileImage");

    return res.status(201).json({
      success: true,
      message: "Call session initiated",
      session: populated,
    });
  } catch (error) {
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

    const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
    if (!session) {
      return res.status(404).json({ success: false, message: "No active call session found" });
    }

    const participant = session.participants.find((p) => p.user.toString() === req.userId.toString());
    if (participant) {
      participant.status = response;
      if (response === "joined") {
        participant.joinedAt = new Date();
        session.status = "active"; // transitions from ringing to active
      } else {
        participant.leftAt = new Date();
      }
    } else {
      // If it's a group call/channel call, users can join dynamically
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

    // If all participants left or declined, end the call session
    const activeParticipants = session.participants.filter(
      (p) => p.status === "joined" || p.status === "ringing"
    );

    if (activeParticipants.length <= 1 && session.type !== "channel") {
      session.status = "ended";
      session.endTime = new Date();
    }

    await session.save();
    const populated = await session.populate("initiator participants.user", "name userName profileImage");

    return res.status(200).json({
      success: true,
      message: `Call response registered: ${response}`,
      session: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get active call session details for recovery
export const getActiveCall = async (req, res) => {
  try {
    const session = await CallSession.findOne({
      status: { $ne: "ended" },
      "participants.user": req.userId,
    }).populate("initiator participants.user", "name userName profileImage");

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
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
      return res.status(404).json({ success: false, message: "Call session not found or already ended" });
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

    return res.status(200).json({
      success: true,
      message: "Call ended successfully",
      session,
    });
  } catch (error) {
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

// Generate Short-Lived TURN credentials (coturn secret handshake)
export const getTurnCredentials = async (req, res) => {
  try {
    const turnSecret = process.env.TURN_SECRET || "vybe_coturn_secret_pass_2026";
    const turnDomain = process.env.TURN_SERVER_DOMAIN || "turn.vybe.app";
    
    const duration = 24 * 60 * 60; // 24 hours validity
    const unixTimestamp = Math.floor(Date.now() / 1000) + duration;
    const username = `${unixTimestamp}:${req.userId}`;
    
    // HMAC-SHA1 signature of the username using the coturn secret
    const hmac = crypto.createHmac("sha1", turnSecret);
    hmac.update(username);
    const password = hmac.digest("base64");

    const iceServers = [
      {
        urls: `stun:${turnDomain}:3478`,
      },
      {
        urls: `turn:${turnDomain}:3478?transport=udp`,
        username,
        credential: password,
      },
      {
        urls: `turn:${turnDomain}:3478?transport=tcp`,
        username,
        credential: password,
      },
    ];

    return res.status(200).json({
      success: true,
      iceServers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

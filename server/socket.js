// socket.js - Socket.IO Event Handlers for Real-time Communication & WebRTC Signaling
import { Server } from "socket.io";
import { User } from "./models/user.model.js";
import { Session } from "./models/session.model.js";
import { Conversation } from "./models/conversation.model.js";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { Channel } from "./models/channel.model.js";
import { Community } from "./models/community.model.js";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { CallSession } from "./models/callSession.model.js";

const activeUsers = new Map();
const socketToUserMap = new Map();
const typingTimers = new Map(); // server-side typing debounce
const socketCallRooms = new Map(); // socketId -> Set of call room names

const getUserRoom = (userId) => `user_${userId}`;
const getUserSocketCount = (userId) => activeUsers.get(userId)?.size || 0;

const addUserSocket = (userId, socketId) => {
  if (!userId) return;
  const uid = userId.toString();
  if (!activeUsers.has(uid)) {
    activeUsers.set(uid, new Set());
  }
  activeUsers.get(uid).add(socketId);
  socketToUserMap.set(socketId, uid);
};

const removeUserSocket = (userId, socketId) => {
  if (!userId) return 0;
  const uid = userId.toString();
  const sockets = activeUsers.get(uid);
  if (!sockets) return 0;

  sockets.delete(socketId);
  socketToUserMap.delete(socketId);

  if (sockets.size === 0) {
    activeUsers.delete(uid);
    return 0;
  }
  return sockets.size;
};

const persistPresence = async (userId, isOnline) => {
  try {
    const update = isOnline
      ? { $set: { isOnline: true, lastSeen: null } }
      : { $set: { isOnline: false, lastSeen: new Date() } };

    return await User.findByIdAndUpdate(userId, update, { new: true }).exec();
  } catch (error) {
    console.error(`[presence] failed for ${userId}:`, error);
  }
};

const leaveCallSessionInDb = async (room, userId) => {
  try {
    const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
    if (session) {
      const participant = session.participants.find(
        (p) => p.user.toString() === userId.toString()
      );
      if (participant && (participant.status === "joined" || participant.status === "ringing")) {
        participant.status = "left";
        participant.leftAt = new Date();
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
      console.log(`[call:leave-room database sync] Updated session ${session._id} for user ${userId}`);
    }
  } catch (err) {
    console.error("[leaveCallSessionInDb] error:", err);
  }
};

const isConversationParticipant = async (conversationId, userId) => {
  try {
    if (!conversationId || !userId) return false;
    const conversation = await Conversation.findById(conversationId).select("participants");
    if (!conversation) return false;
    return conversation.participants.some((p) => p.toString() === userId.toString());
  } catch (err) {
    console.error("[socket auth helper] isConversationParticipant error:", err);
    return false;
  }
};

// Broadcast presence only to user's conversation participants (not globally)
const broadcastPresenceToContacts = async (io, userId, isOnline) => {
  try {
    const conversations = await Conversation.find({ participants: userId }).select("participants");
    const contactIds = new Set();

    conversations.forEach((conv) => {
      conv.participants.forEach((pid) => {
        const pidStr = pid.toString();
        if (pidStr !== userId && getUserSocketCount(pidStr) > 0) {
          contactIds.add(pidStr);
        }
      });
    });

    const payload = {
      userId,
      isOnline,
      ...(isOnline ? {} : { lastSeen: new Date() }),
    };

    contactIds.forEach((contactId) => {
      io.to(getUserRoom(contactId)).emit(isOnline ? "user-online" : "user-offline", payload);
    });
  } catch (err) {
    console.error("[presence broadcast] error:", err);
  }
};

let ioInstance = null;

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGINS?.split(",").map((url) => url.trim()) || ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
      credentials: true,
      allowEIO3: true,
    },
    transports: process.env.SOCKET_TRANSPORTS?.split(",").map((t) => t.trim()) || ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 10e6, // 10MB
  });

  ioInstance = io;

  // Configure Redis Adapter if REDIS_URL is set in environment
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      console.log(`🔌 Initializing Redis adapter for Socket.IO using URL...`);
      const pubClient = new Redis(redisUrl);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log(`✅ Socket.IO Redis adapter initialized successfully`);
    } catch (err) {
      console.error(`❌ Failed to initialize Socket.IO Redis adapter:`, err);
    }
  } else {
    console.log(`ℹ️ Socket.IO Redis adapter skipped (no REDIS_URL configured). Using fallback in-memory adapter.`);
  }

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      let jwtToken = token;

      // Extract from cookies if not provided directly
      if (!jwtToken && socket.handshake.headers.cookie) {
        const cookies = cookie.parse(socket.handshake.headers.cookie);
        jwtToken = cookies.accessToken || cookies.token;
      }

      if (!jwtToken) {
        // Dev mode fallback
        const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
        if (userId && process.env.NODE_ENV !== "production") {
          console.warn(`⚠️ Dev Fallback: socket connect for userId: ${userId}`);
          socket.userId = userId;
          return next();
        }
        return next(new Error("Authentication token is required for socket connection"));
      }

      const secret = process.env.JWT_SECRET || "vybe_super_secret_jwt_key_2026";
      const decoded = jwt.verify(jwtToken, secret);
      if (!decoded || !decoded.userId) {
        return next(new Error("Invalid authentication token"));
      }

      if (decoded.sessionId) {
        const session = await Session.findById(decoded.sessionId);
        if (!session || session.isRevoked) {
          return next(new Error("Session has been revoked or expired"));
        }
      }

      socket.userId = decoded.userId;
      next();
    } catch (err) {
      return next(new Error("Authentication error: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userId} (Socket ID: ${socket.id})`);

    addUserSocket(socket.userId, socket.id);

    if (getUserSocketCount(socket.userId) === 1) {
      persistPresence(socket.userId, true).catch(() => null);
      broadcastPresenceToContacts(io, socket.userId, true);
    }

    socket.join(getUserRoom(socket.userId));

    // =====================================================
    // MESSAGING EVENTS
    // =====================================================
    socket.on("send-message", async (data) => {
      try {
        const { conversationId, messageContent } = data;
        if (!conversationId) return;

        const isParticipant = await isConversationParticipant(conversationId, socket.userId);
        if (!isParticipant) {
          console.warn(`🛡️ Blocked unauthorized send-message: User ${socket.userId} to conversation ${conversationId}`);
          return;
        }

        // Get ALL participants and broadcast (group + 1-to-1 support)
        const conversation = await Conversation.findById(conversationId).select("participants");
        if (!conversation) return;

        conversation.participants.forEach((participantId) => {
          const pidStr = participantId.toString();
          if (pidStr !== socket.userId && getUserSocketCount(pidStr) > 0) {
            io.to(getUserRoom(pidStr)).emit("message-received", {
              conversationId,
              senderId: socket.userId,
              message: messageContent,
              timestamp: new Date(),
            });
          }
        });

        // Delivery confirmation to sender
        socket.emit("message-delivered", {
          conversationId,
          messageId: messageContent?._id,
          status: "delivered",
        });
      } catch (error) {
        console.error("send-message error:", error);
      }
    });

    socket.on("edit-message", async (data) => {
      const { conversationId, messageId, newText } = data;
      const isParticipant = await isConversationParticipant(conversationId, socket.userId);
      if (!isParticipant) return;
      // Broadcast to all users in conversation
      io.to(`conversation_${conversationId}`).emit("message-edited", {
        messageId,
        newText,
        conversationId,
        editedAt: new Date(),
      });
    });

    socket.on("delete-message-everyone", async (data) => {
      const { conversationId, messageId } = data;
      const isParticipant = await isConversationParticipant(conversationId, socket.userId);
      if (!isParticipant) return;
      io.to(`conversation_${conversationId}`).emit("message-deleted-everyone", {
        messageId,
        conversationId,
      });
    });

    socket.on("forward-message", async (data) => {
      const { targetConversationId, message } = data;
      const isParticipant = await isConversationParticipant(targetConversationId, socket.userId);
      if (!isParticipant) return;
      io.to(`conversation_${targetConversationId}`).emit("message-forwarded", {
        conversationId: targetConversationId,
        message,
      });
    });

    socket.on("pin-message", async (data) => {
      const { conversationId, messageId, isPinned } = data;
      const isParticipant = await isConversationParticipant(conversationId, socket.userId);
      if (!isParticipant) return;
      io.to(`conversation_${conversationId}`).emit("message-pinned", {
        conversationId,
        messageId,
        isPinned,
        pinnedBy: socket.userId,
      });
    });

    socket.on("message-read", async (data) => {
      try {
        const { messageId, conversationId } = data;
        const isParticipant = await isConversationParticipant(conversationId, socket.userId);
        if (!isParticipant) return;
        const conversation = await Conversation.findById(conversationId).select("participants");
        if (!conversation) return;

        conversation.participants.forEach((participantId) => {
          const pidStr = participantId.toString();
          if (pidStr !== socket.userId && getUserSocketCount(pidStr) > 0) {
            io.to(getUserRoom(pidStr)).emit("message-read-receipt", {
              messageId,
              conversationId,
              readBy: socket.userId,
              readAt: new Date(),
            });
          }
        });
      } catch (error) {
        console.error("message-read error:", error);
      }
    });

    // =====================================================
    // TYPING INDICATORS (with server-side debounce)
    // =====================================================
    socket.on("typing", async (data) => {
      const { conversationId } = data;
      const isParticipant = await isConversationParticipant(conversationId, socket.userId);
      if (!isParticipant) return;
      const key = `${conversationId}_${socket.userId}`;

      // Clear existing timer
      if (typingTimers.has(key)) {
        clearTimeout(typingTimers.get(key));
      }

      // Broadcast typing
      socket.to(`conversation_${conversationId}`).emit("user-typing", {
        conversationId,
        userId: socket.userId,
        isTyping: true,
      });

      // Auto-stop after 5 seconds if no new typing event
      typingTimers.set(
        key,
        setTimeout(() => {
          socket.to(`conversation_${conversationId}`).emit("user-typing", {
            conversationId,
            userId: socket.userId,
            isTyping: false,
          });
          typingTimers.delete(key);
        }, 5000)
      );
    });

    socket.on("stop-typing", async (data) => {
      const { conversationId } = data;
      const isParticipant = await isConversationParticipant(conversationId, socket.userId);
      if (!isParticipant) return;
      const key = `${conversationId}_${socket.userId}`;

      if (typingTimers.has(key)) {
        clearTimeout(typingTimers.get(key));
        typingTimers.delete(key);
      }

      socket.to(`conversation_${conversationId}`).emit("user-typing", {
        conversationId,
        userId: socket.userId,
        isTyping: false,
      });
    });

    // =====================================================
    // WEBRTC AUDIO & VIDEO CALL SIGNALING
    // =====================================================
    // =====================================================
    // ENTERPRISE WEBRTC CALL SIGNALING & LIFECYCLE
    // =====================================================
    socket.on("call:invite", async (data) => {
      const { room, userToCall, type, callerName, callerAvatar, conversationId } = data;
      const recipientRoom = getUserRoom(userToCall);

      if (getUserSocketCount(userToCall) > 0) {
        // Emit invite to recipient
        io.to(recipientRoom).emit("call:invite-received", {
          room,
          from: socket.userId,
          callerName,
          callerAvatar,
          type,
          conversationId,
        });
        // Notify caller that recipient's device is ringing
        socket.emit("call:status", { room, status: "ringing" });
      } else {
        // Notify caller that we are attempting connection (Calling)
        socket.emit("call:status", { room, status: "calling" });
      }
    });

    socket.on("call:respond", async (data) => {
      const { room, response, to } = data; // response: "joined", "declined", "busy"
      io.to(getUserRoom(to)).emit("call:response-received", {
        room,
        response,
        from: socket.userId,
      });
    });

    socket.on("call:join-room", async (data) => {
      const { room, type } = data;

      // Server-side authorization check for Direct Calls
      if (room.startsWith("call_")) {
        try {
          const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
          if (session) {
            const isParticipant = session.participants.some(
              (p) => p.user.toString() === socket.userId?.toString()
            );
            if (!isParticipant) {
              console.error(`🛡️ Access Denied: User ${socket.userId} is not a participant of call session ${session._id}`);
              socket.emit("call:error", { message: "You are not a participant of this call" });
              return;
            }
          }
        } catch (err) {
          socket.emit("call:error", { message: "Permission check failed: " + err.message });
          return;
        }
      }

      // Server-side authorization check for Community Channels
      if (room.startsWith("channel_")) {
        try {
          const channelId = room.split("_")[1];
          const channel = await Channel.findById(channelId);
          if (!channel) {
            socket.emit("call:error", { message: "Channel not found" });
            return;
          }

          const community = await Community.findById(channel.community);
          if (!community) {
            socket.emit("call:error", { message: "Community not found" });
            return;
          }

          const isMember = community.members.some(
            (m) => m.user.toString() === socket.userId.toString()
          );

          if (!isMember) {
            console.error(`🛡️ Access Denied: User ${socket.userId} is not a member of community ${community._id}`);
            socket.emit("call:error", { message: "You are not a member of this community" });
            return;
          }
        } catch (err) {
          socket.emit("call:error", { message: "Permission check failed: " + err.message });
          return;
        }
      }

      socket.join(room);
      console.log(`📞 User ${socket.userId} joined call room: ${room}`);

      // Track this socket's call rooms for disconnect cleanup
      if (!socketCallRooms.has(socket.id)) {
        socketCallRooms.set(socket.id, new Set());
      }
      socketCallRooms.get(socket.id).add(room);

      // Get all existing sockets in this room (excluding the joiner)
      const roomSockets = await io.in(room).fetchSockets();
      const existingMembers = roomSockets
        .filter((s) => s.id !== socket.id)
        .map((s) => ({ socketId: s.id, userId: s.userId }));

      // Send the joiner the list of existing members so it can create PCs to all of them
      socket.emit("call:room-members", { room, members: existingMembers });

      // Broadcast to others in the room that a new peer joined
      socket.to(room).emit("call:peer-joined", {
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on("call:signal", (data) => {
      const { toSocketId, signal } = data;
      io.to(toSocketId).emit("call:signal-received", {
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        signal,
      });
    });

    socket.on("call:heartbeat", (data) => {
      const { room } = data;
      socket.to(room).emit("call:heartbeat-received", {
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on("call:action", (data) => {
      const { room, action, value } = data; // action: 'mute', 'video', 'screen', 'hand', 'reaction'
      socket.to(room).emit("call:action-broadcast", {
        userId: socket.userId,
        action,
        value,
      });
    });


    socket.on("call:moderate", (data) => {
      const { room, targetUserId, action } = data; // action: 'mute-user', 'kick-user', 'mute-all'
      io.to(room).emit("call:moderated", {
        moderatorId: socket.userId,
        targetUserId,
        action,
      });
    });

    socket.on("call:leave-room", (data) => {
      const { room } = data;
      socket.leave(room);
      // Clean up room tracking
      socketCallRooms.get(socket.id)?.delete(room);
      socket.to(room).emit("call:peer-left", {
        userId: socket.userId,
        socketId: socket.id,
      });

      // Sync state to DB immediately instead of waiting for debounce timeout
      if (socket.userId) {
        leaveCallSessionInDb(room, socket.userId);
      }
    });

    // =====================================================
    // IN-CALL CHAT
    // =====================================================
    socket.on("call:chat-message", (data) => {
      const { room, text } = data;
      // Relay the message to all others in the room
      socket.to(room).emit("call:chat-message-received", {
        from: socket.userId,
        text,
        time: new Date().toISOString(),
      });
    });

    // =====================================================
    // CO-WATCHING WATCH PARTY EVENTS
    // =====================================================
    socket.on("call:watch-party-start", (data) => {
      const { room, videoUrl } = data;
      socket.to(room).emit("call:watch-party-started", {
        videoUrl,
        startedBy: socket.userId,
      });
    });

    socket.on("call:watch-party-stop", (data) => {
      const { room } = data;
      socket.to(room).emit("call:watch-party-stopped", {
        stoppedBy: socket.userId,
      });
    });

    socket.on("call:watch-party-sync", (data) => {
      const { room, action, currentTime, playing } = data; // action: 'play', 'pause', 'seek'
      socket.to(room).emit("call:watch-party-synced", {
        action,
        currentTime,
        playing,
        senderId: socket.userId,
      });
    });


    // =====================================================
    // COMMUNITY CHANNELS REAL-TIME MESSAGING
    // =====================================================
    socket.on("community:join-channel", async (data) => {
      try {
        const { channelId } = data;
        const channel = await Channel.findById(channelId);
        if (!channel) return;
        const community = await Community.findById(channel.community);
        if (!community) return;
        const isMember = community.members.some((m) => m.user.toString() === socket.userId?.toString());
        if (!isMember) {
          console.warn(`🛡️ Blocked unauthorized community:join-channel: User ${socket.userId} to channel ${channelId}`);
          return;
        }

        socket.join(`channel_${channelId}`);
        console.log(`💬 User ${socket.userId} joined community channel room: channel_${channelId}`);
      } catch (err) {
        console.error("community:join-channel error:", err);
      }
    });

    socket.on("community:leave-channel", (data) => {
      const { channelId } = data;
      socket.leave(`channel_${channelId}`);
      console.log(`💬 User ${socket.userId} left community channel room: channel_${channelId}`);
    });

    socket.on("community:send-message", async (data) => {
      try {
        const { channelId, message } = data;
        const channel = await Channel.findById(channelId);
        if (!channel) return;
        const community = await Community.findById(channel.community);
        if (!community) return;
        const isMember = community.members.some((m) => m.user.toString() === socket.userId?.toString());
        if (!isMember) {
          console.warn(`🛡️ Blocked unauthorized community:send-message: User ${socket.userId} to channel ${channelId}`);
          return;
        }

        // Broadcast to other users in this channel room
        socket.to(`channel_${channelId}`).emit("community:message-received", {
          channelId,
          message,
        });
      } catch (err) {
        console.error("community:send-message error:", err);
      }
    });

    // =====================================================
    // INSTAGRAM LIVE BROADCASTING SUITE
    // =====================================================
    socket.on("start-live-stream", (data) => {
      const { streamId, title } = data;
      socket.join(`live_room_${streamId}`);
      io.emit("live-broadcast-started", {
        streamId,
        hostId: socket.userId,
        title,
      });
    });

    socket.on("join-live-stream", (data) => {
      const { streamId } = data;
      socket.join(`live_room_${streamId}`);
      io.to(`live_room_${streamId}`).emit("live-viewer-joined", {
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on("live:signal", (data) => {
      const { toSocketId, signal } = data;
      io.to(toSocketId).emit("live:signal-received", {
        fromSocketId: socket.id,
        signal,
      });
    });

    socket.on("send-live-comment", (data) => {
      const { streamId, comment } = data;
      io.to(`live_room_${streamId}`).emit("live-comment-received", {
        streamId,
        comment,
      });
    });

    socket.on("send-live-heart", (data) => {
      const { streamId } = data;
      io.to(`live_room_${streamId}`).emit("live-heart-received", {
        senderId: socket.userId,
      });
    });

    socket.on("end-live-stream", (data) => {
      const { streamId } = data;
      io.to(`live_room_${streamId}`).emit("live-stream-ended");
      socket.leave(`live_room_${streamId}`);
    });

    // =====================================================
    // REEL / LOOP REALTIME EVENTS
    // =====================================================
    socket.on("loop-like-toggle", (data) => {
      const { loopId, userId, isLiked, likesCount } = data;
      io.emit("loop-like-updated", { loopId, userId, isLiked, likesCount });
    });

    socket.on("loop-comment-send", (data) => {
      const { loopId, comment } = data;
      io.emit("loop-comment-updated", { loopId, comment });
    });

    // =====================================================
    // WEBRTC CALLING & SIGNALING REALTIME SYSTEM
    // =====================================================
    socket.on("call:invite", async (data) => {
      const { userToCall, targetUserId, room, type, conversationId, callerName, callerAvatar } = data;
      const recipientId = (userToCall || targetUserId)?.toString();
      if (!recipientId) return;

      console.log(`📞 Call invite from ${socket.userId} to ${recipientId} in room ${room} (${type})`);

      const targetSockets = activeUsers.get(recipientId);
      const isOnline = Boolean(targetSockets && targetSockets.size > 0);

      socket.emit("call:status", { status: isOnline ? "ringing" : "calling", room });

      const payload = {
        room,
        from: socket.userId,
        callerName: callerName || "User",
        callerAvatar,
        type: type || "video",
        conversationId,
      };

      io.to(`user_${recipientId}`).emit("call:invite-received", payload);
      io.to(`user_${recipientId}`).emit("call:incoming", payload);
    });

    socket.on("call:respond", (data) => {
      const { room, response, to } = data;
      console.log(`📡 Call response [${response}] from ${socket.userId} to ${to} for room ${room}`);

      if (to) {
        io.to(`user_${to.toString()}`).emit("call:response-received", {
          room,
          response,
          from: socket.userId,
        });
      }

      if (response === "accepted" || response === "joined") {
        socket.to(room).emit("call:accepted", { room, acceptedBy: socket.userId });
      } else if (response === "declined" || response === "rejected") {
        socket.to(room).emit("call:rejected", { room, reason: "Call declined" });
      } else if (response === "cancelled") {
        socket.to(room).emit("call:ended", { room, reason: "Call cancelled by caller" });
      }
    });

    socket.on("call:initiate", async (data) => {
      const { targetUserId, userToCall, room, type, conversationId, callerName, callerAvatar } = data;
      const recipientId = (targetUserId || userToCall)?.toString();
      if (!recipientId) return;

      console.log(`📞 Call initiated by ${socket.userId} to ${recipientId} in room ${room} (${type})`);

      const targetSockets = activeUsers.get(recipientId);
      const isOnline = Boolean(targetSockets && targetSockets.size > 0);

      socket.emit("call:status", { status: isOnline ? "ringing" : "calling", room });

      const payload = {
        room,
        from: socket.userId,
        callerName: callerName || "User",
        callerAvatar,
        type: type || "video",
        conversationId,
      };

      io.to(`user_${recipientId}`).emit("call:invite-received", payload);
      io.to(`user_${recipientId}`).emit("call:incoming", payload);
    });

    socket.on("call:accept", (data) => {
      const { room, callerId } = data;
      console.log(`✅ Call accepted by ${socket.userId} in room ${room}`);
      if (callerId) {
        io.to(`user_${callerId.toString()}`).emit("call:accepted", { room, acceptedBy: socket.userId });
        io.to(`user_${callerId.toString()}`).emit("call:response-received", { room, response: "accepted", from: socket.userId });
      }
      socket.to(room).emit("call:accepted", { room, acceptedBy: socket.userId });
    });

    socket.on("call:reject", (data) => {
      const { room, callerId, reason } = data;
      console.log(`❌ Call rejected by ${socket.userId} for room ${room}`);
      if (callerId) {
        io.to(`user_${callerId.toString()}`).emit("call:rejected", {
          room,
          reason: reason || "Call declined",
        });
        io.to(`user_${callerId.toString()}`).emit("call:response-received", {
          room,
          response: "declined",
          from: socket.userId,
        });
      }
      socket.to(room).emit("call:rejected", {
        room,
        reason: reason || "Call declined",
      });
    });

    socket.on("call:end", async (data) => {
      const { room } = data;
      console.log(`🛑 Call ended in room ${room} by ${socket.userId}`);
      socket.to(room).emit("call:ended", { room, endedBy: socket.userId });
      io.to(room).emit("call:ended", { room, endedBy: socket.userId });

      try {
        await CallSession.findOneAndUpdate(
          { room, status: { $ne: "ended" } },
          { status: "ended", endTime: new Date() }
        );
      } catch (e) {
        console.warn("Could not mark call session ended in db:", e);
      }
    });

    socket.on("call:join-room", async (data) => {
      const { room, userId } = data;
      const uid = (userId || socket.userId)?.toString();
      console.log(`🤝 User ${uid} (socket ${socket.id}) joining call room: ${room}`);

      socket.join(room);

      if (!socketCallRooms.has(socket.id)) {
        socketCallRooms.set(socket.id, new Set());
      }
      socketCallRooms.get(socket.id).add(room);

      const roomSockets = await io.in(room).fetchSockets();
      const existingMembers = roomSockets
        .filter((s) => s.id !== socket.id)
        .map((s) => ({
          socketId: s.id,
          userId: (s.userId || socketToUserMap.get(s.id))?.toString(),
        }));

      socket.emit("call:room-members", { members: existingMembers });

      socket.to(room).emit("call:peer-joined", {
        socketId: socket.id,
        userId: uid,
      });
    });

    socket.on("call:leave-room", (data) => {
      const { room } = data;
      console.log(`👋 User ${socket.userId} leaving call room: ${room}`);
      socket.leave(room);

      const sRooms = socketCallRooms.get(socket.id);
      if (sRooms) {
        sRooms.delete(room);
      }

      socket.to(room).emit("call:peer-left", {
        socketId: socket.id,
        userId: socket.userId?.toString(),
      });

      leaveCallSessionInDb(room, socket.userId).catch(() => null);
    });

    socket.on("call:signal", (data) => {
      const { toSocketId, signal } = data;
      io.to(toSocketId).emit("call:signal-received", {
        fromSocketId: socket.id,
        fromUserId: socket.userId?.toString(),
        signal,
      });
    });

    socket.on("call:action", (data) => {
      const { room, action, value } = data;
      const payload = {
        action,
        value,
        userId: socket.userId?.toString(),
        socketId: socket.id,
      };
      socket.to(room).emit("call:action", payload);
      socket.to(room).emit("call:action-broadcast", payload);
    });

    // In-Call Live Chat / Chatroom
    socket.on("call:chat-message", (data) => {
      const { room, text } = data;
      io.to(room).emit("call:chat-message-received", {
        from: socket.userId,
        text,
        time: Date.now(),
      });
    });

    // In-Call Watch Party / Co-Watching Sync
    socket.on("call:watch-party-start", (data) => {
      const { room, videoUrl } = data;
      socket.to(room).emit("call:watch-party-started", {
        videoUrl,
        startedBy: socket.userId,
      });
    });

    socket.on("call:watch-party-stop", (data) => {
      const { room } = data;
      socket.to(room).emit("call:watch-party-stopped", {
        stoppedBy: socket.userId,
      });
    });

    socket.on("call:watch-party-sync", (data) => {
      const { room, action, currentTime, playing } = data;
      socket.to(room).emit("call:watch-party-synced", {
        action,
        currentTime,
        playing,
        senderId: socket.userId,
      });
    });

    // Floating Reaction Emojis
    socket.on("call:reaction", (data) => {
      const { room, emoji } = data;
      io.to(room).emit("call:reaction-received", {
        emoji,
        senderId: socket.userId,
      });
    });

    // =====================================================
    // ROOM MANAGEMENT & DISCONNECT
    // =====================================================
    socket.on("join-conversation", async (data) => {
      const { conversationId } = data;
      const isParticipant = await isConversationParticipant(conversationId, socket.userId);
      if (!isParticipant) {
        console.warn(`🛡️ Blocked unauthorized join-conversation: User ${socket.userId} to conversation ${conversationId}`);
        return;
      }
      socket.join(`conversation_${conversationId}`);
    });

    socket.on("leave-conversation", (data) => {
      const { conversationId } = data;
      socket.leave(`conversation_${conversationId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      const remainingSocketCount = removeUserSocket(socket.userId, socket.id);

      // Clean up typing timers
      for (const [key, timer] of typingTimers.entries()) {
        if (key.endsWith(`_${socket.userId}`)) {
          clearTimeout(timer);
          typingTimers.delete(key);
        }
      }

      // Notify all call rooms this socket was in and update database
      const callRooms = socketCallRooms.get(socket.id);
      if (callRooms) {
        for (const room of callRooms) {
          socket.to(room).emit("call:peer-left", {
            userId: socket.userId,
            socketId: socket.id,
          });

          // Debounce DB and session teardown by 5 seconds
          const disconnectedSocketId = socket.id;
          const disconnectedUserId = socket.userId;
          setTimeout(async () => {
            try {
              // Only clean up if the user hasn't re-joined with a new socket in the meantime
              const currentSockets = activeUsers.get(disconnectedUserId);
              let isStillInRoom = false;
              if (currentSockets && currentSockets.size > 0) {
                for (const sid of currentSockets) {
                  const sRooms = socketCallRooms.get(sid);
                  if (sRooms && sRooms.has(room)) {
                    isStillInRoom = true;
                    break;
                  }
                }
              }

              if (isStillInRoom) {
                console.log(`[disconnect call cleanup] User ${disconnectedUserId} has re-joined call room ${room}, skipping teardown.`);
                return;
              }

              const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
              if (session) {
                const participant = session.participants.find(
                  (p) => p.user.toString() === disconnectedUserId.toString()
                );
                if (participant && (participant.status === "joined" || participant.status === "ringing")) {
                  participant.status = "left";
                  participant.leftAt = new Date();
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
              }
            } catch (err) {
              console.error("[disconnect call cleanup] error:", err);
            }
          }, 5000);
        }
        socketCallRooms.delete(socket.id);
      }

      if (remainingSocketCount === 0) {
        broadcastPresenceToContacts(io, socket.userId, false);
        persistPresence(socket.userId, false).catch(() => null);
      }
    });
  });

  return io;
};

export const getReceiverSocketId = (userId) => {
  const sockets = activeUsers.get(userId);
  if (sockets && sockets.size > 0) {
    return Array.from(sockets)[0];
  }
  return null;
};

export const isUserOnline = (userId) => getUserSocketCount(userId) > 0;
export const getActiveUsersCount = () => activeUsers.size;
export { ioInstance as io };

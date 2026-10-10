// socket.js - Socket.IO Event Handlers for Real-time Communication & WebRTC Signaling
import { Server } from "socket.io";
import { User } from "./models/user.model.js";
import { Session } from "./models/session.model.js";
import { Conversation } from "./models/conversation.model.js";
import { parseCookie } from "cookie";
import * as cookie from "cookie";
import jwt from "jsonwebtoken";
import { getAccessTokenSecret } from "./config/generateToken.js";
import { Channel } from "./models/channel.model.js";
import { Community } from "./models/community.model.js";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { CallSession } from "./models/callSession.model.js";
import { Meeting } from "./models/meeting.model.js";
import { LiveStream } from "./models/liveStream.model.js";
import { ChannelMessage } from "./models/channelMessage.model.js";
import { Reel } from "./models/reel.model.js";
import { recordCallLogMessage } from "./controllers/call.controller.js";

const parseRawCookie = (cookieStr) => {
  if (!cookieStr) return {};
  try {
    if (typeof parseCookie === "function") return parseCookie(cookieStr);
    if (typeof cookie?.parseCookie === "function") return cookie.parseCookie(cookieStr);
    if (typeof cookie?.parse === "function") return cookie.parse(cookieStr);
  } catch (e) {}
  return Object.fromEntries(
    cookieStr.split(";").map((c) => {
      const idx = c.indexOf("=");
      if (idx === -1) return [c.trim(), ""];
      return [c.slice(0, idx).trim(), decodeURIComponent(c.slice(idx + 1).trim())];
    })
  );
};

const activeUsers = new Map();
const socketToUserMap = new Map();
const typingTimers = new Map(); // server-side typing debounce
const socketCallRooms = new Map(); // socketId -> Set of call room names
const socketMeetingRooms = new Map(); // socketId -> Set of meeting IDs
const meetingBreakoutSessions = new Map(); // meetingId -> Active Breakout Session

const getUserRoom = (userId) => {
  const uid = (userId?._id || userId?.id || userId)?.toString();
  return uid ? `user_${uid}` : `user_unknown`;
};

const getUserSocketCount = (userId) => {
  if (!userId) return 0;
  const uid = (userId?._id || userId?.id || userId)?.toString();
  return activeUsers.get(uid)?.size || 0;
};

const addUserSocket = (userId, socketId) => {
  if (!userId) return;
  const uid = (userId?._id || userId?.id || userId)?.toString();
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

    return await User.findByIdAndUpdate(userId, update, { returnDocument: 'after' }).exec();
  } catch (error) {
    console.error(`[presence] failed for ${userId}:`, error);
  }
};

const callTeardownTimers = new Map();

const cancelRoomTeardown = (room) => {
  if (callTeardownTimers.has(room)) {
    clearTimeout(callTeardownTimers.get(room));
    callTeardownTimers.delete(room);
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

      // Check remaining active participants
      const activeParticipants = session.participants.filter(
        (p) => p.status === "joined" || p.status === "ringing"
      );

      // Only if ZERO participants are left in the call, start a 45s grace period for re-joining
      if (activeParticipants.length === 0 && session.type !== "channel") {
        cancelRoomTeardown(room);
        const timer = setTimeout(async () => {
          try {
            const currentSession = await CallSession.findOne({ room, status: { $ne: "ended" } });
            if (currentSession) {
              const stillActive = currentSession.participants.some(
                (p) => p.status === "joined" || p.status === "ringing"
              );
              if (!stillActive) {
                currentSession.status = "ended";
                currentSession.endTime = new Date();
                await currentSession.save();
                console.log(`[call teardown] Grace period expired (0 active peers), ended session ${room}`);
              }
            }
          } catch (e) {
            console.error("[call teardown error]:", e);
          } finally {
            callTeardownTimers.delete(room);
          }
        }, 45000);
        callTeardownTimers.set(room, timer);
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

const getCommunityChannelMembership = async (channelId, userId) => {
  try {
    if (!channelId || !userId) return null;
    const channel = await Channel.findById(channelId).select("community type");
    if (!channel) return null;
    const community = await Community.findById(channel.community).select("owner members roles");
    if (!community) return null;
    const member = community.members.find((item) => String(item.user) === String(userId));
    if (!member) return null;
    return { channel, community, member };
  } catch (err) {
    console.error("[socket auth helper] community membership check failed:", err.message);
    return null;
  }
};

const isSocketInCallRoom = (socket, room) =>
  Boolean(room && socket.rooms.has(room) && socketCallRooms.get(socket.id)?.has(room));

const isSocketInMeeting = (socket, meetingId) =>
  Boolean(meetingId && socketMeetingRooms.get(socket.id)?.has(String(meetingId).trim().toLowerCase()));

const getMeetingAccess = async (meetingId, userId) => {
  try {
    if (!meetingId || !userId) return null;
    const normalizedId = String(meetingId).trim().toLowerCase();
    const meeting = await Meeting.findOne({ meetingId: normalizedId }).select(
      "host status settings participants hiddenFor"
    );
    if (!meeting || meeting.status === "ended") return null;
    if (meeting.hiddenFor?.some((id) => String(id) === String(userId))) return null;
    const participant = meeting.participants.find((item) => String(item.user) === String(userId));
    const isHost = String(meeting.host) === String(userId);
    const isCoHost = participant?.role === "co-host" && participant.status !== "kicked";
    return { meeting, participant, isHost, isCoHost };
  } catch (err) {
    console.error("[socket auth helper] meeting access check failed:", err.message);
    return null;
  }
};

const getLiveStreamForHost = async (streamId, userId) => {
  try {
    if (!streamId || !userId) return null;
    return await LiveStream.findOne({
      _id: streamId,
      host: userId,
      isLive: true,
    });
  } catch (err) {
    console.error("[socket auth helper] live host check failed:", err.message);
    return null;
  }
};

const getCallSessionForParticipant = async (room, userId) => {
  try {
    if (!room || !userId) return null;
    const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
    if (!session) return null;
    const participant = session.participants.find(
      (item) => String(item.user) === String(userId) &&
        !["declined", "left", "busy"].includes(item.status)
    );
    return participant ? { session, participant } : null;
  } catch (err) {
    console.error("[socket auth helper] call session membership check failed:", err.message);
    return null;
  }
};

// Get all online contacts for a user (users sharing conversations who are currently online)
const getOnlineContactsForUser = async (userId) => {
  try {
    if (!userId) return [];
    const uidStr = (userId?._id || userId?.id || userId)?.toString();
    const conversations = await Conversation.find({ participants: uidStr }).select("participants");
    const onlineContactIds = [];
    const seen = new Set();

    conversations.forEach((conv) => {
      conv.participants.forEach((pid) => {
        const pidStr = pid.toString();
        if (pidStr !== uidStr && !seen.has(pidStr)) {
          seen.add(pidStr);
          if (getUserSocketCount(pidStr) > 0) {
            onlineContactIds.push(pidStr);
          }
        }
      });
    });

    return onlineContactIds;
  } catch (err) {
    console.error("[getOnlineContactsForUser] error:", err);
    return [];
  }
};

// Broadcast presence only to user's conversation participants (not globally)
const broadcastPresenceToContacts = async (io, userId, isOnline) => {
  try {
    if (!userId) return;
    const uidStr = (userId?._id || userId?.id || userId)?.toString();
    const conversations = await Conversation.find({ participants: uidStr }).select("participants");
    const contactIds = new Set();

    conversations.forEach((conv) => {
      conv.participants.forEach((pid) => {
        const pidStr = pid.toString();
        if (pidStr !== uidStr && getUserSocketCount(pidStr) > 0) {
          contactIds.add(pidStr);
        }
      });
    });

    const payload = {
      userId: uidStr,
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
  const socketAllowedOrigins = (
    process.env.SOCKET_CORS_ORIGINS ||
    process.env.CORS_ORIGINS ||
    process.env.CLIENT_URL ||
    ""
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isDevelopment = process.env.NODE_ENV !== "production";
  const isLocalDevelopmentOrigin = (origin) =>
    /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Non-browser clients can omit Origin. Browser origins must match exactly.
        if (!origin || socketAllowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (
          isDevelopment &&
          (socketAllowedOrigins.length === 0 || isLocalDevelopmentOrigin(origin))
        ) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by Socket.IO CORS policy"));
      },
      methods: ["GET", "POST"],
      credentials: true,
      allowEIO3: true,
    },
    transports: ["polling", "websocket"],
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
        const cookies = parseRawCookie(socket.handshake.headers.cookie);
        jwtToken = cookies.admin_accessToken || cookies.admin_token || cookies.accessToken || cookies.token;
      }

      if (!jwtToken) {
        // Dev mode fallback
        const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
        if (userId && process.env.NODE_ENV !== "production") {
          console.warn(`⚠️ Dev Fallback: socket connect for userId: ${userId}`);
          socket.authenticatedUserId = String(userId);
          socket.userId = socket.authenticatedUserId;
          return next();
        }
        return next(new Error("Authentication token is required for socket connection"));
      }

      const secret = getAccessTokenSecret();
      const decoded = jwt.verify(jwtToken, secret);
      if (!decoded || !decoded.userId || !decoded.sessionId) {
        return next(new Error("Invalid authentication token or missing session"));
      }

      if (decoded.sessionId) {
        let session;
        try {
          session = await Session.findById(decoded.sessionId);
        } catch (dbErr) {
          console.error("[socket auth] Session validation failed:", dbErr.message);
          return next(new Error("Unable to validate authentication session"));
        }

        if (
          !session ||
          session.isRevoked ||
          String(session.user) !== String(decoded.userId) ||
          (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now())
        ) {
          return next(new Error("Session has been revoked, expired, or does not match this account"));
        }
      }

      socket.authenticatedUserId = String(decoded.userId);
      socket.userId = socket.authenticatedUserId;
      next();
    } catch (err) {
      return next(new Error("Authentication error: " + err.message));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`✅ User connected: ${socket.userId} (Socket ID: ${socket.id})`);

    addUserSocket(socket.userId, socket.id);

    // Check if connected user is an admin/staff member and join appropriate staff rooms
    try {
      const user = await User.findById(socket.userId).select("role name");
      if (user && user.role && user.role !== "user") {
        socket.join("admin_staff");
        socket.join(`admin_${user.role}`);
        console.log(`🛡️ Staff connected: @${user.name} joined admin_staff & admin_${user.role}`);
      }
    } catch (err) {
      console.error("[socket staff room join error]:", err);
    }

    if (getUserSocketCount(socket.userId) === 1) {
      persistPresence(socket.userId, true).catch(() => null);
      broadcastPresenceToContacts(io, socket.userId, true);
    }

    socket.join(getUserRoom(socket.userId));

    // Send the list of currently online contacts directly to the newly connected user
    if (socket.userId) {
      const onlineContacts = await getOnlineContactsForUser(socket.userId);
      socket.emit("online-users-list", { onlineUsers: onlineContacts });
    }

    // Explicit User ID Registration from client to guarantee 100% active socket mapping
    socket.on("register-user", async (data) => {
      const rawId = data?.userId || data?._id || data;
      const requestedUid = (rawId?._id || rawId?.id || rawId)?.toString();
      const authenticatedUid = socket.authenticatedUserId;

      if (!authenticatedUid || !requestedUid) return;
      if (requestedUid !== authenticatedUid) {
        console.warn(
          `🛡️ Blocked socket identity reassignment: authenticated user ${authenticatedUid} tried to register as ${requestedUid}`
        );
        return;
      }

      // Re-register only the authenticated principal; a client cannot change socket.userId.
      const isAlreadyBound =
        socket.userId === authenticatedUid &&
        activeUsers.get(authenticatedUid)?.has(socket.id);

      if (!isAlreadyBound) {
        socket.userId = authenticatedUid;
        addUserSocket(authenticatedUid, socket.id);
        socket.join(getUserRoom(authenticatedUid));
        persistPresence(authenticatedUid, true).catch(() => null);
        broadcastPresenceToContacts(io, authenticatedUid, true);
      }

      const onlineContacts = await getOnlineContactsForUser(authenticatedUid);
      socket.emit("online-users-list", { onlineUsers: onlineContacts });
    });

    // Client requests current online contacts list
    socket.on("get-online-users", async () => {
      if (!socket.userId) return;
      const onlineContacts = await getOnlineContactsForUser(socket.userId);
      socket.emit("online-users-list", { onlineUsers: onlineContacts });
    });

    // Update user presence/status
    socket.on("update-presence", async (data) => {
      if (!socket.userId) return;
      const { status, lastSeen } = data || {};
      const isOnline = status === "online";
      persistPresence(socket.userId, isOnline).catch(() => null);
      broadcastPresenceToContacts(io, socket.userId, isOnline);
      socket.emit("user-presence-updated", { userId: socket.userId, status, lastSeen: lastSeen || new Date() });
    });

    // Notifications must be emitted by trusted server-side controllers after authorization.
    // Never relay a client-supplied recipient/payload directly into another user's notification stream.
    socket.on("send-notification", () => {
      socket.emit("notification:rejected", {
        code: "SERVER_OWNED_EVENT",
        message: "Notifications must be created through an authorized server action.",
      });
    });

    // Send conversation reaction
    socket.on("send-reaction", async (data) => {
      const { conversationId, type, targetId } = data || {};
      if (!conversationId || !socket.userId) return;
      if (!(await isConversationParticipant(conversationId, socket.userId))) {
        console.warn(`🛡️ Blocked unauthorized send-reaction by ${socket.userId}`);
        return;
      }
      if (!["like", "love", "laugh", "wow", "sad", "angry", "heart"].includes(type)) return;
      socket.to(`conversation_${conversationId}`).emit("reaction-received", {
        conversationId,
        type,
        targetId,
        userId: socket.userId,
      });
    });

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
      try {
        const { conversationId, userName, userAvatar } = data;
        if (!conversationId) return;
        const isParticipant = await isConversationParticipant(conversationId, socket.userId);
        if (!isParticipant) return;
        const key = `${conversationId}_${socket.userId}`;

        // Clear existing timer
        if (typingTimers.has(key)) {
          clearTimeout(typingTimers.get(key));
        }

        const payload = {
          conversationId,
          userId: socket.userId,
          userName: userName || "Someone",
          userAvatar: userAvatar || null,
          isTyping: true,
        };

        // Broadcast to conversation room & individual participant rooms
        socket.to(`conversation_${conversationId}`).emit("user-typing", payload);

        const conversation = await Conversation.findById(conversationId).select("participants");
        if (conversation) {
          conversation.participants.forEach((pid) => {
            const pidStr = pid.toString();
            if (pidStr !== socket.userId && getUserSocketCount(pidStr) > 0) {
              io.to(getUserRoom(pidStr)).emit("user-typing", payload);
            }
          });
        }

        // Auto-stop after 4 seconds if no new typing event
        typingTimers.set(
          key,
          setTimeout(async () => {
            const stopPayload = {
              conversationId,
              userId: socket.userId,
              isTyping: false,
            };
            socket.to(`conversation_${conversationId}`).emit("user-typing", stopPayload);
            if (conversation) {
              conversation.participants.forEach((pid) => {
                const pidStr = pid.toString();
                if (pidStr !== socket.userId && getUserSocketCount(pidStr) > 0) {
                  io.to(getUserRoom(pidStr)).emit("user-typing", stopPayload);
                }
              });
            }
            typingTimers.delete(key);
          }, 4000)
        );
      } catch (err) {
        console.error("typing error:", err);
      }
    });

    socket.on("stop-typing", async (data) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;
        const isParticipant = await isConversationParticipant(conversationId, socket.userId);
        if (!isParticipant) return;
        const key = `${conversationId}_${socket.userId}`;

        if (typingTimers.has(key)) {
          clearTimeout(typingTimers.get(key));
          typingTimers.delete(key);
        }

        const stopPayload = {
          conversationId,
          userId: socket.userId,
          isTyping: false,
        };

        socket.to(`conversation_${conversationId}`).emit("user-typing", stopPayload);

        const conversation = await Conversation.findById(conversationId).select("participants");
        if (conversation) {
          conversation.participants.forEach((pid) => {
            const pidStr = pid.toString();
            if (pidStr !== socket.userId && getUserSocketCount(pidStr) > 0) {
              io.to(getUserRoom(pidStr)).emit("user-typing", stopPayload);
            }
          });
        }
      } catch (err) {
        console.error("stop-typing error:", err);
      }
    });

    // Real-time Chat Theme Update (Instagram / WhatsApp style)
    socket.on("chat:theme-update", async (data) => {
      try {
        const { conversationId, theme, systemMessage } = data || {};
        if (!conversationId || !socket.userId) return;
        if (!(await isConversationParticipant(conversationId, socket.userId))) {
          console.warn(`🛡️ Blocked unauthorized chat:theme-update by ${socket.userId}`);
          return;
        }

        socket.to(`conversation_${conversationId}`).emit("chat:theme-updated", {
          conversationId,
          theme,
          systemMessage,
        });

        const conversation = await Conversation.findById(conversationId).select("participants");
        if (conversation) {
          conversation.participants.forEach((pid) => {
            const pidStr = pid.toString();
            if (pidStr !== socket.userId && getUserSocketCount(pidStr) > 0) {
              io.to(getUserRoom(pidStr)).emit("chat:theme-updated", {
                conversationId,
                theme,
                systemMessage,
              });
            }
          });
        }
      } catch (err) {
        console.error("chat:theme-update error:", err);
      }
    });

    // =====================================================
    // INSTAGRAM-GRADE LIVE STREAMING REAL-TIME ENGINE
    // =====================================================
    socket.on("start-live-stream", async (data) => {
      try {
        const { streamId } = data || {};
        if (!streamId || !socket.userId) return;

        const stream = await getLiveStreamForHost(streamId, socket.userId);
        if (!stream) {
          console.warn(`🛡️ Blocked start-live-stream by non-host ${socket.userId}`);
          return;
        }
        socket.join(`live_${streamId}`);

        const hostUser = await User.findById(socket.userId).select("userName name profileImage followers").lean();
        for (const followerId of hostUser?.followers || []) {
          const follower = String(followerId);
          if (getUserSocketCount(follower) > 0) {
            io.to(getUserRoom(follower)).emit("live:creator-started", {
              streamId,
              title: stream.title || "Live Video",
              host: {
                _id: hostUser._id,
                userName: hostUser.userName,
                name: hostUser.name,
                profileImage: hostUser.profileImage,
              },
            });
          }
        }
      } catch (err) {
        console.error("start-live-stream error:", err);
      }
    });

    socket.on("join-live-stream", async (data) => {
      try {
        const { streamId } = data || {};
        if (!streamId || !socket.userId) return;

        const live = await LiveStream.findById(streamId).select("host isLive audience viewers peakViewers totalUniqueViewers");
        if (!live || !live.isLive) {
          socket.emit("live:error", { message: "This live stream is no longer available" });
          return;
        }
        if (String(live.host) !== String(socket.userId) && live.audience === "close_friends") {
          const host = await User.findById(live.host).select("closeFriends").lean();
          const isCloseFriend = (host?.closeFriends || []).some((id) => String(id) === String(socket.userId));
          if (!isCloseFriend) {
            socket.emit("live:error", { message: "This live stream is limited to close friends" });
            return;
          }
        }

        socket.join(`live_${streamId}`);
        let viewerInfo = {
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName || "Viewer",
          userAvatar: socket.profilePicture || "",
        };
        const user = await User.findById(socket.userId).select("userName name profileImage isVerified").lean();
        if (user) {
          viewerInfo.userName = user.userName || user.name || viewerInfo.userName;
          viewerInfo.userAvatar = user.profileImage?.url || user.profilePicture || "";
          viewerInfo.isVerified = Boolean(user.isVerified);
        }

        if (!live.viewers.some((id) => String(id) === String(socket.userId))) {
          live.viewers.push(socket.userId);
        }
        live.peakViewers = Math.max(live.peakViewers || 1, live.viewers.length);
        live.totalUniqueViewers = Math.max(live.totalUniqueViewers || 1, live.viewers.length);
        await live.save();

        viewerInfo.viewerCount = live.viewers.length;
        socket.to(`live_${streamId}`).emit("live-viewer-joined", viewerInfo);
        io.to(`live_${streamId}`).emit("live:viewer-count-updated", {
          streamId,
          viewerCount: live.viewers.length,
        });
      } catch (err) {
        console.error("join-live-stream error:", err);
        socket.emit("live:error", { message: "Unable to join this live stream" });
      }
    });

    socket.on("leave-live-stream", async (data) => {
      try {
        const { streamId } = data;
        if (!streamId) return;

        socket.leave(`live_${streamId}`);

        let currentViewerCount = 1;
        if (socket.userId) {
          try {
            const live = await LiveStream.findById(streamId);
            if (live && live.isLive) {
              live.viewers = live.viewers.filter((v) => v.toString() !== socket.userId.toString());
              await live.save();
              currentViewerCount = Math.max(1, live.viewers.length);
            }
          } catch (e) {}
        }

        socket.to(`live_${streamId}`).emit("live-viewer-left", {
          socketId: socket.id,
          userId: socket.userId,
          viewerCount: currentViewerCount,
        });
        io.to(`live_${streamId}`).emit("live:viewer-count-updated", {
          streamId,
          viewerCount: currentViewerCount,
        });
      } catch (err) {
        console.error("leave-live-stream error:", err);
      }
    });

    // WebRTC Signaling Relay for Live Stream (Host <-> Viewer / Co-Host)
    socket.on("live:signal", async (data) => {
      const { streamId, toSocketId, signal } = data || {};
      const room = streamId ? `live_${streamId}` : "";
      if (!room || !toSocketId || !signal || !socket.rooms.has(room)) return;
      const roomSockets = await io.in(room).fetchSockets();
      if (!roomSockets.some((candidate) => candidate.id === toSocketId)) return;
      io.to(toSocketId).emit("live:signal-received", {
        streamId,
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        signal,
      });
    });

    // Live Comments
    socket.on("send-live-comment", async (data) => {
      try {
        const { streamId, comment } = data || {};
        const room = streamId ? `live_${streamId}` : "";
        if (!socket.userId || !room || !socket.rooms.has(room) ||
            typeof comment?.text !== "string" || !comment.text.trim() || comment.text.length > 1000) return;

        const user = await User.findById(socket.userId).select("userName name profileImage isVerified").lean();
        const commentPayload = {
          _id: `${Date.now()}_${socket.id}`,
          user: socket.userId,
          userName: user?.userName || user?.name || "Viewer",
          userAvatar: user?.profileImage?.url || user?.profilePicture || "",
          isVerified: Boolean(user?.isVerified),
          text: comment.text.trim(),
          createdAt: new Date(),
        };
        const live = await LiveStream.findOneAndUpdate(
          { _id: streamId, isLive: true, commentsDisabled: { $ne: true } },
          { $push: { comments: commentPayload }, $inc: { "stats.totalComments": 1 } },
          { new: true }
        );
        if (!live) return;
        io.to(room).emit("live-comment-received", { streamId, comment: commentPayload });
      } catch (err) {
        console.error("send-live-comment error:", err);
      }
    });

    // Live Heart Burst Reactions
    socket.on("send-live-heart", async (data) => {
      try {
        const { streamId, reactionType = "heart", count = 1 } = data || {};
        const room = streamId ? `live_${streamId}` : "";
        if (!socket.userId || !room || !socket.rooms.has(room)) return;
        const safeCount = Number.isInteger(count) ? Math.max(1, Math.min(10, count)) : 1;
        const allowedReactions = ["heart", "fire", "clap", "laugh", "wow"];
        const safeReaction = allowedReactions.includes(reactionType) ? reactionType : "heart";
        const live = await LiveStream.findOneAndUpdate(
          { _id: streamId, isLive: true },
          { $inc: { "stats.totalHearts": safeCount } },
          { new: true }
        ).select("_id");
        if (!live) return;
        socket.to(room).emit("live-heart-received", {
          streamId, fromUserId: socket.userId, reactionType: safeReaction, count: safeCount,
        });
      } catch (err) {
        console.error("send-live-heart error:", err);
      }
    });

    // Live Pinned Comments
    socket.on("live:pin-comment", async (data) => {
      try {
        const { streamId, comment } = data || {};
        const live = await getLiveStreamForHost(streamId, socket.userId);
        if (!live) return;
        let pinnedComment = null;
        if (comment) {
          const commentId = String(comment._id || comment.id || "");
          const existing = live.comments.find((item) => String(item._id) === commentId);
          if (!existing) return;
          pinnedComment = {
            user: existing.user,
            userName: existing.userName,
            text: existing.text,
            pinnedAt: new Date(),
          };
        }
        live.pinnedComment = pinnedComment;
        await live.save();
        io.to(`live_${streamId}`).emit("live:pinned-comment-updated", { streamId, pinnedComment });
      } catch (err) {
        console.error("live:pin-comment error:", err);
      }
    });

    // Live Q&A Box
    socket.on("live:new-question", (data) => {
      const { streamId, question } = data;
      if (!streamId) return;
      io.to(`live_${streamId}`).emit("live:question-received", {
        streamId,
        question,
      });
    });

    socket.on("live:display-question", async (data) => {
      const { streamId, question } = data || {};
      if (!(await getLiveStreamForHost(streamId, socket.userId))) return;
      if (question && (typeof question.text !== "string" || question.text.length > 1000)) return;
      io.to(`live_${streamId}`).emit("live:question-displayed", {
        streamId,
        question: question ? { ...question, userId: undefined, hostId: socket.userId } : null,
      });
    });

    // Co-Host Dual Screen Live Signaling
    socket.on("live:cohost-request", async (data) => {
      const { streamId, hostSocketId } = data || {};
      const room = streamId ? `live_${streamId}` : "";
      if (!socket.userId || !room || !socket.rooms.has(room) || !hostSocketId) return;
      const live = await LiveStream.findOne({ _id: streamId, isLive: true }).select("host");
      const target = io.sockets.sockets.get(hostSocketId);
      if (!live || !target || String(target.userId) !== String(live.host)) return;
      io.to(hostSocketId).emit("live:cohost-request-received", {
        streamId,
        guestSocketId: socket.id,
        guestUserId: socket.userId,
        guestUserName: socket.userName,
        guestAvatar: socket.profilePicture,
      });
    });

    socket.on("live:cohost-accept", async (data) => {
      const { streamId, guestSocketId } = data || {};
      const live = await getLiveStreamForHost(streamId, socket.userId);
      const guest = guestSocketId ? io.sockets.sockets.get(guestSocketId) : null;
      const room = streamId ? `live_${streamId}` : "";
      if (!live || !guest || !guest.userId || !guest.rooms.has(room)) return;
      live.coHost = guest.userId;
      await live.save();
      io.to(guestSocketId).emit("live:cohost-accepted", { streamId, hostSocketId: socket.id });
      io.to(room).emit("live:cohost-joined", {
        streamId,
        coHost: { _id: guest.userId, userName: guest.userName, profileImage: guest.profilePicture },
      });
    });

    socket.on("live:cohost-leave", async (data) => {
      const { streamId } = data || {};
      const live = await LiveStream.findOne({ _id: streamId, isLive: true }).select("host coHost");
      if (!live) return;
      const isHost = String(live.host) === String(socket.userId);
      const isCoHost = live.coHost && String(live.coHost) === String(socket.userId);
      if (!isHost && !isCoHost) return;
      if (isCoHost) {
        live.coHost = null;
        await live.save();
      }
      io.to(`live_${streamId}`).emit("live:cohost-ended", { streamId, endedBy: socket.userId });
    });

    // Host Friendly Wave
    socket.on("live:wave", async (data) => {
      const { streamId, targetSocketId } = data || {};
      const room = streamId ? `live_${streamId}` : "";
      if (!room || !socket.userId || !socket.rooms.has(room) || !targetSocketId) return;
      const target = await io.in(room).fetchSockets();
      if (!target.some((candidate) => candidate.id === targetSocketId)) return;
      io.to(targetSocketId).emit("live:wave-received", {
        fromUserId: socket.userId,
        fromUserName: socket.userName || "Viewer",
      });
    });

    // End Live Stream Broadcast
    socket.on("end-live-stream", async (data) => {
      try {
        const { streamId } = data || {};
        const live = await getLiveStreamForHost(streamId, socket.userId);
        if (!live) return;
        live.isLive = false;
        live.endedAt = new Date();
        await live.save();
        io.to(`live_${streamId}`).emit("live-stream-ended", {
          streamId,
          stats: {
            totalHearts: live.stats?.totalHearts || 0,
            totalComments: live.stats?.totalComments || 0,
          },
        });
        io.emit("live:creator-ended", { streamId, hostId: socket.userId });
      } catch (err) {
        console.error("end-live-stream error:", err);
      }
    });

    // =====================================================
    // WEBRTC AUDIO & VIDEO CALL SIGNALING
    // =====================================================
    // =====================================================
    // ENTERPRISE WEBRTC CALL SIGNALING & LIFECYCLE
    // =====================================================
    socket.on("call:invite", async (data) => {
      try {
        const { room, userToCall, targetUserId: explicitTargetId, type, callerName, callerAvatar, conversationId } = data || {};
        const targetUserId = (explicitTargetId || userToCall?._id || userToCall?.id || userToCall?.user?._id || userToCall)?.toString();
        if (!socket.userId || !room || !targetUserId || targetUserId === String(socket.userId)) return;

        // The REST endpoint creates the canonical session first. Only the initiator may
        // invite the receiver recorded in that session.
        const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
        if (!session || String(session.initiator) !== String(socket.userId)) {
          console.warn(`🛡️ Blocked call invite from non-initiator ${socket.userId} for room ${room}`);
          return;
        }
        const callerIsParticipant = session.participants.some((p) => String(p.user) === String(socket.userId));
        const targetIsParticipant = session.participants.some((p) => String(p.user) === targetUserId);
        if (!callerIsParticipant || !targetIsParticipant) return;
        if (session.conversationId && conversationId && String(session.conversationId) !== String(conversationId)) return;
        if (!session.participants.some((p) => String(p.user) === targetUserId && ["ringing", "joined"].includes(p.status))) return;

        const recipientRoom = getUserRoom(targetUserId);
        let resolvedAvatar = socket.profilePicture || "";
        let resolvedCallerName = socket.userName || "User";
        if ((!resolvedAvatar || !resolvedCallerName) && socket.userId) {
          try {
            const u = await User.findById(socket.userId).select("userName name profileImage profilePicture").lean();
            if (u) {
              resolvedCallerName = u.userName || u.name || resolvedCallerName;
              resolvedAvatar = u.profileImage?.url || (typeof u.profileImage === "string" ? u.profileImage : u.profilePicture?.url || u.profilePicture || "");
              socket.profilePicture = resolvedAvatar;
              socket.userName = resolvedCallerName;
            }
          } catch (e) {}
        }

        const invitePayload = {
          room,
          from: String(socket.userId),
          callerName: resolvedCallerName,
          callerAvatar: resolvedAvatar,
          type: type || session.type || "video",
          conversationId: session.conversationId ? String(session.conversationId) : null,
        };

        io.to(recipientRoom).emit("call:invite-received", invitePayload);
        const recipientSockets = activeUsers.get(targetUserId);
        if (recipientSockets) {
          for (const sockId of recipientSockets) {
            if (sockId !== socket.id) io.to(sockId).emit("call:invite-received", invitePayload);
          }
        }
        socket.emit("call:status", { room, status: recipientSockets?.size ? "ringing" : "calling" });
      } catch (err) {
        console.error("call:invite error:", err);
      }
    });

    socket.on("call:respond", async (data) => {
      try {
        const { room, response, to, targetUserId: explicitTargetId } = data || {};
        const targetUserId = (explicitTargetId || to?._id || to?.id || to?.user?._id || to)?.toString();
        const allowedResponses = ["accepted", "joined", "declined", "busy", "cancelled"];
        if (!socket.userId || !room || !targetUserId || !allowedResponses.includes(response)) return;

        const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
        if (!session) return;
        const ownParticipant = session.participants.find((p) => String(p.user) === String(socket.userId));
        const targetParticipant = session.participants.find((p) => String(p.user) === targetUserId);
        if (!ownParticipant || !targetParticipant || targetUserId === String(socket.userId)) {
          console.warn(`🛡️ Blocked unauthorized call response for room ${room}`);
          return;
        }

        const responsePayload = { room, response, from: String(socket.userId) };
        io.to(getUserRoom(targetUserId)).emit("call:response-received", responsePayload);
        const targetSockets = activeUsers.get(targetUserId);
        if (targetSockets) {
          for (const sockId of targetSockets) {
            if (sockId !== socket.id) io.to(sockId).emit("call:response-received", responsePayload);
          }
        }
      } catch (err) {
        console.error("call:respond error:", err);
      }
    });

    // In-call invitation ("Add People" to live call)
    socket.on("call:invite-user", async (data) => {
      try {
        const { room, targetUserId: rawTargetId, type, conversationId } = data || {};
        const targetUserId = (rawTargetId?._id || rawTargetId?.id || rawTargetId)?.toString();
        if (!socket.userId || !room || !targetUserId || targetUserId === String(socket.userId)) return;
        if (!isSocketInCallRoom(socket, room)) return;

        const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
        const callerIsParticipant = session?.participants.some((p) =>
          String(p.user) === String(socket.userId) && ["joined", "ringing"].includes(p.status)
        );
        if (!session || !callerIsParticipant) return;
        if (!["group", "channel"].includes(session.type)) {
          socket.emit("call:error", { message: "Adding participants is only available for group/channel calls" });
          return;
        }

        const targetUser = await User.findById(targetUserId).select("_id").lean();
        if (!targetUser) return;
        const effectiveConversationId = session.conversationId ? String(session.conversationId) : null;
        if (effectiveConversationId) {
          const isConversationMember = await isConversationParticipant(effectiveConversationId, targetUserId);
          if (!isConversationMember) {
            socket.emit("call:error", { message: "The invited user is not a participant in this conversation" });
            return;
          }
        }
        const existing = session.participants.find((p) => String(p.user) === targetUserId);
        if (!existing) {
          session.participants.push({ user: targetUserId, status: "ringing", role: "listener" });
          await session.save();
        } else if (["left", "declined", "busy", "disconnected"].includes(existing.status)) {
          existing.status = "ringing";
          existing.leftAt = null;
          await session.save();
        }

        const caller = await User.findById(socket.userId).select("name userName profileImage").lean();
        const invitePayload = {
          room,
          from: String(socket.userId),
          callerName: caller?.name || caller?.userName || socket.userName || "VYBE User",
          callerAvatar: caller?.profileImage?.url || socket.profilePicture || null,
          type: type || session.type || "video",
          conversationId: effectiveConversationId,
          isGroupInvite: true,
        };

        io.to(getUserRoom(targetUserId)).emit("call:invite-received", invitePayload);
        const recipientSockets = activeUsers.get(targetUserId);
        if (recipientSockets) {
          for (const sockId of recipientSockets) {
            if (sockId !== socket.id) io.to(sockId).emit("call:invite-received", invitePayload);
          }
        }
      } catch (err) {
        console.error("call:invite-user error:", err);
      }
    });

    // Floating reaction emojis broadcast (WhatsApp / Instagram Live call reactions)
    socket.on("call:send-reaction", (data) => {
      const { room, emoji } = data || {};
      if (!room || typeof emoji !== "string" || emoji.length > 12 || !isSocketInCallRoom(socket, room)) return;

      io.to(room).emit("call:reaction-received", {
        emoji,
        userName: socket.userName || "User",
        userId: socket.userId,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      });
    });

    socket.on("call:join-room", async (data) => {
      const { room, userName: payloadUserName, name: payloadName, profilePicture: payloadProfilePicture } = data || {};
      if (!room || !socket.userId || typeof room !== "string" || room.length > 180) return;

      // Validate room membership before joining, rather than trusting a client-supplied room ID.
      if (!room.startsWith("channel_")) {
        const authorized = await getCallSessionForParticipant(room, socket.userId);
        if (!authorized) {
          socket.emit("call:error", { message: "You are not authorized to join this call" });
          return;
        }
      }

      cancelRoomTeardown(room);

      if (payloadUserName) socket.userName = payloadUserName;
      if (payloadName) socket.name = payloadName;
      if (payloadProfilePicture) socket.profilePicture = payloadProfilePicture;

      // Check community channel permission if this is a channel room
      if (room.startsWith("channel_")) {
        try {
          const channelId = room.replace("channel_", "");
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
            (m) => m.user.toString() === socket.userId?.toString()
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
      console.log(`📞 User ${socket.userId} (@${socket.userName || "User"}) joined call room: ${room}`);

      // Track this socket's call rooms for disconnect cleanup
      if (!socketCallRooms.has(socket.id)) {
        socketCallRooms.set(socket.id, new Set());
      }
      socketCallRooms.get(socket.id).add(room);

      const getAvatarUrl = (u) => {
        if (!u) return null;
        if (typeof u.profileImage === "string" && u.profileImage.trim()) return u.profileImage;
        if (u.profileImage?.url && typeof u.profileImage.url === "string") return u.profileImage.url;
        if (typeof u.profilePicture === "string" && u.profilePicture.trim()) return u.profilePicture;
        if (u.profilePicture?.url && typeof u.profilePicture.url === "string") return u.profilePicture.url;
        return null;
      };

      // Fetch joining user's profile metadata
      let joinerProfile = {
        userName: socket.userName || payloadUserName || "User",
        name: socket.name || payloadName || "",
        profilePicture: socket.profilePicture || payloadProfilePicture || null,
      };

      if (socket.userId) {
        try {
          const u = await User.findById(socket.userId).select("userName name profileImage profilePicture").lean();
          if (u) {
            const avatar = getAvatarUrl(u) || payloadProfilePicture;
            joinerProfile = {
              userName: u.userName || socket.userName || payloadUserName || "User",
              name: u.name || socket.name || payloadName || "",
              profilePicture: avatar,
            };
            socket.userName = joinerProfile.userName;
            socket.name = joinerProfile.name;
            socket.profilePicture = avatar;
          }
        } catch (e) {}
      }

      // Get all existing sockets in this room (excluding the joiner and any sockets of the same user)
      const roomSockets = await io.in(room).fetchSockets();
      const existingMembers = await Promise.all(
        roomSockets
          .filter((s) => s.id !== socket.id && (!socket.userId || !s.userId || s.userId.toString() !== socket.userId.toString()))
          .map(async (s) => {
            let uData = {
              socketId: s.id,
              userId: s.userId,
              userName: s.userName || "Participant",
              name: s.name || "",
              profilePicture: s.profilePicture || null,
            };
            if (s.userId) {
              try {
                const u = await User.findById(s.userId).select("userName name profileImage profilePicture").lean();
                if (u) {
                  const avatar = getAvatarUrl(u) || s.profilePicture;
                  uData.userName = u.userName || s.userName;
                  uData.name = u.name || s.name;
                  uData.profilePicture = avatar;
                  s.userName = uData.userName;
                  s.name = uData.name;
                  s.profilePicture = avatar;
                }
              } catch (e) {}
            }
            return uData;
          })
      );

      // Send the joiner the list of existing members with metadata
      socket.emit("call:room-members", { room, members: existingMembers });

      // Broadcast to others in the room with full profile metadata
      socket.to(room).emit("call:peer-joined", {
        userId: socket.userId,
        socketId: socket.id,
        userName: joinerProfile.userName,
        name: joinerProfile.name,
        profilePicture: joinerProfile.profilePicture,
      });
    });

    socket.on("call:signal", async (data) => {
      const { toSocketId, toUserId, room, signal } = data || {};
      if (!room || !signal || !isSocketInCallRoom(socket, room)) return;

      const payload = {
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        fromMetadata: {
          userId: socket.userId,
          userName: socket.userName,
          name: socket.name,
          profilePicture: socket.profilePicture,
        },
        signal,
      };
      const roomSockets = await io.in(room).fetchSockets();
      if (toSocketId) {
        const target = roomSockets.find((candidate) => candidate.id === toSocketId);
        if (target) io.to(toSocketId).emit("call:signal-received", payload);
        return;
      }
      if (toUserId) {
        for (const target of roomSockets) {
          if (String(target.userId) === String(toUserId) && target.id !== socket.id) {
            io.to(target.id).emit("call:signal-received", payload);
          }
        }
        return;
      }
      socket.to(room).emit("call:signal-received", payload);
    });

    socket.on("call:heartbeat", (data) => {
      const { room } = data || {};
      if (!isSocketInCallRoom(socket, room)) return;
      socket.to(room).emit("call:heartbeat-received", {
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on("call:action", (data) => {
      const { room, ...actionPayload } = data || {};
      if (!isSocketInCallRoom(socket, room)) return;
      const allowedActions = ["mute", "video", "screen", "hand", "reaction"];
      if (actionPayload.action && !allowedActions.includes(actionPayload.action)) return;
      socket.to(room).emit("call:action-broadcast", {
        ...actionPayload,
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on("call:moderate", async (data) => {
      const { room, targetUserId, action } = data || {};
      if (!isSocketInCallRoom(socket, room) || !targetUserId) return;
      const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
      const moderator = session?.participants.find((p) => String(p.user) === String(socket.userId));
      const isHost = session && (
        String(session.initiator) === String(socket.userId) || moderator?.role === "host"
      );
      if (!isHost) {
        console.warn(`🛡️ Blocked call moderation by non-host ${socket.userId}`);
        return;
      }
      if (!session.participants.some((p) => String(p.user) === String(targetUserId))) return;
      if (!["mute-user", "kick-user", "mute-all"].includes(action)) return;
      io.to(room).emit("call:moderated", {
        moderatorId: socket.userId,
        targetUserId,
        action,
      });
    });

    socket.on("call:leave-room", async (data) => {
      const { room } = data || {};
      if (!isSocketInCallRoom(socket, room)) return;
      socket.leave(room);
      socketCallRooms.get(socket.id)?.delete(room);
      socket.to(room).emit("call:peer-left", {
        userId: socket.userId,
        socketId: socket.id,
      });
      if (socket.userId) await leaveCallSessionInDb(room, socket.userId);
    });

    const handleCallHangup = async (data) => {
      const { room, targetUserId } = data || {};
      if (!room || !socket.userId) return;

      try {
        const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
        if (!session) return;
        const participant = session.participants.find((p) => String(p.user) === String(socket.userId));
        if (!participant) {
          console.warn(`🛡️ Blocked hangup by non-participant ${socket.userId} for ${room}`);
          return;
        }

        const isHost = String(session.initiator) === String(socket.userId) || participant.role === "host";
        const isGroup = ["group", "channel"].includes(session.type) || session.participants.length > 2;
        const endForEveryone = !isGroup || isHost;
        cancelRoomTeardown(room);

        const invitedTarget = targetUserId && session.participants.some(
          (p) => String(p.user) === String(targetUserId)
        ) ? String(targetUserId) : null;

        if (endForEveryone) {
          session.status = "ended";
          session.endTime = new Date();
          session.participants.forEach((p) => {
            if (p.status === "joined" || p.status === "ringing") {
              p.status = "left";
              p.leftAt = new Date();
            }
          });
          await session.save();
          io.to(room).emit("call:ended", { room, endedBy: socket.userId });
          if (invitedTarget) {
            io.to(getUserRoom(invitedTarget)).emit("call:ended", { room, endedBy: socket.userId });
            io.to(getUserRoom(invitedTarget)).emit("call:response-received", {
              room, response: "cancelled", from: String(socket.userId),
            });
          }
          recordCallLogMessage(session).catch(() => null);
        } else {
          participant.status = "left";
          participant.leftAt = new Date();
          await session.save();
          socket.leave(room);
          socketCallRooms.get(socket.id)?.delete(room);
          socket.to(room).emit("call:peer-left", { room, userId: socket.userId, socketId: socket.id });
        }
      } catch (err) {
        console.error("[call:hangup] authorization/state update failed:", err);
      }
    };

    socket.on("call:hangup", handleCallHangup);

    // =====================================================
    // IN-CALL CHAT, ATTACHMENTS, PINNING & REACTIONS ENGINE
    // =====================================================
    socket.on("call:chat-message", (data) => {
      const { room, text, id, senderName, senderAvatar, replyTo, file, attachments } = data || {};
      if (!isSocketInCallRoom(socket, room)) return;
      if ((!text && !file && (!Array.isArray(attachments) || attachments.length === 0)) ||
          (typeof text === "string" && text.length > 5000) ||
          (Array.isArray(attachments) && attachments.length > 10)) return;

      socket.to(room).emit("call:chat-message-received", {
        id: id || Date.now().toString(),
        from: socket.userId,
        senderName: socket.userName || "Participant",
        senderAvatar: socket.profilePicture || null,
        text: typeof text === "string" ? text : "",
        file: file || null,
        attachments: Array.isArray(attachments) ? attachments : (file ? [file] : []),
        replyTo: replyTo || null,
        pinned: false,
        reactions: {},
        time: new Date().toISOString(),
      });
    });

    socket.on("call:chat-reaction", (data) => {
      const { room, messageId, emoji } = data || {};
      if (!isSocketInCallRoom(socket, room) || !messageId ||
          typeof emoji !== "string" || emoji.length > 12) return;

      io.to(room).emit("call:chat-reaction-received", {
        messageId,
        emoji,
        userId: socket.userId,
        senderName: socket.userName || "Participant",
      });
    });

    socket.on("call:pin-message", async (data) => {
      const { room, messageId, pinned } = data || {};
      if (!isSocketInCallRoom(socket, room) || !messageId) return;
      const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
      const participant = session?.participants.find((p) => String(p.user) === String(socket.userId));
      const isHost = session && (
        String(session.initiator) === String(socket.userId) || participant?.role === "host"
      );
      if (!isHost) return;
      io.to(room).emit("call:message-pinned", {
        messageId, pinned: Boolean(pinned), pinnedBy: socket.userId,
      });
    });

    socket.on("call:recording-status", async (data) => {
      const { room, isRecording } = data || {};
      if (!isSocketInCallRoom(socket, room)) return;
      const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
      const participant = session?.participants.find((p) => String(p.user) === String(socket.userId));
      const isHost = session && (
        String(session.initiator) === String(socket.userId) || participant?.role === "host"
      );
      if (!isHost) return;
      io.to(room).emit("call:recording-status-changed", {
        isRecording: Boolean(isRecording),
        startedBy: socket.userId,
        startedByName: socket.userName || "Participant",
      });
    });

    // In-Call Live Typing Indicator Event
    socket.on("call:typing", (data) => {
      const { room, isTyping } = data || {};
      if (!isSocketInCallRoom(socket, room)) return;
      socket.to(room).emit("call:user-typing", {
        room,
        userId: socket.userId,
        userName: socket.userName || "Participant",
        userAvatar: socket.profilePicture || null,
        isTyping: Boolean(isTyping),
      });
    });

    // =====================================================
    // CO-WATCHING WATCH PARTY EVENTS
    // =====================================================
    socket.on("call:watch-party-start", (data) => {
      const { room, videoUrl } = data || {};
      if (!isSocketInCallRoom(socket, room) || typeof videoUrl !== "string" || videoUrl.length > 2000) return;
      socket.to(room).emit("call:watch-party-started", { videoUrl, startedBy: socket.userId });
    });

    socket.on("call:watch-party-stop", (data) => {
      const { room } = data || {};
      if (!isSocketInCallRoom(socket, room)) return;
      socket.to(room).emit("call:watch-party-stopped", { stoppedBy: socket.userId });
    });

    socket.on("call:watch-party-sync", (data) => {
      const { room, action, currentTime, playing } = data || {};
      if (!isSocketInCallRoom(socket, room) || !["play", "pause", "seek"].includes(action)) return;
      if (typeof currentTime !== "number" || !Number.isFinite(currentTime) || currentTime < 0) return;
      socket.to(room).emit("call:watch-party-synced", {
        action, currentTime, playing: Boolean(playing), senderId: socket.userId,
      });
    });

    // In-Call Reaction Emojis
    socket.on("call:reaction", (data) => {
      const { room, emoji } = data || {};
      if (!isSocketInCallRoom(socket, room) || typeof emoji !== "string" || emoji.length > 12) return;
      io.to(room).emit("call:reaction-received", { emoji, senderId: socket.userId });
    });

    // Explicit Call End Event
    // Explicit Call End Event; shares the same participant/host policy as hangup.
    socket.on("call:end", handleCallHangup);

    // =====================================================
    // VYBE MEET REAL-TIME CONFERENCING ENGINE
    // =====================================================
    socket.on("meeting:join-room", async (data) => {
      try {
        const { meetingId, userName: payloadUserName, name: payloadName, profilePicture: payloadAvatar } = data || {};
        if (!meetingId) return;

        if (typeof meetingId !== "string" || !socket.userId) {
          socket.emit("meeting:error", { message: "A valid meeting ID and authenticated account are required" });
          return;
        }
        const normalizedMeetingId = meetingId.trim().toLowerCase();
        if (!normalizedMeetingId || normalizedMeetingId.length > 120) return;
        const roomName = `meeting_${normalizedMeetingId}`;

        // Only an existing, non-ended meeting can be joined; honor locks and kicked participants.
        const access = await getMeetingAccess(normalizedMeetingId, socket.userId);
        if (!access) {
          socket.emit("meeting:error", { message: "Meeting not found or access denied" });
          return;
        }
        const { meeting, participant, isHost, isCoHost } = access;
        if (participant?.status === "kicked") {
          socket.emit("meeting:error", { message: "You have been removed from this meeting" });
          return;
        }
        if (meeting.settings?.isLocked && !isHost && !isCoHost && !participant) {
          socket.emit("meeting:error", { message: "This meeting is locked" });
          return;
        }
        if (participant) {
          participant.status = "joined";
          participant.leftAt = null;
          participant.joinedAt = new Date();
          if (isHost) participant.role = "host";
        } else {
          meeting.participants.push({
            user: socket.userId,
            role: "participant",
            status: "joined",
            joinedAt: new Date(),
            leftAt: null,
          });
        }
        if (meeting.status === "waiting") meeting.status = "active";
        await meeting.save();

        socket.join(roomName);

        if (!socketMeetingRooms.has(socket.id)) {
          socketMeetingRooms.set(socket.id, new Set());
        }
        socketMeetingRooms.get(socket.id).add(normalizedMeetingId);

        let userProfile = {
          userId: socket.userId || null,
          userName: socket.userName || payloadUserName || "Participant",
          name: socket.name || payloadName || "",
          profilePicture: socket.profilePicture || payloadAvatar || null,
          isVerified: false,
        };

        if (socket.userId) {
          try {
            const u = await User.findById(socket.userId).select("userName name profileImage isVerified").lean();
            if (u) {
              userProfile.userName = u.userName || userProfile.userName;
              userProfile.name = u.name || userProfile.name;
              userProfile.profilePicture = u.profileImage?.url || (typeof u.profileImage === "string" ? u.profileImage : userProfile.profilePicture);
              userProfile.isVerified = u.isVerified || false;
              socket.userName = userProfile.userName;
              socket.name = userProfile.name;
              socket.profilePicture = userProfile.profilePicture;
            }
          } catch (e) {}
        }

        // Fetch existing members in meeting room (excluding self sockets)
        const roomSockets = await io.in(roomName).fetchSockets();
        const existingMembers = await Promise.all(
          roomSockets
            .filter((s) => s.id !== socket.id && (!socket.userId || !s.userId || s.userId.toString() !== socket.userId.toString()))
            .map(async (s) => {
              let mData = {
                socketId: s.id,
                userId: s.userId || null,
                userName: s.userName || "Participant",
                name: s.name || "",
                profilePicture: s.profilePicture || null,
                isVerified: false,
              };
              if (s.userId) {
                try {
                  const u = await User.findById(s.userId).select("userName name profileImage isVerified").lean();
                  if (u) {
                    mData.userName = u.userName || mData.userName;
                    mData.name = u.name || mData.name;
                    mData.profilePicture = u.profileImage?.url || (typeof u.profileImage === "string" ? u.profileImage : mData.profilePicture);
                    mData.isVerified = u.isVerified || false;
                    s.userName = mData.userName;
                    s.name = mData.name;
                    s.profilePicture = mData.profilePicture;
                  }
                } catch (e) {}
              }
              return mData;
            })
        );

        // Send existing members list to joiner
        socket.emit("meeting:room-members", {
          meetingId: normalizedMeetingId,
          members: existingMembers,
        });

        // Broadcast to existing attendees that a new participant joined
        socket.to(roomName).emit("meeting:peer-joined", {
          socketId: socket.id,
          userId: socket.userId,
          userName: userProfile.userName,
          name: userProfile.name,
          profilePicture: userProfile.profilePicture,
          isVerified: userProfile.isVerified,
        });

        console.log(`📹 [Vybe Meet] User @${userProfile.userName} joined meeting "${normalizedMeetingId}"`);
      } catch (err) {
        console.error("[meeting:join-room] error:", err);
      }
    });

    socket.on("meeting:signal", async (data) => {
      const { toSocketId, toUserId, meetingId, signal } = data || {};
      if (!meetingId || !signal || !isSocketInMeeting(socket, meetingId)) return;

      const payload = {
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        fromMetadata: {
          userId: socket.userId,
          userName: socket.userName,
          name: socket.name,
          profilePicture: socket.profilePicture,
        },
        signal,
      };
      const roomName = `meeting_${String(meetingId).trim().toLowerCase()}`;
      const roomSockets = await io.in(roomName).fetchSockets();

      if (toSocketId) {
        const target = roomSockets.find((candidate) => candidate.id === toSocketId);
        if (target) io.to(toSocketId).emit("meeting:signal-received", payload);
        return;
      }
      if (toUserId) {
        for (const target of roomSockets) {
          if (String(target.userId) === String(toUserId) && target.id !== socket.id) {
            io.to(target.id).emit("meeting:signal-received", payload);
          }
        }
        return;
      }
      socket.to(roomName).emit("meeting:signal-received", payload);
    });

    socket.on("meeting:action", (data) => {
      const { meetingId, ...actionPayload } = data || {};
      if (!meetingId || !isSocketInMeeting(socket, meetingId)) return;
      const allowedActions = ["mute", "video", "screen", "hand", "raise-hand", "lower-hand", "reaction"];
      if (actionPayload.action && !allowedActions.includes(actionPayload.action)) return;
      socket.to(`meeting_${String(meetingId).trim().toLowerCase()}`).emit("meeting:action-broadcast", {
        ...actionPayload,
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on("meeting:caption", (data) => {
      const { meetingId, text, isFinal, id, language } = data || {};
      if (!meetingId || typeof text !== "string" || !text.trim() || text.length > 2000 ||
          !isSocketInMeeting(socket, meetingId)) return;
      const roomName = `meeting_${String(meetingId).trim().toLowerCase()}`;
      socket.to(roomName).emit("meeting:caption-received", {
        id: id || `caption_${socket.id}_${Date.now()}`,
        speakerId: socket.userId,
        speakerName: socket.userName || "Participant",
        speakerAvatar: socket.profilePicture || null,
        text: text.trim(),
        isFinal: Boolean(isFinal),
        language: typeof language === "string" ? language.slice(0, 24) : "en-US",
        timestamp: Date.now(),
      });
    });

    socket.on("meeting:chat-message", (data) => {
      const { meetingId, text, id, replyTo, file, attachments } = data || {};
      if (!meetingId || !isSocketInMeeting(socket, meetingId)) return;
      if ((!text && !file && (!Array.isArray(attachments) || attachments.length === 0)) ||
          (typeof text === "string" && text.length > 5000) ||
          (Array.isArray(attachments) && attachments.length > 10)) return;

      const roomName = `meeting_${String(meetingId).trim().toLowerCase()}`;
      socket.to(roomName).emit("meeting:chat-message-received", {
        id: id || Date.now().toString(),
        from: socket.userId,
        senderName: socket.userName || "Participant",
        senderAvatar: socket.profilePicture || null,
        text: typeof text === "string" ? text : "",
        file: file || null,
        attachments: Array.isArray(attachments) ? attachments : (file ? [file] : []),
        replyTo: replyTo || null,
        pinned: false,
        reactions: {},
        time: new Date().toISOString(),
      });
    });

    socket.on("meeting:chat-reaction", async (data) => {
      const { meetingId, messageId, emoji } = data || {};
      if (!meetingId || !messageId || typeof emoji !== "string" || emoji.length > 12 ||
          !isSocketInMeeting(socket, meetingId)) return;
      const roomName = `meeting_${String(meetingId).trim().toLowerCase()}`;
      io.to(roomName).emit("meeting:chat-reaction-received", {
        messageId,
        emoji,
        userId: socket.userId,
        senderName: socket.userName || "Participant",
      });
    });

    socket.on("meeting:pin-message", async (data) => {
      const { meetingId, messageId, pinned } = data || {};
      if (!meetingId || !messageId || !isSocketInMeeting(socket, meetingId)) return;
      const access = await getMeetingAccess(meetingId, socket.userId);
      if (!access || (!access.isHost && !access.isCoHost)) return;
      io.to(`meeting_${String(meetingId).trim().toLowerCase()}`).emit("meeting:message-pinned", {
        messageId,
        pinned: Boolean(pinned),
        pinnedBy: socket.userId,
      });
    });

    socket.on("meeting:reaction", (data) => {
      const { meetingId, emoji, leftPercent, driftX } = data || {};
      if (!meetingId || typeof emoji !== "string" || emoji.length > 12 ||
          !isSocketInMeeting(socket, meetingId)) return;
      socket.to(`meeting_${String(meetingId).trim().toLowerCase()}`).emit("meeting:reaction-received", {
        emoji,
        leftPercent: Number.isFinite(leftPercent) ? Math.max(0, Math.min(100, leftPercent)) : 50,
        driftX: Number.isFinite(driftX) ? Math.max(-100, Math.min(100, driftX)) : 0,
        senderId: socket.userId,
        senderName: socket.userName || "Participant",
      });
    });

    socket.on("meeting:recording-status", async (data) => {
      const { meetingId, isRecording } = data || {};
      if (!meetingId || !isSocketInMeeting(socket, meetingId)) return;
      const access = await getMeetingAccess(meetingId, socket.userId);
      if (!access || (!access.isHost && !access.isCoHost)) return;
      io.to(`meeting_${String(meetingId).trim().toLowerCase()}`).emit("meeting:recording-status-changed", {
        isRecording: Boolean(isRecording),
        startedBy: socket.userId,
        startedByName: socket.userName || "Participant",
      });
    });

    socket.on("meeting:host-control", async (data) => {
      const { meetingId, targetUserId, targetSocketId, action } = data || {};
      if (!meetingId || !action || !isSocketInMeeting(socket, meetingId)) return;
      const normalizedId = String(meetingId).trim().toLowerCase();
      const access = await getMeetingAccess(normalizedId, socket.userId);
      if (!access || (!access.isHost && !access.isCoHost)) {
        console.warn(`🛡️ Blocked unauthorized meeting host action ${action} by ${socket.userId}`);
        return;
      }
      const roomName = `meeting_${normalizedId}`;
      if (action === "end-meeting") {
        if (!access.isHost) return;
        await Meeting.findOneAndUpdate(
          { meetingId: normalizedId, host: socket.userId, status: { $ne: "ended" } },
          { status: "ended", endTime: new Date() }
        );
        io.to(roomName).emit("meeting:ended", { meetingId: normalizedId, endedBy: socket.userId });
      } else {
        io.to(roomName).emit("meeting:host-action-received", {
          moderatorId: socket.userId,
          targetUserId,
          targetSocketId,
          action,
        });
      }
    });

    socket.on("meeting:leave-room", async (data) => {
      const { meetingId } = data || {};
      if (!meetingId || !isSocketInMeeting(socket, meetingId)) return;
      const normalizedId = String(meetingId).trim().toLowerCase();
      const roomName = `meeting_${normalizedId}`;
      socket.leave(roomName);
      socketMeetingRooms.get(socket.id)?.delete(normalizedId);
      socket.to(roomName).emit("meeting:peer-left", {
        userId: socket.userId,
        socketId: socket.id,
      });
      if (socket.userId) {
        try {
          await Meeting.findOneAndUpdate(
            { meetingId: normalizedId, "participants.user": socket.userId },
            { $set: { "participants.$.leftAt": new Date(), "participants.$.status": "left" } }
          );
        } catch (err) {
          console.error("meeting:leave-room error:", err);
        }
      }
    });

    // =====================================================
    // REAL-TIME BREAKOUT ROOMS (GOOGLE MEET PARITY)
    // =====================================================
    socket.on("meeting:breakout-start", async (data) => {
      try {
        const { meetingId, rooms, durationMinutes } = data || {};
        if (!meetingId || !rooms || !Array.isArray(rooms)) return;
        const normalizedId = meetingId.toLowerCase();

        // Verify host authorization server-side
        const meeting = await Meeting.findOne({ meetingId: normalizedId }).select("host").lean();
        const isHost = meeting && socket.userId && meeting.host.toString() === socket.userId.toString();
        if (!isHost) {
          console.warn(`🛡️ Blocked unauthorized breakout-start by socket ${socket.id} (user: ${socket.userId})`);
          return;
        }

        const duration = Number(durationMinutes) || 10;
        const timerExpiresAt = Date.now() + duration * 60 * 1000;

        const session = {
          meetingId: normalizedId,
          hostUserId: socket.userId,
          status: "active",
          startedAt: Date.now(),
          durationMinutes: duration,
          timerExpiresAt,
          rooms: rooms.map((r, idx) => ({
            id: r.id || `room-${idx + 1}`,
            name: r.name || `Breakout Room ${idx + 1}`,
            participants: Array.isArray(r.participants) ? r.participants : [],
          })),
        };

        meetingBreakoutSessions.set(normalizedId, session);

        // Broadcast breakout launch to all participants in main meeting room
        io.to(`meeting_${normalizedId}`).emit("meeting:breakout-started", {
          meetingId: normalizedId,
          session,
          timerExpiresAt,
        });

        console.log(`🚪 [Vybe Meet] Host started ${rooms.length} breakout rooms in "${normalizedId}" (${duration} mins)`);
      } catch (err) {
        console.error("meeting:breakout-start error:", err);
      }
    });

    socket.on("meeting:breakout-join-room", async (data) => {
      try {
        const { meetingId, roomId } = data || {};
        if (!meetingId || !roomId) return;
        const normalizedId = meetingId.toLowerCase();
        const breakoutRoomName = `meeting_${normalizedId}_breakout_${roomId}`;

        // Join breakout sub-room
        socket.join(breakoutRoomName);

        // Fetch other members in this breakout room
        const roomSockets = await io.in(breakoutRoomName).fetchSockets();
        const members = roomSockets
          .filter((s) => s.id !== socket.id)
          .map((s) => ({
            socketId: s.id,
            userId: s.userId || null,
            userName: s.userName || "Participant",
            name: s.name || "",
            profilePicture: s.profilePicture || null,
          }));

        socket.emit("meeting:breakout-room-members", {
          meetingId: normalizedId,
          roomId,
          members,
        });

        // Notify existing members in this breakout room
        socket.to(breakoutRoomName).emit("meeting:breakout-peer-joined", {
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName || "Participant",
          name: socket.name || "",
          profilePicture: socket.profilePicture || null,
        });

        console.log(`🚪 [Vybe Meet] @${socket.userName || socket.id} entered breakout sub-room "${breakoutRoomName}"`);
      } catch (err) {
        console.error("meeting:breakout-join-room error:", err);
      }
    });

    socket.on("meeting:breakout-leave-room", (data) => {
      const { meetingId, roomId } = data || {};
      if (!meetingId || !roomId) return;
      const normalizedId = meetingId.toLowerCase();
      const breakoutRoomName = `meeting_${normalizedId}_breakout_${roomId}`;

      socket.leave(breakoutRoomName);
      socket.to(breakoutRoomName).emit("meeting:breakout-peer-left", {
        socketId: socket.id,
        userId: socket.userId,
      });
    });

    socket.on("meeting:breakout-broadcast", async (data) => {
      try {
        const { meetingId, message } = data || {};
        if (!meetingId || !message) return;
        const normalizedId = meetingId.toLowerCase();

        // Broadcast to main room and all breakout participants
        io.to(`meeting_${normalizedId}`).emit("meeting:breakout-broadcast-received", {
          message: typeof message === "string" ? message.trim() : "",
          senderName: socket.userName || "Meeting Host",
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("meeting:breakout-broadcast error:", err);
      }
    });

    socket.on("meeting:breakout-move-user", (data) => {
      const { meetingId, targetSocketId, targetUserId, newRoomId, newRoomName } = data || {};
      if (!meetingId || !newRoomId) return;
      const normalizedId = meetingId.toLowerCase();

      const target = targetSocketId || (targetUserId ? Array.from(activeUsers.get(targetUserId.toString()) || [])[0] : null);
      if (target) {
        io.to(target).emit("meeting:breakout-reassigned", {
          meetingId: normalizedId,
          newRoomId,
          newRoomName: newRoomName || `Room ${newRoomId}`,
        });
      }
    });

    socket.on("meeting:breakout-end", async (data) => {
      try {
        const { meetingId } = data || {};
        if (!meetingId) return;
        const normalizedId = meetingId.toLowerCase();

        meetingBreakoutSessions.delete(normalizedId);

        // Notify all sockets across all breakout subrooms to return to main meeting
        io.to(`meeting_${normalizedId}`).emit("meeting:breakout-ended", {
          meetingId: normalizedId,
        });

        console.log(`🚪 [Vybe Meet] Breakout session closed in "${normalizedId}". All users returning to main meeting.`);
      } catch (err) {
        console.error("meeting:breakout-end error:", err);
      }
    });

    // =====================================================
    // COMMUNITY CHANNELS REAL-TIME MESSAGING & PRESENCE
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
        socket.join(`community_${community._id}`);
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

    socket.on("community:typing", (data) => {
      const { channelId, userName } = data;
      socket.to(`channel_${channelId}`).emit("community:user-typing", {
        channelId,
        userId: socket.userId,
        userName,
      });
    });

    socket.on("community:stop-typing", (data) => {
      const { channelId } = data;
      socket.to(`channel_${channelId}`).emit("community:user-stop-typing", {
        channelId,
        userId: socket.userId,
      });
    });

    socket.on("community:message-reaction", (data) => {
      const { channelId, message } = data;
      socket.to(`channel_${channelId}`).emit("community:reaction-updated", {
        channelId,
        message,
      });
    });

    socket.on("community:message-deleted", (data) => {
      const { channelId, messageId } = data;
      socket.to(`channel_${channelId}`).emit("community:message-deleted", {
        channelId,
        messageId,
      });
    });

    socket.on("community:message-edited", (data) => {
      const { channelId, message } = data;
      socket.to(`channel_${channelId}`).emit("community:message-edited", {
        channelId,
        message,
      });
    });

    socket.on("community:message-pinned", (data) => {
      const { channelId, message, isPinned } = data;
      socket.to(`channel_${channelId}`).emit("community:message-pinned", {
        channelId,
        message,
        isPinned,
      });
    });

    socket.on("community:voice-presence-join", (data) => {
      const { communityId, channelId, user } = data;
      io.to(`community_${communityId}`).emit("community:voice-presence-updated", {
        communityId,
        channelId,
        user,
        action: "join",
      });
    });

    socket.on("community:voice-presence-leave", (data) => {
      const { communityId, channelId, userId } = data;
      io.to(`community_${communityId}`).emit("community:voice-presence-updated", {
        communityId,
        channelId,
        userId,
        action: "leave",
      });
    });


    // =====================================================
    // REEL REALTIME EVENTS
    // =====================================================
    socket.on("reel-like-toggle", (data) => {
      const { reelId, userId, isLiked, likesCount } = data;
      io.emit("reel-like-updated", { reelId, userId, isLiked, likesCount });
    });

    socket.on("reel-comment-send", (data) => {
      const { reelId, comment } = data;
      io.emit("reel-comment-updated", { reelId, comment });
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

              if (disconnectedUserId) {
                leaveCallSessionInDb(room, disconnectedUserId);
              }
            } catch (err) {
              console.error("[disconnect call cleanup] error:", err);
            }
          }, 10000);
        }
        socketCallRooms.delete(socket.id);
      }

      // Notify all meeting rooms this socket was in and update meeting in DB
      const meetingRooms = socketMeetingRooms.get(socket.id);
      if (meetingRooms) {
        for (const meetingId of meetingRooms) {
          const roomName = `meeting_${meetingId}`;
          socket.to(roomName).emit("meeting:peer-left", {
            userId: socket.userId,
            socketId: socket.id,
          });

          if (socket.userId) {
            Meeting.findOneAndUpdate(
              { meetingId, "participants.user": socket.userId },
              { $set: { "participants.$.status": "left", "participants.$.leftAt": new Date() } }
            ).catch(() => null);
          }
        }
        socketMeetingRooms.delete(socket.id);
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
export const getSocket = () => ioInstance || global.io;
export const getIO = () => ioInstance || global.io;
export { ioInstance as io };

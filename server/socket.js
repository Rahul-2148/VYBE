// socket.js - Socket.IO Event Handlers for Real-time Communication & WebRTC Signaling
import { Server } from "socket.io";
import { User } from "./models/user.model.js";
import { Session } from "./models/session.model.js";
import { Conversation } from "./models/conversation.model.js";
import { parseCookie } from "cookie";
import * as cookie from "cookie";
import jwt from "jsonwebtoken";
import { Channel } from "./models/channel.model.js";
import { Community } from "./models/community.model.js";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { CallSession } from "./models/callSession.model.js";
import { Meeting } from "./models/meeting.model.js";
import { LiveStream } from "./models/liveStream.model.js";
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
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin) ||
          (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) ||
          (process.env.SOCKET_CORS_ORIGINS && process.env.SOCKET_CORS_ORIGINS.includes(origin))
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Dev-friendly fallback
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
        try {
          const session = await Session.findById(decoded.sessionId);
          if (session && session.isRevoked) {
            return next(new Error("Session has been revoked or expired"));
          }
        } catch (dbErr) {
          console.warn("[socket auth] Session check DB notice (non-fatal):", dbErr.message);
        }
      }

      socket.userId = decoded.userId;
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
      const targetUid = (rawId?._id || rawId?.id || rawId)?.toString();
      if (targetUid) {
        const isAlreadyBound = socket.userId === targetUid && activeUsers.get(targetUid)?.has(socket.id);
        if (!isAlreadyBound) {
          if (socket.userId && socket.userId !== targetUid) {
            removeUserSocket(socket.userId, socket.id);
            socket.leave(getUserRoom(socket.userId));
          }
          socket.userId = targetUid;
          addUserSocket(targetUid, socket.id);
          socket.join(getUserRoom(targetUid));
          console.log(`🔗 Explicit user registration: Socket ${socket.id} bound to User ${targetUid} (Total sockets: ${getUserSocketCount(targetUid)})`);

          persistPresence(targetUid, true).catch(() => null);
          broadcastPresenceToContacts(io, targetUid, true);
        }

        const onlineContacts = await getOnlineContactsForUser(targetUid);
        socket.emit("online-users-list", { onlineUsers: onlineContacts });
      }
    });

    // Client requests current online contacts list
    socket.on("get-online-users", async () => {
      if (!socket.userId) return;
      const onlineContacts = await getOnlineContactsForUser(socket.userId);
      socket.emit("online-users-list", { onlineUsers: onlineContacts });
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
        const { conversationId, theme, systemMessage } = data;
        if (!conversationId) return;

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
        const { streamId, title } = data;
        if (!streamId) return;

        socket.join(`live_${streamId}`);

        // Broadcast to followers that creator went LIVE
        if (socket.userId) {
          const hostUser = await User.findById(socket.userId).select("userName name profileImage followers");
          if (hostUser && hostUser.followers?.length > 0) {
            hostUser.followers.forEach((fId) => {
              const fIdStr = fId.toString();
              if (getUserSocketCount(fIdStr) > 0) {
                io.to(getUserRoom(fIdStr)).emit("live:creator-started", {
                  streamId,
                  title: title || "Live Video",
                  host: {
                    _id: hostUser._id,
                    userName: hostUser.userName,
                    name: hostUser.name,
                    profileImage: hostUser.profileImage,
                  },
                });
              }
            });
          }
        }
      } catch (err) {
        console.error("start-live-stream error:", err);
      }
    });

    socket.on("join-live-stream", async (data) => {
      try {
        const { streamId } = data;
        if (!streamId) return;

        socket.join(`live_${streamId}`);

        let viewerInfo = {
          socketId: socket.id,
          userId: socket.userId || null,
          userName: socket.userName || "Viewer",
          userAvatar: socket.profilePicture || "",
        };

        if (socket.userId) {
          const u = await User.findById(socket.userId).select("userName name profileImage isVerified").lean();
          if (u) {
            viewerInfo.userName = u.userName || u.name || viewerInfo.userName;
            viewerInfo.userAvatar = u.profileImage?.url || u.profilePicture || "";
          }
        }

        // Update LiveStream in DB
        let currentViewerCount = 1;
        try {
          const live = await LiveStream.findById(streamId);
          if (live && live.isLive) {
            if (socket.userId && !live.viewers.some((v) => v.toString() === socket.userId.toString())) {
              live.viewers.push(socket.userId);
            }
            if (live.viewers.length > live.peakViewers) {
              live.peakViewers = live.viewers.length;
            }
            live.totalUniqueViewers = Math.max(live.totalUniqueViewers || 1, live.viewers.length);
            await live.save();
            currentViewerCount = live.viewers.length;
          }
        } catch (e) {}

        viewerInfo.viewerCount = currentViewerCount;

        // Notify room that new viewer joined
        socket.to(`live_${streamId}`).emit("live-viewer-joined", viewerInfo);
        io.to(`live_${streamId}`).emit("live:viewer-count-updated", {
          streamId,
          viewerCount: currentViewerCount,
        });
      } catch (err) {
        console.error("join-live-stream error:", err);
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
    socket.on("live:signal", (data) => {
      const { toSocketId, signal } = data;
      if (!toSocketId || !signal) return;
      io.to(toSocketId).emit("live:signal-received", {
        fromSocketId: socket.id,
        signal,
      });
    });

    // Live Comments
    socket.on("send-live-comment", async (data) => {
      try {
        const { streamId, comment } = data;
        if (!streamId || !comment) return;

        let commentPayload = {
          _id: new Date().getTime().toString(),
          user: socket.userId,
          userName: socket.userName || comment.user || "Viewer",
          userAvatar: socket.profilePicture || comment.userAvatar || "",
          text: comment.text,
          createdAt: new Date(),
        };

        if (socket.userId) {
          const u = await User.findById(socket.userId).select("userName name profileImage isVerified").lean();
          if (u) {
            commentPayload.userName = u.userName || u.name;
            commentPayload.userAvatar = u.profileImage?.url || u.profilePicture || "";
            commentPayload.isVerified = u.isVerified;
          }
        }

        // Persist comment in database asynchronously
        LiveStream.findByIdAndUpdate(streamId, {
          $push: { comments: commentPayload },
          $inc: { "stats.totalComments": 1 },
        }).catch(() => null);

        io.to(`live_${streamId}`).emit("live-comment-received", {
          streamId,
          comment: commentPayload,
        });
      } catch (err) {
        console.error("send-live-comment error:", err);
      }
    });

    // Live Heart Burst Reactions
    socket.on("send-live-heart", (data) => {
      try {
        const { streamId, reactionType = "heart", count = 1 } = data;
        if (!streamId) return;

        // Increment stats asynchronously
        LiveStream.findByIdAndUpdate(streamId, {
          $inc: { "stats.totalHearts": count },
        }).catch(() => null);

        socket.to(`live_${streamId}`).emit("live-heart-received", {
          streamId,
          fromUserId: socket.userId,
          reactionType,
          count,
        });
      } catch (err) {
        console.error("send-live-heart error:", err);
      }
    });

    // Live Pinned Comments
    socket.on("live:pin-comment", async (data) => {
      try {
        const { streamId, comment } = data;
        if (!streamId) return;
        io.to(`live_${streamId}`).emit("live:pinned-comment-updated", {
          streamId,
          pinnedComment: comment,
        });
      } catch (err) {}
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

    socket.on("live:display-question", (data) => {
      const { streamId, question } = data;
      if (!streamId) return;
      io.to(`live_${streamId}`).emit("live:question-displayed", {
        streamId,
        question, // null to hide, or question object to display
      });
    });

    // Co-Host Dual Screen Live Signaling
    socket.on("live:cohost-request", (data) => {
      const { streamId, hostSocketId } = data;
      if (!hostSocketId) return;
      io.to(hostSocketId).emit("live:cohost-request-received", {
        streamId,
        guestSocketId: socket.id,
        guestUserId: socket.userId,
        guestUserName: socket.userName,
        guestAvatar: socket.profilePicture,
      });
    });

    socket.on("live:cohost-accept", (data) => {
      const { streamId, guestSocketId, guestUser } = data;
      if (!guestSocketId) return;

      io.to(guestSocketId).emit("live:cohost-accepted", {
        streamId,
        hostSocketId: socket.id,
      });

      io.to(`live_${streamId}`).emit("live:cohost-joined", {
        streamId,
        coHost: guestUser,
      });
    });

    socket.on("live:cohost-leave", (data) => {
      const { streamId } = data;
      if (!streamId) return;
      io.to(`live_${streamId}`).emit("live:cohost-ended", { streamId });
    });

    // Host Friendly Wave
    socket.on("live:wave", (data) => {
      const { targetSocketId, targetUserName } = data;
      if (!targetSocketId) return;
      io.to(targetSocketId).emit("live:wave-received", {
        fromUserName: socket.userName || "Host",
      });
    });

    // End Live Stream Broadcast
    socket.on("end-live-stream", async (data) => {
      try {
        const { streamId, stats } = data;
        if (!streamId) return;

        io.to(`live_${streamId}`).emit("live-stream-ended", {
          streamId,
          stats: stats || {},
        });

        // Broadcast to all that creator has ended live
        if (socket.userId) {
          io.emit("live:creator-ended", {
            streamId,
            hostId: socket.userId,
          });
        }
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
      const { room, userToCall, targetUserId: explicitTargetId, type, callerName, callerAvatar, conversationId } = data;
      const targetUserId = (explicitTargetId || userToCall?._id || userToCall?.id || userToCall?.user?._id || userToCall)?.toString();
      if (!targetUserId) {
        console.warn(`[call:invite] Missing targetUserId from caller ${socket.userId}`);
        return;
      }
      const recipientRoom = getUserRoom(targetUserId);

      console.log(`📞 [call:invite] User ${socket.userId} calling ${targetUserId} in room ${room} (recipient sockets: ${getUserSocketCount(targetUserId)})`);

      let resolvedAvatar = callerAvatar || socket.profilePicture || "";
      let resolvedCallerName = callerName || socket.userName || "User";

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
        from: (socket.userId || "").toString(),
        callerName: resolvedCallerName,
        callerAvatar: resolvedAvatar,
        type: type || "video",
        conversationId,
      };

      // 1. Emit invite to recipient room, excluding caller's socket
      socket.to(recipientRoom).emit("call:invite-received", invitePayload);

      // 2. Also emit directly to every active socket of recipient, excluding caller's socket
      const recipientSockets = activeUsers.get(targetUserId);
      if (recipientSockets && recipientSockets.size > 0) {
        for (const sockId of recipientSockets) {
          if (sockId !== socket.id) {
            io.to(sockId).emit("call:invite-received", invitePayload);
          }
        }
      }

      const isOnline = getUserSocketCount(targetUserId) > 0;
      socket.emit("call:status", { room, status: isOnline ? "ringing" : "calling" });
    });

    socket.on("call:respond", async (data) => {
      const { room, response, to, targetUserId: explicitTargetId } = data; // response: "joined", "declined", "busy", "accepted", "cancelled"
      const targetUserId = (explicitTargetId || to?._id || to?.id || to?.user?._id || to)?.toString();
      if (!targetUserId) return;

      console.log(`📞 [call:respond] User ${socket.userId} responded ${response} to ${targetUserId} in room ${room}`);

      const responsePayload = {
        room,
        response,
        from: (socket.userId || "").toString(),
      };

      socket.to(getUserRoom(targetUserId)).emit("call:response-received", responsePayload);

      const targetSockets = activeUsers.get(targetUserId);
      if (targetSockets && targetSockets.size > 0) {
        for (const sockId of targetSockets) {
          if (sockId !== socket.id) {
            io.to(sockId).emit("call:response-received", responsePayload);
          }
        }
      }
    });

    // In-call invitation ("Add People" to live call)
    socket.on("call:invite-user", async (data) => {
      const { room, targetUserId: rawTargetId, type, conversationId } = data || {};
      const targetUserId = (rawTargetId?._id || rawTargetId?.id || rawTargetId)?.toString();
      if (!room || !targetUserId) return;

      console.log(`📞 [call:invite-user] User ${socket.userId} inviting ${targetUserId} to live call room ${room}`);

      let callerName = socket.name || socket.userName || "Vybe User";
      let callerAvatar = socket.profilePicture || null;
      if (socket.userId) {
        try {
          const u = await User.findById(socket.userId).select("name userName profileImage").lean();
          if (u) {
            callerName = u.name || u.userName || callerName;
            callerAvatar = u.profileImage?.url || (typeof u.profileImage === "string" ? u.profileImage : callerAvatar);
          }
        } catch (e) {}
      }

      const invitePayload = {
        room,
        from: (socket.userId || "").toString(),
        callerName,
        callerAvatar,
        type: type || "video",
        conversationId,
        isGroupInvite: true,
      };

      // 1. Emit to recipient personal room
      socket.to(getUserRoom(targetUserId)).emit("call:invite-received", invitePayload);

      // 2. Emit to all active socket connections of recipient
      const recipientSockets = activeUsers.get(targetUserId);
      if (recipientSockets) {
        for (const sockId of recipientSockets) {
          if (sockId !== socket.id) {
            io.to(sockId).emit("call:invite-received", invitePayload);
          }
        }
      }
    });

    // Floating reaction emojis broadcast (WhatsApp / Instagram Live call reactions)
    socket.on("call:send-reaction", (data) => {
      const { room, emoji, userName, userId } = data || {};
      if (!room || !emoji) return;

      io.to(room).emit("call:reaction-received", {
        emoji,
        userName: userName || socket.userName || "User",
        userId: userId || socket.userId,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      });
    });

    socket.on("call:join-room", async (data) => {
      const { room, userId: payloadUserId, userName: payloadUserName, name: payloadName, profilePicture: payloadProfilePicture } = data || {};
      if (!room) return;

      cancelRoomTeardown(room);

      if (payloadUserId && !socket.userId) socket.userId = payloadUserId;
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

      // Get all existing sockets in this room (excluding the joiner)
      const roomSockets = await io.in(room).fetchSockets();
      const existingMembers = await Promise.all(
        roomSockets
          .filter((s) => s.id !== socket.id)
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

    socket.on("call:signal", (data) => {
      const { toSocketId, signal, fromMetadata } = data;
      io.to(toSocketId).emit("call:signal-received", {
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        fromMetadata: fromMetadata || {
          userId: socket.userId,
          userName: socket.userName,
          name: socket.name,
          profilePicture: socket.profilePicture,
        },
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
      const { room, ...actionPayload } = data; // action: 'mute', 'video', 'screen', 'hand', 'reaction', streamId, hasAudio
      socket.to(room).emit("call:action-broadcast", {
        userId: socket.userId,
        socketId: socket.id,
        ...actionPayload,
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

      // Sync state to DB with grace period
      if (socket.userId) {
        leaveCallSessionInDb(room, socket.userId);
      }
    });

    socket.on("call:hangup", async (data) => {
      const { room, targetUserId } = data;
      if (!room) return;

      console.log(`📴 [call:hangup] User ${socket.userId} explicitly hung up call room ${room}`);
      cancelRoomTeardown(room);

      // 1. Notify everyone in the room that call is ended
      io.to(room).emit("call:ended", { room, endedBy: socket.userId });

      // 2. Also notify target user's personal room in case they were ringing
      if (targetUserId) {
        io.to(getUserRoom(targetUserId.toString())).emit("call:ended", { room, endedBy: socket.userId });
        socket.to(getUserRoom(targetUserId.toString())).emit("call:response-received", {
          room,
          response: "cancelled",
          from: (socket.userId || "").toString(),
        });
      }

      // 3. Mark session ended in database
      try {
        const session = await CallSession.findOne({ room, status: { $ne: "ended" } });
        if (session) {
          session.status = "ended";
          session.endTime = new Date();
          session.participants.forEach((p) => {
            if (p.status === "joined" || p.status === "ringing") {
              p.status = "left";
              p.leftAt = new Date();
            }
          });
          await session.save();
          recordCallLogMessage(session).catch(() => null);
        }
      } catch (err) {
        console.error("[call:hangup DB error]:", err);
      }
    });

    // =====================================================
    // IN-CALL CHAT, ATTACHMENTS, PINNING & REACTIONS ENGINE
    // =====================================================
    socket.on("call:chat-message", (data) => {
      const { room, text, id, senderName, senderAvatar, replyTo, from, file, attachments } = data;
      if (!room || (!text && !file && (!attachments || attachments.length === 0))) return;

      if (!socket.rooms.has(room)) {
        socket.join(room);
      }

      const senderId = socket.userId || from || socket.id;
      console.log(`💬 [In-Call Chat] Message from "${senderName}" (${senderId}) in room "${room}"`);

      // Relay the rich message with file attachments to all other participants in the room
      socket.to(room).emit("call:chat-message-received", {
        id: id || Date.now().toString(),
        from: senderId,
        senderName: senderName || "Participant",
        senderAvatar: senderAvatar || null,
        text: text || "",
        file: file || null,
        attachments: attachments || (file ? [file] : []),
        replyTo: replyTo || null,
        pinned: false,
        reactions: {},
        time: new Date().toISOString(),
      });
    });

    socket.on("call:chat-reaction", (data) => {
      const { room, messageId, emoji } = data;
      if (!room || !messageId || !emoji) return;

      if (!socket.rooms.has(room)) {
        socket.join(room);
      }

      const userId = socket.userId || data.from || socket.id;
      console.log(`✨ [In-Call Chat Reaction] User "${userId}" reacted "${emoji}" to message "${messageId}" in room "${room}"`);

      io.to(room).emit("call:chat-reaction-received", {
        messageId,
        emoji,
        userId,
        senderName: data.senderName || "Participant",
      });
    });

    socket.on("call:pin-message", (data) => {
      const { room, messageId, pinned } = data;
      if (!room || !messageId) return;

      if (!socket.rooms.has(room)) {
        socket.join(room);
      }

      console.log(`📌 [In-Call Pin] Message ${messageId} pinned=${pinned} in room ${room}`);
      // Synchronize pinned message state across all attendees
      io.to(room).emit("call:message-pinned", {
        messageId,
        pinned: Boolean(pinned),
        pinnedBy: socket.userId || socket.id,
      });
    });

    socket.on("call:recording-status", (data) => {
      const { room, isRecording } = data;
      if (!room) return;

      if (!socket.rooms.has(room)) {
        socket.join(room);
      }

      console.log(`🔴 [In-Call Recording] Status in room ${room}: isRecording=${isRecording}`);
      io.to(room).emit("call:recording-status-changed", {
        isRecording: Boolean(isRecording),
        startedBy: socket.userId || socket.id,
        startedByName: data.userName || "Participant",
      });
    });

    // In-Call Live Typing Indicator Event
    socket.on("call:typing", (data) => {
      const { room, senderName, senderAvatar, isTyping } = data;
      if (!room) return;

      if (!socket.rooms.has(room)) {
        socket.join(room);
      }

      const senderId = socket.userId || data.from || socket.id;
      socket.to(room).emit("call:user-typing", {
        room,
        userId: senderId,
        userName: senderName || "Participant",
        userAvatar: senderAvatar || null,
        isTyping: Boolean(isTyping),
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

    // In-Call Reaction Emojis
    socket.on("call:reaction", (data) => {
      const { room, emoji } = data;
      io.to(room).emit("call:reaction-received", {
        emoji,
        senderId: socket.userId,
      });
    });

    // Explicit Call End Event
    socket.on("call:end", async (data) => {
      const { room } = data;
      console.log(`🛑 Call ended in room ${room} by ${socket.userId}`);
      socket.to(room).emit("call:ended", { room, endedBy: socket.userId });
      io.to(room).emit("call:ended", { room, endedBy: socket.userId });

      try {
        const session = await CallSession.findOneAndUpdate(
          { room, status: { $ne: "ended" } },
          { status: "ended", endTime: new Date() },
          { returnDocument: 'after' }
        );
        if (session) {
          recordCallLogMessage(session).catch(() => null);
        }
      } catch (e) {
        console.warn("Could not mark call session ended in db:", e);
      }
    });


    // =====================================================
    // VYBE MEET REAL-TIME CONFERENCING ENGINE
    // =====================================================
    socket.on("meeting:join-room", async (data) => {
      try {
        const { meetingId, userName: payloadUserName, name: payloadName, profilePicture: payloadAvatar } = data || {};
        if (!meetingId) return;

        const normalizedMeetingId = meetingId.trim().toLowerCase();
        const roomName = `meeting_${normalizedMeetingId}`;

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

        // Fetch existing members in meeting room
        const roomSockets = await io.in(roomName).fetchSockets();
        const existingMembers = await Promise.all(
          roomSockets
            .filter((s) => s.id !== socket.id)
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

    socket.on("meeting:signal", (data) => {
      const { toSocketId, signal, fromMetadata } = data;
      if (!toSocketId || !signal) return;
      io.to(toSocketId).emit("meeting:signal-received", {
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        fromMetadata: fromMetadata || {
          userId: socket.userId,
          userName: socket.userName,
          name: socket.name,
          profilePicture: socket.profilePicture,
        },
        signal,
      });
    });

    socket.on("meeting:action", (data) => {
      const { meetingId, ...actionPayload } = data;
      if (!meetingId) return;
      socket.to(`meeting_${meetingId.toLowerCase()}`).emit("meeting:action-broadcast", {
        userId: socket.userId,
        socketId: socket.id,
        ...actionPayload,
      });
    });

    socket.on("meeting:chat-message", (data) => {
      const { meetingId, text, id, senderName, senderAvatar, replyTo, file, attachments } = data;
      if (!meetingId || (!text && !file && (!attachments || attachments.length === 0))) return;

      const roomName = `meeting_${meetingId.toLowerCase()}`;
      if (!socket.rooms.has(roomName)) {
        socket.join(roomName);
      }

      socket.to(roomName).emit("meeting:chat-message-received", {
        id: id || Date.now().toString(),
        from: socket.userId || socket.id,
        senderName: senderName || socket.userName || "Participant",
        senderAvatar: senderAvatar || socket.profilePicture || null,
        text: text || "",
        file: file || null,
        attachments: attachments || (file ? [file] : []),
        replyTo: replyTo || null,
        pinned: false,
        reactions: {},
        time: new Date().toISOString(),
      });
    });

    socket.on("meeting:chat-reaction", (data) => {
      const { meetingId, messageId, emoji, senderName } = data;
      if (!meetingId || !messageId || !emoji) return;

      io.to(`meeting_${meetingId.toLowerCase()}`).emit("meeting:chat-reaction-received", {
        messageId,
        emoji,
        userId: socket.userId || socket.id,
        senderName: senderName || socket.userName || "Participant",
      });
    });

    socket.on("meeting:pin-message", (data) => {
      const { meetingId, messageId, pinned } = data;
      if (!meetingId || !messageId) return;

      io.to(`meeting_${meetingId.toLowerCase()}`).emit("meeting:message-pinned", {
        messageId,
        pinned: Boolean(pinned),
        pinnedBy: socket.userId || socket.id,
      });
    });

    socket.on("meeting:reaction", (data) => {
      const { meetingId, emoji } = data;
      if (!meetingId || !emoji) return;

      io.to(`meeting_${meetingId.toLowerCase()}`).emit("meeting:reaction-received", {
        emoji,
        senderId: socket.userId || socket.id,
        senderName: socket.userName || "Participant",
      });
    });

    socket.on("meeting:recording-status", (data) => {
      const { meetingId, isRecording } = data;
      if (!meetingId) return;

      io.to(`meeting_${meetingId.toLowerCase()}`).emit("meeting:recording-status-changed", {
        isRecording: Boolean(isRecording),
        startedBy: socket.userId || socket.id,
        startedByName: socket.userName || data.userName || "Participant",
      });
    });

    socket.on("meeting:host-control", async (data) => {
      const { meetingId, targetUserId, targetSocketId, action } = data;
      if (!meetingId || !action) return;

      const roomName = `meeting_${meetingId.toLowerCase()}`;
      console.log(`🛡️ [Vybe Meet Host Action] ${action} in meeting ${meetingId} by ${socket.userId}`);

      if (action === "end-meeting") {
        io.to(roomName).emit("meeting:ended", {
          meetingId,
          endedBy: socket.userId,
        });

        Meeting.findOneAndUpdate(
          { meetingId: meetingId.toLowerCase() },
          { status: "ended", endTime: new Date() }
        ).catch(() => null);
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
      const { meetingId } = data;
      if (!meetingId) return;

      const normalizedId = meetingId.toLowerCase();
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
            { $set: { "participants.$.status": "left", "participants.$.leftAt": new Date() } }
          );
        } catch (e) {}
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
export const getSocket = () => ioInstance;
export { ioInstance as io };

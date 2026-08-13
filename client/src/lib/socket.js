// src/lib/socket.js - Socket.IO Client Configuration
import { io } from "socket.io-client";

let socket = null;

/**
 * Initialize Socket.IO connection
 * Should be called once during app initialization
 */
export const initializeSocket = (userId) => {
  // If socket exists for the same user, reuse it
  if (socket && socket.auth?.userId === userId) return socket;

  // If socket exists for a different user (account switch), disconnect first
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const socketURL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";
  const socketPath = import.meta.env.VITE_SOCKET_PATH || "/socket.io";
  const transports = (import.meta.env.VITE_SOCKET_TRANSPORTS || "websocket,polling")
    .split(",")
    .map((t) => t.trim());

  // Extract JWT from cookies to pass explicitly in auth handshake
  // This ensures the server socket middleware can verify the token
  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
  };

  const token = getCookie("accessToken") || getCookie("token");

  socket = io(socketURL, {
    path: socketPath,
    transports,
    withCredentials: true, // Send cookies with the handshake request
    auth: {
      token: token || null,
      userId: userId, // Dev fallback — server uses this only when NODE_ENV !== production
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on("reconnect_attempt", () => {
    const freshToken = getCookie("accessToken") || getCookie("token");
    if (socket.auth) {
      socket.auth.token = freshToken;
    }
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error);
  });

  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });

  return socket;
};

/**
 * Get the Socket.IO instance
 */
export const getSocket = () => {
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// =====================================================
// MESSAGING EVENTS
// =====================================================

/**
 * Send a message
 */
export const sendMessage = (conversationId, recipientId, messageContent) => {
  if (!socket) return;
  socket.emit("send-message", {
    conversationId,
    recipientId,
    messageContent,
  });
};

/**
 * Listen for message received
 */
export const onMessageReceived = (callback) => {
  if (!socket) return;
  socket.on("message-received", callback);
  return () => socket?.off("message-received", callback);
};

/**
 * Listen for message delivered
 */
export const onMessageDelivered = (callback) => {
  if (!socket) return;
  socket.on("message-delivered", callback);
  return () => socket?.off("message-delivered", callback);
};

/**
 * Listen for message sent
 */
export const onMessageSent = (callback) => {
  if (!socket) return;
  socket.on("message-sent", callback);
  return () => socket?.off("message-sent", callback);
};

/**
 * Mark message as read
 */
export const markMessageAsRead = (messageId, conversationId, readBy) => {
  if (!socket) return;
  socket.emit("message-read", {
    messageId,
    conversationId,
    readBy,
  });
};

/**
 * Listen for message read receipt
 */
export const onMessageReadReceipt = (callback) => {
  if (!socket) return;
  socket.on("message-read-receipt", callback);
  return () => socket?.off("message-read-receipt", callback);
};

// =====================================================
// TYPING INDICATORS
// =====================================================

/**
 * Emit typing event
 */
export const emitTyping = (conversationId) => {
  if (!socket) return;
  socket.emit("typing", { conversationId });
};

/**
 * Emit stop typing event
 */
export const emitStopTyping = (conversationId) => {
  if (!socket) return;
  socket.emit("stop-typing", { conversationId });
};

/**
 * Listen for user typing
 */
export const onUserTyping = (callback) => {
  if (!socket) return;
  socket.on("user-typing", callback);
  return () => socket?.off("user-typing", callback);
};

// =====================================================
// CONVERSATION EVENTS
// =====================================================

/**
 * Join a conversation room
 */
export const joinConversation = (conversationId) => {
  if (!socket) return;
  socket.emit("join-conversation", { conversationId });
};

/**
 * Leave a conversation room
 */
export const leaveConversation = (conversationId) => {
  if (!socket) return;
  socket.emit("leave-conversation", { conversationId });
};

/**
 * Listen for user joined conversation
 */
export const onUserJoinedConversation = (callback) => {
  if (!socket) return;
  socket.on("user-joined-conversation", callback);
  return () => socket?.off("user-joined-conversation", callback);
};

/**
 * Listen for user left conversation
 */
export const onUserLeftConversation = (callback) => {
  if (!socket) return;
  socket.on("user-left-conversation", callback);
  return () => socket?.off("user-left-conversation", callback);
};

// =====================================================
// ONLINE STATUS & PRESENCE
// =====================================================

/**
 * Update user presence/status
 */
export const updatePresence = (status, lastSeen) => {
  if (!socket) return;
  socket.emit("update-presence", {
    status,
    lastSeen,
  });
};

/**
 * Listen for user online
 */
export const onUserOnline = (callback) => {
  if (!socket) return;
  socket.on("user-online", callback);
  return () => socket?.off("user-online", callback);
};

/**
 * Listen for user offline
 */
export const onUserOffline = (callback) => {
  if (!socket) return;
  socket.on("user-offline", callback);
  return () => socket?.off("user-offline", callback);
};

/**
 * Listen for user presence updated
 */
export const onUserPresenceUpdated = (callback) => {
  if (!socket) return;
  socket.on("user-presence-updated", callback);
  return () => socket?.off("user-presence-updated", callback);
};

// =====================================================
// NOTIFICATION EVENTS
// =====================================================

/**
 * Send notification to user
 */
export const sendNotification = (recipientId, type, payload) => {
  if (!socket) return;
  socket.emit("send-notification", {
    recipientId,
    type,
    payload,
  });
};

/**
 * Listen for notification received
 */
export const onNotificationReceived = (callback) => {
  if (!socket) return;
  socket.on("notification-received", callback);
  return () => socket?.off("notification-received", callback);
};

// =====================================================
// REACTION EVENTS
// =====================================================

/**
 * Send reaction (like, heart, laugh, etc.)
 */
export const sendReaction = (conversationId, type, targetId) => {
  if (!socket) return;
  socket.emit("send-reaction", {
    conversationId,
    type,
    targetId,
  });
};

/**
 * Listen for reaction received
 */
export const onReactionReceived = (callback) => {
  if (!socket) return;
  socket.on("reaction-received", callback);
  return () => socket?.off("reaction-received", callback);
};

// =====================================================
// CLEAN UP & REMOVE LISTENERS
// =====================================================

/**
 * Remove all listeners for an event
 */
export const removeListener = (event) => {
  if (!socket) return;
  socket.off(event);
};

/**
 * Remove all listeners
 */
export const removeAllListeners = () => {
  if (!socket) return;
  socket.removeAllListeners();
};

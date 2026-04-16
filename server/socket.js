import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";

let io;

const getAllowedOrigins = () => {
  return (process.env.CORS_ORIGINS || process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const getUserIdFromHandshake = (socket) => {
  try {
    const parsed = cookie.parse(socket.handshake.headers?.cookie || "");
    const token = parsed.token;

    if (!token || !process.env.JWT_SECRET) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.userId || null;
  } catch {
    return null;
  }
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = getUserIdFromHandshake(socket);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("conversation:join", (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
};

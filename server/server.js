// server.js - nodemon reload #2
import { configDotenv } from "dotenv";
import http from "http";
import connectDB from "./config/db.js";
import app from "./app.js";
import { initializeSocket } from "./socket.js";

configDotenv();

// Process Level Error Catchers for Runtime Stability
process.on("uncaughtException", (error) => {
  console.error("💥 UNCAUGHT EXCEPTION! Shutting down gracefully...", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 UNHANDLED REJECTION! Detail:", reason);
});

const PORT = process.env.PORT || 8000;

// Create HTTP server to support Socket.IO
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Make io instance available globally
app.locals.io = io;

// Connect to DB and then start server
httpServer.listen(PORT, () => {
  connectDB();
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔌 Socket.IO initialized and ready for connections`);
});

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

import { archiveExpiredStories, purgeExpiredArchivedStories } from "./services/storyArchive.service.js";

// Connect to DB and then start server
httpServer.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔌 Socket.IO initialized and ready for connections`);

  // Run initial Story Auto-Archive and 30-Day Archive Purge on startup
  archiveExpiredStories().catch((e) =>
    console.error("Startup story auto-archive error:", e.message)
  );
  purgeExpiredArchivedStories().catch((e) =>
    console.error("Startup story archive purge error:", e.message)
  );

  // Periodic Story Auto-Archive check every 5 minutes
  setInterval(() => {
    archiveExpiredStories().catch((e) =>
      console.error("Periodic story auto-archive error:", e.message)
    );
  }, 5 * 60 * 1000);

  // Periodic 30-Day Archive Purge check once every 2 hours
  setInterval(() => {
    purgeExpiredArchivedStories().catch((e) =>
      console.error("Periodic story archive purge error:", e.message)
    );
  }, 2 * 60 * 60 * 1000);
});

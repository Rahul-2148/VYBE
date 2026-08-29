// server.js - Vybe Enterprise Backend Server
import "dotenv/config";
import http from "http";
import connectDB from "./config/db.js";
import app from "./app.js";
import { initializeSocket } from "./socket.js";
import { archiveExpiredStories, purgeExpiredArchivedStories } from "./services/storyArchive.service.js";

// Process Level Error Catchers for Runtime Stability
process.on("uncaughtException", (error) => {
  console.error("💥 UNCAUGHT EXCEPTION! Shutting down gracefully...", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED REJECTION! Detail:", reason);
});

const PORT = process.env.PORT || 8000;

// Create HTTP server to support Socket.IO
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Make io instance available globally
app.locals.io = io;
global.io = io;

// Ultra-fast parallelized bootstrap
const startServer = async () => {
  const startTime = performance.now();

  // 1. Start HTTP Server immediately (zero-wait network readiness)
  httpServer.listen(PORT, () => {
    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(`🚀 VYBE Server is running on port ${PORT} [Boot time: ${elapsed}ms]`);
    console.log(`🔌 Socket.IO initialized and ready for connections`);
  });

  // 2. Connect to Database in parallel with connection pooling & IPv4 acceleration
  connectDB()
    .then(() => {
      // 3. Dispatch background maintenance without blocking HTTP readiness
      setImmediate(() => {
        archiveExpiredStories().catch((e) =>
          console.error("Startup story auto-archive notice:", e.message)
        );
        purgeExpiredArchivedStories().catch((e) =>
          console.error("Startup story archive purge notice:", e.message)
        );
      });
    })
    .catch((err) => {
      console.error("💥 MongoDB Fatal Connection Error:", err.message);
    });

  // 4. Periodic background tasks (Story auto-archive & 30-day purge)
  setInterval(() => {
    archiveExpiredStories().catch((e) =>
      console.error("Periodic story auto-archive error:", e.message)
    );
  }, 5 * 60 * 1000);

  setInterval(() => {
    purgeExpiredArchivedStories().catch((e) =>
      console.error("Periodic story archive purge error:", e.message)
    );
  }, 2 * 60 * 60 * 1000);
};

startServer();

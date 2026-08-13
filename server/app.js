// app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";
import cron from "node-cron";
import { cleanupExpiredMessages } from "./utils/cronJob/cleanupDisappearingMessages.js";
import { cleanupExpiredStories } from "./utils/cronJob/storyCleanup.js";
import { cleanupExpiredPremiumPayments } from "./utils/cronJob/premiumPaymentCleanup.js";
import { errorMiddleware } from "./utils/errorHandler.js";

// Cron jobs
cron.schedule("*/1 * * * *", cleanupExpiredMessages); // every 1 min
cron.schedule("*/30 * * * * *", cleanupExpiredStories); // every 30 sec
cron.schedule("*/5 * * * *", cleanupExpiredPremiumPayments); // every 5 min

// Import routes
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import loopRouter from "./routes/loop.route.js";
import storyRouter from "./routes/story.route.js";
import messageRouter from "./routes/message.route.js";
import conversationRouter from "./routes/conversation.route.js";
import aiRouter from "./routes/ai.route.js";
import searchRouter from "./routes/search.route.js";
import notificationRouter from "./routes/notification.route.js";
import liveRouter from "./routes/liveStream.route.js";
import monetizationRouter from "./routes/monetization.route.js";
import communityRouter from "./routes/community.route.js";
import callRouter from "./routes/call.route.js";

import { setSecurityHeaders } from "./middlewares/securityHeaders.js";
import { apiRateLimiter } from "./middlewares/rateLimiter.js";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security & Performance Middlewares
app.use(setSecurityHeaders);
app.use(apiRateLimiter);
app.use(compression());

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy" });
});

import noteRouter from "./routes/note.route.js";

// using Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/loop", loopRouter);
app.use("/api/v1/story", storyRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/conversation", conversationRouter);
app.use("/api/v1/note", noteRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/notification", notificationRouter);
app.use("/api/v1/live", liveRouter);
app.use("/api/v1/monetization", monetizationRouter);
app.use("/api/v1/community", communityRouter);
app.use("/api/v1/call", callRouter);

// Default home route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Welcome to VYBE API",
    version: "1.0.0",
    docs: "API documentation available at /docs",
  });
});

// 404 handler (must be before error middleware)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Global error handling middleware (MUST BE LAST)
app.use(errorMiddleware);

export default app;

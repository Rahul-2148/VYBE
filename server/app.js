import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cron from "node-cron";
import { cleanupExpiredMessages } from "./utils/cronJob/cleanupDisappearingMessages.js";
import { cleanupExpiredStories } from "./utils/cronJob/storyCleanup.js";

// Cron jobs
cron.schedule("*/1 * * * *", cleanupExpiredMessages); // every 1 min
cron.schedule("*/30 * * * * *", cleanupExpiredStories); // every 30 sec

// Import routes
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import loopRouter from "./routes/loop.route.js";
import storyRouter from "./routes/story.route.js";
import messageRouter from "./routes/message.route.js";
import conversationRouter from "./routes/conversation.route.js";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// using Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/loop", loopRouter);
app.use("/api/v1/story", storyRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/conversation", conversationRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

export default app;

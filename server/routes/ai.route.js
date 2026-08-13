import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  generateCaptionAndHashtags,
  generateBio,
  translateContent,
  getSmartReplies,
  analyzeTextSafety,
  getModerationAuditLogs,
} from "../controllers/ai.controller.js";

const aiRouter = express.Router();

aiRouter.post("/generate-caption", isAuthenticated, generateCaptionAndHashtags);
aiRouter.post("/generate-bio", isAuthenticated, generateBio);
aiRouter.post("/translate", isAuthenticated, translateContent);
aiRouter.get("/smart-replies", isAuthenticated, getSmartReplies);
aiRouter.post("/check-safety", isAuthenticated, analyzeTextSafety);
aiRouter.get("/moderation-logs", isAuthenticated, getModerationAuditLogs);

export default aiRouter;

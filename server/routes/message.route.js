// routes/message.routes.js
import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";
import {
  sendMessage,
  getMessages,
  markConversationSeen,
  markMessageAsSeen,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  reactMessage,
  searchMessages,
} from "../controllers/message.controller.js";
import { getUserConversations } from "../controllers/conversation.controller.js";

const messageRouter = express.Router();

/* ================= SEND MESSAGE ================= */
messageRouter.post(
  "/send",
  isAuthenticated,
  upload.array("media", 10),
  sendMessage
);

/* ================= GET USER CONVERSATIONS ================= */
// 🔥 MUST BE BEFORE /:conversationId
messageRouter.get("/conversations", isAuthenticated, getUserConversations);

/* ================= GET MESSAGES (by conversation) ================= */
messageRouter.get("/:conversationId", isAuthenticated, getMessages);

/* ================= MARK CONVERSATION SEEN ================= */
messageRouter.post(
  "/seen/:conversationId",
  isAuthenticated,
  markConversationSeen
);

/* ================= MARK SINGLE MESSAGE SEEN ================= */
messageRouter.post(
  "/message-seen/:messageId",
  isAuthenticated,
  markMessageAsSeen
);

/* ================= EDIT MESSAGE ================= */
messageRouter.patch("/edit/:messageId", isAuthenticated, editMessage);

/* ================= DELETE FOR EVERYONE ================= */
// 🔥 keep specific routes ABOVE generic :messageId
messageRouter.delete(
  "/delete-for-everyone/:messageId",
  isAuthenticated,
  deleteMessageForEveryone
);

/* ================= DELETE FOR ME ================= */
messageRouter.delete("/:messageId", isAuthenticated, deleteMessageForMe);

/* ================= REACT TO MESSAGE ================= */
messageRouter.post("/react/:messageId", isAuthenticated, reactMessage);

/* ================= SEARCH MESSAGES ================= */
messageRouter.get("/search/:conversationId", isAuthenticated, searchMessages);

export default messageRouter;

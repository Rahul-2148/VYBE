import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";
import {
  sendMessage,
  sendVoiceNote,
  forwardMessage,
  pinMessage,
  getMessages,
  getSharedMedia,
  getPinnedMessages,
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

// Primary Messaging
messageRouter.post("/send", isAuthenticated, upload.array("media", 10), sendMessage);
messageRouter.post("/voice-note", isAuthenticated, upload.single("audio"), sendVoiceNote);

// Forward & Pin
messageRouter.post("/forward/:messageId", isAuthenticated, forwardMessage);
messageRouter.post("/pin/:messageId", isAuthenticated, pinMessage);

// Inbox Conversations & Messages
messageRouter.get("/conversations", isAuthenticated, getUserConversations);
messageRouter.get("/pinned/:conversationId", isAuthenticated, getPinnedMessages);
messageRouter.get("/shared-media/:conversationId", isAuthenticated, getSharedMedia);
messageRouter.get("/search/:conversationId", isAuthenticated, searchMessages);
messageRouter.get("/:conversationId", isAuthenticated, getMessages);

// Receipts & Reactions
messageRouter.post("/seen/:conversationId", isAuthenticated, markConversationSeen);
messageRouter.post("/message-seen/:messageId", isAuthenticated, markMessageAsSeen);
messageRouter.post("/react/:messageId", isAuthenticated, reactMessage);

// Editing & Deletions
messageRouter.patch("/edit/:messageId", isAuthenticated, editMessage);
messageRouter.delete("/delete-for-everyone/:messageId", isAuthenticated, deleteMessageForEveryone);
messageRouter.delete("/:messageId", isAuthenticated, deleteMessageForMe);

export default messageRouter;

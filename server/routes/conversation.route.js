import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  createOneToOneConversation,
  createGroupConversation,
  addGroupMember,
  removeGroupMember,
  renameGroup,
  updateGroupDescription,
  makeCoAdmin,
  removeCoAdmin,
  createInviteLink,
  joinViaInvite,
  getUserConversations,
  getConversationDetails,
  toggleMuteConversation,
  togglePinConversation,
  toggleArchiveConversation,
  toggleBlockInConversation,
  toggleRestrictInConversation,
  toggleDisappearingMessages,
  updateChatTheme,
  toggleVanishMode,
  acceptMessageRequest,
  declineMessageRequest,
  deleteConversation,
  clearChatHistory,
} from "../controllers/conversation.controller.js";

const conversationRouter = express.Router();

// Create Conversations
conversationRouter.post("/one-to-one", isAuthenticated, createOneToOneConversation);
conversationRouter.post("/group", isAuthenticated, createGroupConversation);
conversationRouter.post("/create-group", isAuthenticated, createGroupConversation);

// Group Member Management
conversationRouter.post("/add/:conversationId", isAuthenticated, addGroupMember);
conversationRouter.delete("/remove/:conversationId/:memberId", isAuthenticated, removeGroupMember);

// Group Settings
conversationRouter.patch("/rename/:conversationId", isAuthenticated, renameGroup);
conversationRouter.patch("/description/:conversationId", isAuthenticated, updateGroupDescription);

// Admin Management
conversationRouter.post("/admin/add/:conversationId/:memberId", isAuthenticated, makeCoAdmin);
conversationRouter.delete("/admin/remove/:conversationId/:memberId", isAuthenticated, removeCoAdmin);

// Invite Links
conversationRouter.post("/invite/:conversationId", isAuthenticated, createInviteLink);
conversationRouter.post("/join/:token", isAuthenticated, joinViaInvite);

// User Inbox & Details
conversationRouter.get("/my", isAuthenticated, getUserConversations);
conversationRouter.get("/details/:conversationId", isAuthenticated, getConversationDetails);

// Conversation Actions
conversationRouter.delete("/delete/:conversationId", isAuthenticated, deleteConversation);
conversationRouter.delete("/clear/:conversationId", isAuthenticated, clearChatHistory);
conversationRouter.patch("/mute/:conversationId", isAuthenticated, toggleMuteConversation);
conversationRouter.patch("/pin/:conversationId", isAuthenticated, togglePinConversation);
conversationRouter.patch("/archive/:conversationId", isAuthenticated, toggleArchiveConversation);
conversationRouter.patch("/block/:conversationId", isAuthenticated, toggleBlockInConversation);
conversationRouter.patch("/restrict/:conversationId", isAuthenticated, toggleRestrictInConversation);
conversationRouter.patch("/accept-request/:conversationId", isAuthenticated, acceptMessageRequest);
conversationRouter.delete("/decline-request/:conversationId", isAuthenticated, declineMessageRequest);

// Message Settings
conversationRouter.patch("/disappearing/:conversationId", isAuthenticated, toggleDisappearingMessages);
conversationRouter.patch("/theme/:conversationId", isAuthenticated, updateChatTheme);
conversationRouter.patch("/vanish/:conversationId", isAuthenticated, toggleVanishMode);

export default conversationRouter;

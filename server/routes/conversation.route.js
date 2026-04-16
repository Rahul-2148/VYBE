import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  createOneToOneConversation,
  createGroupConversation,
  addGroupMember,
  removeGroupMember,
  renameGroup,
  makeCoAdmin,
  removeCoAdmin,
  createInviteLink,
  joinViaInvite,
  getUserConversations,
  toggleMuteConversation,
  toggleVanishMode,
  togglePinConversation,
} from "../controllers/conversation.controller.js";

const conversationRouter = express.Router();

conversationRouter.post(
  "/one-to-one",
  isAuthenticated,
  createOneToOneConversation
);
conversationRouter.post("/group", isAuthenticated, createGroupConversation);

conversationRouter.post(
  "/add/:conversationId",
  isAuthenticated,
  addGroupMember
);
conversationRouter.delete(
  "/remove/:conversationId/:memberId",
  isAuthenticated,
  removeGroupMember
);

conversationRouter.patch(
  "/rename/:conversationId",
  isAuthenticated,
  renameGroup
);

conversationRouter.post(
  "/admin/add/:conversationId/:memberId",
  isAuthenticated,
  makeCoAdmin
);
conversationRouter.delete(
  "/admin/remove/:conversationId/:memberId",
  isAuthenticated,
  removeCoAdmin
);

conversationRouter.post(
  "/invite/:conversationId",
  isAuthenticated,
  createInviteLink
);
conversationRouter.post("/join/:token", isAuthenticated, joinViaInvite);

conversationRouter.get("/my", isAuthenticated, getUserConversations);

conversationRouter.patch(
  "/mute/:conversationId",
  isAuthenticated,
  toggleMuteConversation
);

conversationRouter.patch(
  "/pin/:conversationId",
  isAuthenticated,
  togglePinConversation
);

conversationRouter.patch(
  "/vanish/:conversationId",
  isAuthenticated,
  toggleVanishMode
);

export default conversationRouter;

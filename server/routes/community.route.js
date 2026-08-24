import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  createCommunity,
  getUserCommunities,
  getCommunityDetails,
  getExploreCommunities,
  joinPublicCommunity,
  joinCommunity,
  updateCommunity,
  leaveCommunity,
  deleteCommunity,
  regenerateInviteCode,
  updateMemberRole,
  kickMember,
  createChannel,
  updateChannel,
  deleteChannel,
} from "../controllers/community.controller.js";
import {
  getChannelMessages,
  sendChannelMessage,
  toggleMessageReaction,
  deleteChannelMessage,
  togglePinMessage,
  getPinnedMessages,
  editChannelMessage,
} from "../controllers/channelMessage.controller.js";
import { upload } from "../middlewares/multer.js";

const communityRouter = express.Router();

// ── Community Discovery & CRUD ──
communityRouter.get("/list", isAuthenticated, getUserCommunities);
communityRouter.get("/explore", isAuthenticated, getExploreCommunities);
communityRouter.post(
  "/create",
  isAuthenticated,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  createCommunity
);
communityRouter.get("/details/:communityId", isAuthenticated, getCommunityDetails);
communityRouter.post("/:communityId/join-public", isAuthenticated, joinPublicCommunity);
communityRouter.post("/join", isAuthenticated, joinCommunity);
communityRouter.put(
  "/:communityId/update",
  isAuthenticated,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  updateCommunity
);
communityRouter.post("/:communityId/invite/regenerate", isAuthenticated, regenerateInviteCode);
communityRouter.post("/:communityId/leave", isAuthenticated, leaveCommunity);
communityRouter.delete("/:communityId", isAuthenticated, deleteCommunity);

// ── Members & Roles Moderation ──
communityRouter.put("/:communityId/members/:targetUserId/role", isAuthenticated, updateMemberRole);
communityRouter.delete("/:communityId/members/:targetUserId", isAuthenticated, kickMember);

// ── Channels CRUD ──
communityRouter.post("/:communityId/channel/create", isAuthenticated, createChannel);
communityRouter.put("/:communityId/channel/:channelId", isAuthenticated, updateChannel);
communityRouter.delete("/:communityId/channel/:channelId", isAuthenticated, deleteChannel);

// ── Channel Messages & Real-time actions ──
communityRouter.get("/channel/:channelId/messages", isAuthenticated, getChannelMessages);
communityRouter.get("/channel/:channelId/pinned", isAuthenticated, getPinnedMessages);
communityRouter.post("/channel/:channelId/send", isAuthenticated, upload.array("media", 10), sendChannelMessage);
communityRouter.post("/channel/:channelId/message/:messageId/reaction", isAuthenticated, toggleMessageReaction);
communityRouter.post("/channel/:channelId/message/:messageId/pin", isAuthenticated, togglePinMessage);
communityRouter.put("/channel/:channelId/message/:messageId", isAuthenticated, editChannelMessage);
communityRouter.delete("/channel/:channelId/message/:messageId", isAuthenticated, deleteChannelMessage);

export default communityRouter;

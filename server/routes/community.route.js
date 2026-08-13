import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  createCommunity,
  getUserCommunities,
  getCommunityDetails,
  createChannel,
  joinCommunity,
} from "../controllers/community.controller.js";
import {
  getChannelMessages,
  sendChannelMessage,
} from "../controllers/channelMessage.controller.js";
import { upload } from "../middlewares/multer.js";

const communityRouter = express.Router();

communityRouter.post("/create", isAuthenticated, createCommunity);
communityRouter.get("/list", isAuthenticated, getUserCommunities);
communityRouter.get("/details/:communityId", isAuthenticated, getCommunityDetails);
communityRouter.post("/:communityId/channel/create", isAuthenticated, createChannel);
communityRouter.post("/join", isAuthenticated, joinCommunity);

// Channel Messages routes
communityRouter.get("/channel/:channelId/messages", isAuthenticated, getChannelMessages);
communityRouter.post("/channel/:channelId/send", isAuthenticated, upload.array("media", 10), sendChannelMessage);

export default communityRouter;

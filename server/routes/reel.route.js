import express from "express";
import {
  addWatchTime,
  commentReel,
  likeReelComment,
  replyReelComment,
  likeReelReply,
  deleteReelReply,
  pinReelComment,
  getAllReels,
  getAllReelsOfLoggedInUser,
  incrementReelView,
  likeReel,
  getReelLikers,
  uploadReel,
  remixReel,
  reshareReel,
  toggleSaveReel,
  getSavedReels,
  getReelsByAudio,
  getReelById,
  deleteReel,
  reportReel,
  notInterestedReel,
  toggleCommentsReel,
  getReelTranscript,
} from "../controllers/reel.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const reelRouter = express.Router();

// Real-Time Audio Transcript
reelRouter.get("/transcript/:reelId", isAuthenticated, getReelTranscript);

// Upload & Feed
reelRouter.post("/upload", isAuthenticated, upload.single("media"), uploadReel);
reelRouter.post("/remix/:originalReelId", isAuthenticated, upload.single("media"), remixReel);
reelRouter.post("/reshare/:reelId", isAuthenticated, reshareReel);

reelRouter.get("/get-all-reels", isAuthenticated, getAllReels);

reelRouter.get("/get-all-Of-logged-in-user", isAuthenticated, getAllReelsOfLoggedInUser);
reelRouter.delete("/delete/:reelId", isAuthenticated, deleteReel);
reelRouter.get("/:reelId", isAuthenticated, getReelById);

// Moderation & Tuning
reelRouter.post("/not-interested/:reelId", isAuthenticated, notInterestedReel);
reelRouter.post("/report/:reelId", isAuthenticated, reportReel);
reelRouter.patch("/toggle-comments/:reelId", isAuthenticated, toggleCommentsReel);

// Interaction & Bookmarks
reelRouter.post("/like/:reelId", isAuthenticated, likeReel);
reelRouter.get("/likers/:reelId", isAuthenticated, getReelLikers);
reelRouter.get("/likes/:reelId", isAuthenticated, getReelLikers); // client alias

reelRouter.post("/comment/:reelId", isAuthenticated, commentReel);
reelRouter.post("/comment/like/:reelId/:commentId", isAuthenticated, likeReelComment);
reelRouter.post("/comment/reply/:reelId/:commentId", isAuthenticated, replyReelComment);
reelRouter.post("/comment/reply-like/:reelId/:commentId/:replyId", isAuthenticated, likeReelReply);
reelRouter.delete("/comment/reply/:reelId/:commentId/:replyId", isAuthenticated, deleteReelReply);
reelRouter.post("/comment/pin/:reelId/:commentId", isAuthenticated, pinReelComment);

reelRouter.post("/save/:reelId", isAuthenticated, toggleSaveReel);
reelRouter.get("/saved", isAuthenticated, getSavedReels);

// Analytics & Audio
reelRouter.post("/view/:reelId", isAuthenticated, incrementReelView);
reelRouter.post("/watch/:reelId", isAuthenticated, addWatchTime);
reelRouter.get("/audio/:audioId", isAuthenticated, getReelsByAudio);

export default reelRouter;

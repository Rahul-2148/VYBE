import express from "express";
import {
  addWatchTime,
  commentReel,
  getAllReels,
  getAllReelsOfLoggedInUser,
  incrementReelView,
  likeReel,
  uploadReel,
  remixReel,
  toggleSaveReel,
  getSavedReels,
  getReelsByAudio,
  getReelById,
  deleteReel,
  reportReel,
  notInterestedReel,
  toggleCommentsReel,
} from "../controllers/reel.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const reelRouter = express.Router();

// Upload & Feed
reelRouter.post("/upload", isAuthenticated, upload.single("media"), uploadReel);
reelRouter.post("/remix/:originalReelId", isAuthenticated, upload.single("media"), remixReel);

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
reelRouter.post("/comment/:reelId", isAuthenticated, commentReel);
reelRouter.post("/save/:reelId", isAuthenticated, toggleSaveReel);
reelRouter.get("/saved", isAuthenticated, getSavedReels);

// Analytics & Audio
reelRouter.post("/view/:reelId", isAuthenticated, incrementReelView);
reelRouter.post("/watch/:reelId", isAuthenticated, addWatchTime);
reelRouter.get("/audio/:audioId", isAuthenticated, getReelsByAudio);

export default reelRouter;

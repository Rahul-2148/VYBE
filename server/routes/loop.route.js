import express from "express";
import {
  addWatchTime,
  commentLoop,
  getAllLoops,
  getAllLoopsOfLoggedInUser,
  incrementLoopView,
  likeLoop,
  uploadLoop,
  remixLoop,
  toggleSaveLoop,
  getSavedLoops,
  getLoopsByAudio,
  getLoopById,
  deleteLoop,
} from "../controllers/loop.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const loopRouter = express.Router();

// Upload & Feed
loopRouter.post("/upload", isAuthenticated, upload.single("media"), uploadLoop);
loopRouter.post("/remix/:originalLoopId", isAuthenticated, upload.single("media"), remixLoop);
loopRouter.get("/get-all-loops", isAuthenticated, getAllLoops);
loopRouter.get("/get-all-Of-logged-in-user", isAuthenticated, getAllLoopsOfLoggedInUser);
loopRouter.delete("/delete/:loopId", isAuthenticated, deleteLoop);
loopRouter.get("/:loopId", isAuthenticated, getLoopById);

// Interaction & Bookmarks
loopRouter.post("/like/:loopId", isAuthenticated, likeLoop);
loopRouter.post("/comment/:loopId", isAuthenticated, commentLoop);
loopRouter.post("/save/:loopId", isAuthenticated, toggleSaveLoop);
loopRouter.get("/saved", isAuthenticated, getSavedLoops);

// Analytics & Audio
loopRouter.post("/view/:loopId", isAuthenticated, incrementLoopView);
loopRouter.post("/watch/:loopId", isAuthenticated, addWatchTime);
loopRouter.get("/audio/:audioId", isAuthenticated, getLoopsByAudio);

export default loopRouter;

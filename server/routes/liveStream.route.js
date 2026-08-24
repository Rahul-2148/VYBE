import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";
import {
  startLiveStream,
  getActiveLiveStreams,
  getLiveStreamDetails,
  endLiveStream,
  uploadRecording,
  shareLiveAsReel,
  getLiveArchive,
  deleteArchive,
  getReplay,
  submitLiveQuestion,
  toggleQuestionDisplay,
  togglePinComment,
  toggleComments,
  kickMuteViewer,
} from "../controllers/liveStream.controller.js";

const liveRouter = express.Router();

// Core broadcast lifecycle
liveRouter.post("/start", isAuthenticated, startLiveStream);
liveRouter.get("/active", isAuthenticated, getActiveLiveStreams);
liveRouter.get("/details/:streamId", isAuthenticated, getLiveStreamDetails);
liveRouter.post("/end/:streamId", isAuthenticated, endLiveStream);

// Recording & Replay
liveRouter.post("/upload-recording/:streamId", isAuthenticated, upload.single("recording"), uploadRecording);
liveRouter.post("/share-as-reel/:streamId", isAuthenticated, shareLiveAsReel);
liveRouter.get("/replay/:streamId", isAuthenticated, getReplay);

// Archive
liveRouter.get("/archive", isAuthenticated, getLiveArchive);
liveRouter.delete("/archive/:streamId", isAuthenticated, deleteArchive);

// In-stream interactions
liveRouter.post("/question/:streamId", isAuthenticated, submitLiveQuestion);
liveRouter.patch("/question/display/:streamId/:questionId", isAuthenticated, toggleQuestionDisplay);
liveRouter.patch("/pin-comment/:streamId", isAuthenticated, togglePinComment);
liveRouter.patch("/comments/toggle/:streamId", isAuthenticated, toggleComments);
liveRouter.patch("/moderation/:streamId/:viewerId", isAuthenticated, kickMuteViewer);

export default liveRouter;

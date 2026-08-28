import express from "express";
import {
  uploadStory,
  getStoriesFeed,
  getUserStories,
  viewStory,
  toggleStoryLike,
  reactToStory,
  votePoll,
  answerQuiz,
  submitQuestionResponse,
  respondSlider,
  replyStory,
  fetchStoryAnalytics,
  restoreStory,
  toggleCloseFriend,
  getCloseFriends,
  clearAllCloseFriends,
  getStoryArchive,
  createHighlight,
  updateCover,
  setHighlightOrder,
  getHighlightsByUsername,
  deleteHighlight,
  deleteStory,
  getAllStories,
  muteStoryUser,
  unmuteStoryUser,
  reportStory,
} from "../controllers/story.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const storyRouter = express.Router();

// Primary Story Operations
storyRouter.post("/upload", isAuthenticated, upload.single("media"), uploadStory);
storyRouter.get("/feed", isAuthenticated, getStoriesFeed);
storyRouter.get("/user/:userId", isAuthenticated, getUserStories);
storyRouter.post("/view/:storyId", isAuthenticated, viewStory);
storyRouter.post("/like/:storyId", isAuthenticated, toggleStoryLike);
storyRouter.post("/react/:storyId", isAuthenticated, reactToStory);

// Mute & Privacy Operations
storyRouter.post("/mute/:targetUserId", isAuthenticated, muteStoryUser);
storyRouter.post("/unmute/:targetUserId", isAuthenticated, unmuteStoryUser);
storyRouter.post("/report/:storyId", isAuthenticated, reportStory);

// Analytics & Restoration
storyRouter.get("/analytics/:storyId", isAuthenticated, fetchStoryAnalytics);
storyRouter.post("/restore/:storyId", isAuthenticated, restoreStory);

// Interactive Stickers Operations
storyRouter.post("/poll/:storyId/vote", isAuthenticated, votePoll);
storyRouter.post("/quiz/:storyId/answer", isAuthenticated, answerQuiz);
storyRouter.post("/question/:storyId/submit", isAuthenticated, submitQuestionResponse);
storyRouter.post("/slider/:storyId/respond", isAuthenticated, respondSlider);

// Story DM Reply
storyRouter.post("/reply/:storyId", isAuthenticated, replyStory);

// Close Friends System
storyRouter.post("/close-friends/toggle/:targetUserId", isAuthenticated, toggleCloseFriend);
storyRouter.get("/close-friends", isAuthenticated, getCloseFriends);
storyRouter.delete("/close-friends/clear", isAuthenticated, clearAllCloseFriends);

// Story Archive & Highlights
storyRouter.get("/archive", isAuthenticated, getStoryArchive);
storyRouter.post("/highlight/create", isAuthenticated, upload.single("coverImage"), createHighlight);
storyRouter.post("/highlight/cover/:highlightId", isAuthenticated, upload.single("coverImage"), updateCover);
storyRouter.post("/highlight/reorder", isAuthenticated, setHighlightOrder);
storyRouter.get("/highlight/user/:userName", isAuthenticated, getHighlightsByUsername);
storyRouter.delete("/highlight/:highlightId", isAuthenticated, deleteHighlight);

// Delete & Admin
storyRouter.delete("/:storyId", isAuthenticated, deleteStory);
storyRouter.get("/admin/stories", isAuthenticated, getAllStories);

export default storyRouter;

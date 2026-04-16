import express from "express";
import {
  deleteStory,
  getAllStories,
  getStoriesFeed,
  getUserStories,
  reactToStory,
  toggleStoryLike,
  uploadStory,
  viewStory,
} from "../controllers/story.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const storyRouter = express.Router();

storyRouter.post(
  "/upload",
  isAuthenticated,
  upload.single("media"),
  uploadStory
);

storyRouter.get("/feed", isAuthenticated, getStoriesFeed);

storyRouter.get("/user/:userId", isAuthenticated, getUserStories);

storyRouter.post("/view/:storyId", isAuthenticated, viewStory);

storyRouter.post("/like/:storyId", isAuthenticated, toggleStoryLike);

storyRouter.post("/react/:storyId", isAuthenticated, reactToStory);

storyRouter.delete("/:storyId", isAuthenticated, deleteStory);

// get all stories route (for admin, moderation or analytics)
storyRouter.get("/admin/stories", isAuthenticated, getAllStories);

export default storyRouter;

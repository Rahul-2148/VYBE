// music.route.js
import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  searchMusic,
  getCategoryMusic,
  getAIRecommendedMusic,
  toggleSaveAudio,
  getSavedAudios,
  removeSavedAudio,
} from "../controllers/music.controller.js";

const musicRouter = express.Router();

musicRouter.get("/search", searchMusic);
musicRouter.get("/recommend", getAIRecommendedMusic);
musicRouter.get("/category/:category", getCategoryMusic);

// Saved Audio Endpoints
musicRouter.post("/save", isAuthenticated, toggleSaveAudio);
musicRouter.get("/saved", isAuthenticated, getSavedAudios);
musicRouter.delete("/saved/:audioId", isAuthenticated, removeSavedAudio);

export default musicRouter;

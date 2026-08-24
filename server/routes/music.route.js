// music.route.js
import express from "express";
import { searchMusic, getCategoryMusic, getAIRecommendedMusic } from "../controllers/music.controller.js";

const musicRouter = express.Router();

musicRouter.get("/search", searchMusic);
musicRouter.get("/recommend", getAIRecommendedMusic);
musicRouter.get("/category/:category", getCategoryMusic);

export default musicRouter;

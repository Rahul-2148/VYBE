// music.route.js
import express from "express";
import { searchMusic, getCategoryMusic, getAIRecommendedMusic } from "../controllers/music.controller.js";

const router = express.Router();

router.get("/search", searchMusic);
router.get("/recommend", getAIRecommendedMusic);
router.get("/category/:category", getCategoryMusic);

export default router;

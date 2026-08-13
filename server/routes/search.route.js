import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  searchAll,
  getExploreFeed,
  getHashtagDetails,
  toggleFollowHashtag,
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistoryItem,
  getLocationDetails,
} from "../controllers/search.controller.js";

const searchRouter = express.Router();

searchRouter.get("/query", isAuthenticated, searchAll);
searchRouter.get("/explore", isAuthenticated, getExploreFeed);
searchRouter.get("/tag/:hashtag", isAuthenticated, getHashtagDetails);
searchRouter.get("/location/:locationName", isAuthenticated, getLocationDetails);
searchRouter.post("/follow-tag/:hashtag", isAuthenticated, toggleFollowHashtag);
searchRouter.get("/history", isAuthenticated, getSearchHistory);
searchRouter.post("/history", isAuthenticated, addSearchHistory);
searchRouter.delete("/history", isAuthenticated, clearSearchHistory);
searchRouter.delete("/history/:itemId", isAuthenticated, removeSearchHistoryItem);

export default searchRouter;

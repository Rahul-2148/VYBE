import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  startLiveStream,
  getActiveLiveStreams,
  endLiveStream,
} from "../controllers/liveStream.controller.js";

const liveRouter = express.Router();

liveRouter.post("/start", isAuthenticated, startLiveStream);
liveRouter.get("/active", isAuthenticated, getActiveLiveStreams);
liveRouter.post("/end/:streamId", isAuthenticated, endLiveStream);

export default liveRouter;

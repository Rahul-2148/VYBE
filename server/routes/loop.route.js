import express from "express";
import {
  addWatchTime,
  commentLoop,
  getAllLoops,
  getAllLoopsOfLoggedInUser,
  incrementLoopView,
  likeLoop,
  uploadLoop,
} from "../controllers/loop.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const loopRouter = express.Router();

loopRouter.post("/upload", isAuthenticated, upload.single("media"), uploadLoop);
loopRouter.get(
  "/get-all-Of-logged-in-user",
  isAuthenticated,
  getAllLoopsOfLoggedInUser
); // get all loops of current user
loopRouter.get("/get-all-loops", isAuthenticated, getAllLoops); // get all loops of all users
loopRouter.post("/like/:loopId", isAuthenticated, likeLoop);
loopRouter.post("/comment/:loopId", isAuthenticated, commentLoop);
loopRouter.post("/view/:loopId", isAuthenticated, incrementLoopView); // increment view count
loopRouter.post("/watch/:loopId", isAuthenticated, addWatchTime); // add watch time


export default loopRouter;

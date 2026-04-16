import express from "express";
import {
  editProfile,
  follow,
  getCurrentUser,
  getProfile,
  suggestedUsers,
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const userRouter = express.Router();

userRouter.get("/current-user", isAuthenticated, getCurrentUser);
userRouter.get("/suggested", isAuthenticated, suggestedUsers);
userRouter.get("/getProfile/:userName", isAuthenticated, getProfile);
userRouter.get("/follow/:targetUserId", isAuthenticated, follow);
userRouter.put(
  "/edit-profile",
  isAuthenticated,
  upload.single("profileImage"),
  editProfile
);

export default userRouter;

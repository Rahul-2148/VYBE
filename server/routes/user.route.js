import express from "express";
import {
  editProfile,
  follow,
  getCurrentUser,
  getProfile,
  suggestedUsers,
  switchAccountType,
  getAccountInsights,
  getPrivacySettings,
  updatePrivacySettings,
  getUserTheme,
  updateUserTheme,
  getFollowRequests,
  handleFollowRequest,
  trackProfileTap,
  blockUserDirect,
  unblockUserDirect,
  getBlockedUsersList,
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const userRouter = express.Router();

userRouter.get("/current-user", isAuthenticated, getCurrentUser);
userRouter.get("/suggested", isAuthenticated, suggestedUsers);
userRouter.get("/getProfile/:userName", isAuthenticated, getProfile);
userRouter.get("/follow/:targetUserId", isAuthenticated, follow);
userRouter.get("/insights", isAuthenticated, getAccountInsights);
userRouter.get("/privacy-settings", isAuthenticated, getPrivacySettings);
userRouter.patch("/privacy-settings", isAuthenticated, updatePrivacySettings);
userRouter.put("/switch-account-type", isAuthenticated, switchAccountType);
userRouter.get("/theme", isAuthenticated, getUserTheme);
userRouter.put("/theme", isAuthenticated, updateUserTheme);
userRouter.get("/follow-requests", isAuthenticated, getFollowRequests);
userRouter.post("/follow-request/:action", isAuthenticated, handleFollowRequest);
userRouter.post("/track-tap", isAuthenticated, trackProfileTap);
userRouter.post("/block/:targetUserId", isAuthenticated, blockUserDirect);
userRouter.post("/unblock/:targetUserId", isAuthenticated, unblockUserDirect);
userRouter.get("/blocked-list", isAuthenticated, getBlockedUsersList);
userRouter.put(
  "/edit-profile",
  isAuthenticated,
  upload.single("profileImage"),
  editProfile
);

export default userRouter;

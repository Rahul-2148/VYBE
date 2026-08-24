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
  getUserFollowers,
  getUserFollowing,
  getUserMutuals,
  requestContactInfo,
  getSavedItems,
  submitReport,
  applyForVerification,
  getVerificationStatus,
  getActiveAnnouncements,
} from "../controllers/user.controller.js";
import { updateNotificationSettings } from "../controllers/notification.controller.js";
import { searchAll } from "../controllers/search.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const userRouter = express.Router();

userRouter.get("/current", isAuthenticated, getCurrentUser);
userRouter.get("/current-user", isAuthenticated, getCurrentUser);
userRouter.get("/search", isAuthenticated, searchAll);
userRouter.get("/saved-items", isAuthenticated, getSavedItems);
userRouter.get("/suggested", isAuthenticated, suggestedUsers);
userRouter.get("/getProfile/:userName", isAuthenticated, getProfile);
userRouter.get("/:userName/followers", isAuthenticated, getUserFollowers);
userRouter.get("/:userName/following", isAuthenticated, getUserFollowing);
userRouter.get("/:userName/mutuals", isAuthenticated, getUserMutuals);
userRouter.post("/request-contact/:targetUserId", isAuthenticated, requestContactInfo);
userRouter.get("/follow/:targetUserId", isAuthenticated, follow);
userRouter.get("/insights", isAuthenticated, getAccountInsights);
userRouter.get("/privacy-settings", isAuthenticated, getPrivacySettings);
userRouter.patch("/privacy-settings", isAuthenticated, updatePrivacySettings);
userRouter.put("/notification-preferences", isAuthenticated, updateNotificationSettings);
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

// Safety, Reports & Verification
userRouter.post("/report", isAuthenticated, submitReport);
userRouter.post("/apply-verification", isAuthenticated, upload.single("document"), applyForVerification);
userRouter.get("/verification-status", isAuthenticated, getVerificationStatus);
userRouter.get("/announcements", isAuthenticated, getActiveAnnouncements);

export default userRouter;

import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  getUserNotifications,
  markNotificationsRead,
  updateNotificationSettings,
  getUnreadNotificationCount,
} from "../controllers/notification.controller.js";

const notificationRouter = express.Router();

notificationRouter.get("/unread-count", isAuthenticated, getUnreadNotificationCount);
notificationRouter.get("/feed", isAuthenticated, getUserNotifications);
notificationRouter.post("/read", isAuthenticated, markNotificationsRead);
notificationRouter.put("/settings", isAuthenticated, updateNotificationSettings);

export default notificationRouter;

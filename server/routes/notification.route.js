import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  getUserNotifications,
  markNotificationsRead,
  updateNotificationSettings,
  getUnreadNotificationCount,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notification.controller.js";

const notificationRouter = express.Router();

notificationRouter.get("/unread-count", isAuthenticated, getUnreadNotificationCount);
notificationRouter.get("/feed", isAuthenticated, getUserNotifications);
notificationRouter.post("/read", isAuthenticated, markNotificationsRead);
notificationRouter.put("/settings", isAuthenticated, updateNotificationSettings);
notificationRouter.delete("/clear-all", isAuthenticated, clearAllNotifications);
notificationRouter.delete("/:notificationId", isAuthenticated, deleteNotification);

export default notificationRouter;

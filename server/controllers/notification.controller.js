import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { getIO } from "../socket.js";

// Helper function to create notification & emit via Socket.io
export const createNotificationHelper = async ({ req, recipient, sender, type, post, reel, story, commentText }) => {
  try {
    if (!recipient || !sender || recipient.toString() === sender.toString()) return null;

    const recipientIdStr = recipient.toString();
    const senderIdStr = sender.toString();

    const [recipientUser, senderUser] = await Promise.all([
      User.findById(recipient).select("blockedUsers notificationSettings"),
      User.findById(sender).select("blockedUsers"),
    ]);

    if (!recipientUser || !senderUser) return null;

    const isBlocked =
      recipientUser.blockedUsers?.some((id) => id.toString() === senderIdStr) ||
      senderUser.blockedUsers?.some((id) => id.toString() === recipientIdStr);

    if (isBlocked) return null;

    const targetPost = post || null;
    const targetReel = reel || null;
    const targetStory = story || null;
    const targetComment = commentText || "";

    // Check user notification preferences
    const settings = recipientUser.notificationSettings;
    if (settings?.pauseAll) return null;
    if (type === "like" && settings?.likes === "off") return null;
    if (type === "comment" && settings?.comments === "off") return null;
    if (type === "follow" && settings?.newFollowers === false) return null;

    let notification = null;

    // Deduplication / Upsert for unique interaction types
    if (type === "like" || type === "follow" || type === "follow_request" || type === "follow_accept") {
      const dupQuery = { recipient, sender, type };
      if (targetPost) dupQuery.post = targetPost;
      if (targetReel) dupQuery.reel = targetReel;
      if (targetStory) dupQuery.story = targetStory;

      const updateDoc = {
        recipient,
        sender,
        type,
        post: targetPost,
        reel: targetReel,
        story: targetStory,
        commentText: targetComment,
        read: false,
        isRead: false,
      };

      notification = await Notification.findOneAndUpdate(
        dupQuery,
        { $set: updateDoc },
        { upsert: true, returnDocument: 'after' }
      );
    } else if (type === "comment") {
      const recentQuery = {
        recipient,
        sender,
        type,
        commentText: targetComment,
        createdAt: { $gte: new Date(Date.now() - 5000) },
      };
      if (targetPost) recentQuery.post = targetPost;
      if (targetReel) recentQuery.reel = targetReel;
      const duplicateComment = await Notification.findOne(recentQuery);
      if (duplicateComment) {
        notification = duplicateComment;
      }
    }

    if (!notification) {
      notification = await Notification.create({
        recipient,
        sender,
        type,
        post: targetPost,
        reel: targetReel,
        story: targetStory,
        commentText: targetComment,
        read: false,
        isRead: false,
      });
    }

    const populated = await Notification.findById(notification._id)
      .populate("sender", "name userName profileImage isVerified")
      .populate({
        path: "post",
        select: "media caption mediaType mediaItems",
      })
      .populate({
        path: "reel",
        select: "media caption",
      })
      .populate({
        path: "story",
        select: "media",
      });

    // Emit Real-time Notification via Socket.IO
    try {
      const io = getIO() || global.io;
      if (io) {
        const rooms = [`user_${recipientIdStr}`, recipientIdStr];
        rooms.forEach((r) => {
          io.to(r).emit("new-notification", populated);
          io.to(r).emit("notification-received", { notification: populated });
          io.to(r).emit("notification:received", populated);
        });
      }
    } catch (socketError) {
      console.error("Socket notification emit error:", socketError);
    }

    return populated;
  } catch (error) {
    console.error("createNotificationHelper error:", error);
    return null;
  }
};

// Get User's Notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, page = 1, limit = 50 } = req.query;
    
    const query = { recipient: userId };
    if (type && type !== "all") {
      if (type === "likes") query.type = "like";
      else if (type === "comments") query.type = "comment";
      else if (type === "follows") query.type = { $in: ["follow", "follow_request", "follow_accept"] };
      else if (type === "mentions") query.type = "mention";
      else if (type === "calls") query.type = { $in: ["call", "contact_request"] };
      else query.type = type;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const notifications = await Notification.find(query)
      .populate("sender", "name userName profileImage isVerified")
      .populate({
        path: "post",
        select: "media caption mediaType mediaItems",
      })
      .populate({
        path: "reel",
        select: "media caption",
      })
      .populate({
        path: "story",
        select: "media",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      $or: [{ isRead: false }, { read: false }],
    });

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

// Clear All Notifications for User
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { type } = req.query;
    const query = { recipient: userId };
    if (type && type !== "all") {
      if (type === "likes") query.type = "like";
      else if (type === "comments") query.type = "comment";
      else if (type === "follows") query.type = { $in: ["follow", "follow_request", "follow_accept"] };
      else if (type === "mentions") query.type = "mention";
      else if (type === "calls") query.type = { $in: ["call", "contact_request"] };
      else query.type = type;
    }

    await Notification.deleteMany(query);

    return res.status(200).json({
      success: true,
      message: "All notifications cleared successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to clear notifications",
      error: error.message,
    });
  }
};

// Mark All as Read
export const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    await Notification.updateMany(
      { recipient: userId, $or: [{ isRead: false }, { read: false }] },
      { $set: { isRead: true, read: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

// Delete Single Notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });

    return res.status(200).json({
      success: true,
      message: "Notification removed",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

// Get Unread Count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;

    const count = await Notification.countDocuments({
      recipient: userId,
      $or: [{ isRead: false }, { read: false }],
    });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get unread count",
      error: error.message,
    });
  }
};

// Update Notification Preferences
export const updateNotificationSettings = async (req, res) => {
  try {
    const settings = req.body.settings || req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { notificationSettings: settings } },
      { returnDocument: 'after' }
    );

    return res.status(200).json({
      success: true,
      notificationSettings: user.notificationSettings,
      message: "Notification settings updated!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `updateSettings error: ${error.message}` });
  }
};

// Get Unread Notification Count
export const getUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.userId,
      $or: [{ isRead: false }, { read: false }],
    });
    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getUnreadNotificationCount error: ${error.message}` });
  }
};

// Aliases for route compatibility
export const getUserNotifications = getNotifications;
export const markNotificationsRead = markNotificationsAsRead;



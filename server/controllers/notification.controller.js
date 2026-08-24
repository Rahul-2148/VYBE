import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";

// Helper function to create notification & emit via Socket.io
export const createNotificationHelper = async ({ req, recipient, sender, type, post, reel, story, commentText }) => {
  try {
    if (!recipient || recipient.toString() === sender.toString()) return;

    const [recipientUser, senderUser] = await Promise.all([
      User.findById(recipient).select("blockedUsers notificationSettings"),
      User.findById(sender).select("blockedUsers"),
    ]);

    if (!recipientUser || !senderUser) return;

    const isBlocked =
      recipientUser.blockedUsers?.some((id) => id.toString() === sender.toString()) ||
      senderUser.blockedUsers?.some((id) => id.toString() === recipient.toString());

    if (isBlocked) return;

    const targetReel = reel;

    // Deduplication check
    let dupQuery = { recipient, sender, type };
    if (post) dupQuery.post = post;
    if (targetReel) {
      dupQuery.reel = targetReel;
    }
    if (story) dupQuery.story = story;

    // Check user notification preferences
    const settings = recipientUser.notificationSettings;
    if (settings?.pauseAll) return;
    if (type === "like" && settings?.likes === "off") return;
    if (type === "comment" && settings?.comments === "off") return;
    if (type === "follow" && settings?.newFollowers === false) return;

    let notif;
    if (type === "like" || type === "follow" || type === "follow_request" || type === "follow_accept") {
      const updateDoc = {
        recipient,
        sender,
        type,
        post: post || null,
        reel: targetReel || null,
        story: story || null,
        commentText: commentText || "",
      };
      notif = await Notification.findOneAndUpdate(
        dupQuery,
        { $setOnInsert: updateDoc },
        { upsert: true, returnDocument: 'after' }
      );
    } else if (type === "comment") {
      dupQuery.commentText = commentText || "";
      dupQuery.createdAt = { $gte: new Date(Date.now() - 5000) };
      const duplicateComment = await Notification.findOne(dupQuery);
      if (duplicateComment) return duplicateComment;
    }
  } catch (dupError) {
    console.error("Duplicate notification check error:", dupError);
  }

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    post: post || null,
    reel: targetReel || null,
    story: story || null,
    commentText: commentText || "",
  });

  const populated = await Notification.findById(notification._id)
    .populate("sender", "name userName profileImage isVerified")
    .populate({
      path: "post",
      select: "media caption mediaType",
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
    const io = global.io;
    if (io) {
      io.to(`user_${recipient}`).emit("new-notification", populated);
      io.to(`user_${recipient}`).emit("notification-received", { notification: populated });
      io.to(`user_${recipient}`).emit("notification:received", populated);
    }
  } catch (socketError) {
    console.error("Socket notification emit error:", socketError);
  }

  return populated;
};

// Get User's Notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "name userName profileImage isVerified")
      .populate({
        path: "post",
        select: "media caption mediaType",
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
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
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

// Mark All as Read
export const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
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
      isRead: false,
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
    const unreadCount = await Notification.countDocuments({ recipient: req.userId, isRead: false });
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


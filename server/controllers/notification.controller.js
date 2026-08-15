import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";

// Helper function to create notification & emit via Socket.io
export const createNotificationHelper = async ({ req, recipient, sender, type, post, loop, story, commentText }) => {
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

    // Deduplication check
    let dupQuery = { recipient, sender, type };
    if (post) dupQuery.post = post;
    if (loop) dupQuery.loop = loop;
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
        loop: loop || null,
        story: story || null,
        commentText: commentText || "",
      };
      notif = await Notification.findOneAndUpdate(
        dupQuery,
        { $setOnInsert: updateDoc },
        { upsert: true, new: true }
      );
    } else if (type === "comment") {
      dupQuery.commentText = commentText || "";
      dupQuery.createdAt = { $gte: new Date(Date.now() - 5000) };
      const duplicateComment = await Notification.findOne(dupQuery);
      if (duplicateComment) return duplicateComment;
    }

    if (!notif) {
      notif = await Notification.create({
        recipient,
        sender,
        type,
        post: post || null,
        loop: loop || null,
        story: story || null,
        commentText: commentText || "",
      });
    }

    const populated = await notif.populate([
      { path: "sender", select: "name userName profileImage isVerified" },
      { path: "post", select: "media mediaType" },
      { path: "loop", select: "media" },
    ]);

    // Emit Socket.io real-time event
    const io = req?.app?.locals?.io;
    if (io) {
      io.to(`user_${recipient}`).emit("notification-received", {
        notification: populated,
      });
    }

    return populated;
  } catch (error) {
    console.error("createNotificationHelper error:", error);
  }
};

// Get User Notifications Activity Feed
export const getUserNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const before = req.query.before;

    let filter = { recipient: req.userId };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    let query = Notification.find(filter)
      .sort({ createdAt: -1 });

    if (!before) {
      query = query.skip((page - 1) * limit);
    }
    query = query.limit(limit)
      .populate("sender", "name userName profileImage followers isVerified")
      .populate("post", "media mediaType")
      .populate("loop", "media");

    const notifications = await query;
    const unreadCount = await Notification.countDocuments({ recipient: req.userId, read: false });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
      hasMore: notifications.length === limit,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getUserNotifications error: ${error.message}` });
  }
};

// Mark Notifications Read
export const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.userId, read: false }, { $set: { read: true } });
    return res.status(200).json({ success: true, message: "Notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ success: false, message: `markRead error: ${error.message}` });
  }
};

// Update Notification Preferences
export const updateNotificationSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { notificationSettings: settings } },
      { new: true }
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
    const unreadCount = await Notification.countDocuments({ recipient: req.userId, read: false });
    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getUnreadNotificationCount error: ${error.message}` });
  }
};

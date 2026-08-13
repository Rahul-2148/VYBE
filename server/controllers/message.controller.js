// controllers/message.controller.js
import mongoose from "mongoose";
import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";

/* ================= PRIVACY CHECK HELPER ================= */
export const checkMessagePrivacy = async (conversation, userId) => {
  if (conversation.isGroup) return { allowed: true };

  const otherParticipantId = conversation.participants.find((p) => p.toString() !== userId.toString());
  if (!otherParticipantId) return { allowed: true };

  if (conversation.blockedBy?.some((id) => id.toString() === otherParticipantId.toString())) {
    return { allowed: false, status: 403, message: "You cannot send messages in this conversation." };
  }
  if (conversation.blockedBy?.some((id) => id.toString() === userId.toString())) {
    return { allowed: false, status: 403, message: "You have blocked this conversation." };
  }

  const [sender, recipient] = await Promise.all([
    User.findById(userId).select("blockedUsers followers following"),
    User.findById(otherParticipantId).select("blockedUsers followers following privacySettings"),
  ]);

  if (sender?.blockedUsers?.some((id) => id.toString() === otherParticipantId.toString())) {
    return { allowed: false, status: 403, message: "You have blocked this user." };
  }
  if (recipient?.blockedUsers?.some((id) => id.toString() === userId.toString())) {
    return { allowed: false, status: 403, message: "This user has blocked you." };
  }

  // Evaluate recipient DM Privacy Settings
  const privacy = recipient?.privacySettings || {};
  const allowMessagesFrom = privacy.allowMessagesFrom || "everyone";
  const messageRequestPermission = privacy.messageRequestPermission || "requests";

  const senderFollowsRecipient = recipient?.followers?.some((id) => id.toString() === userId.toString());
  const recipientFollowsSender = recipient?.following?.some((id) => id.toString() === userId.toString());

  // Check if DM is permitted
  if (allowMessagesFrom === "no_one") {
    return { allowed: false, status: 403, message: "This user does not accept direct messages." };
  }
  if (allowMessagesFrom === "followers" && !senderFollowsRecipient) {
    if (messageRequestPermission === "dont_receive") {
      return { allowed: false, status: 403, message: "This user only accepts direct messages from their followers." };
    }
  }
  if (allowMessagesFrom === "following" && !recipientFollowsSender) {
    if (messageRequestPermission === "dont_receive") {
      return { allowed: false, status: 403, message: "This user only accepts direct messages from accounts they follow." };
    }
  }

  return { allowed: true, privacy, recipientFollowsSender };
};

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.userId;
    let { conversationId, recipientId, type, messageType, text, sharedType, sharedId, sharedData, replyTo, voiceDuration, locationData, clientMessageId } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Auto-resolve or create 1-to-1 conversation if recipientId is supplied without conversationId
    if (!conversationId && recipientId) {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({ message: "Invalid recipient ID format" });
      }

      const uObjId = new mongoose.Types.ObjectId(userId);
      const rObjId = new mongoose.Types.ObjectId(recipientId);

      let conv = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [uObjId, rObjId] },
      });
      if (!conv) {
        conv = await Conversation.create({
          participants: [uObjId, rObjId],
          isGroup: false,
          requestStatus: "none",
        });
      }
      conversationId = conv._id;
    }

    if (!conversationId) return res.status(400).json({ message: "conversationId or recipientId missing" });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a participant" });
    }

    let rawEffectiveType = messageType || type || "text";
    if (rawEffectiveType === "shared_loop") rawEffectiveType = "shared_reel";
    if (rawEffectiveType === "shared_user") rawEffectiveType = "shared_profile";
    const effectiveType = rawEffectiveType;
    const content = { text: text ? text.trim() : "" };

    if (clientMessageId) {
      const existingMessage = await Message.findOne({
        conversation: conversationId,
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(clientMessageId) ? clientMessageId : null },
          { clientMessageId: clientMessageId }
        ]
      });
      if (existingMessage) {
        const populatedMessage = await existingMessage.populate("sender", "userName profileImage isVerified");
        return res.status(200).json({ success: true, message: populatedMessage, isDuplicate: true });
      }
    }

    // Block & Privacy Settings Check (1-to-1 chats)
    const privacyCheck = await checkMessagePrivacy(conversation, userId);
    if (!privacyCheck.allowed) {
      return res.status(privacyCheck.status).json({ message: privacyCheck.message });
    }

    const { privacy, recipientFollowsSender } = privacyCheck;
    if (privacy) {
      // Story reply privacy check
      if (effectiveType === "shared_story" || sharedType === "story") {
        const allowReplies = privacy.allowStoryRepliesFrom || "everyone";
        if (allowReplies === "off") {
          return res.status(403).json({ message: "This user has turned off story replies." });
        }
        if (allowReplies === "following" && !recipientFollowsSender) {
          return res.status(403).json({ message: "This user only allows story replies from accounts they follow." });
        }
      }

      // Post share privacy check
      if (effectiveType === "shared_post" || effectiveType === "shared_reel" || sharedType === "post" || sharedType === "reel") {
        const allowPostShare = privacy.allowPostSharingToDM || "everyone";
        if (allowPostShare === "no_one") {
          return res.status(403).json({ message: "This user does not accept shared posts in direct messages." });
        }
      }
    }

    if (!conversation.isGroup && recipientFollowsSender !== undefined) {
      // Set Message Request Status if recipient doesn't follow sender & conversation isn't accepted
      if (!recipientFollowsSender && conversation.requestStatus !== "accepted") {
        conversation.requestStatus = "pending";
      } else if (recipientFollowsSender && (conversation.requestStatus === "none" || conversation.requestStatus === "pending")) {
        conversation.requestStatus = "accepted";
      }
    }

    // Text
    if (effectiveType === "text") {
      if ((!text || !text.trim()) && (!req.files || req.files.length === 0) && !locationData && !sharedId && !sharedData) {
        return res.status(400).json({ message: "Text or media required" });
      }
      content.text = text ? text.trim() : "";
    }

    // Media (Multiple or URL/Sticker payload)
    if (req.files && req.files.length > 0) {
      content.media = [];
      for (const file of req.files) {
        const upload = await uploadOnCloudinary(file.path, "VYBE/messages");
        content.media.push({
          url: upload.url,
          public_id: upload.public_id,
          type: file.mimetype.startsWith("image")
            ? "image"
            : file.mimetype.startsWith("video")
            ? "video"
            : file.mimetype.startsWith("audio")
            ? "audio"
            : "document",
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        });
      }
    } else if (sharedData?.mediaUrl || req.body.mediaUrl || req.body.stickerUrl) {
      const mUrl = sharedData?.mediaUrl || req.body.mediaUrl || req.body.stickerUrl;
      const mType = effectiveType === "sticker" || rawEffectiveType === "sticker" ? "sticker" : "image";
      content.media = [{ url: mUrl, type: mType }];
    }

    // Voice Note
    if (effectiveType === "voice") {
      content.voiceDuration = Number(voiceDuration) || 0;
    }

    // Location Pin
    if (effectiveType === "location" && locationData) {
      try {
        content.locationData = typeof locationData === "string" ? JSON.parse(locationData) : locationData;
      } catch (e) {
        content.locationData = null;
      }
    }

    // Share Content
    if (effectiveType === "share" || effectiveType?.startsWith("shared_")) {
      let rawType = (sharedType || effectiveType.replace("shared_", "") || "post").toLowerCase();
      let normalizedModelType = "Post";
      if (rawType === "reel" || rawType === "loop") normalizedModelType = "Loop";
      else if (rawType === "story") normalizedModelType = "Story";
      else if (rawType === "profile" || rawType === "user") normalizedModelType = "User";

      content.shared = { type: normalizedModelType };
      if (sharedId && mongoose.Types.ObjectId.isValid(sharedId)) {
        content.shared.refId = sharedId;
      }

      if (sharedData) {
        content.sharedData = typeof sharedData === "string" ? JSON.parse(sharedData) : sharedData;
      } else if (sharedId && mongoose.Types.ObjectId.isValid(sharedId)) {
        const postObj = await Post.findById(sharedId).populate("author", "userName profileImage isVerified");
        if (postObj) {
          content.sharedData = {
            _id: postObj._id,
            caption: postObj.caption,
            mediaUrl: postObj.mediaUrl || (postObj.media && postObj.media[0]?.url) || (postObj.carousel && postObj.carousel[0]?.url),
            author: postObj.author,
          };
        }
      }
    }

    // Disappearing message / Vanish mode support
    const disappearConfig = {};
    if (conversation.vanishMode) {
      disappearConfig.enabled = true;
      disappearConfig.afterSeen = true;
    } else if (conversation.disappearingMessages?.enabled) {
      const duration = conversation.disappearingMessages.duration || 86400;
      disappearConfig.enabled = true;
      disappearConfig.expireAt = new Date(Date.now() + duration * 1000);
    }

    let message;
    try {
      message = await Message.create({
        conversation: conversationId,
        sender: userId,
        type: req.files && req.files.length > 0 ? content.media[0].type : effectiveType,
        content,
        replyTo,
        status: "sent",
        disappear: disappearConfig.enabled ? disappearConfig : undefined,
        clientMessageId: clientMessageId || undefined,
      });
    } catch (createErr) {
      if (createErr.code === 11000 && clientMessageId) {
        const existingMessage = await Message.findOne({ clientMessageId }).populate("sender", "userName profileImage isVerified");
        if (existingMessage) {
          return res.status(200).json({ success: true, message: existingMessage, isDuplicate: true });
        }
      }
      throw createErr;
    }

    // Update lastMessage & unread counts atomically
    const incFields = {};
    conversation.participants.forEach((uid) => {
      if (uid.toString() !== userId.toString()) {
        incFields[`unreadCount.${uid.toString()}`] = 1;
      }
    });

    const updatedConv = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: { lastMessage: message._id },
        ...(Object.keys(incFields).length > 0 ? { $inc: incFields } : {}),
      },
      { new: true }
    );

    const populatedMessage = await message.populate("sender", "userName profileImage isVerified");

    // Socket real-time broadcast to ALL participants
    const io = req.app.locals.io;
    if (io && updatedConv) {
      updatedConv.participants.forEach((participantId) => {
        io.to(`user_${participantId}`).emit("message-received", {
          conversationId: conversationId.toString(),
          message: populatedMessage,
          unreadCount: updatedConv.unreadCount.get(participantId.toString()),
        });
      });
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: `sendMessage error: ${error.message}` });
  }
};

/* ================= SEND VOICE NOTE ================= */
export const sendVoiceNote = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId, duration } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file required for voice note" });
    }

    const upload = await uploadOnCloudinary(req.file.path, "VYBE/messages/voice");

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    // Block & Privacy check
    const privacyCheck = await checkMessagePrivacy(conversation, userId);
    if (!privacyCheck.allowed) {
      return res.status(privacyCheck.status).json({ message: privacyCheck.message });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "voice",
      content: {
        media: [{ url: upload.url, public_id: upload.public_id, type: "audio", name: "Voice Note" }],
        voiceDuration: Number(duration) || 0,
      },
    });

    // Update lastMessage & unread counts atomically
    const incFields = {};
    conversation.participants.forEach((uid) => {
      if (uid.toString() !== userId.toString()) {
        incFields[`unreadCount.${uid.toString()}`] = 1;
      }
    });

    const updatedConv = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: { lastMessage: message._id },
        ...(Object.keys(incFields).length > 0 ? { $inc: incFields } : {}),
      },
      { new: true }
    );

    const populatedMessage = await message.populate("sender", "userName profileImage isVerified");

    // Broadcast to all participants
    const io = req.app.locals.io;
    if (io && updatedConv) {
      updatedConv.participants.forEach((participantId) => {
        io.to(`user_${participantId}`).emit("message-received", {
          conversationId,
          message: populatedMessage,
          unreadCount: updatedConv.unreadCount.get(participantId.toString()),
        });
      });
    }

    return res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    return res.status(500).json({ message: `sendVoiceNote error: ${error.message}` });
  }
};

/* ================= FORWARD MESSAGE ================= */
export const forwardMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { targetConversationIds } = req.body; // Array of conversation IDs

    if (!targetConversationIds || targetConversationIds.length === 0) {
      return res.status(400).json({ message: "Target conversations required" });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) return res.status(404).json({ message: "Message not found" });

    if (originalMessage.deletedForEveryone) {
      return res.status(400).json({ message: "Cannot forward deleted message" });
    }

    const forwardedMessages = [];

    for (const targetConvId of targetConversationIds) {
      const targetConv = await Conversation.findById(targetConvId);
      if (!targetConv) continue;

      if (!targetConv.participants.some((p) => p.toString() === userId.toString())) continue;

      // Block & Privacy check
      const privacyCheck = await checkMessagePrivacy(targetConv, userId);
      if (!privacyCheck.allowed) continue;

      const forwarded = await Message.create({
        conversation: targetConvId,
        sender: userId,
        type: originalMessage.type,
        content: { ...originalMessage.content },
        isForwarded: true,
        forwardedFrom: originalMessage._id,
        forwardCount: (originalMessage.forwardCount || 0) + 1,
        status: "sent",
      });

      // Update lastMessage & unread counts atomically
      const incFields = {};
      targetConv.participants.forEach((uid) => {
        if (uid.toString() !== userId.toString()) {
          incFields[`unreadCount.${uid.toString()}`] = 1;
        }
      });

      const updatedTargetConv = await Conversation.findByIdAndUpdate(
        targetConvId,
        {
          $set: { lastMessage: forwarded._id },
          ...(Object.keys(incFields).length > 0 ? { $inc: incFields } : {}),
        },
        { new: true }
      );

      const populatedForwarded = await forwarded.populate("sender", "userName profileImage isVerified");
      forwardedMessages.push(populatedForwarded);

      // Socket broadcast
      const io = req.app.locals.io;
      if (io && updatedTargetConv) {
        updatedTargetConv.participants.forEach((participantId) => {
          io.to(`user_${participantId}`).emit("message-received", {
            conversationId: targetConvId.toString(),
            message: populatedForwarded,
            unreadCount: updatedTargetConv.unreadCount.get(participantId.toString()),
          });
        });
      }
    }

    // Increment forward count on original
    originalMessage.forwardCount = (originalMessage.forwardCount || 0) + targetConversationIds.length;
    await originalMessage.save();

    res.status(201).json({ success: true, messages: forwardedMessages });
  } catch (error) {
    res.status(500).json({ message: `forwardMessage error: ${error.message}` });
  }
};

/* ================= PIN MESSAGE ================= */
export const pinMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a participant" });
    }

    // Toggle pin
    if (message.isPinned) {
      message.isPinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;

      // Remove from conversation pinned list
      conversation.pinnedMessages = conversation.pinnedMessages.filter(
        (pm) => pm.message.toString() !== messageId
      );
    } else {
      // Max 3 pinned messages per conversation
      if (conversation.pinnedMessages.length >= 3) {
        return res.status(400).json({ message: "Maximum 3 pinned messages per chat" });
      }

      message.isPinned = true;
      message.pinnedAt = new Date();
      message.pinnedBy = userId;

      conversation.pinnedMessages.push({
        message: messageId,
        pinnedBy: userId,
        pinnedAt: new Date(),
      });
    }

    await Promise.all([message.save(), conversation.save()]);

    const io = req.app.locals.io;
    if (io) {
      conversation.participants.forEach((pid) => {
        io.to(`user_${pid}`).emit("message-pinned", {
          conversationId: message.conversation.toString(),
          messageId,
          isPinned: message.isPinned,
          pinnedBy: userId,
        });
      });
    }

    res.json({ success: true, isPinned: message.isPinned });
  } catch (error) {
    res.status(500).json({ message: `pinMessage error: ${error.message}` });
  }
};

/* ================= GET MESSAGES ================= */
export const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;

    // Automatically delete seen vanish messages in this conversation
    await Message.deleteMany({
      conversation: conversationId,
      "disappear.afterSeen": true,
      status: "seen",
    });

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const before = req.query.before;
    let filter = {
      conversation: conversationId,
      deletedFor: { $ne: userId },
    };

    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    let query = Message.find(filter)
      .populate("sender", "userName profileImage isVerified")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "userName profileImage isVerified",
        },
      });

    query = query.sort({ createdAt: -1 });
    if (!before) {
      query = query.skip((page - 1) * limit);
    }
    query = query.limit(limit);
    const messages = await query;
    return res.status(200).json({ success: true, messages: messages.reverse(), hasMore: messages.length === limit });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

/* ================= GET SHARED MEDIA ================= */
export const getSharedMedia = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    const { mediaType } = req.query; // "image", "video", "audio", "document", "link"
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    let filter = {
      conversation: conversationId,
      deletedFor: { $ne: userId },
      deletedForEveryone: { $ne: true },
    };

    if (mediaType === "link") {
      filter["content.linkPreview.url"] = { $exists: true, $ne: null };
    } else if (mediaType) {
      filter["content.media"] = { $elemMatch: { type: mediaType } };
    } else {
      filter["content.media"] = { $exists: true, $not: { $size: 0 } };
    }

    const messages = await Message.find(filter)
      .populate("sender", "userName profileImage isVerified")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, messages, hasMore: messages.length === limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= MARK AS SEEN ================= */
export const markConversationSeen = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    // Always reset the current user's unread count for the conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCount.${userId}`]: 0 },
    });

    const user = await User.findById(userId).select("readReceipts");
    if (!user?.readReceipts) return res.status(200).json({ success: true });

    // Update all unseen messages from others
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        "seenBy.user": { $ne: userId },
      },
      {
        $addToSet: { seenBy: { user: userId, seenAt: new Date() } },
        $set: { status: "seen" },
      }
    );

    const io = req.app.locals.io;
    if (io) {
      const conversation = await Conversation.findById(conversationId);
      conversation.participants.forEach((participantId) => {
        io.to(`user_${participantId}`).emit("messages-seen", {
          conversationId,
          seenBy: userId,
          seenAt: new Date(),
        });
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: `markSeen error: ${error.message}` });
  }
};

/* ================= EDIT MESSAGE ================= */
export const editMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Can only edit within 15 minutes
    const editWindow = 15 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > editWindow) {
      return res.status(400).json({ message: "Messages can only be edited within 15 minutes" });
    }

    message.content.text = text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const io = req.app.locals.io;
    if (io) {
      const conversation = await Conversation.findById(message.conversation);
      conversation.participants.forEach((pid) => {
        io.to(`user_${pid}`).emit("message-edited", {
          messageId,
          text,
          conversationId: message.conversation.toString(),
          editedAt: message.editedAt,
        });
      });
    }

    res.status(200).json({ success: true, message, info: "Message edited!" });
  } catch (error) {
    res.status(500).json({ message: `editMessage error: ${error.message}` });
  }
};

/* ================= DELETE MESSAGE (For Me) ================= */
export const deleteMessageForMe = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;

    const messageObj = await Message.findById(messageId);
    if (!messageObj) return res.status(404).json({ message: "Message not found" });

    const conversation = await Conversation.findById(messageObj.conversation);
    if (!conversation || !conversation.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: userId },
    });

    res.status(200).json({ success: true, message: "Message deleted!" });
  } catch (error) {
    res.status(500).json({ message: `deleteMessage error: ${error.message}` });
  }
};

/* ================= DELETE MESSAGE (For Everyone) ================= */
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (message.content?.media?.length > 0) {
      for (const m of message.content.media) {
        if (m.public_id) await deleteFromCloudinary(m.public_id).catch(() => null);
      }
    }

    message.deletedForEveryone = true;
    message.status = "seen";
    message.type = "text";
    message.content = { text: "This message was deleted" };
    message.reactions = [];
    message.isPinned = false;
    await message.save();

    const io = req.app.locals.io;
    if (io) {
      const conversation = await Conversation.findById(message.conversation);
      conversation.participants.forEach((pid) => {
        io.to(`user_${pid}`).emit("message-deleted-everyone", {
          messageId,
          conversationId: message.conversation.toString(),
        });
      });
    }

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ message: `deleteForEveryone error: ${error.message}` });
  }
};

/* ================= MARK SINGLE MESSAGE AS SEEN ================= */
export const markMessageAsSeen = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const alreadySeen = message.seenBy.some((s) =>
      (s.user || s).toString() === userId.toString()
    );

    if (!alreadySeen) {
      message.seenBy.push({ user: userId, seenAt: new Date() });
      message.status = "seen";
      await message.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= REACT MESSAGE ================= */
export const reactMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const existingIndex = message.reactions.findIndex((r) => r.user?.toString() === userId.toString());

    if (existingIndex !== -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
        message.reactions[existingIndex].reactedAt = new Date();
      }
    } else {
      message.reactions.push({ user: userId, emoji, reactedAt: new Date() });
    }

    await message.save();
    const populated = await message.populate("sender", "userName profileImage");

    const io = req.app.locals.io;
    if (io && conversation) {
      conversation.participants.forEach((pid) => {
        io.to(`user_${pid}`).emit("message-reaction-updated", {
          messageId,
          conversationId: message.conversation.toString(),
          reactions: message.reactions,
        });
      });
    }

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    res.status(500).json({ message: `reactMessage error: ${error.message}` });
  }
};

/* ================= SEARCH MESSAGES ================= */
export const searchMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    const { q } = req.query;

    if (!q) return res.json({ messages: [] });

    const safeRegex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const messages = await Message.find({
      conversation: conversationId,
      "content.text": { $regex: safeRegex, $options: "i" },
      deletedForEveryone: { $ne: true },
      deletedFor: { $ne: userId },
    })
      .populate("sender", "userName profileImage")
      .sort({ createdAt: 1 })
      .limit(50);

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET PINNED MESSAGES ================= */
export const getPinnedMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({
      conversation: conversationId,
      isPinned: true,
      deletedForEveryone: { $ne: true },
    })
      .populate("sender", "userName profileImage")
      .populate("pinnedBy", "userName")
      .sort({ pinnedAt: -1 })
      .limit(3);

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

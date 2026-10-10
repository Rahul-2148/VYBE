import { ChannelMessage } from "../models/channelMessage.model.js";
import { Channel } from "../models/channel.model.js";
import { Community } from "../models/community.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import { io } from "../socket.js";

// 1. Fetch channel messages history
export const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before, limit = 50 } = req.query;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }

    const community = await Community.findById(channel.community);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    const isMember = community.members.some((m) => m.user.toString() === req.userId.toString());
    if (!isMember && community.isPrivate) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this community" });
    }

    const query = { channel: channelId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChannelMessage.find(query)
      .populate("sender", "name userName profileImage")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name userName profileImage" },
      })
      .populate("reactions.user", "name userName profileImage")
      .sort({ createdAt: 1 })
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Send message to channel (REST API upload / voice / sticker / attachment)
export const sendChannelMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { text, type, replyTo, voiceDuration, stickerUrl, stickerName } = req.body;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }

    const community = await Community.findById(channel.community);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    const isMember = community.members.some((m) => m.user.toString() === req.userId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. You are not a member of this community." });
    }

    const mediaList = [];

    // Check sticker payload
    if (type === "sticker" && stickerUrl) {
      mediaList.push({
        url: stickerUrl,
        type: "sticker",
        name: stickerName || "Sticker",
        size: 0,
      });
    }

    // Process file uploads (Audio, Images, Videos, Voice notes, Documents)
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploaded = await uploadOnCloudinary(file.path, "VYBE/community/channels");
          let mediaType = "file";
          if (file.mimetype?.startsWith("image/")) mediaType = "image";
          else if (file.mimetype?.startsWith("video/")) mediaType = "video";
          else if (file.mimetype?.startsWith("audio/") || type === "voice") mediaType = type === "voice" ? "voice" : "audio";

          mediaList.push({
            url: uploaded.url,
            public_id: uploaded.public_id,
            type: mediaType,
            name: file.originalname || "Attachment",
            size: file.size || 0,
          });
        } catch (uploadErr) {
          console.warn("Channel media upload failed for file:", file.originalname, uploadErr.message);
        }
      }
    }

    let finalType = type || "text";
    if (type === "voice" || (mediaList.length > 0 && mediaList[0].type === "voice")) {
      finalType = "voice";
    } else if (mediaList.length > 0 && finalType === "text") {
      finalType = mediaList[0].type;
    }

    const message = await ChannelMessage.create({
      channel: channelId,
      community: channel.community,
      sender: req.userId,
      type: finalType,
      content: {
        text: text || "",
        media: mediaList,
        voiceDuration: voiceDuration ? Number(voiceDuration) : 0,
      },
      replyTo: replyTo || null,
    });

    const populated = await ChannelMessage.findById(message._id)
      .populate("sender", "name userName profileImage")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name userName profileImage" },
      });

    return res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    console.error("sendChannelMessage error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Toggle Emoji Reaction on a Channel Message
export const toggleMessageReaction = async (req, res) => {
  try {
    const { channelId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: "Emoji is required" });
    }

    const message = await ChannelMessage.findOne({ _id: messageId, channel: channelId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    const community = await Community.findById(message.community).select("members isPrivate");
    const isMember = community?.members.some((m) => String(m.user) === String(req.userId));
    if (!community || !isMember) {
      return res.status(403).json({ success: false, message: "Only community members can react to channel messages" });
    }
    if (typeof emoji !== "string" || !emoji.trim() || emoji.length > 32) {
      return res.status(400).json({ success: false, message: "A valid emoji reaction is required" });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.userId.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ user: req.userId, emoji });
    }

    await message.save();

    const populated = await ChannelMessage.findById(message._id)
      .populate("sender", "name userName profileImage")
      .populate("reactions.user", "name userName profileImage");

    return res.status(200).json({
      success: true,
      message: populated,
      action: existingIndex > -1 ? "removed" : "added",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Delete Channel Message
export const deleteChannelMessage = async (req, res) => {
  try {
    const { channelId, messageId } = req.params;

    const message = await ChannelMessage.findOne({ _id: messageId, channel: channelId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const community = await Community.findById(message.community);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }
    const member = community.members.find((m) => String(m.user) === String(req.userId));
    if (!member) {
      return res.status(403).json({ success: false, message: "You must be a current community member to delete channel messages" });
    }
    const isOwner = String(community.owner) === String(req.userId);
    const isAdmin = member.roles.includes("admin") || member.roles.includes("moderator") || member.roles.includes("owner");
    const isSender = String(message.sender) === String(req.userId);

    if (!isSender && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Permission denied to delete this message" });
    }

    await ChannelMessage.findByIdAndDelete(messageId);

    // Emit only after the API has authenticated the caller and authorized deletion.
    // Client-originated community:message-deleted broadcasts are not trusted.
    io?.to(`channel_${channelId}`).emit("community:message-deleted", {
      channelId,
      messageId,
      deletedBy: req.userId.toString(),
    });

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
      messageId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Toggle Pin Message
export const togglePinMessage = async (req, res) => {
  try {
    const { channelId, messageId } = req.params;

    const message = await ChannelMessage.findOne({ _id: messageId, channel: channelId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const community = await Community.findById(message.community);
    const member = community?.members.find((m) => m.user.toString() === req.userId.toString());
    const isOwner = community?.owner.toString() === req.userId.toString();
    const canPin = isOwner || member?.roles.includes("admin") || member?.roles.includes("moderator");

    if (!canPin) {
      return res.status(403).json({ success: false, message: "Only admins and moderators can pin messages" });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    const populated = await ChannelMessage.findById(message._id)
      .populate("sender", "name userName profileImage");

    return res.status(200).json({
      success: true,
      message: populated,
      isPinned: message.isPinned,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get Pinned Messages for Channel
export const getPinnedMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const channel = await Channel.findById(channelId).select("community");
    if (!channel) return res.status(404).json({ success: false, message: "Channel not found" });
    const community = await Community.findById(channel.community).select("members isPrivate");
    if (!community) return res.status(404).json({ success: false, message: "Community not found" });
    const isMember = community.members.some((m) => String(m.user) === String(req.userId));
    if (community.isPrivate && !isMember) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this private community" });
    }
    const messages = await ChannelMessage.find({ channel: channelId, isPinned: true })
      .populate("sender", "name userName profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Edit Channel Message
export const editChannelMessage = async (req, res) => {
  try {
    const { channelId, messageId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }

    const message = await ChannelMessage.findOne({ _id: messageId, channel: channelId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    const community = await Community.findById(message.community).select("members");
    const isMember = community?.members.some((m) => String(m.user) === String(req.userId));
    if (!community || !isMember) {
      return res.status(403).json({ success: false, message: "Only current community members can edit channel messages" });
    }
    if (typeof text !== "string" || !text.trim() || text.length > 5000) {
      return res.status(400).json({ success: false, message: "Text must be 1-5000 characters" });
    }

    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own messages" });
    }

    message.content.text = text.trim();
    message.edited = true;
    await message.save();

    const populated = await ChannelMessage.findById(message._id)
      .populate("sender", "name userName profileImage")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name userName profileImage" },
      })
      .populate("reactions.user", "name userName profileImage");

    return res.status(200).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

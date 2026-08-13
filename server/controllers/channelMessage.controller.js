import { ChannelMessage } from "../models/channelMessage.model.js";
import { Channel } from "../models/channel.model.js";
import { Community } from "../models/community.model.js";

// Fetch channel messages history
export const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }

    // Verify community membership
    const community = await Community.findById(channel.community);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    const isMember = community.members.some((m) => m.user.toString() === req.userId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this community" });
    }

    const messages = await ChannelMessage.find({ channel: channelId })
      .populate("sender", "name userName profileImage")
      .sort({ createdAt: 1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send message to channel (REST API fallback/upload)
export const sendChannelMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { text, type } = req.body;

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
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const mediaList = [];
    if (req.files && req.files.length > 0) {
      // If there are files from multer upload (e.g. image/video attachments)
      for (const file of req.files) {
        mediaList.push({
          url: file.path || file.secure_url,
          public_id: file.filename || file.public_id || "",
          type: file.mimetype?.split("/")[0] || "file",
          name: file.originalname || "Attachment",
          size: file.size || 0,
        });
      }
    }

    const message = await ChannelMessage.create({
      channel: channelId,
      community: channel.community,
      sender: req.userId,
      type: type || (mediaList.length > 0 ? mediaList[0].type : "text"),
      content: {
        text,
        media: mediaList,
      },
    });

    const populated = await message.populate("sender", "name userName profileImage");

    return res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

import { Community } from "../models/community.model.js";
import { Channel } from "../models/channel.model.js";
import crypto from "crypto";

// Create Community with default channels and roles
export const createCommunity = async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Community name is required" });
    }

    const inviteCode = crypto.randomBytes(4).toString("hex"); // e.g. "a1b2c3d4"

    const community = await Community.create({
      name,
      description: description || "",
      owner: req.userId,
      isPrivate: isPrivate || false,
      inviteCode,
      members: [
        {
          user: req.userId,
          roles: ["owner"],
        },
      ],
      roles: [
        { name: "owner", permissions: ["manage_channels", "manage_roles", "kick_members", "mute_members", "speak", "stream", "send_messages"] },
        { name: "member", permissions: ["speak", "send_messages"] },
      ],
    });

    // Create default channels
    const defaultChannels = [
      { name: "general-text", type: "text", position: 0 },
      { name: "general-voice", type: "voice", position: 1 },
      { name: "general-video", type: "video", position: 2 },
    ];

    const channelPromises = defaultChannels.map((ch) =>
      Channel.create({
        community: community._id,
        name: ch.name,
        type: ch.type,
        position: ch.position,
      })
    );

    const channels = await Promise.all(channelPromises);

    return res.status(201).json({
      success: true,
      message: "Community created successfully!",
      community,
      channels,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch all communities of current user
export const getUserCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ "members.user": req.userId })
      .populate("owner", "name userName profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, communities });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get details of a single community, including channels
export const getCommunityDetails = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId)
      .populate("owner", "name userName profileImage")
      .populate("members.user", "name userName profileImage isOnline");

    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    // Check if user is a member
    const isMember = community.members.some((m) => m.user._id.toString() === req.userId.toString());
    if (!isMember && community.isPrivate) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const channels = await Channel.find({ community: communityId }).sort({ position: 1 });

    return res.status(200).json({ success: true, community, channels });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new channel
export const createChannel = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: "Name and type are required" });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    // Check permission (owner or manage_channels)
    const member = community.members.find((m) => m.user.toString() === req.userId.toString());
    if (!member) {
      return res.status(403).json({ success: false, message: "Not a member of this community" });
    }

    const hasPermission =
      community.owner.toString() === req.userId.toString() ||
      member.roles.includes("admin") ||
      member.roles.some((rName) => {
        const role = community.roles.find((rl) => rl.name === rName);
        return role?.permissions.includes("manage_channels");
      });

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: "You do not have permission to create channels" });
    }

    const lastChannel = await Channel.findOne({ community: communityId }).sort({ position: -1 });
    const position = lastChannel ? lastChannel.position + 1 : 0;

    const channel = await Channel.create({
      community: communityId,
      name,
      type,
      description: description || "",
      position,
    });

    return res.status(201).json({ success: true, message: "Channel created!", channel });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Join a community via invite code
export const joinCommunity = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ success: false, message: "Invite code is required" });
    }

    const community = await Community.findOne({ inviteCode });
    if (!community) {
      return res.status(404).json({ success: false, message: "Invalid invite code" });
    }

    const isAlreadyMember = community.members.some((m) => m.user.toString() === req.userId.toString());
    if (isAlreadyMember) {
      return res.status(400).json({ success: false, message: "You are already a member of this community" });
    }

    community.members.push({
      user: req.userId,
      roles: ["member"],
    });

    await community.save();

    return res.status(200).json({ success: true, message: "Joined community successfully!", community });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

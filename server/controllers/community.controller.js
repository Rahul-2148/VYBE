import { Community } from "../models/community.model.js";
import { Channel } from "../models/channel.model.js";
import { ChannelMessage } from "../models/channelMessage.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import crypto from "crypto";

// 1. Create Community with categorized default channels and roles
export const createCommunity = async (req, res) => {
  try {
    const { name, description, category, tags, isPrivate, welcomeMessage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Community name is required" });
    }

    const inviteCode = crypto.randomBytes(4).toString("hex");

    let iconData = { url: "", public_id: "" };
    let bannerData = { url: "", public_id: "" };

    if (req.files) {
      if (req.files.icon && req.files.icon[0]) {
        try {
          const uploadedIcon = await uploadOnCloudinary(req.files.icon[0].path, "VYBE/community/icons");
          if (uploadedIcon?.url) {
            iconData = { url: uploadedIcon.url, public_id: uploadedIcon.public_id };
          }
        } catch (err) {
          console.warn("Icon upload failed:", err.message);
        }
      }
      if (req.files.banner && req.files.banner[0]) {
        try {
          const uploadedBanner = await uploadOnCloudinary(req.files.banner[0].path, "VYBE/community/banners");
          if (uploadedBanner?.url) {
            bannerData = { url: uploadedBanner.url, public_id: uploadedBanner.public_id };
          }
        } catch (err) {
          console.warn("Banner upload failed:", err.message);
        }
      }
    }

    const parsedTags = typeof tags === "string" ? tags.split(",").map((t) => t.trim()).filter(Boolean) : (Array.isArray(tags) ? tags : []);

    const community = await Community.create({
      name: name.trim(),
      description: description || "",
      category: category || "General",
      tags: parsedTags,
      owner: req.userId,
      isPrivate: isPrivate === "true" || isPrivate === true,
      inviteCode,
      image: iconData,
      icon: iconData,
      banner: bannerData,
      welcomeMessage: welcomeMessage || "Welcome to the community! Feel free to introduce yourself.",
      memberCount: 1,
      members: [
        {
          user: req.userId,
          roles: ["owner"],
          joinedAt: new Date(),
        },
      ],
      roles: [
        { name: "owner", permissions: ["manage_channels", "manage_roles", "kick_members", "mute_members", "speak", "stream", "send_messages"] },
        { name: "admin", permissions: ["manage_channels", "kick_members", "mute_members", "speak", "stream", "send_messages"] },
        { name: "moderator", permissions: ["kick_members", "mute_members", "speak", "stream", "send_messages"] },
        { name: "member", permissions: ["speak", "send_messages"] },
      ],
    });

    // Default categorized channels
    const defaultChannels = [
      { name: "announcements", type: "text", category: "ANNOUNCEMENTS", topic: "Important server announcements", position: 0 },
      { name: "general-chat", type: "text", category: "TEXT CHANNELS", topic: "Hangout and chit-chat", position: 1 },
      { name: "memes-and-media", type: "text", category: "TEXT CHANNELS", topic: "Share spicy memes, photos and clips", position: 2 },
      { name: "General Lounge", type: "voice", category: "VOICE ROOMS", topic: "Casual drop-in voice hangouts", position: 3 },
      { name: "Video Stage", type: "video", category: "VOICE ROOMS", topic: "Live video and screen-share room", position: 4 },
    ];

    const channelPromises = defaultChannels.map((ch) =>
      Channel.create({
        community: community._id,
        name: ch.name,
        type: ch.type,
        category: ch.category,
        topic: ch.topic,
        position: ch.position,
      })
    );

    const channels = await Promise.all(channelPromises);

    const populated = await Community.findById(community._id).populate("owner", "name userName profileImage");

    return res.status(201).json({
      success: true,
      message: "Community created successfully!",
      community: populated,
      channels,
    });
  } catch (error) {
    console.error("createCommunity error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Fetch all joined communities of current user
export const getUserCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ "members.user": req.userId })
      .populate("owner", "name userName profileImage")
      .sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, communities });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get single community details + categorized channels
export const getCommunityDetails = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId)
      .populate("owner", "name userName profileImage bio")
      .populate("members.user", "name userName profileImage isOnline bio");

    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    const isMember = community.members.some(
      (m) => m.user?._id?.toString() === req.userId.toString() || m.user?.toString() === req.userId.toString()
    );

    if (!isMember && community.isPrivate) {
      return res.status(403).json({ success: false, message: "Access denied. Private community" });
    }

    const channels = await Channel.find({ community: communityId }).sort({ position: 1 });

    return res.status(200).json({
      success: true,
      community,
      channels,
      isMember,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Discover public communities (Explore Directory)
export const getExploreCommunities = async (req, res) => {
  try {
    const { category, search, sort = "popular", page = 1, limit = 20 } = req.query;
    const query = { isPrivate: false };

    if (category && category !== "All") {
      query.category = category;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }

    let sortOptions = { memberCount: -1, createdAt: -1 };
    if (sort === "newest") sortOptions = { createdAt: -1 };
    else if (sort === "name") sortOptions = { name: 1 };

    const total = await Community.countDocuments(query);
    const communities = await Community.find(query)
      .populate("owner", "name userName profileImage")
      .sort(sortOptions)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      communities,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("getExploreCommunities error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Join a public community without invite code
export const joinPublicCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    if (community.isPrivate) {
      return res.status(403).json({ success: false, message: "Cannot direct join a private community. Use invite code." });
    }

    const isAlreadyMember = community.members.some((m) => m.user.toString() === req.userId.toString());
    if (isAlreadyMember) {
      return res.status(400).json({ success: false, message: "You are already a member of this community" });
    }

    community.members.push({
      user: req.userId,
      roles: ["member"],
      joinedAt: new Date(),
    });
    community.memberCount = community.members.length;
    await community.save();

    const populated = await Community.findById(community._id)
      .populate("owner", "name userName profileImage")
      .populate("members.user", "name userName profileImage isOnline");

    const channels = await Channel.find({ community: community._id }).sort({ position: 1 });

    return res.status(200).json({
      success: true,
      message: `Welcome to ${community.name}!`,
      community: populated,
      channels,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Join via Invite Code
export const joinCommunity = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ success: false, message: "Invite code is required" });
    }

    const community = await Community.findOne({ inviteCode: inviteCode.trim() });
    if (!community) {
      return res.status(404).json({ success: false, message: "Invalid invite code or community not found" });
    }

    const isAlreadyMember = community.members.some((m) => m.user.toString() === req.userId.toString());
    if (isAlreadyMember) {
      return res.status(400).json({ success: false, message: "You are already a member of this server" });
    }

    community.members.push({
      user: req.userId,
      roles: ["member"],
      joinedAt: new Date(),
    });
    community.memberCount = community.members.length;
    await community.save();

    const populated = await Community.findById(community._id)
      .populate("owner", "name userName profileImage")
      .populate("members.user", "name userName profileImage isOnline");

    const channels = await Channel.find({ community: community._id }).sort({ position: 1 });

    return res.status(200).json({
      success: true,
      message: `Successfully joined ${community.name}!`,
      community: populated,
      channels,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Update Community settings (Name, description, icon, banner, privacy, category)
export const updateCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { name, description, category, tags, isPrivate, welcomeMessage } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    // Permission check: Owner or Admin
    const member = community.members.find((m) => m.user.toString() === req.userId.toString());
    const isOwner = community.owner.toString() === req.userId.toString();
    const isAdmin = member?.roles.includes("admin") || member?.roles.includes("owner");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "You don't have permission to edit this community" });
    }

    if (name) community.name = name.trim();
    if (description !== undefined) community.description = description.trim();
    if (category) community.category = category;
    if (welcomeMessage !== undefined) community.welcomeMessage = welcomeMessage;
    if (isPrivate !== undefined) community.isPrivate = isPrivate === "true" || isPrivate === true;

    if (tags !== undefined) {
      community.tags = typeof tags === "string" ? tags.split(",").map((t) => t.trim()).filter(Boolean) : (Array.isArray(tags) ? tags : []);
    }

    if (req.files) {
      if (req.files.icon && req.files.icon[0]) {
        const uploadedIcon = await uploadOnCloudinary(req.files.icon[0].path, "VYBE/community/icons");
        if (uploadedIcon?.url) {
          community.image = { url: uploadedIcon.url, public_id: uploadedIcon.public_id };
          community.icon = { url: uploadedIcon.url, public_id: uploadedIcon.public_id };
        }
      }
      if (req.files.banner && req.files.banner[0]) {
        const uploadedBanner = await uploadOnCloudinary(req.files.banner[0].path, "VYBE/community/banners");
        if (uploadedBanner?.url) {
          community.banner = { url: uploadedBanner.url, public_id: uploadedBanner.public_id };
        }
      }
    }

    await community.save();

    const populated = await Community.findById(community._id)
      .populate("owner", "name userName profileImage")
      .populate("members.user", "name userName profileImage isOnline");

    return res.status(200).json({
      success: true,
      message: "Community updated successfully!",
      community: populated,
    });
  } catch (error) {
    console.error("updateCommunity error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Regenerate invite code
export const regenerateInviteCode = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    const isOwner = community.owner.toString() === req.userId.toString();
    const member = community.members.find((m) => m.user.toString() === req.userId.toString());
    const isAdmin = member?.roles.includes("admin") || member?.roles.includes("owner");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    community.inviteCode = crypto.randomBytes(4).toString("hex");
    await community.save();

    return res.status(200).json({
      success: true,
      message: "New invite code generated!",
      inviteCode: community.inviteCode,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Leave Community
export const leaveCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    if (community.owner.toString() === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "As the server owner, you cannot leave without deleting or transferring ownership.",
      });
    }

    community.members = community.members.filter((m) => m.user.toString() !== req.userId.toString());
    community.memberCount = community.members.length;
    await community.save();

    return res.status(200).json({
      success: true,
      message: `Left ${community.name} successfully`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 10. Delete Community (Owner only)
export const deleteCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    if (community.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the owner can delete this community" });
    }

    // Delete associated channels & messages
    await ChannelMessage.deleteMany({ community: communityId });
    await Channel.deleteMany({ community: communityId });
    await Community.findByIdAndDelete(communityId);

    return res.status(200).json({
      success: true,
      message: "Community and all channels deleted permanently",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 11. Update Member Role (Assign/Revoke Admin, Moderator, Member)
export const updateMemberRole = async (req, res) => {
  try {
    const { communityId, targetUserId } = req.params;
    const { role } = req.body; // e.g. "admin", "moderator", "member"

    const validRoles = ["admin", "moderator", "member"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    const isOwner = community.owner.toString() === req.userId.toString();
    const callerMember = community.members.find((m) => m.user.toString() === req.userId.toString());
    const isCallerAdmin = callerMember?.roles.includes("admin") || callerMember?.roles.includes("owner");

    if (!isOwner && !isCallerAdmin) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    const targetMember = community.members.find((m) => m.user.toString() === targetUserId.toString());
    if (!targetMember) {
      return res.status(404).json({ success: false, message: "Member not found in community" });
    }

    if (community.owner.toString() === targetUserId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot change owner role" });
    }

    // Replace roles with the selected role (keep base member)
    targetMember.roles = role === "member" ? ["member"] : [role, "member"];
    await community.save();

    const populated = await Community.findById(communityId)
      .populate("owner", "name userName profileImage")
      .populate("members.user", "name userName profileImage isOnline");

    return res.status(200).json({
      success: true,
      message: `Updated role to ${role}`,
      community: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 12. Kick Member
export const kickMember = async (req, res) => {
  try {
    const { communityId, targetUserId } = req.params;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    const isOwner = community.owner.toString() === req.userId.toString();
    const callerMember = community.members.find((m) => m.user.toString() === req.userId.toString());
    const isCallerAdmin = callerMember?.roles.includes("admin") || callerMember?.roles.includes("owner") || callerMember?.roles.includes("moderator");

    if (!isOwner && !isCallerAdmin) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    if (community.owner.toString() === targetUserId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot kick community owner" });
    }

    community.members = community.members.filter((m) => m.user.toString() !== targetUserId.toString());
    community.memberCount = community.members.length;
    await community.save();

    const populated = await Community.findById(communityId)
      .populate("owner", "name userName profileImage")
      .populate("members.user", "name userName profileImage isOnline");

    return res.status(200).json({
      success: true,
      message: "Member removed from community",
      community: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 13. Create Channel
export const createChannel = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { name, type, category, topic, description, isPrivate, allowedRoles } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: "Channel name and type are required" });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found" });
    }

    const member = community.members.find((m) => m.user.toString() === req.userId.toString());
    const isOwner = community.owner.toString() === req.userId.toString();
    const canManage = isOwner || member?.roles.includes("admin") || member?.roles.includes("owner");

    if (!canManage) {
      return res.status(403).json({ success: false, message: "You do not have permission to create channels" });
    }

    const lastChannel = await Channel.findOne({ community: communityId }).sort({ position: -1 });
    const position = lastChannel ? lastChannel.position + 1 : 0;

    let assignedCategory = category;
    if (!assignedCategory) {
      assignedCategory = type === "text" ? "TEXT CHANNELS" : "VOICE ROOMS";
    }

    const channel = await Channel.create({
      community: communityId,
      name: name.trim().replace(/\s+/g, "-").toLowerCase(),
      type,
      category: assignedCategory,
      topic: topic || description || "",
      description: description || topic || "",
      isPrivate: isPrivate === "true" || isPrivate === true,
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [],
      position,
    });

    return res.status(201).json({ success: true, message: "Channel created!", channel });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 14. Update Channel
export const updateChannel = async (req, res) => {
  try {
    const { communityId, channelId } = req.params;
    const { name, topic, category, slowmode } = req.body;

    const channel = await Channel.findOne({ _id: channelId, community: communityId });
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }

    const community = await Community.findById(communityId);
    const member = community?.members.find((m) => m.user.toString() === req.userId.toString());
    const isOwner = community?.owner.toString() === req.userId.toString();
    const canManage = isOwner || member?.roles.includes("admin");

    if (!canManage) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    if (name) channel.name = name.trim().replace(/\s+/g, "-").toLowerCase();
    if (topic !== undefined) channel.topic = topic;
    if (category) channel.category = category;
    if (slowmode !== undefined) channel.slowmode = Number(slowmode);

    await channel.save();

    return res.status(200).json({ success: true, message: "Channel updated!", channel });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 15. Delete Channel
export const deleteChannel = async (req, res) => {
  try {
    const { communityId, channelId } = req.params;

    const channel = await Channel.findOne({ _id: channelId, community: communityId });
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }

    const community = await Community.findById(communityId);
    const member = community?.members.find((m) => m.user.toString() === req.userId.toString());
    const isOwner = community?.owner.toString() === req.userId.toString();
    const canManage = isOwner || member?.roles.includes("admin");

    if (!canManage) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    await ChannelMessage.deleteMany({ channel: channelId });
    await Channel.findByIdAndDelete(channelId);

    return res.status(200).json({ success: true, message: "Channel deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

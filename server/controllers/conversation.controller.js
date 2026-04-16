import crypto from "crypto";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";

/* ================= HELPERS ================= */
const isAdmin = (conversation, userId) =>
  conversation.admins.some((a) => a.user.toString() === userId.toString());

const isOwner = (conversation, userId) =>
  conversation.admins.some(
    (a) => a.user.toString() === userId.toString() && a.role === "owner"
  );

/* ================= CLEANUP MESSAGES MEDIA ================= */
const cleanupMessagesMedia = async (conversationId) => {
  const messages = await Message.find({ conversation: conversationId });

  for (let msg of messages) {
    if (msg.content?.media?.public_id) {
      await deleteFromCloudinary(msg.content.media.public_id);
    }
  }

  await Message.deleteMany({ conversation: conversationId });
};

/* ================= 1-1 CHAT ================= */
export const createOneToOneConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { userId: otherUserId } = req.body;

    if (!userId || !otherUserId) {
      return res.status(400).json({ message: "User missing" });
    }

    // 🔥 IMPORTANT: existing conversation check
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, otherUserId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, otherUserId],
        isGroup: false,
      });
    }

    res.status(200).json({ conversation });
  } catch (err) {
    console.error("createOneToOneConversation error:", err);
    res.status(500).json({ message: "Conversation failed" });
  }
};

/* ================= CREATE GROUP ================= */
export const createGroupConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, members } = req.body;

    if (!name || !members || members.length < 2)
      return res.status(400).json({
        message: "Group needs name & minimum 3 members",
      });

    const participants = [...new Set([...members, userId])];
    const unreadCount = {};
    participants.forEach((id) => (unreadCount[id] = 0));

    const conversation = await Conversation.create({
      isGroup: true,
      groupName: name,
      participants,
      admins: [{ user: userId, role: "owner" }],
      unreadCount,
    });

    res.status(201).json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADD MEMBER ================= */
export const addGroupMember = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { memberId } = req.body;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ message: "Group not found" });

    if (!isAdmin(conversation, userId))
      return res.status(403).json({ message: "Admin only" });

    if (conversation.participants.includes(memberId))
      return res.status(400).json({ message: "Already member" });

    conversation.participants.push(memberId);
    conversation.unreadCount.set(memberId, 0);

    await conversation.save();
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= REMOVE / LEAVE ================= */
export const removeGroupMember = async (req, res) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ message: "Group not found" });

    if (!isAdmin(conversation, userId) && userId !== memberId)
      return res.status(403).json({ message: "Not allowed" });

    conversation.participants.pull(memberId);
    conversation.admins = conversation.admins.filter(
      (a) => a.user.toString() !== memberId
    );
    conversation.unreadCount.delete(memberId);

    // ✅ Cleanup if last member removed
    if (conversation.participants.length < 2) {
      await cleanupMessagesMedia(conversation._id);
      await conversation.deleteOne();
      return res.json({ success: true, deleted: true });
    }

    if (
      conversation.admins.length === 0 &&
      conversation.participants.length > 0
    ) {
      conversation.admins.push({
        user: conversation.participants[0],
        role: "owner",
      });
    }

    await conversation.save();
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= RENAME ================= */
export const renameGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ message: "Group not found" });

    if (!isAdmin(conversation, userId))
      return res.status(403).json({ message: "Admin only" });

    conversation.groupName = name;
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= MAKE / REMOVE CO-ADMIN ================= */
export const makeCoAdmin = async (req, res) => {
  const { conversationId, memberId } = req.params;
  const userId = req.userId;

  const conversation = await Conversation.findById(conversationId);
  if (!isOwner(conversation, userId))
    return res.status(403).json({ message: "Owner only" });

  const admin = conversation.admins.find((a) => a.user.toString() === memberId);

  if (admin) admin.role = "co-admin";
  else conversation.admins.push({ user: memberId, role: "co-admin" });

  await conversation.save();
  res.json({ success: true });
};

export const removeCoAdmin = async (req, res) => {
  const { conversationId, memberId } = req.params;
  const userId = req.userId;

  const conversation = await Conversation.findById(conversationId);
  if (!isOwner(conversation, userId))
    return res.status(403).json({ message: "Owner only" });

  conversation.admins = conversation.admins.filter(
    (a) => a.user.toString() !== memberId
  );

  await conversation.save();
  res.json({ success: true });
};

/* ================= INVITE LINK ================= */
export const createInviteLink = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.userId;

  const conversation = await Conversation.findById(conversationId);
  if (!isAdmin(conversation, userId))
    return res.status(403).json({ message: "Admin only" });

  const token = crypto.randomBytes(20).toString("hex");

  conversation.invite = {
    token,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  await conversation.save();

  res.json({
    success: true,
    link: `${process.env.CLIENT_URL}/invite/${token}`,
  });
};

export const joinViaInvite = async (req, res) => {
  const { token } = req.params;
  const userId = req.userId;

  const conversation = await Conversation.findOne({
    "invite.token": token,
    "invite.expiresAt": { $gt: Date.now() },
  });

  if (!conversation) return res.status(400).json({ message: "Invalid invite" });

  if (!conversation.participants.includes(userId)) {
    conversation.participants.push(userId);
    conversation.unreadCount.set(userId, 0);
    await conversation.save();
  }

  res.json({ success: true, conversationId: conversation._id });
};

/* ================= USER INBOX ================= */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "userName profileImage")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "userName profileImage" },
      })
      .sort({ updatedAt: -1 });

    const map = new Map();

    conversations.forEach((conv) => {
      // 🧠 GROUP CHAT
      if (conv.isGroup) {
        map.set(conv._id.toString(), {
          _id: conv._id,
          isGroup: true,
          name: conv.groupName,
          avatar: conv.groupImage?.url,
          participants: conv.participants,
          lastMessage: conv.lastMessage,
        });
        return;
      }

      // 🧠 1–1 CHAT
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      if (!otherUser) return;

      const key = otherUser._id.toString(); // 🔥 duplicate killer

      if (!map.has(key)) {
        map.set(key, {
          _id: conv._id,
          isGroup: false,
          participant: otherUser, 
          lastMessage: conv.lastMessage,
        });
      }
    });

    return res.status(200).json({
      conversations: Array.from(map.values()),
    });
  } catch (err) {
    console.error("getUserConversations error:", err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

/* ================= MUTE ================= */
export const toggleMuteConversation = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.userId;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return res.status(404).json({ message: "Not found" });

  if (conversation.mutedBy.includes(userId)) conversation.mutedBy.pull(userId);
  else conversation.mutedBy.push(userId);

  await conversation.save();

  res.json({
    success: true,
    muted: conversation.mutedBy.includes(userId),
  });
};

// PIN / UNPIN conversation
export const togglePinConversation = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.userId;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return res.status(404).json({ message: "Not found" });

  if (conversation.pinnedBy.includes(userId)) {
    conversation.pinnedBy.pull(userId);
  } else {
    conversation.pinnedBy.push(userId);
  }

  await conversation.save();

  res.json({
    success: true,
    pinned: conversation.pinnedBy.includes(userId),
  });
};

/* ================= VANISH MODE ================= */
export const toggleVanishMode = async (req, res) => {
  const { conversationId } = req.params;
  const { duration } = req.body; // seconds
  const userId = req.userId;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return res.status(404).json({ message: "Not found" });

  if (!conversation.participants.includes(userId))
    return res.status(403).json({ message: "Unauthorized" });

  conversation.vanishMode = !conversation.vanishMode;
  conversation.vanishDuration = duration || null;

  await conversation.save();

  res.json({
    success: true,
    vanishMode: conversation.vanishMode,
  });
};

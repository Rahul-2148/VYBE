import mongoose from "mongoose";
import crypto from "crypto";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";
import { isUserOnline } from "../socket.js";

/* ================= HELPERS ================= */
const isAdmin = (conversation, userId) =>
  conversation.admins.some((a) => a.user.toString() === userId.toString());

const isOwner = (conversation, userId) =>
  conversation.admins.some(
    (a) => a.user.toString() === userId.toString() && a.role === "owner"
  );

/* ================= CLEANUP MESSAGES MEDIA ================= */
const cleanupMessagesMedia = async (conversationId) => {
  const BATCH_SIZE = 100;
  let skip = 0;
  let batch;

  do {
    batch = await Message.find({ conversation: conversationId })
      .skip(skip)
      .limit(BATCH_SIZE)
      .select("content");

    for (const msg of batch) {
      if (msg.content?.media?.length > 0) {
        for (const m of msg.content.media) {
          if (m.public_id) {
            await deleteFromCloudinary(m.public_id).catch(() => null);
          }
        }
      }
    }

    skip += BATCH_SIZE;
  } while (batch.length === BATCH_SIZE);

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

    // Existing conversation check
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
    const { name, members, description } = req.body;

    if (!name || !members || members.length < 2)
      return res.status(400).json({
        message: "Group needs name & minimum 3 members",
      });

    // Bidirectional block check for all proposed members
    const blockedByCreator = await getBlockedUserIds(userId);
    for (const memberId of members) {
      if (blockedByCreator.includes(memberId.toString())) {
        return res.status(400).json({ message: "Unable to create group. One or more users are blocked." });
      }
      const memberBlockedList = await getBlockedUserIds(memberId);
      if (memberBlockedList.includes(userId.toString())) {
        return res.status(400).json({ message: "Unable to create group due to privacy settings of some users." });
      }
    }

    const participants = [...new Set([...members, userId])];
    const unreadCount = {};
    participants.forEach((id) => (unreadCount[id] = 0));

    const conversation = await Conversation.create({
      isGroup: true,
      groupName: name,
      description: description || "",
      participants,
      admins: [{ user: userId, role: "owner" }],
      unreadCount,
    });

    // Create system message for group creation
    await Message.create({
      conversation: conversation._id,
      sender: userId,
      type: "system",
      content: { text: "created this group" },
      systemEvent: "group_created",
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

    if (conversation.participants.some((p) => p.toString() === memberId))
      return res.status(400).json({ message: "Already member" });

    // Bidirectional block check
    const blockedByCreator = await getBlockedUserIds(userId);
    if (blockedByCreator.includes(memberId.toString())) {
      return res.status(400).json({ message: "Unable to add user due to privacy settings." });
    }
    const memberBlockedList = await getBlockedUserIds(memberId);
    if (memberBlockedList.includes(userId.toString())) {
      return res.status(400).json({ message: "Unable to add user due to privacy settings." });
    }

    conversation.participants.push(memberId);
    conversation.unreadCount.set(memberId, 0);
    await conversation.save();

    // System message
    await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "system",
      content: { text: "added a member" },
      systemEvent: "member_added",
      systemEventData: { targetUser: memberId },
    });

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

    const isSelf = userId === memberId;

    if (!isAdmin(conversation, userId) && !isSelf)
      return res.status(403).json({ message: "Not allowed" });

    conversation.participants.pull(memberId);
    conversation.admins = conversation.admins.filter(
      (a) => a.user.toString() !== memberId
    );
    conversation.unreadCount.delete(memberId);

    // System message
    await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "system",
      content: { text: isSelf ? "left the group" : "removed a member" },
      systemEvent: isSelf ? "member_left" : "member_removed",
      systemEventData: { targetUser: memberId },
    });

    // Cleanup if last member
    if (conversation.participants.length < 2) {
      await cleanupMessagesMedia(conversation._id);
      await conversation.deleteOne();
      return res.json({ success: true, deleted: true });
    }

    // Auto-assign owner if no admins left
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

    const oldName = conversation.groupName;
    conversation.groupName = name;
    await conversation.save();

    // System message
    await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "system",
      content: { text: `renamed the group from "${oldName}" to "${name}"` },
      systemEvent: "group_renamed",
    });

    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE GROUP DESCRIPTION ================= */
export const updateGroupDescription = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { description } = req.body;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ message: "Group not found" });

    if (!isAdmin(conversation, userId))
      return res.status(403).json({ message: "Admin only" });

    conversation.description = description || "";
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= MAKE / REMOVE CO-ADMIN ================= */
export const makeCoAdmin = async (req, res) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!isOwner(conversation, userId))
      return res.status(403).json({ message: "Owner only" });

    const admin = conversation.admins.find((a) => a.user.toString() === memberId);

    if (admin) admin.role = "co-admin";
    else conversation.admins.push({ user: memberId, role: "co-admin" });

    await conversation.save();

    // System message
    await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "system",
      content: { text: "made a member admin" },
      systemEvent: "admin_promoted",
      systemEventData: { targetUser: memberId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeCoAdmin = async (req, res) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!isOwner(conversation, userId))
      return res.status(403).json({ message: "Owner only" });

    conversation.admins = conversation.admins.filter(
      (a) => a.user.toString() !== memberId
    );

    await conversation.save();

    await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "system",
      content: { text: "removed admin role" },
      systemEvent: "admin_demoted",
      systemEventData: { targetUser: memberId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= INVITE LINK ================= */
export const createInviteLink = async (req, res) => {
  try {
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
      link: `${process.env.FRONTEND_URL}/invite/${token}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const joinViaInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOne({
      "invite.token": token,
      "invite.expiresAt": { $gt: Date.now() },
    });

    if (!conversation) return res.status(400).json({ message: "Invalid invite" });

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      conversation.participants.push(userId);
      conversation.unreadCount.set(userId, 0);
      await conversation.save();
    }

    res.json({ success: true, conversationId: conversation._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= USER INBOX (PRODUCTION-GRADE) ================= */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "userName profileImage isOnline lastSeen name")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "userName profileImage" },
      })
      .sort({ updatedAt: -1 });

    const results = [];
    const seenDmUsers = new Set();

    conversations.forEach((conv) => {
      const isArchived = conv.archivedBy?.includes(userId);
      const isPinned = conv.pinnedBy?.includes(userId);
      const isMuted = conv.mutedBy?.includes(userId);
      const isBlocked = conv.blockedBy?.includes(userId);
      const userUnread = typeof conv.unreadCount?.get === "function"
        ? (conv.unreadCount.get(userId.toString()) || 0)
        : (conv.unreadCount?.[userId.toString()] || 0);

      // GROUP CHAT
      if (conv.isGroup) {
        const enrichedParticipants = (conv.participants || []).map((p) => {
          if (!p) return p;
          const pid = (p._id || p)?.toString();
          const online = pid ? isUserOnline(pid) : false;
          return p.toObject ? { ...p.toObject(), isOnline: online || Boolean(p.isOnline) } : p;
        });

        results.push({
          _id: conv._id,
          isGroup: true,
          name: conv.groupName,
          description: conv.description,
          avatar: conv.groupImage?.url,
          participants: enrichedParticipants,
          admins: conv.admins,
          lastMessage: conv.lastMessage,
          unreadCount: userUnread,
          isPinned,
          isMuted,
          isArchived,
          isBlocked,
          theme: conv.theme,
          disappearingMessages: conv.disappearingMessages,
          requestStatus: conv.requestStatus,
          updatedAt: conv.updatedAt,
        });
        return;
      }

      // 1-1 CHAT — deduplicate
      const otherUser = (conv.participants || []).find((p) => {
        const pid = p?._id ? p._id.toString() : p?.toString();
        return pid && pid !== userId.toString();
      });

      if (!otherUser) return;

      const otherUserId = otherUser?._id ? otherUser._id.toString() : otherUser?.toString();
      if (!otherUserId || seenDmUsers.has(otherUserId)) return;
      seenDmUsers.add(otherUserId);

      const isOtherOnline = isUserOnline(otherUserId);
      const participantObj = otherUser.toObject
        ? { ...otherUser.toObject(), isOnline: isOtherOnline || Boolean(otherUser.isOnline) }
        : { ...otherUser, isOnline: isOtherOnline || Boolean(otherUser.isOnline) };

      results.push({
        _id: conv._id,
        isGroup: false,
        participant: participantObj,
        lastMessage: conv.lastMessage,
        unreadCount: userUnread,
        isPinned,
        isMuted,
        isArchived,
        isBlocked,
        theme: conv.theme,
        disappearingMessages: conv.disappearingMessages,
        requestStatus: conv.requestStatus,
        updatedAt: conv.updatedAt,
      });
    });

    // Sort: pinned first, then by updatedAt
    results.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return res.status(200).json({ conversations: results });
  } catch (err) {
    console.error("getUserConversations error:", err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

/* ================= MUTE ================= */
export const toggleMuteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    const isMuted = conversation.mutedBy.some((id) => id.toString() === userId);

    if (isMuted) conversation.mutedBy.pull(userId);
    else conversation.mutedBy.push(userId);

    await conversation.save();

    res.json({
      success: true,
      muted: !isMuted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= PIN / UNPIN ================= */
export const togglePinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    const isPinned = conversation.pinnedBy.some((id) => id.toString() === userId);

    if (isPinned) {
      conversation.pinnedBy.pull(userId);
    } else {
      // Max 3 pinned conversations per user
      const pinnedCount = await Conversation.countDocuments({
        participants: userId,
        pinnedBy: userId,
      });
      if (pinnedCount >= 3) {
        return res.status(400).json({ message: "Maximum 3 pinned chats allowed" });
      }
      conversation.pinnedBy.push(userId);
    }

    await conversation.save();

    res.json({
      success: true,
      pinned: !isPinned,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ARCHIVE ================= */
export const toggleArchiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    const isArchived = conversation.archivedBy.some((id) => id.toString() === userId);

    if (isArchived) conversation.archivedBy.pull(userId);
    else conversation.archivedBy.push(userId);

    await conversation.save();

    const io = req.app.locals.io;
    if (io) {
      io.to(`user_${userId}`).emit("conversation-archived", {
        conversationId,
        archived: !isArchived,
      });
    }

    res.json({
      success: true,
      archived: !isArchived,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= BLOCK IN CONVERSATION ================= */
export const toggleBlockInConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    const isBlocked = conversation.blockedBy.some((id) => id.toString() === userId);

    if (isBlocked) {
      conversation.blockedBy.pull(userId);
    } else {
      conversation.blockedBy.push(userId);
    }

    await conversation.save();

    // Synchronize to User-level blockedUsers and clear following/followers links if it's 1-to-1
    if (!conversation.isGroup) {
      const otherParticipantId = conversation.participants.find((p) => p.toString() !== userId);
      if (otherParticipantId) {
        if (isBlocked) {
          // Unblocking: pull from user's blockedUsers
          await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: otherParticipantId } });
        } else {
          // Blocking: push to user's blockedUsers and sever following/followers links
          await User.findByIdAndUpdate(userId, {
            $addToSet: { blockedUsers: otherParticipantId },
            $pull: { following: otherParticipantId, followers: otherParticipantId },
          });
          await User.findByIdAndUpdate(otherParticipantId, {
            $pull: { following: userId, followers: userId },
          });
        }
      }
    }

    res.json({
      success: true,
      blocked: !isBlocked,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= RESTRICT IN CONVERSATION ================= */
export const toggleRestrictInConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    const isRestricted = conversation.restrictedBy.some((id) => id.toString() === userId);

    if (isRestricted) conversation.restrictedBy.pull(userId);
    else conversation.restrictedBy.push(userId);

    await conversation.save();

    res.json({
      success: true,
      restricted: !isRestricted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DISAPPEARING MESSAGES ================= */
export const toggleDisappearingMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { duration } = req.body; // seconds: 86400, 604800, 2592000 or null
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    if (!conversation.participants.some((p) => p.toString() === userId))
      return res.status(403).json({ message: "Unauthorized" });

    const isEnabled = conversation.disappearingMessages?.enabled;

    conversation.disappearingMessages = {
      enabled: !isEnabled,
      duration: !isEnabled ? (duration || 86400) : null,
      setBy: userId,
      setAt: new Date(),
    };

    await conversation.save();

    // System message
    await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "system",
      content: {
        text: !isEnabled
          ? `turned on disappearing messages (${formatDuration(duration || 86400)})`
          : "turned off disappearing messages",
      },
      systemEvent: !isEnabled ? "disappearing_enabled" : "disappearing_disabled",
    });

    const io = req.app.locals.io;
    if (io) {
      conversation.participants.forEach((pid) => {
        io.to(`user_${pid}`).emit("disappearing-messages-updated", {
          conversationId,
          disappearingMessages: conversation.disappearingMessages,
        });
      });
    }

    res.json({
      success: true,
      disappearingMessages: conversation.disappearingMessages,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= CHAT THEME ================= */
export const updateChatTheme = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { theme, customColor } = req.body;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    if (!conversation.participants.some((p) => p.toString() === userId))
      return res.status(403).json({ message: "Unauthorized" });

    // Personal chat wallpaper preference: only notify caller's socket
    const io = req.app.locals.io;
    if (io) {
      io.to(`user_${userId}`).emit("chat-theme-updated", {
        conversationId,
        theme,
        customThemeColor: customColor,
        userId,
      });
    }

    res.json({ success: true, theme });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= VANISH MODE ================= */
export const toggleVanishMode = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { duration } = req.body;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Not found" });

    if (!conversation.participants.some((p) => p.toString() === userId))
      return res.status(403).json({ message: "Unauthorized" });

    conversation.vanishMode = !conversation.vanishMode;
    conversation.vanishDuration = duration || null;

    await conversation.save();

    // System message
    await Message.create({
      conversation: conversationId,
      sender: userId,
      type: "system",
      content: {
        text: conversation.vanishMode ? "turned on vanish mode" : "turned off vanish mode",
      },
      systemEvent: conversation.vanishMode ? "vanish_enabled" : "vanish_disabled",
    });

    res.json({
      success: true,
      vanishMode: conversation.vanishMode,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET CONVERSATION DETAILS ================= */
export const getConversationDetails = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "userName profileImage isOnline lastSeen name bio")
      .populate("admins.user", "userName profileImage name")
      .populate("pinnedMessages.message")
      .populate("pinnedMessages.pinnedBy", "userName");

    if (!conversation) return res.status(404).json({ success: false, message: "Not found" });

    const isParticipant = conversation.participants.some(
      (p) => (p._id || p).toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }

    const participant = conversation.participants.find(
      (p) => (p._id || p).toString() !== userId.toString()
    );

    const enrichedParticipants = conversation.participants.map((p) => {
      if (!p) return p;
      const pid = (p._id || p)?.toString();
      const online = pid ? isUserOnline(pid) : false;
      return p.toObject ? { ...p.toObject(), isOnline: online || Boolean(p.isOnline) } : p;
    });

    const enrichedParticipant = participant
      ? {
          ...(participant.toObject ? participant.toObject() : participant),
          isOnline: isUserOnline((participant._id || participant)?.toString()) || Boolean(participant.isOnline),
        }
      : participant;

    res.json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        participants: enrichedParticipants,
        participant: enrichedParticipant,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= ACCEPT MESSAGE REQUEST ================= */
export const acceptMessageRequest = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a participant" });
    }

    conversation.requestStatus = "accepted";
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DECLINE MESSAGE REQUEST ================= */
export const declineMessageRequest = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a participant" });
    }

    await cleanupMessagesMedia(conversation._id);
    await conversation.deleteOne();

    res.json({ success: true, message: "Request declined and deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE CONVERSATION ================= */
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a participant" });
    }

    await cleanupMessagesMedia(conversation._id);
    await conversation.deleteOne();

    res.json({ success: true, message: "Conversation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= CLEAR CHAT HISTORY ================= */
export const clearChatHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a participant" });
    }

    await cleanupMessagesMedia(conversation._id);

    conversation.lastMessage = null;
    conversation.unreadCounts = new Map();
    await conversation.save();

    res.json({ success: true, message: "Chat history cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= HELPER ================= */
function formatDuration(seconds) {
  if (seconds <= 86400) return "24 hours";
  if (seconds <= 604800) return "7 days";
  if (seconds <= 2592000) return "30 days";
  return `${Math.floor(seconds / 86400)} days`;
}

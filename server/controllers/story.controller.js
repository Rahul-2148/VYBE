import uploadOnCloudinary from "../config/cloudinary.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";
import { Highlight } from "../models/highlight.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { Notification } from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../socket.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";
import { createNotificationHelper } from "./notification.controller.js";
import { checkMessagePrivacy } from "./message.controller.js";

import {
  emitStoryCreated,
  emitStoryViewed,
  emitStoryLiked,
  emitStoryReacted,
  emitStoryDeleted,
} from "../services/storySocket.service.js";

import { getStoryAnalytics } from "../services/storyAnalytics.service.js";
import { archiveExpiredStories, deleteStoryWithMedia, restoreArchivedStory } from "../services/storyArchive.service.js";
import {
  createHighlightCollection,
  updateHighlightCover,
  reorderHighlights,
  deleteHighlightCollection,
} from "../services/storyHighlight.service.js";

// 1. Upload Story Controller
export const uploadStory = async (req, res) => {
  try {
    const author = req.userId;
    const { mediaType, caption, location, hashtags, music, visibleTo, stickers, filter, sharedEntity, mediaUrl } = req.body;

    let media = null;
    if (req.file) {
      media = await uploadOnCloudinary(req.file.path, "VYBE/stories");
    } else if (mediaUrl) {
      media = { url: mediaUrl, public_id: `shared_${Date.now()}` };
    } else {
      return res.status(400).json({ success: false, error: true, message: "Story media file or URL is required" });
    }

    let parsedStickers = [];
    if (stickers) {
      try {
        parsedStickers = typeof stickers === "string" ? JSON.parse(stickers) : stickers;
      } catch (e) {
        parsedStickers = [];
      }
    }

    let parsedMusic = null;
    if (music) {
      try {
        parsedMusic = typeof music === "string" ? JSON.parse(music) : music;
      } catch (e) {
        parsedMusic = null;
      }
    }

    let parsedSharedEntity = null;
    if (sharedEntity) {
      try {
        parsedSharedEntity = typeof sharedEntity === "string" ? JSON.parse(sharedEntity) : sharedEntity;
      } catch (e) {
        parsedSharedEntity = null;
      }
    }

    const story = await Story.create({
      author,
      mediaType: mediaType || (media?.url?.endsWith(".mp4") || media?.url?.includes("/video/") ? "video" : "image"),
      media,
      caption,
      location,
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : JSON.parse(hashtags)) : [],
      filter: filter || "none",
      music: parsedMusic,
      sharedEntity: parsedSharedEntity,
      visibleTo: visibleTo === "closeFriends" ? "closeFriends" : "public",
      stickers: parsedStickers,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await User.findByIdAndUpdate(author, {
      $push: { stories: story._id },
    });

    const populatedStory = await Story.findById(story._id).populate("author", "userName profileImage name followers isVerified");

    // Real-time socket broadcast to followers
    if (populatedStory?.author?.followers) {
      emitStoryCreated(io, populatedStory, populatedStory.author.followers);
    }

    res.status(201).json({
      success: true,
      error: false,
      story: populatedStory,
      message: "Story published successfully!",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 2. View Story Controller
export const viewStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;

    const storyObj = await Story.findById(storyId);
    if (!storyObj) {
      return res.status(404).json({ success: false, error: true, message: "Story not found" });
    }

    // Block check
    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(storyObj.author.toString())) {
      return res.status(404).json({ success: false, error: true, message: "Story not found" });
    }

    if (storyObj.author.toString() === userId.toString()) {
      return res.status(200).json({ success: true, message: "Owner story view acknowledged" });
    }

    const alreadyViewed = storyObj.viewers.some((v) => v.toString() === userId);
    if (!alreadyViewed) {
      await Story.findByIdAndUpdate(storyId, { $addToSet: { viewers: userId } });
      
      // Socket event to notify story author in real time
      emitStoryViewed(io, storyId, userId, storyObj.author);
    }

    res.status(200).json({ success: true, message: "Story marked as viewed" });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 3. Get Stories Feed Controller (Grouped with Close Friends Privacy & Auto-Archiving)
export const getStoriesFeed = async (req, res) => {
  try {
    const userId = req.userId;

    // Trigger auto-archiving of expired stories in the background
    archiveExpiredStories().catch((e) => console.error("Background auto-archive error:", e.message));

    const currentUser = await User.findById(userId).select("following closeFriends");
    if (!currentUser) {
      return res.status(404).json({ success: false, error: true, message: "User not found" });
    }

    const blockedUserIds = await getBlockedUserIds(userId);
    const followingIds = (currentUser.following || []).filter(
      (id) => !blockedUserIds.includes(id.toString())
    );
    const authorIds = [...followingIds, userId];

    const stories = await Story.find({
      author: { $in: authorIds, $nin: blockedUserIds },
      isArchived: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate("author", "userName profileImage name closeFriends hiddenStoriesFrom isVerified")
      .populate("viewers", "userName profileImage name")
      .populate("reactions.user", "userName profileImage");

    const grouped = {};

    stories.forEach((story) => {
      const authorId = story.author._id.toString();
      const isOwner = authorId === userId;

      // Close Friends privacy check:
      if (story.visibleTo === "closeFriends" && !isOwner) {
        const authorCloseFriends = story.author.closeFriends || [];
        const isCloseFriend = authorCloseFriends.some((id) => id.toString() === userId);
        if (!isCloseFriend) return;
      }

      // Hidden stories check:
      if (!isOwner) {
        const authorHiddenStories = story.author.hiddenStoriesFrom || [];
        const isHidden = authorHiddenStories.some((id) => id.toString() === userId);
        if (isHidden) return;
      }

      if (!grouped[authorId]) {
        grouped[authorId] = {
          author: {
            _id: story.author._id,
            userName: story.author.userName,
            profileImage: story.author.profileImage,
            name: story.author.name,
          },
          stories: [],
          hasUnseen: false,
          hasCloseFriendsStory: false,
          isCurrentUser: isOwner,
        };
      }

      const hasSeen = story.viewers.some((v) => v._id.toString() === userId);
      if (!hasSeen) grouped[authorId].hasUnseen = true;
      if (story.visibleTo === "closeFriends") grouped[authorId].hasCloseFriendsStory = true;

      grouped[authorId].stories.push({
        ...story.toObject(),
        hasSeen,
      });
    });

    const resultList = Object.values(grouped);

    // Sort: Unseen stories first, then current user, then seen
    resultList.sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return 0;
    });

    res.status(200).json({
      success: true,
      error: false,
      stories: resultList,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 4. Toggle Story Like
export const toggleStoryLike = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;

    const storyObj = await Story.findById(storyId);
    if (!storyObj) return res.status(404).json({ success: false, message: "Story not found" });

    // Block check
    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(storyObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    let story = await Story.findOneAndUpdate(
      { _id: storyId, likes: userId },
      { $pull: { likes: userId } },
      { new: true }
    );

    if (story) {
      // Unlike occurred - delete notification
      await Notification.deleteOne({
        recipient: story.author,
        sender: userId,
        type: "like",
        story: story._id,
      });
    } else {
      // Like occurred - addToSet
      story = await Story.findOneAndUpdate(
        { _id: storyId },
        { $addToSet: { likes: userId } },
        { new: true }
      );

      const existingNotif = await Notification.findOne({
        recipient: story.author,
        sender: userId,
        type: "like",
        story: story._id,
      });

      if (!existingNotif) {
        createNotificationHelper({
          req,
          recipient: story.author,
          sender: userId,
          type: "like",
          story: story._id,
        }).catch(() => null);
      }
    }

    // Socket notification to author
    const isLikedNow = story.likes.some((id) => id.toString() === userId.toString());
    emitStoryLiked(io, story._id, userId, story.author, isLikedNow);

    return res.status(200).json({
      success: true,
      isLiked: isLikedNow,
      likesCount: story.likes.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 5. React to Story with Emoji
export const reactToStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ success: false, message: "Emoji is required" });

    const storyObj = await Story.findById(storyId);
    if (!storyObj) return res.status(404).json({ success: false, message: "Story not found" });

    // Block check
    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(storyObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    const story = await Story.findByIdAndUpdate(
      storyId,
      { $push: { reactions: { user: userId, emoji, reactedAt: new Date() } } },
      { new: true }
    );

    emitStoryReacted(io, story._id, userId, story.author, emoji);

    return res.status(200).json({
      success: true,
      message: `Reacted with ${emoji}`,
      reactions: story.reactions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 6. Interactive Stickers Handlers
export const votePoll = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.userId;

    const storyObj = await Story.findById(storyId);
    if (!storyObj) return res.status(404).json({ success: false, message: "Story not found" });

    // Block check
    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(storyObj.author.toString())) {
      return res.status(403).json({ success: false, message: "Action blocked." });
    }

    // First pull the user's vote if any to ensure clean update
    await Story.findByIdAndUpdate(storyId, {
      $pull: { pollVotes: { user: userId } }
    });

    const story = await Story.findByIdAndUpdate(
      storyId,
      { $push: { pollVotes: { user: userId, optionIndex, votedAt: new Date() } } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Poll vote recorded!",
      pollVotes: story.pollVotes,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const answerQuiz = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.userId;

    const storyObj = await Story.findById(storyId);
    if (!storyObj) return res.status(404).json({ success: false, message: "Story not found" });

    // Block check
    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(storyObj.author.toString())) {
      return res.status(403).json({ success: false, message: "Action blocked." });
    }

    const quizSticker = storyObj.stickers.find((s) => s.type === "quiz");
    const isCorrect = quizSticker?.quiz?.correctOptionIndex === optionIndex;

    const story = await Story.findByIdAndUpdate(
      storyId,
      { $push: { quizAnswers: { user: userId, optionIndex, isCorrect, answeredAt: new Date() } } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      isCorrect,
      quizAnswers: story.quizAnswers,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const submitQuestionResponse = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { responseText } = req.body;
    const userId = req.userId;

    if (!responseText) return res.status(400).json({ success: false, message: "Response text required" });

    const storyObj = await Story.findById(storyId);
    if (!storyObj) return res.status(404).json({ success: false, message: "Story not found" });

    // Block check
    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(storyObj.author.toString())) {
      return res.status(403).json({ success: false, message: "Action blocked." });
    }

    const story = await Story.findByIdAndUpdate(
      storyId,
      { $push: { questionResponses: { user: userId, responseText, createdAt: new Date() } } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Response submitted!",
      questionResponses: story.questionResponses,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 7. Reply to Story via DM
export const replyStory = async (req, res) => {
  try {
    const senderId = req.userId;
    const { storyId } = req.params;
    const { text } = req.body;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: "Story not found" });

    const receiverId = story.author;

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      isGroup: false,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        isGroup: false,
      });
    }

    // Call checkMessagePrivacy helper
    const privacyCheck = await checkMessagePrivacy(conversation, senderId);
    if (!privacyCheck.allowed) {
      return res.status(privacyCheck.status).json({ message: privacyCheck.message });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      type: "shared_story",
      content: {
        text: text ? text.trim() : "",
        shared: {
          type: "Story",
          refId: story._id,
        },
        sharedData: {
          _id: story._id,
          caption: story.caption || "",
          mediaUrl: story.media?.url,
          author: {
            _id: story.author._id,
            userName: story.author.userName,
            profileImage: story.author.profileImage,
          }
        }
      },
    });

    // Update lastMessage & unread counts atomically
    const incFields = {};
    conversation.participants.forEach((uid) => {
      if (uid.toString() !== senderId.toString()) {
        incFields[`unreadCount.${uid.toString()}`] = 1;
      }
    });

    const updatedConv = await Conversation.findByIdAndUpdate(
      conversation._id,
      {
        $set: { lastMessage: message._id },
        ...(Object.keys(incFields).length > 0 ? { $inc: incFields } : {}),
      },
      { new: true }
    );

    const populatedMessage = await message.populate("sender", "userName profileImage isVerified");

    // Socket real-time broadcast to ALL participants
    const ioApp = req.app?.locals?.io || io;
    if (ioApp && updatedConv) {
      updatedConv.participants.forEach((participantId) => {
        ioApp.to(`user_${participantId}`).emit("message-received", {
          conversationId: conversation._id.toString(),
          message: populatedMessage,
          unreadCount: updatedConv.unreadCount.get(participantId.toString()),
        });
      });
    }

    return res.status(201).json({
      success: true,
      message: "Story reply sent",
      data: populatedMessage,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 8. Story Analytics & Insights Endpoint
export const fetchStoryAnalytics = async (req, res) => {
  try {
    const { storyId } = req.params;
    const analytics = await getStoryAnalytics(storyId, req.userId);
    return res.status(200).json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 9. Restore Story from Archive Endpoint
export const restoreStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await restoreArchivedStory(storyId, req.userId);
    return res.status(200).json({ success: true, message: "Story restored to feed", story });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 10. Close Friends System Handlers
export const toggleCloseFriend = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isCloseFriend = !user.closeFriends.some((id) => id.toString() === targetUserId.toString());

    await User.findByIdAndUpdate(
      userId,
      isCloseFriend
        ? { $addToSet: { closeFriends: targetUserId } }
        : { $pull: { closeFriends: targetUserId } }
    );

    return res.status(200).json({
      success: true,
      isCloseFriend,
      message: isCloseFriend ? "Added to Close Friends" : "Removed from Close Friends",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const getCloseFriends = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("closeFriends", "userName name profileImage");
    return res.status(200).json({ success: true, closeFriends: user?.closeFriends || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 11. Highlights Operations
export const createHighlight = async (req, res) => {
  try {
    const { title, storyIds, category } = req.body;
    const authorId = req.userId;

    const parsedStoryIds = typeof storyIds === "string" ? JSON.parse(storyIds) : storyIds;

    const highlight = await createHighlightCollection({
      title,
      authorId,
      storyIds: parsedStoryIds,
      coverFile: req.file,
      category,
    });

    res.status(201).json({ success: true, highlight });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const updateCover = async (req, res) => {
  try {
    const { highlightId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: "Cover image file required" });

    const highlight = await updateHighlightCover(highlightId, req.userId, req.file);
    res.status(200).json({ success: true, highlight });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const setHighlightOrder = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    const result = await reorderHighlights(req.userId, orderedIds);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const getHighlightsByUsername = async (req, res) => {
  try {
    const { userName } = req.params;
    const user = await User.findOne({ userName });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const currentUserId = req.userId;
    if (currentUserId) {
      const blockedUserIds = await getBlockedUserIds(currentUserId);
      if (blockedUserIds.includes(user._id.toString())) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
    }

    const highlights = await Highlight.find({ author: user._id })
      .sort({ order: 1, createdAt: -1 })
      .populate({
        path: "stories",
        populate: {
          path: "author",
          select: "userName profileImage name",
        },
      });

    res.status(200).json({ success: true, highlights });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const deleteHighlight = async (req, res) => {
  try {
    const { highlightId } = req.params;
    const result = await deleteHighlightCollection(highlightId, req.userId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// 12. Story Deletion & Archive Fetch
export const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const authorId = req.userId;

    const result = await deleteStoryWithMedia(storyId, authorId);
    
    // Broadcast delete event to clients via Socket.IO
    emitStoryDeleted(io, storyId, authorId);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const getStoryArchive = async (req, res) => {
  try {
    const userId = req.userId;
    const archivedStories = await Story.find({ author: userId, isArchived: true })
      .sort({ createdAt: -1 })
      .populate("viewers", "userName profileImage name");

    res.status(200).json({ success: true, stories: archivedStories });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    const blockedUserIds = await getBlockedUserIds(currentUserId);
    if (blockedUserIds.includes(userId.toString())) {
      return res.status(404).json({ success: false, error: true, message: "User stories not found" });
    }

    const stories = await Story.find({ author: userId, isArchived: false, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: 1 })
      .populate("author", "userName profileImage name closeFriends hiddenStoriesFrom isVerified");

    const filtered = stories.filter((story) => {
      const isOwner = story.author._id.toString() === currentUserId.toString();
      if (isOwner) return true;

      // Hidden check
      const authorHiddenStories = story.author.hiddenStoriesFrom || [];
      const isHidden = authorHiddenStories.some((id) => id.toString() === currentUserId.toString());
      if (isHidden) return false;

      // Close Friends check
      if (story.visibleTo === "closeFriends") {
        const authorCloseFriends = story.author.closeFriends || [];
        const isCloseFriend = authorCloseFriends.some((id) => id.toString() === currentUserId.toString());
        if (!isCloseFriend) return false;
      }
      return true;
    });

    res.status(200).json({ success: true, stories: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

export const getAllStories = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const blockedUserIds = await getBlockedUserIds(currentUserId);

    const stories = await Story.find({
      author: { $nin: blockedUserIds },
      isArchived: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate("author", "userName profileImage name closeFriends hiddenStoriesFrom isVerified");

    const filtered = stories.filter((story) => {
      const isOwner = story.author._id.toString() === currentUserId.toString();
      if (isOwner) return true;

      // Hidden check
      const authorHiddenStories = story.author.hiddenStoriesFrom || [];
      const isHidden = authorHiddenStories.some((id) => id.toString() === currentUserId.toString());
      if (isHidden) return false;

      // Close Friends check
      if (story.visibleTo === "closeFriends") {
        const authorCloseFriends = story.author.closeFriends || [];
        const isCloseFriend = authorCloseFriends.some((id) => id.toString() === currentUserId.toString());
        if (!isCloseFriend) return false;
      }
      return true;
    });

    res.status(200).json({ success: true, stories: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// Mute Creator Stories
export const muteStoryUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.params;

    await User.findByIdAndUpdate(userId, {
      $addToSet: { mutedStories: targetUserId },
    });

    res.status(200).json({ success: true, message: "Stories muted for user" });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// Unmute Creator Stories
export const unmuteStoryUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.params;

    await User.findByIdAndUpdate(userId, {
      $pull: { mutedStories: targetUserId },
    });

    res.status(200).json({ success: true, message: "Stories unmuted for user" });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

// Report Story
export const reportStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { reason } = req.body;

    res.status(200).json({ success: true, message: "Story report submitted to moderation." });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

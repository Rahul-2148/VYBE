import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";

// upload story controller
export const uploadStory = async (req, res) => {
  try {
    const author = req.userId;
    const { mediaType, caption, location, hashtags, music, visibleTo } =
      req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Media required" });
    }

    const media = await uploadOnCloudinary(req.file.path, "VYBE/stories");

    const story = await Story.create({
      author,
      mediaType,
      media,
      caption,
      location,
      hashtags,
      music,
      visibleTo,
    });

    await User.findByIdAndUpdate(author, {
      $push: { stories: story._id },
    });

    res.status(201).json({
      success: true,
      story,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// view story controller
export const viewStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (!story.viewers.some((v) => v.toString() === userId)) {
      story.viewers.push(userId);
      await story.save();
    }

    res.status(200).json({ success: true, message: "Story viewed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// get stories feed
export const getStoriesFeed = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("following");
    const ids = [...user.following, userId];

    const stories = await Story.find({
      author: { $in: ids },
      expiresAt: { $gt: new Date() },
    })
      .populate("author", "userName profileImage")
      .sort({ createdAt: 1 })
      .populate("author", "userName profileImage")
      .populate("viewers", "userName profileImage")
      .populate("reactions.user", "userName profileImage");

    const grouped = {};

    stories.forEach((story) => {
      const uid = story.author._id.toString();

      if (!grouped[uid]) {
        grouped[uid] = {
          author: story.author,
          stories: [],
          hasUnseen: false,
          isCurrentUser: uid === userId,
        };
      }

      const hasSeen = story.viewers.some((v) => v.toString() === userId);

      if (!hasSeen) grouped[uid].hasUnseen = true;

      grouped[uid].stories.push({
        ...story.toObject(),
        hasSeen,
      });
    });

    res.status(200).json({
      success: true,
      stories: Object.values(grouped),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Like/unlike story controller
export const toggleStoryLike = async (req, res) => {
  const { storyId } = req.params;
  const userId = req.userId;

  const story = await Story.findById(storyId);
  if (!story) return res.status(404).json({ message: "Not found" });

  const index = story.likes.findIndex((id) => id.toString() === userId);

  if (index === -1) story.likes.push(userId);
  else story.likes.splice(index, 1);

  await story.save();
  res.json({ success: true, likes: story.likes.length });
};

export const reactToStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { emoji } = req.body; // ANY emoji
    const userId = req.userId;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji required" });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const index = story.reactions.findIndex(
      (r) => r.user.toString() === userId
    );

    // same emoji → remove
    if (index !== -1 && story.reactions[index].emoji === emoji) {
      story.reactions.splice(index, 1);
    }
    // different emoji → update
    else if (index !== -1) {
      story.reactions[index].emoji = emoji;
      story.reactions[index].reactedAt = Date.now();
    }
    // new reaction
    else {
      story.reactions.push({ user: userId, emoji });
    }

    await story.save();

    res.status(200).json({
      success: true,
      reaction: emoji,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// delete story controller
export const deleteStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Only author can delete
    if (story.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this story" });
    }

    // Delete media from cloudinary
    if (story.media?.public_id) {
      await deleteFromCloudinary(story.media.public_id);
    }

    // Remove story reference from user
    await User.findByIdAndUpdate(userId, {
      $pull: { stories: storyId },
    });

    // Delete story document
    await Story.findByIdAndDelete(storyId);

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `deleteStory error: ${error.message}` });
  }
};

// get user stories controller
export const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;

    const stories = await Story.find({
      author: userId,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate("author", "userName profileImage");

    res.status(200).json({
      success: true,
      stories,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// get all stories controller (for admin, moderation or analytics)
export const getAllStories = async (req, res) => {
  try {
    const stories = await Story.find().populate("author viewers").sort({
      createdAt: -1,
    });
    return res
      .status(200)
      .json({ success: true, error: false, stories: stories });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `getAllStories error: ${error.message}` });
  }
};

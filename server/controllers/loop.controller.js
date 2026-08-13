import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { Loop } from "../models/loop.model.js";
import { User } from "../models/user.model.js";
import calculateLoopScore from "../utils/calculateLoopScore.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";
import { createNotificationHelper } from "./notification.controller.js";
import { Notification } from "../models/notification.model.js";

export const CATEGORY_MAP = {
  tech: ["coding", "tech", "developer", "javascript", "react", "programming", "webdev", "ai", "software", "code", "python", "java", "nextjs", "node", "flutter", "swift", "kotlin", "database", "sql", "git"],
  fitness: ["gym", "fitness", "workout", "motivation", "healthy", "exercise", "bodybuilding", "crossfit", "muscle", "abs", "running", "training", "diet", "nutrition", "healthyfood", "protein", "cardio"],
  food: ["cooking", "recipe", "foodie", "delicious", "yummy", "chef", "food", "cake", "diet", "healthyfood", "tasty", "baking", "dinner", "lunch", "breakfast", "restaurant", "dessert"],
  entertainment: ["funny", "meme", "comedy", "lol", "humor", "joke", "prank", "dance", "trending", "viral", "reels", "entertainment", "cute", "pet", "cat", "dog", "fun", "crazy", "fail"],
  fashion: ["ootd", "fashion", "lifestyle", "travel", "photography", "outfit", "style", "makeup", "beauty", "shopping", "model", "suit", "dress", "shoes", "glam"],
  music: ["singer", "song", "cover", "music", "guitar", "beats", "rap", "hiphop", "singer", "instrument", "concert", "melody", "audio", "track", "vocal", "piano", "dj", "remix"],
};

export const SENSITIVE_KEYWORDS = ["nsfw", "gore", "explicit", "horror", "scary", "violence", "fight", "blood", "kill", "death", "accident", "abuse", "adult"];

export const getLoopCategories = (loop) => {
  const categories = new Set();
  const searchText = (
    (loop.caption || "") + " " + 
    (loop.music || "") + " " + 
    (loop.hashtags || []).join(" ")
  ).toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        categories.add(category);
        break;
      }
    }
  }
  return Array.from(categories);
};

export const recordCategoryInteraction = async (userId, loop, weight) => {
  try {
    if (!userId || !loop) return;
    const categories = getLoopCategories(loop);
    if (categories.length === 0) return;

    const user = await User.findById(userId);
    if (!user) return;

    if (!user.contentCategoryInterests) {
      user.contentCategoryInterests = new Map();
    }

    categories.forEach((cat) => {
      const currentVal = user.contentCategoryInterests.get(cat) || 0;
      user.contentCategoryInterests.set(cat, currentVal + weight);
    });

    await user.save();
  } catch (error) {
    console.error("[category interaction recording failed]", error);
  }
};

// 1. Create Reel/Loop Controller
export const uploadLoop = async (req, res) => {
  try {
    const author = req.userId;
    const { caption, location, hashtags, music, audioTrack, captions, taggedUsers } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: true, message: "Video media file is required" });
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Loop video must be under 100MB",
      });
    }

    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Only video files are allowed for reels/loops",
      });
    }

    const media = await uploadOnCloudinary(req.file.path, "VYBE/loops");

    let parsedAudioTrack = {
      id: "audio_" + Date.now(),
      title: music || "Original Audio",
      artist: "",
      coverUrl: "",
    };

    if (audioTrack) {
      try {
        parsedAudioTrack = typeof audioTrack === "string" ? JSON.parse(audioTrack) : audioTrack;
      } catch (e) {
        // fallback to default
      }
    }

    let parsedCaptions = [];
    if (captions) {
      try {
        parsedCaptions = typeof captions === "string" ? JSON.parse(captions) : captions;
      } catch (e) {
        parsedCaptions = [];
      }
    }

    let parsedTaggedUsers = [];
    if (taggedUsers) {
      try {
        parsedTaggedUsers = typeof taggedUsers === "string" ? JSON.parse(taggedUsers) : taggedUsers;
      } catch (e) {
        parsedTaggedUsers = [];
      }
    }

    const loop = await Loop.create({
      caption,
      media,
      author,
      location,
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : JSON.parse(hashtags)) : [],
      music: music || parsedAudioTrack.title,
      audioTrack: parsedAudioTrack,
      captions: parsedCaptions,
      taggedUsers: parsedTaggedUsers,
    });

    const user = await User.findById(author);
    if (user) {
      user.loops.push(loop._id);
      await user.save();
    }

    const populatedLoop = await Loop.findById(loop._id).populate("author", "name userName profileImage isVerified");

    return res.status(201).json({
      success: true,
      error: false,
      loop: populatedLoop,
      message: "Loop uploaded successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `uploadLoop error: ${error.message}` });
  }
};

// 2. Create Remix Reel Controller
export const remixLoop = async (req, res) => {
  try {
    const author = req.userId;
    const { originalLoopId } = req.params;
    const { caption, location, hashtags } = req.body;

    const originalLoop = await Loop.findById(originalLoopId).populate("author", "userName");
    if (!originalLoop) {
      return res.status(404).json({ success: false, error: true, message: "Original loop not found for remix" });
    }

    // Block check
    const blockedUserIds = await getBlockedUserIds(author);
    if (blockedUserIds.includes(originalLoop.author.toString()) || blockedUserIds.includes(originalLoop.author._id?.toString())) {
      return res.status(403).json({ success: false, message: "Action blocked." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: true, message: "Remix video media is required" });
    }

    const media = await uploadOnCloudinary(req.file.path, "VYBE/loops/remixes");

    const remix = await Loop.create({
      caption,
      media,
      author,
      isRemix: true,
      originalLoop: originalLoop._id,
      audioTrack: originalLoop.audioTrack || { title: `Remix with @${originalLoop.author?.userName}` },
      location,
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : JSON.parse(hashtags)) : [],
    });

    await User.findByIdAndUpdate(author, { $push: { loops: remix._id } });

    const populatedRemix = await Loop.findById(remix._id)
      .populate("author", "name userName profileImage isVerified")
      .populate({
        path: "originalLoop",
        select: "media caption author",
        populate: { path: "author", select: "userName profileImage isVerified" },
      });

    return res.status(201).json({
      success: true,
      error: false,
      loop: populatedRemix,
      message: "Remix Reel published!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `remixLoop error: ${error.message}` });
  }
};

// 3. Toggle Save Reel Controller
export const toggleSaveLoop = async (req, res) => {
  try {
    const { loopId } = req.params;
    const userId = req.userId;

    const userObj = await User.findById(userId);
    if (!userObj) {
      return res.status(404).json({ success: false, error: true, message: "User not found" });
    }

    const alreadySaved = userObj.savedLoops?.some((id) => id.toString() === loopId.toString());
    let isSaved = false;

    if (alreadySaved) {
      await User.findByIdAndUpdate(userId, { $pull: { savedLoops: loopId } });
      await Loop.findByIdAndUpdate(loopId, { $pull: { savedBy: userId } });
    } else {
      await User.findByIdAndUpdate(userId, { $addToSet: { savedLoops: loopId } });
      await Loop.findByIdAndUpdate(loopId, { $addToSet: { savedBy: userId } });
      isSaved = true;
    }

    if (isSaved) {
      const loop = await Loop.findById(loopId);
      if (loop) {
        recordCategoryInteraction(userId, loop, 8).catch(() => null);
      }
    }

    return res.status(200).json({
      success: true,
      error: false,
      isSaved,
      message: isSaved ? "Reel saved to collections" : "Reel removed from saved",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `toggleSaveLoop error: ${error.message}` });
  }
};

// 4. Get Saved Loops Collections Controller
export const getSavedLoops = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: "savedLoops",
      populate: { path: "author", select: "name userName profileImage" },
    });

    return res.status(200).json({
      success: true,
      error: false,
      savedLoops: user?.savedLoops || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getSavedLoops error: ${error.message}` });
  }
};



// 6. Get All Loops Controller (Feed with Preload Optimization support)
export const getAllLoops = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const blockedUserIds = await getBlockedUserIds(req.userId);

    const privateUsers = await User.find({
      accountType: "private",
      _id: { $ne: req.userId },
      followers: { $ne: req.userId }
    }).select("_id");
    
    const privateUserIds = privateUsers.map(u => u._id);
    const excludedUserIds = [...privateUserIds, ...blockedUserIds];

    // 1. Fetch all loops
    let loops = await Loop.find({
      author: { $nin: excludedUserIds }
    })
      .populate("author", "name userName profileImage followers isVerified")
      .populate("likes", "_id")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("viewedBy", "userName name profileImage")
      .populate({
        path: "originalLoop",
        select: "media author caption",
        populate: { path: "author", select: "userName profileImage isVerified" },
      });

    if (!user) {
      loops.sort((a, b) => (b.score || 0) - (a.score || 0));
      return res.status(200).json({ success: true, error: false, loops });
    }

    // 2. Sensitive content filtering
    if (user.sensitiveContentFilter === "low") {
      loops = loops.filter((loop) => {
        const text = (
          (loop.caption || "") + " " +
          (loop.hashtags || []).join(" ")
        ).toLowerCase();
        return !SENSITIVE_KEYWORDS.some((kw) => text.includes(kw));
      });
    }

    // 3. Snooze Suggested Posts in Feed Check
    const isSnoozed = user.snoozeSuggestedPosts && user.snoozeExpiresAt && new Date() < new Date(user.snoozeExpiresAt);
    const followingIds = new Set((user.following || []).map((id) => id.toString()));

    if (isSnoozed) {
      loops = loops.filter((loop) => {
        const authorIdStr = loop.author?._id?.toString();
        return authorIdStr === userId.toString() || followingIds.has(authorIdStr);
      });
    }

    // 4. Calculate Relevance Score
    const mappedLoops = loops.map((loop) => {
      let relevanceScore = 0;
      const authorIdStr = loop.author?._id?.toString();
      const isFriend = followingIds.has(authorIdStr);

      if (isFriend) {
        relevanceScore += 100;
      }

      if (loop.likes && loop.likes.length > 0) {
        const friendLikesCount = loop.likes.filter((like) => followingIds.has(like._id?.toString())).length;
        relevanceScore += friendLikesCount * 20;
      }
      if (loop.comments && loop.comments.length > 0) {
        const friendCommentsCount = loop.comments.filter((comment) => followingIds.has(comment.author?._id?.toString())).length;
        relevanceScore += friendCommentsCount * 30;
      }

      const categories = getLoopCategories(loop);
      if (categories.length > 0 && user.contentCategoryInterests) {
        categories.forEach((cat) => {
          const interestScore = user.contentCategoryInterests.get(cat) || 0;
          relevanceScore += interestScore * 2;
        });
      }

      relevanceScore += (loop.score || 0) * 0.5;

      return { loop, relevanceScore };
    });

    // 5. Sort by score
    mappedLoops.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const sortedLoops = mappedLoops.map((item) => item.loop);

    return res.status(200).json({ success: true, error: false, loops: sortedLoops });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getAllLoops error: ${error.message}` });
  }
};

// 7. Get All Loops of Logged in User Controller
export const getAllLoopsOfLoggedInUser = async (req, res) => {
  try {
    const author = req.userId;
    const loops = await Loop.find({ author })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified")
      .populate("likes", "_id")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("viewedBy", "userName name profileImage");

    return res.status(200).json({ success: true, error: false, loops });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getAllLoops error: ${error.message}` });
  }
};

// 8. Like/Unlike Loop Controller
export const likeLoop = async (req, res) => {
  try {
    const loopId = req.params.loopId;
    const userId = req.userId;

    const loopObj = await Loop.findById(loopId);
    if (!loopObj) {
      return res.status(404).json({ message: "Loop not found!" });
    }

    // Block check
    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(loopObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    // Like limit check (50000 likes limit)
    if (loopObj.likes.length >= 50000 && !loopObj.likes.includes(userId)) {
      return res.status(429).json({
        message: "Like limit reached for this loop",
      });
    }

    let loop;
    const hasLiked = loopObj.likes.some((id) => id.toString() === userId.toString());

    if (action === "unlike" || (action === undefined && hasLiked)) {
      loop = await Loop.findOneAndUpdate(
        { _id: loopId },
        { $pull: { likes: userId } },
        { new: true }
      );

      if (loop) {
        // Unlike occurred - delete notification
        await Notification.deleteOne({
          recipient: loop.author,
          sender: userId,
          type: "like",
          loop: loop._id,
        });
      }
    } else {
      // Like occurred - addToSet
      loop = await Loop.findOneAndUpdate(
        { _id: loopId },
        { $addToSet: { likes: userId } },
        { new: true }
      );

      const existingNotif = await Notification.findOne({
        recipient: loop.author,
        sender: userId,
        type: "like",
        loop: loop._id,
      });

      if (!existingNotif) {
        createNotificationHelper({
          req,
          recipient: loop.author,
          sender: userId,
          type: "like",
          loop: loop._id,
        }).catch(() => null);
      }
    }

    const score = calculateLoopScore(loop);
    loop = await Loop.findByIdAndUpdate(
      loopId,
      { $set: { score } },
      { new: true }
    );

    await loop.populate("author", "name userName profileImage isVerified");
    await loop.populate("likes", "_id");
    await loop.populate("comments.author", "name userName profileImage isVerified");

    const isLikedNow = loop.likes.some((id) => id._id.toString() === userId.toString());
    if (isLikedNow) {
      recordCategoryInteraction(userId, loop, 5).catch(() => null);
    }

    return res.status(200).json({
      success: true,
      error: false,
      loop,
      message: isLikedNow ? "Like added" : "Like removed",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `likeLoop error: ${error.message}` });
  }
};

// 9. Comment Loop Controller
export const commentLoop = async (req, res) => {
  try {
    const loopId = req.params.loopId;
    const author = req.userId;
    const { message, clientCommentId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: "Comment message is required" });
    }

    const loopObj = await Loop.findById(loopId);
    if (!loopObj) {
      return res.status(404).json({ message: "Loop not found!" });
    }

    // Block check
    const blockedUserIds = await getBlockedUserIds(author);
    if (blockedUserIds.includes(loopObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    // Prevent comment spam (same user)
    const userComments = loopObj.comments.filter(
      (c) => c.author.toString() === author.toString()
    );

    if (userComments.length >= 100) {
      return res.status(429).json({
        message: "Too many comments on this loop",
      });
    }

    if (clientCommentId) {
      const alreadyExists = loopObj.comments.some(c => c._id.toString() === clientCommentId.toString());
      if (alreadyExists) {
        const loop = await Loop.findById(loopId)
          .populate("author", "name userName profileImage isVerified")
          .populate("comments.author", "name userName profileImage isVerified");
        return res.status(200).json({ success: true, error: false, loop, message: "Duplicate comment detected (idempotent)" });
      }
    }

    const commentObj = { author, message: message.trim() };
    if (clientCommentId) {
      commentObj._id = clientCommentId;
    }

    const updatedLoop = await Loop.findByIdAndUpdate(
      loopId,
      { $push: { comments: commentObj } },
      { new: true }
    );

    const score = calculateLoopScore(updatedLoop);
    const loop = await Loop.findByIdAndUpdate(
      loopId,
      { $set: { score } },
      { new: true }
    )
      .populate("author", "name userName profileImage isVerified")
      .populate("comments.author", "name userName profileImage isVerified");

    createNotificationHelper({
      req,
      recipient: loop.author,
      sender: author,
      type: "comment",
      loop: loop._id,
      commentText: message.trim(),
    }).catch(() => null);

    recordCategoryInteraction(author, loop, 10).catch(() => null);

    const comment = loop.comments[loop.comments.length - 1];
    return res.status(200).json({ success: true, error: false, loop, comment });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `commentLoop error: ${error.message}` });
  }
};

// 10. Increment Loop View Controller
export const incrementLoopView = async (req, res) => {
  try {
    const { loopId } = req.params;
    const userId = req.userId;

    const loopObj = await Loop.findById(loopId);
    if (!loopObj) return res.status(404).json({ message: "Loop not found" });

    const alreadyViewed = loopObj.viewedBy.some((id) => id.toString() === userId.toString());
    if (alreadyViewed) {
      return res.status(200).json({
        success: true,
        error: false,
        views: loopObj.views,
        message: "View already counted",
      });
    }

    const updatedLoop = await Loop.findByIdAndUpdate(
      loopId,
      {
        $inc: { views: 1 },
        $addToSet: { viewedBy: userId }
      },
      { new: true }
    );

    const score = calculateLoopScore(updatedLoop);
    await Loop.findByIdAndUpdate(loopId, { $set: { score } });

    recordCategoryInteraction(userId, updatedLoop, 1).catch(() => null);

    return res.status(200).json({
      success: true,
      error: false,
      views: updatedLoop.views,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `incrementLoopView error: ${error.message}` });
  }
};

// 11. Add Watch Time Controller
export const addWatchTime = async (req, res) => {
  try {
    const { duration } = req.body;
    const { loopId } = req.params;

    const loop = await Loop.findById(loopId);
    if (!loop) return res.status(404).json({ message: "Loop not found" });

    loop.watchTime += duration || 0;
    loop.score += (duration || 0) * 5;
    await loop.save();

    recordCategoryInteraction(req.userId, loop, Math.min(Math.floor(duration || 0), 5)).catch(() => null);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 12. Get Single Loop By ID Controller
export const getLoopById = async (req, res) => {
  try {
    const { loopId } = req.params;
    const loop = await Loop.findById(loopId)
      .populate("author", "name userName profileImage isVerified")
      .populate("likes", "_id")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("viewedBy", "userName name profileImage")
      .populate({
        path: "originalLoop",
        select: "media author caption",
        populate: { path: "author", select: "userName profileImage isVerified" },
      });

    if (!loop) {
      return res.status(404).json({ success: false, error: true, message: "Loop not found" });
    }

    // Block check
    const userId = req.userId;
    if (userId && loop.author) {
      const blockedUserIds = await getBlockedUserIds(userId);
      if (blockedUserIds.includes(loop.author._id.toString())) {
        return res.status(404).json({ success: false, error: true, message: "Loop not found" });
      }
    }

    return res.status(200).json({ success: true, error: false, loop });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getLoopById error: ${error.message}` });
  }
};

// 13. Get Loops By Audio Track Controller
export const getLoopsByAudio = async (req, res) => {
  try {
    const { audioId } = req.params;
    const userId = req.userId;

    let query = {
      $or: [
        { "audioTrack.id": audioId },
        { "audioTrack.title": { $regex: audioId, $options: "i" } },
        { music: { $regex: audioId, $options: "i" } },
      ],
    };

    if (userId) {
      const blockedUserIds = await getBlockedUserIds(userId);
      query.author = { $nin: blockedUserIds };
    }

    const loops = await Loop.find(query)
      .sort({ createdAt: -1 })
      .populate("author", "userName profileImage name isVerified");

    const audioTrackName = loops.length > 0 ? loops[0].audioTrack?.title || loops[0].music || audioId : audioId;

    return res.status(200).json({
      success: true,
      error: false,
      audioTrackName,
      loops,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getLoopsByAudio error: ${error.message}` });
  }
};

// Delete Loop / Reel
export const deleteLoop = async (req, res) => {
  try {
    const { loopId } = req.params;
    const userId = req.userId;

    const loop = await Loop.findById(loopId);
    if (!loop) return res.status(404).json({ success: false, message: "Loop not found!" });

    if (loop.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this loop" });
    }

    if (loop.media?.public_id) {
      await deleteFromCloudinary(loop.media.public_id, "video").catch(() => null);
    }

    await User.updateMany({ savedLoops: loop._id }, { $pull: { savedLoops: loop._id } });
    await User.findByIdAndUpdate(loop.author, { $pull: { loops: loop._id } });

    // Clean up notifications related to this loop
    await Notification.deleteMany({ loop: loop._id });

    await Loop.findByIdAndDelete(loopId);

    return res.status(200).json({ success: true, message: "Loop deleted successfully", loopId });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `deleteLoop error: ${error.message}` });
  }
};

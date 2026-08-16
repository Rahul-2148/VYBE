import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { Reel } from "../models/reel.model.js";
import { User } from "../models/user.model.js";
import calculateReelScore from "../utils/calculateReelScore.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";
import { createNotificationHelper } from "./notification.controller.js";
import { Notification } from "../models/notification.model.js";
import { getExcludedAuthorIdsForFeed } from "../utils/feedPrivacyHelper.js";

export const CATEGORY_MAP = {
  tech: ["coding", "tech", "developer", "javascript", "react", "programming", "webdev", "ai", "software", "code", "python", "java", "nextjs", "node", "flutter", "swift", "kotlin", "database", "sql", "git"],
  fitness: ["gym", "fitness", "workout", "motivation", "healthy", "exercise", "bodybuilding", "crossfit", "muscle", "abs", "running", "training", "diet", "nutrition", "healthyfood", "protein", "cardio"],
  food: ["cooking", "recipe", "foodie", "delicious", "yummy", "chef", "food", "cake", "diet", "healthyfood", "tasty", "baking", "dinner", "lunch", "breakfast", "restaurant", "dessert"],
  entertainment: ["funny", "meme", "comedy", "lol", "humor", "joke", "prank", "dance", "trending", "viral", "reels", "entertainment", "cute", "pet", "cat", "dog", "fun", "crazy", "fail"],
  fashion: ["ootd", "fashion", "lifestyle", "travel", "photography", "outfit", "style", "makeup", "beauty", "shopping", "model", "suit", "dress", "shoes", "glam"],
  music: ["singer", "song", "cover", "music", "guitar", "beats", "rap", "hiphop", "singer", "instrument", "concert", "melody", "audio", "track", "vocal", "piano", "dj", "remix"],
};

export const SENSITIVE_KEYWORDS = ["nsfw", "gore", "explicit", "horror", "scary", "violence", "fight", "blood", "kill", "death", "accident", "abuse", "adult"];

export const getReelCategories = (reel) => {
  const categories = new Set();
  const searchText = (
    (reel.caption || "") + " " + 
    (reel.music || "") + " " + 
    (reel.hashtags || []).join(" ")
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



export const recordCategoryInteraction = async (userId, reel, weight) => {
  try {
    if (!userId || !reel) return;
    const categories = getReelCategories(reel);
    if (categories.length === 0) return;

    const user = await User.findById(userId);
    if (!user) return;

    if (!user.contentCategoryInterests) {
      user.contentCategoryInterests = new Map();
    }

    categories.forEach((cat) => {
      let currentVal = 0;
      if (typeof user.contentCategoryInterests.get === "function") {
        currentVal = user.contentCategoryInterests.get(cat) || 0;
        user.contentCategoryInterests.set(cat, currentVal + weight);
      } else {
        currentVal = user.contentCategoryInterests[cat] || 0;
        user.contentCategoryInterests[cat] = currentVal + weight;
      }
    });

    await user.save();
  } catch (error) {
    console.error("[category interaction recording failed]", error);
  }
};

// 1. Create Reel Controller
export const uploadReel = async (req, res) => {
  try {
    const author = req.userId;
    const { caption, location, hashtags, music, audioTrack, captions, taggedUsers, aiLabel, isVybeTv, duration } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: true, message: "Video media file is required" });
    }

    const MAX_SIZE = 1024 * 1024 * 1024; // 1GB (1024MB) for 4K / High Definition and VYBE TV
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Video file exceeds maximum 1GB limit",
      });
    }

    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Only video files are allowed for reels and VYBE TV",
      });
    }

    const parsedDuration = Number(duration) || 0;
    const isLongForm = isVybeTv === "true" || isVybeTv === true || parsedDuration > 180; // > 3 mins auto-triggers VYBE TV

    const media = await uploadOnCloudinary(req.file.path, "VYBE/reels");

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

    let parsedAiLabel = { isAIGenerated: false, tool: "", contentType: "video", disclosedAt: null };
    if (aiLabel) {
      try {
        const raw = typeof aiLabel === "string" ? JSON.parse(aiLabel) : aiLabel;
        if (raw.isAIGenerated === true || raw.isAIGenerated === "true") {
          parsedAiLabel = {
            isAIGenerated: true,
            tool: raw.tool || "",
            contentType: raw.contentType || "video",
            disclosedAt: new Date(),
          };
        }
      } catch (e) {}
    }

    const reel = await Reel.create({
      caption,
      media,
      author,
      location,
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : JSON.parse(hashtags)) : [],
      music: music || parsedAudioTrack.title,
      audioTrack: parsedAudioTrack,
      captions: parsedCaptions,
      taggedUsers: parsedTaggedUsers,
      aiLabel: parsedAiLabel,
      isVybeTv: isLongForm,
      duration: parsedDuration,
    });

    const user = await User.findById(author);
    if (user) {
      if (!user.reels) user.reels = [];
      user.reels.push(reel._id);

      await user.save();
    }

    const populatedReel = await Reel.findById(reel._id).populate("author", "name userName profileImage isVerified");

    return res.status(201).json({
      success: true,
      error: false,
      reel: populatedReel,
      message: "Reel uploaded successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `uploadReel error: ${error.message}` });
  }
};



// 2. Create Remix Reel Controller
export const remixReel = async (req, res) => {
  try {
    const author = req.userId;
    const { originalReelId } = req.params;
    const targetId = originalReelId;
    const { caption, location, hashtags } = req.body;

    const originalReel = await Reel.findById(targetId).populate("author", "userName");
    if (!originalReel) {
      return res.status(404).json({ success: false, error: true, message: "Original reel not found for remix" });
    }

    // Block check
    const blockedUserIds = await getBlockedUserIds(author);
    if (blockedUserIds.includes(originalReel.author.toString()) || blockedUserIds.includes(originalReel.author._id?.toString())) {
      return res.status(403).json({ success: false, message: "Action blocked." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: true, message: "Remix video media is required" });
    }

    const media = await uploadOnCloudinary(req.file.path, "VYBE/reels/remixes");

    const remix = await Reel.create({
      caption,
      media,
      author,
      isRemix: true,
      originalReel: originalReel._id,
      audioTrack: originalReel.audioTrack || { title: `Remix with @${originalReel.author?.userName}` },
      location,
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : JSON.parse(hashtags)) : [],
    });

    await User.findByIdAndUpdate(author, {
      $push: { reels: remix._id },
    });

    const populatedRemix = await Reel.findById(remix._id)
      .populate("author", "name userName profileImage isVerified")
      .populate({
        path: "originalReel",
        select: "media caption author",
        populate: { path: "author", select: "userName profileImage isVerified" },
      });

    return res.status(201).json({
      success: true,
      error: false,
      reel: populatedRemix,
      message: "Remix Reel published!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `remixReel error: ${error.message}` });
  }
};



// 3. Toggle Save Reel Controller
export const toggleSaveReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const targetId = reelId;
    const userId = req.userId;

    const userObj = await User.findById(userId);
    if (!userObj) {
      return res.status(404).json({ success: false, error: true, message: "User not found" });
    }

    const alreadySaved = (userObj.savedReels || []).some((id) => id.toString() === targetId.toString());
    let updatedUser;
    let isSaved = false;

    if (alreadySaved) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $pull: { savedReels: targetId } },
        { returnDocument: 'after' }
      );
      await Reel.findByIdAndUpdate(targetId, { $pull: { savedBy: userId } });
    } else {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { savedReels: targetId } },
        { returnDocument: 'after' }
      );
      await Reel.findByIdAndUpdate(targetId, { $addToSet: { savedBy: userId } });
      isSaved = true;
    }

    if (isSaved) {
      const reel = await Reel.findById(targetId);
      if (reel) {
        recordCategoryInteraction(userId, reel, 8).catch(() => null);
      }
    }

    return res.status(200).json({
      success: true,
      error: false,
      isSaved,
      user: updatedUser,
      savedReels: updatedUser?.savedReels || [],
      message: isSaved ? "Reel saved to collections" : "Reel removed from saved",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `toggleSaveReel error: ${error.message}` });
  }
};



// 4. Get Saved Reels Collections Controller
export const getSavedReels = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: "savedReels",
      populate: { path: "author", select: "name userName profileImage isVerified" },
    });

    return res.status(200).json({
      success: true,
      error: false,
      savedReels: user?.savedReels || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getSavedReels error: ${error.message}` });
  }
};



// 6. Get All Reels Controller
export const getAllReels = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const excludedAuthorIds = await getExcludedAuthorIdsForFeed(req.userId);

    const reelQuery = { author: { $nin: excludedAuthorIds } };
    if (req.userId) {
      reelQuery.hiddenBy = { $nin: [req.userId] };
    }

    let reels = await Reel.find(reelQuery)
      .populate("author", "name userName profileImage followers isVerified accountType professionalType")
      .populate("likes", "_id")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("viewedBy", "userName name profileImage")
      .populate({
        path: "originalReel",
        select: "media author caption",
        populate: { path: "author", select: "userName profileImage isVerified" },
      });

    // Filter out orphaned reels where author was deleted
    reels = reels.filter((r) => r && r.author);

    if (!user) {
      reels.sort((a, b) => (b.score || 0) - (a.score || 0));
      return res.status(200).json({ success: true, error: false, reels });
    }

    if (user.sensitiveContentFilter === "low") {
      reels = reels.filter((reel) => {
        const text = (
          (reel.caption || "") + " " +
          (reel.hashtags || []).join(" ")
        ).toLowerCase();
        return !SENSITIVE_KEYWORDS.some((kw) => text.includes(kw));
      });
    }

    const isSnoozed = user.snoozeSuggestedPosts && user.snoozeExpiresAt && new Date() < new Date(user.snoozeExpiresAt);
    const followingIds = new Set((user.following || []).map((id) => id.toString()));

    if (isSnoozed && followingIds.size > 0) {
      const filtered = reels.filter((reel) => {
        const authorIdStr = reel.author?._id?.toString();
        return authorIdStr === userId.toString() || followingIds.has(authorIdStr);
      });
      if (filtered.length > 0) {
        reels = filtered;
      }
    }

    const mappedReels = reels.map((reel) => {
      let relevanceScore = 0;
      const authorIdStr = reel.author?._id?.toString();
      const isFriend = followingIds.has(authorIdStr);

      if (isFriend) {
        relevanceScore += 100;
      }

      if (reel.likes && reel.likes.length > 0) {
        const friendLikesCount = reel.likes.filter((like) => followingIds.has(like._id?.toString())).length;
        relevanceScore += friendLikesCount * 20;
      }
      if (reel.comments && reel.comments.length > 0) {
        const friendCommentsCount = reel.comments.filter((comment) => followingIds.has(comment.author?._id?.toString())).length;
        relevanceScore += friendCommentsCount * 30;
      }

      const categories = getReelCategories(reel);
      if (categories.length > 0 && user.contentCategoryInterests) {
        categories.forEach((cat) => {
          let interestScore = 0;
          if (typeof user.contentCategoryInterests.get === "function") {
            interestScore = user.contentCategoryInterests.get(cat) || 0;
          } else {
            interestScore = user.contentCategoryInterests[cat] || 0;
          }
          relevanceScore += interestScore * 2;
        });
      }

      relevanceScore += (reel.score || 0) * 0.5;

      return { reel, relevanceScore };
    });

    mappedReels.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.reel.createdAt || 0) - new Date(a.reel.createdAt || 0);
    });
    const sortedReels = mappedReels.map((item) => item.reel);

    return res.status(200).json({ success: true, error: false, reels: sortedReels });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getAllReels error: ${error.message}` });
  }
};



// 7. Get All Reels of Logged in User Controller
export const getAllReelsOfLoggedInUser = async (req, res) => {
  try {
    const author = req.userId;
    const reels = await Reel.find({ author })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified")
      .populate("likes", "_id")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("viewedBy", "userName name profileImage");

    return res.status(200).json({ success: true, error: false, reels });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getAllReelsOfLoggedInUser error: ${error.message}` });
  }
};



// 8. Like/Unlike Reel Controller
export const likeReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const targetId = reelId;
    const userId = req.userId;
    const { action } = req.body || {};

    const reelObj = await Reel.findById(targetId);
    if (!reelObj) {
      return res.status(404).json({ message: "Reel not found!" });
    }

    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(reelObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    if (reelObj.likes.length >= 50000 && !reelObj.likes.includes(userId)) {
      return res.status(429).json({
        message: "Like limit reached for this reel",
      });
    }

    let reel;
    const hasLiked = reelObj.likes.some((id) => id.toString() === userId.toString());

    if (action === "unlike" || (action === undefined && hasLiked)) {
      reel = await Reel.findOneAndUpdate(
        { _id: targetId },
        { $pull: { likes: userId } },
        { returnDocument: 'after' }
      );

      if (reel) {
        await Notification.deleteOne({
          recipient: reel.author,
          sender: userId,
          type: "like",
          reel: reel._id,
        });
      }
    } else {
      reel = await Reel.findOneAndUpdate(
        { _id: targetId },
        { $addToSet: { likes: userId } },
        { returnDocument: 'after' }
      );

      const existingNotif = await Notification.findOne({
        recipient: reel.author,
        sender: userId,
        type: "like",
        reel: reel._id,
      });

      if (!existingNotif) {
        createNotificationHelper({
          req,
          recipient: reel.author,
          sender: userId,
          type: "like",
          reel: reel._id,
        }).catch(() => null);
      }
    }

    const score = calculateReelScore(reel);
    reel = await Reel.findByIdAndUpdate(
      targetId,
      { $set: { score } },
      { returnDocument: 'after' }
    );

    await reel.populate("author", "name userName profileImage isVerified");
    await reel.populate("likes", "_id");
    await reel.populate("comments.author", "name userName profileImage isVerified");

    const isLikedNow = reel.likes.some((id) => id._id.toString() === userId.toString());
    if (isLikedNow) {
      recordCategoryInteraction(userId, reel, 5).catch(() => null);
    }

    return res.status(200).json({
      success: true,
      error: false,
      reel,
      message: isLikedNow ? "Like added" : "Like removed",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `likeReel error: ${error.message}` });
  }
};



// 9. Comment Reel Controller
export const commentReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const targetId = reelId;
    const author = req.userId;
    const { message, clientCommentId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: "Comment message is required" });
    }

    const reelObj = await Reel.findById(targetId);
    if (!reelObj) {
      return res.status(404).json({ message: "Reel not found!" });
    }

    const blockedUserIds = await getBlockedUserIds(author);
    if (blockedUserIds.includes(reelObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    const userComments = reelObj.comments.filter(
      (c) => c.author.toString() === author.toString()
    );

    if (userComments.length >= 100) {
      return res.status(429).json({
        message: "Too many comments on this reel",
      });
    }

    if (clientCommentId) {
      const alreadyExists = reelObj.comments.some((c) => c._id.toString() === clientCommentId.toString());
      if (alreadyExists) {
        const reel = await Reel.findById(targetId)
          .populate("author", "name userName profileImage isVerified")
          .populate("comments.author", "name userName profileImage isVerified");
        return res.status(200).json({ success: true, error: false, reel, message: "Duplicate comment detected (idempotent)" });
      }
    }

    const commentObj = { author, message: message.trim() };
    if (clientCommentId) {
      commentObj._id = clientCommentId;
    }

    const updatedReel = await Reel.findByIdAndUpdate(
      targetId,
      { $push: { comments: commentObj } },
      { returnDocument: 'after' }
    );

    const score = calculateReelScore(updatedReel);
    const reel = await Reel.findByIdAndUpdate(
      targetId,
      { $set: { score } },
      { returnDocument: 'after' }
    )
      .populate("author", "name userName profileImage isVerified")
      .populate("comments.author", "name userName profileImage isVerified");

    createNotificationHelper({
      req,
      recipient: reel.author,
      sender: author,
      type: "comment",
      reel: reel._id,
      commentText: message.trim(),
    }).catch(() => null);

    recordCategoryInteraction(author, reel, 10).catch(() => null);

    const comment = reel.comments[reel.comments.length - 1];
    return res.status(200).json({ success: true, error: false, reel, comment });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `commentReel error: ${error.message}` });
  }
};



// 10. Increment Reel View Controller
export const incrementReelView = async (req, res) => {
  try {
    const { reelId } = req.params;
    const targetId = reelId;
    const userId = req.userId;

    const reelObj = await Reel.findById(targetId);
    if (!reelObj) return res.status(404).json({ message: "Reel not found" });

    const alreadyViewed = reelObj.viewedBy.some((id) => id.toString() === userId.toString());
    if (alreadyViewed) {
      return res.status(200).json({
        success: true,
        error: false,
        views: reelObj.views,
        message: "View already counted",
      });
    }

    const updatedReel = await Reel.findByIdAndUpdate(
      targetId,
      {
        $inc: { views: 1 },
        $addToSet: { viewedBy: userId }
      },
      { returnDocument: 'after' }
    );

    const score = calculateReelScore(updatedReel);
    await Reel.findByIdAndUpdate(targetId, { $set: { score } });

    recordCategoryInteraction(userId, updatedReel, 1).catch(() => null);

    return res.status(200).json({
      success: true,
      error: false,
      views: updatedReel.views,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `incrementReelView error: ${error.message}` });
  }
};



// 11. Add Watch Time Controller
export const addWatchTime = async (req, res) => {
  try {
    const { duration } = req.body;
    const { reelId } = req.params;
    const targetId = reelId;

    const reel = await Reel.findById(targetId);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    reel.watchTime += duration || 0;
    reel.score += (duration || 0) * 5;
    await reel.save();

    recordCategoryInteraction(req.userId, reel, Math.min(Math.floor(duration || 0), 5)).catch(() => null);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 12. Get Single Reel By ID Controller
export const getReelById = async (req, res) => {
  try {
    const { reelId } = req.params;
    const targetId = reelId;
    const reel = await Reel.findById(targetId)
      .populate("author", "name userName profileImage isVerified")
      .populate("likes", "_id")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("viewedBy", "userName name profileImage")
      .populate({
        path: "originalReel",
        select: "media author caption",
        populate: { path: "author", select: "userName profileImage isVerified" },
      });

    if (!reel) {
      return res.status(404).json({ success: false, error: true, message: "Reel not found" });
    }

    const userId = req.userId;
    if (userId && reel.author) {
      const blockedUserIds = await getBlockedUserIds(userId);
      if (blockedUserIds.includes(reel.author._id.toString())) {
        return res.status(404).json({ success: false, error: true, message: "Reel not found" });
      }
    }

    return res.status(200).json({ success: true, error: false, reel });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getReelById error: ${error.message}` });
  }
};



// 13. Get Reels By Audio Track Controller
export const getReelsByAudio = async (req, res) => {
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

    const reels = await Reel.find(query)
      .sort({ createdAt: -1 })
      .populate("author", "userName profileImage name isVerified");

    const audioTrackName = reels.length > 0 ? reels[0].audioTrack?.title || reels[0].music || audioId : audioId;

    return res.status(200).json({
      success: true,
      error: false,
      audioTrackName,
      reels,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getReelsByAudio error: ${error.message}` });
  }
};



// 14. Delete Reel
export const deleteReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const targetId = reelId;
    const userId = req.userId;

    const reel = await Reel.findById(targetId);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found!" });

    if (reel.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this reel" });
    }

    if (reel.media?.public_id) {
      await deleteFromCloudinary(reel.media.public_id, "video").catch(() => null);
    }

    await User.updateMany({ savedReels: targetId }, { $pull: { savedReels: targetId } });
    await User.findByIdAndUpdate(reel.author, { $pull: { reels: targetId } });

    await Notification.deleteMany({ reel: targetId });

    await Reel.findByIdAndDelete(targetId);

    return res.status(200).json({ success: true, message: "Reel deleted successfully", reelId: targetId });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `deleteReel error: ${error.message}` });
  }
};

// 15. Not Interested in Reel (Feed Tuning)
export const notInterestedReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.userId;

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found!" });

    await Reel.findByIdAndUpdate(reelId, {
      $addToSet: { hiddenBy: userId },
    });

    return res.status(200).json({
      success: true,
      message: "We'll show you fewer reels like this.",
      reelId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `notInterestedReel error: ${error.message}` });
  }
};

// 16. Report Reel
export const reportReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.userId;
    const { reason, details } = req.body;

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found!" });

    await Reel.findByIdAndUpdate(reelId, {
      $push: {
        reports: {
          user: userId,
          reason: reason || "other",
          details: details || "",
          createdAt: new Date(),
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Thank you for reporting. We will review this reel shortly.",
      reelId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `reportReel error: ${error.message}` });
  }
};

// 17. Toggle Comments On/Off (Author Only)
export const toggleCommentsReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.userId;

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found!" });

    if (reel.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to change settings for this reel" });
    }

    const updatedState = !reel.commentsDisabled;
    reel.commentsDisabled = updatedState;
    await reel.save();

    return res.status(200).json({
      success: true,
      commentsDisabled: updatedState,
      message: updatedState ? "Commenting turned off for this reel." : "Commenting turned on for this reel.",
      reelId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `toggleCommentsReel error: ${error.message}` });
  }
};



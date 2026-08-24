import fs from "fs";
import { detectAIMetadataFromBuffer } from "../lib/aiMetadataDetector.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Reel } from "../models/reel.model.js";
import { Draft } from "../models/draft.model.js";
import { Collection } from "../models/collection.model.js";
import { createNotificationHelper } from "./notification.controller.js";
import { Notification } from "../models/notification.model.js";
import { rankPostsForUser } from "../services/feedAlgorithm.service.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";
import { getExcludedAuthorIdsForFeed } from "../utils/feedPrivacyHelper.js";

// 1. Upload Single Post Controller
export const uploadPost = async (req, res) => {
  try {
    const author = req.userId;
    let { caption, altText, mediaType, location, hashtags, music, taggedUsers, likesHidden, allowComments, scheduledPublishTime, aiLabel } = req.body;
    hashtags = parseHashtags(hashtags);

    if (!req.file) {
      return res.status(400).json({ message: "Media is required" });
    }

    const media = await uploadOnCloudinary(req.file.path, "VYBE/posts");

    let parsedTaggedUsers = [];
    if (taggedUsers) {
      try {
        parsedTaggedUsers = typeof taggedUsers === "string" ? JSON.parse(taggedUsers) : taggedUsers;
      } catch (e) {
        parsedTaggedUsers = [];
      }
    }

    let parsedMusic = null;
    if (music) {
      try {
        parsedMusic = typeof music === "string" ? JSON.parse(music) : music;
      } catch (e) {
        parsedMusic = { title: music };
      }
    }

    let parsedAiLabel = { isAIGenerated: false, tool: "", disclosedAt: null };
    if (aiLabel) {
      try {
        const raw = typeof aiLabel === "string" ? JSON.parse(aiLabel) : aiLabel;
        if (raw.isAIGenerated === true || raw.isAIGenerated === "true") {
          parsedAiLabel = {
            isAIGenerated: true,
            tool: raw.tool || "",
            disclosedAt: new Date(),
          };
        }
      } catch (e) {}
    }

    // Auto-detect C2PA / EXIF / SynthID AI metadata on server if not already self-disclosed
    if (!parsedAiLabel.isAIGenerated && req.file?.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          const buf = fs.readFileSync(req.file.path);
          const autoDetected = detectAIMetadataFromBuffer(buf);
          if (autoDetected && autoDetected.isAIGenerated) {
            parsedAiLabel = {
              isAIGenerated: true,
              tool: autoDetected.tool || "Generative AI",
              disclosedAt: new Date(),
              detectedAutomatically: true,
            };
          }
        }
      } catch (err) {}
    }

    const createdPost = await Post.create({
      caption,
      altText,
      mediaType: mediaType || "image",
      media,
      author,
      location,
      hashtags,
      music: parsedMusic,
      taggedUsers: parsedTaggedUsers,
      likesHidden: likesHidden === "true" || likesHidden === true,
      allowComments: allowComments !== "false" && allowComments !== false,
      scheduledPublishTime: scheduledPublishTime ? new Date(scheduledPublishTime) : null,
      aiLabel: parsedAiLabel,
    });

    await User.findByIdAndUpdate(author, { $push: { posts: createdPost._id } });

    const populatedPost = await Post.findById(createdPost._id)
      .populate("author", "name userName profileImage isVerified")
      .populate("taggedUsers.user", "userName profileImage");

    return res.status(200).json({
      success: true,
      error: false,
      post: populatedPost,
      message: "Post uploaded successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: `uploadPost error: ${error.message}` });
  }
};

// 2. Upload Multi-Media Carousel Post Controller
export const uploadCarouselPost = async (req, res) => {
  try {
    const author = req.userId;
    let { caption, altText, location, hashtags, music, taggedUsers, likesHidden, allowComments, scheduledPublishTime, aiLabel } = req.body;
    hashtags = parseHashtags(hashtags);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least 2 media items required for carousel" });
    }

    const carouselMedia = [];
    try {
      for (const file of req.files) {
        const upload = await uploadOnCloudinary(file.path, "VYBE/posts/carousel");
        carouselMedia.push({
          url: upload.url,
          public_id: upload.public_id,
          type: file.mimetype.startsWith("video") ? "video" : "image",
        });
      }
    } catch (uploadErr) {
      for (const item of carouselMedia) {
        if (item.public_id) await deleteFromCloudinary(item.public_id, item.type).catch(() => null);
      }
      throw uploadErr;
    }

    let parsedTaggedUsers = [];
    if (taggedUsers) {
      try {
        parsedTaggedUsers = typeof taggedUsers === "string" ? JSON.parse(taggedUsers) : taggedUsers;
      } catch (e) {
        parsedTaggedUsers = [];
      }
    }

    let parsedMusic = null;
    if (music) {
      try {
        parsedMusic = typeof music === "string" ? JSON.parse(music) : music;
      } catch (e) {
        parsedMusic = { title: music };
      }
    }

    let parsedAiLabel = { isAIGenerated: false, tool: "", disclosedAt: null };
    if (aiLabel) {
      try {
        const raw = typeof aiLabel === "string" ? JSON.parse(aiLabel) : aiLabel;
        if (raw.isAIGenerated === true || raw.isAIGenerated === "true") {
          parsedAiLabel = {
            isAIGenerated: true,
            tool: raw.tool || "",
            disclosedAt: new Date(),
          };
        }
      } catch (e) {}
    }

    // Auto-detect C2PA / EXIF / SynthID AI metadata across carousel items
    if (!parsedAiLabel.isAIGenerated && req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file?.path && fs.existsSync(file.path)) {
          try {
            const buf = fs.readFileSync(file.path);
            const autoDetected = detectAIMetadataFromBuffer(buf);
            if (autoDetected && autoDetected.isAIGenerated) {
              parsedAiLabel = {
                isAIGenerated: true,
                tool: autoDetected.tool || "Generative AI",
                disclosedAt: new Date(),
                detectedAutomatically: true,
              };
              break;
            }
          } catch (e) {}
        }
      }
    }

    const createdPost = await Post.create({
      caption,
      altText,
      mediaType: "carousel",
      media: carouselMedia[0], // primary thumbnail
      carouselMedia,
      author,
      location,
      hashtags,
      music: parsedMusic,
      taggedUsers: parsedTaggedUsers,
      likesHidden: likesHidden === "true" || likesHidden === true,
      allowComments: allowComments !== "false" && allowComments !== false,
      scheduledPublishTime: scheduledPublishTime ? new Date(scheduledPublishTime) : null,
      aiLabel: parsedAiLabel,
    });

    await User.findByIdAndUpdate(author, { $push: { posts: createdPost._id } });

    const populatedPost = await Post.findById(createdPost._id)
      .populate("author", "name userName profileImage isVerified")
      .populate("taggedUsers.user", "userName profileImage");

    return res.status(200).json({
      success: true,
      error: false,
      post: populatedPost,
      message: "Carousel Post published! 📸",
    });
  } catch (error) {
    return res.status(500).json({ message: `uploadCarouselPost error: ${error.message}` });
  }
};

// 3. Toggle Archive Post Controller
export const toggleArchivePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to archive this post" });
    }

    const newArchiveState = !post.isArchived;

    // Use findOneAndUpdate to bypass full schema re-validation on save()
    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId },
      { $set: { isArchived: newArchiveState } },
      { returnDocument: 'after' }
    ).populate("author", "name userName profileImage isVerified");

    return res.status(200).json({
      success: true,
      isArchived: updatedPost.isArchived,
      post: updatedPost,
      message: updatedPost.isArchived ? "Post moved to archive" : "Post unarchived to feed",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `toggleArchive error: ${error.message}` });
  }
};

// 4. Get Private Archived Posts Controller
export const getArchivedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.userId, isArchived: true })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified")
      .lean();

    return res.status(200).json({ success: true, posts: posts || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getArchived error: ${error.message}` });
  }
};

// 4b. Edit Post Controller
export const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this post" });
    }

    const { caption, location, altText, allowComments, likesHidden, aiLabel } = req.body;

    // Build update object — only include fields that were actually sent
    const updateFields = {
      isEdited: true,
      editedAt: new Date(),
    };

    if (caption !== undefined) {
      updateFields.caption = caption;
      // Auto-extract hashtags from caption
      const hashtagMatches = caption.match(/#[a-zA-Z0-9_]+/g);
      updateFields.hashtags = hashtagMatches ? hashtagMatches.map((h) => h.slice(1).toLowerCase()) : [];
    }
    if (location !== undefined) updateFields.location = location;
    if (altText !== undefined) updateFields.altText = altText;
    if (allowComments !== undefined) updateFields.allowComments = allowComments;
    if (likesHidden !== undefined) updateFields.likesHidden = likesHidden;

    // AI Content Disclosure
    if (aiLabel !== undefined) {
      updateFields["aiLabel.isAIGenerated"] = !!aiLabel.isAIGenerated;
      updateFields["aiLabel.tool"] = aiLabel.tool || "";
      if (aiLabel.isAIGenerated && !post.aiLabel?.disclosedAt) {
        updateFields["aiLabel.disclosedAt"] = new Date();
      }
      if (!aiLabel.isAIGenerated) {
        updateFields["aiLabel.disclosedAt"] = null;
      }
    }

    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId },
      { $set: updateFields },
      { returnDocument: 'after' }
    )
      .populate("author", "name userName profileImage isVerified")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("taggedUsers.user", "userName profileImage");

    return res.status(200).json({
      success: true,
      post: updatedPost,
      message: "Post updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `editPost error: ${error.message}` });
  }
};

// 5. Named Collections Controllers
export const createCollection = async (req, res) => {
  try {
    const { name, coverImage } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Collection name required" });

    const collection = await Collection.create({
      name: name.trim(),
      author: req.userId,
      coverImage: coverImage || "",
    });

    return res.status(201).json({ success: true, collection });
  } catch (error) {
    return res.status(500).json({ message: `createCollection error: ${error.message}` });
  }
};

export const getUserCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ author: req.userId })
      .populate("posts")
      .populate("reels");
    return res.status(200).json({ success: true, collections });
  } catch (error) {
    return res.status(500).json({ message: `getUserCollections error: ${error.message}` });
  }
};

export const addPostToCollection = async (req, res) => {
  try {
    const { collectionId, postId, reelId } = req.body;

    const collection = await Collection.findById(collectionId);
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    if (collection.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (postId) {
      const index = collection.posts.indexOf(postId);
      if (index === -1) {
        collection.posts.push(postId);
      } else {
        collection.posts.splice(index, 1);
      }
    }

    if (reelId) {
      if (!collection.reels) collection.reels = [];
      const reelIndex = collection.reels.indexOf(reelId);
      if (reelIndex === -1) {
        collection.reels.push(reelId);
      } else {
        collection.reels.splice(reelIndex, 1);
      }
    }

    await collection.save();
    return res.status(200).json({ success: true, collection });
  } catch (error) {
    return res.status(500).json({ message: `addPostToCollection error: ${error.message}` });
  }
};

// 6. Drafts Controllers
export const saveDraft = async (req, res) => {
  try {
    const {
      draftId,
      _id,
      caption = "",
      location = "",
      hashtags = [],
      mediaPreview = "",
      draftType = "post",
      mediaItems = [],
      altText = "",
      aspectRatio = "4:5",
      filter = "normal",
      audioTrack = null,
      aiLabel = null,
      isVybeTv = false,
      videoDuration = 0,
    } = req.body;

    const targetDraftId = draftId || _id;

    if (targetDraftId) {
      const existingDraft = await Draft.findOne({ _id: targetDraftId, author: req.userId });
      if (existingDraft) {
        existingDraft.caption = caption;
        existingDraft.location = location;
        existingDraft.hashtags = parseHashtags(hashtags);
        if (mediaPreview) existingDraft.mediaPreview = mediaPreview;
        existingDraft.draftType = draftType;
        existingDraft.mediaItems = mediaItems;
        existingDraft.altText = altText;
        existingDraft.aspectRatio = aspectRatio;
        existingDraft.filter = filter;
        existingDraft.audioTrack = audioTrack;
        if (aiLabel) existingDraft.aiLabel = aiLabel;
        existingDraft.isVybeTv = isVybeTv;
        existingDraft.videoDuration = videoDuration;
        await existingDraft.save();

        return res.status(200).json({ success: true, draft: existingDraft, message: "Draft updated! 📝" });
      }
    }

    const draft = await Draft.create({
      author: req.userId,
      caption,
      location,
      hashtags: parseHashtags(hashtags),
      mediaPreview: mediaPreview || mediaItems?.[0]?.preview || mediaItems?.[0]?.url || "",
      draftType,
      mediaItems,
      altText,
      aspectRatio,
      filter,
      audioTrack,
      aiLabel,
      isVybeTv,
      videoDuration,
    });
    return res.status(201).json({ success: true, draft, message: "Draft saved! 📝" });
  } catch (error) {
    return res.status(500).json({ message: `saveDraft error: ${error.message}` });
  }
};

export const getUserDrafts = async (req, res) => {
  try {
    const drafts = await Draft.find({ author: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, drafts });
  } catch (error) {
    return res.status(500).json({ message: `getUserDrafts error: ${error.message}` });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    const draft = await Draft.findOneAndDelete({ _id: draftId, author: req.userId });
    if (!draft) {
      return res.status(404).json({ success: false, message: "Draft not found" });
    }
    return res.status(200).json({ success: true, message: "Draft deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: `deleteDraft error: ${error.message}` });
  }
};

// 7. Get All Posts (Public Feed - excluding archived)
export const getAllPosts = async (req, res) => {
  try {
    const excludedAuthorIds = await getExcludedAuthorIdsForFeed(req.userId);

    const posts = await Post.find({
      isArchived: { $ne: true },
      author: { $nin: excludedAuthorIds },
      $or: [
        { scheduledPublishTime: { $exists: false } },
        { scheduledPublishTime: null },
        { scheduledPublishTime: { $lte: new Date() } }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified followers accountType professionalType")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("comments.replies.author", "name userName profileImage isVerified")
      .populate("taggedUsers.user", "userName profileImage")
      .lean();

    const validPosts = posts.filter(p => p && p.author);

    return res.status(200).json({ success: true, error: false, posts: validPosts });
  } catch (error) {
    return res.status(500).json({ message: `getAllPosts error: ${error.message}` });
  }
};

// 7b. Get Algorithmic Ranked Feed
export const getRankedFeed = async (req, res) => {
  try {
    const { mode = "for-you" } = req.query;
    const currentUser = await User.findById(req.userId);
    const excludedAuthorIds = await getExcludedAuthorIdsForFeed(req.userId);

    const posts = await Post.find({
      isArchived: { $ne: true },
      author: { $nin: excludedAuthorIds },
      $or: [
        { scheduledPublishTime: { $exists: false } },
        { scheduledPublishTime: null },
        { scheduledPublishTime: { $lte: new Date() } }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified followers accountType professionalType")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("comments.replies.author", "name userName profileImage isVerified")
      .populate("taggedUsers.user", "userName profileImage")
      .lean();

    const validPosts = posts.filter(p => p && p.author);
    const rankedPosts = rankPostsForUser(validPosts, currentUser, mode);

    return res.status(200).json({
      success: true,
      mode,
      posts: rankedPosts,
    });
  } catch (error) {
    return res.status(500).json({ message: `getRankedFeed error: ${error.message}` });
  }
};

// 8. Get Posts of Logged in User (excluding archived)
export const getAllPostsOfLoggedInUser = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.userId, isArchived: { $ne: true } })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("comments.replies.author", "name userName profileImage isVerified")
      .lean();
    return res.status(200).json({ success: true, error: false, posts });
  } catch (error) {
    return res.status(500).json({ message: `getAllPosts error: ${error.message}` });
  }
};

// 9. Like Post Controller
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;
    const { action } = req.body;

    const postObj = await Post.findById(postId);
    if (!postObj) return res.status(404).json({ message: "Post not found!" });

    // Block check
    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.includes(postObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    let post;
    const hasLiked = postObj.likes.some((id) => id.toString() === userId.toString());

    if (action === "unlike" || (action === undefined && hasLiked)) {
      post = await Post.findOneAndUpdate(
        { _id: postId },
        { $pull: { likes: userId } },
        { returnDocument: 'after' }
      );

      if (post) {
        // Unlike occurred - delete notification
        await Notification.deleteOne({
          recipient: post.author,
          sender: userId,
          type: "like",
          post: post._id,
        });
      }
    } else {
      // Like occurred - addToSet
      post = await Post.findOneAndUpdate(
        { _id: postId },
        { $addToSet: { likes: userId } },
        { returnDocument: 'after' }
      );

      const existingNotif = await Notification.findOne({
        recipient: post.author,
        sender: userId,
        type: "like",
        post: post._id,
      });

      if (!existingNotif) {
        createNotificationHelper({
          req,
          recipient: post.author,
          sender: userId,
          type: "like",
          post: post._id,
        }).catch(() => null);
      }
    }

    await post.populate("author", "name userName profileImage.url profileImage.public_id isVerified");

    return res.status(200).json({ success: true, error: false, post });
  } catch (error) {
    return res.status(500).json({ message: `likePost error: ${error.message}` });
  }
};

// 9b. Get Post Likers Controller
export const getPostLikers = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).populate({
      path: "likes",
      select: "name userName profileImage isVerified followers following",
    });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    return res.status(200).json({ success: true, likers: post.likes || [] });
  } catch (error) {
    return res.status(500).json({ message: `getPostLikers error: ${error.message}` });
  }
};

// 10. Comment Post Controller
export const commentPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const author = req.userId;
    const { message, clientCommentId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }

    const postObj = await Post.findById(postId);
    if (!postObj) return res.status(404).json({ message: "Post not found!" });

    // Block check
    const blockedUserIds = await getBlockedUserIds(author);
    if (blockedUserIds.includes(postObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    if (clientCommentId) {
      const alreadyExists = postObj.comments.some(c => c._id.toString() === clientCommentId.toString());
      if (alreadyExists) {
        const post = await Post.findById(postId)
          .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
          .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified");
        return res.status(200).json({ success: true, error: false, post, message: "Duplicate comment detected (idempotent)" });
      }
    }

    const commentObj = { author, message: message.trim(), replies: [], likes: [] };
    if (clientCommentId) {
      commentObj._id = clientCommentId;
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: commentObj } },
      { returnDocument: 'after' }
    )
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.replies.author", "name userName profileImage.url profileImage.public_id isVerified");

    createNotificationHelper({
      req,
      recipient: post.author,
      sender: author,
      type: "comment",
      post: post._id,
      commentText: message.trim(),
    }).catch(() => null);

    return res.status(200).json({ success: true, error: false, post });
  } catch (error) {
    return res.status(500).json({ message: `commentPost error: ${error.message}` });
  }
};

// 10b. Like / Unlike Post Comment Controller
export const likePostComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (!comment.likes) comment.likes = [];
    const hasLiked = comment.likes.some((id) => id.toString() === userId.toString());

    if (hasLiked) {
      comment.likes = comment.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      comment.likes.push(userId);
      if (comment.author.toString() !== userId.toString()) {
        createNotificationHelper({
          req,
          recipient: comment.author,
          sender: userId,
          type: "like",
          post: post._id,
        }).catch(() => null);
      }
    }

    await post.save();
    const updatedPost = await Post.findById(postId)
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.replies.author", "name userName profileImage.url profileImage.public_id isVerified");

    return res.status(200).json({ success: true, post: updatedPost, isLiked: !hasLiked });
  } catch (error) {
    return res.status(500).json({ message: `likePostComment error: ${error.message}` });
  }
};

// 10c. Reply to Post Comment Controller
export const replyPostComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const author = req.userId;
    const { message, replyingTo } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (!comment.replies) comment.replies = [];
    comment.replies.push({
      author,
      message: message.trim(),
      replyingTo: replyingTo || "",
      likes: [],
      createdAt: new Date(),
    });

    await post.save();
    const updatedPost = await Post.findById(postId)
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.replies.author", "name userName profileImage.url profileImage.public_id isVerified");

    if (comment.author.toString() !== author.toString()) {
      createNotificationHelper({
        req,
        recipient: comment.author,
        sender: author,
        type: "comment",
        post: post._id,
        commentText: message.trim(),
      }).catch(() => null);
    }

    return res.status(200).json({ success: true, post: updatedPost });
  } catch (error) {
    return res.status(500).json({ message: `replyPostComment error: ${error.message}` });
  }
};

// 10d. Like / Unlike Post Reply Controller
export const likePostReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (!reply.likes) reply.likes = [];
    const hasLiked = reply.likes.some((id) => id.toString() === userId.toString());

    if (hasLiked) {
      reply.likes = reply.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      reply.likes.push(userId);
    }

    await post.save();
    const updatedPost = await Post.findById(postId)
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.replies.author", "name userName profileImage.url profileImage.public_id isVerified");

    return res.status(200).json({ success: true, post: updatedPost, isLiked: !hasLiked });
  } catch (error) {
    return res.status(500).json({ message: `likePostReply error: ${error.message}` });
  }
};

// 10e. Delete Post Reply Controller
export const deletePostReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (reply.author.toString() !== userId.toString() && post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this reply" });
    }

    comment.replies.pull(replyId);
    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.replies.author", "name userName profileImage.url profileImage.public_id isVerified");

    return res.status(200).json({ success: true, post: updatedPost, message: "Reply deleted" });
  } catch (error) {
    return res.status(500).json({ message: `deletePostReply error: ${error.message}` });
  }
};

// 10f. Pin / Unpin Post Comment Controller (YouTube/Instagram Style)
export const pinPostComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the post author can pin comments" });
    }

    const targetComment = post.comments.id(commentId);
    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const willPin = !targetComment.isPinned;
    if (willPin) {
      // Unpin any other previously pinned comments (YouTube standard)
      post.comments.forEach((c) => {
        c.isPinned = false;
      });
      targetComment.isPinned = true;
    } else {
      targetComment.isPinned = false;
    }

    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.replies.author", "name userName profileImage.url profileImage.public_id isVerified");

    return res.status(200).json({ success: true, post: updatedPost, isPinned: targetComment.isPinned });
  } catch (error) {
    return res.status(500).json({ message: `pinPostComment error: ${error.message}` });
  }
};

// 11. Save Post Controller
export const savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    const userObj = await User.findById(userId);
    if (!userObj) return res.status(404).json({ message: "User not found!" });

    const alreadySaved = userObj.savedPosts.some((id) => id.toString() === postId.toString());
    let user;

    if (alreadySaved) {
      user = await User.findByIdAndUpdate(
        userId,
        { $pull: { savedPosts: postId } },
        { returnDocument: 'after' }
      );
      await Post.findByIdAndUpdate(postId, { $inc: { savedCount: -1 } });
    } else {
      user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { savedPosts: postId } },
        { returnDocument: 'after' }
      );
      await Post.findByIdAndUpdate(postId, { $inc: { savedCount: 1 } });
    }

    return res.status(200).json({
      success: true,
      error: false,
      user,
      savedPosts: user.savedPosts,
      message: `Post ${alreadySaved ? "unsaved" : "saved"}!`,
    });
  } catch (error) {
    return res.status(500).json({ message: `save error: ${error.message}` });
  }
};

// 11b. Get Saved Posts Controller
export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: "savedPosts",
      populate: [
        { path: "author", select: "name userName profileImage isVerified" },
        { path: "comments.author", select: "userName profileImage isVerified" },
      ],
    });

    return res.status(200).json({
      success: true,
      error: false,
      savedPosts: user?.savedPosts || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `getSavedPosts error: ${error.message}`,
    });
  }
};

// 12. Delete Post Controller
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found!" });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    if (post.mediaType === "carousel" && post.carouselMedia && post.carouselMedia.length > 0) {
      for (const item of post.carouselMedia) {
        if (item.public_id) {
          await deleteFromCloudinary(item.public_id, item.type === "video" ? "video" : "image").catch(() => null);
        }
      }
    } else if (post.media?.public_id) {
      await deleteFromCloudinary(post.media.public_id, post.mediaType === "video" ? "video" : "image").catch(() => null);
    }

    await User.updateMany({ savedPosts: post._id }, { $pull: { savedPosts: post._id } });
    await User.findByIdAndUpdate(post.author, { $pull: { posts: post._id } });
    await Collection.updateMany({ posts: postId }, { $pull: { posts: postId } });
    await Notification.deleteMany({ post: postId });
    await Post.findByIdAndDelete(postId);

    return res.status(200).json({ success: true, message: "Post deleted successfully", postId });
  } catch (error) {
    return res.status(500).json({ message: `deletePost error: ${error.message}` });
  }
};

const parseHashtags = (hashtags) => {
  if (!hashtags) return [];
  if (Array.isArray(hashtags)) return hashtags.map((h) => h.toString().trim()).filter(Boolean);
  if (typeof hashtags === "string") {
    return hashtags
      .split(/[,#\s]+/)
      .map((h) => h.trim())
      .filter(Boolean);
  }
  return [];
};

// Delete Comment Controller
export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const postObj = await Post.findById(postId);
    if (!postObj) return res.status(404).json({ message: "Post not found" });

    const comment = postObj.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.author.toString() !== req.userId.toString() && postObj.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $pull: { comments: { _id: commentId } } },
      { returnDocument: 'after' }
    ).populate("author", "name userName profileImage.url profileImage.public_id isVerified")
     .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified");

    await Notification.deleteOne({
      recipient: postObj.author,
      sender: comment.author,
      type: "comment",
      post: postObj._id,
      commentText: comment.message,
    });

    return res.status(200).json({ success: true, message: "Comment deleted", post });
  } catch (error) {
    return res.status(500).json({ message: `deleteComment error: ${error.message}` });
  }
};

// Edit Comment Controller
export const editComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { message } = req.body;
    const postObj = await Post.findById(postId);
    if (!postObj) return res.status(404).json({ message: "Post not found" });

    const comment = postObj.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this comment" });
    }

    const blockedUserIds = await getBlockedUserIds(req.userId);
    if (blockedUserIds.includes(postObj.author.toString())) {
      return res.status(403).json({ message: "Action blocked." });
    }

    const post = await Post.findOneAndUpdate(
      { _id: postId, "comments._id": commentId },
      { $set: { "comments.$.message": message } },
      { returnDocument: 'after' }
    )
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified");

    const editedComment = post.comments.find(c => c._id.toString() === commentId.toString());
    return res.status(200).json({ success: true, message: "Comment edited", post, comment: editedComment });
  } catch (error) {
    return res.status(500).json({ message: `editComment error: ${error.message}` });
  }
};

// Get Posts by Audio Track
export const getPostsByAudio = async (req, res) => {
  try {
    const { audioId } = req.params;
    const decoded = decodeURIComponent(audioId || "").trim();

    if (!decoded) {
      return res.status(200).json({ success: true, posts: [], count: 0 });
    }

    const regex = new RegExp(decoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const posts = await Post.find({
      isArchived: { $ne: true },
      $or: [
        { music: { $regex: regex } },
        { "music.title": { $regex: regex } },
        { "music.id": decoded },
        { "music.trackId": decoded },
      ],
    })
      .populate("author", "userName name profileImage isVerified")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      audioTrackName: decoded,
      count: posts.length,
      posts,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getPostsByAudio error: ${error.message}` });
  }
};

// Get Single Post By ID Controller
export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .populate("author", "name userName profileImage isVerified followers accountType professionalType")
      .populate("likes", "_id")
      .populate("comments.author", "name userName profileImage isVerified")
      .populate("comments.replies.author", "name userName profileImage isVerified")
      .populate("taggedUsers.user", "userName profileImage");

    if (!post) {
      return res.status(404).json({ success: false, error: true, message: "Post not found" });
    }

    return res.status(200).json({ success: true, error: false, post });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `getPostById error: ${error.message}` });
  }
};

// Get Tagged Posts & Reels for a User
export const getTaggedPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const [posts, reels] = await Promise.all([
      Post.find({ "taggedUsers.user": userId, isArchived: { $ne: true } })
        .sort({ createdAt: -1 })
        .populate("author", "name userName profileImage isVerified"),
      Reel.find({ taggedUsers: userId })
        .sort({ createdAt: -1 })
        .populate("author", "name userName profileImage isVerified"),
    ]);

    const formattedPosts = posts.map((p) => ({ ...p.toObject(), __kind: "post" }));
    const formattedReels = reels.map((r) => ({ ...r.toObject(), __kind: "reel" }));
    const tagged = [...formattedPosts, ...formattedReels].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({ success: true, tagged });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getTaggedPosts error: ${error.message}` });
  }
};


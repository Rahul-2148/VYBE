import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Draft } from "../models/draft.model.js";
import { Collection } from "../models/collection.model.js";
import { createNotificationHelper } from "./notification.controller.js";
import { Notification } from "../models/notification.model.js";
import { rankPostsForUser } from "../services/feedAlgorithm.service.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";

// 1. Upload Single Post Controller
export const uploadPost = async (req, res) => {
  try {
    const author = req.userId;
    let { caption, altText, mediaType, location, hashtags, music, taggedUsers, likesHidden, allowComments, scheduledPublishTime } = req.body;
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
    let { caption, altText, location, hashtags, music, taggedUsers, likesHidden, allowComments, scheduledPublishTime } = req.body;
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
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to archive this post" });
    }

    post.isArchived = !post.isArchived;
    await post.save();

    return res.status(200).json({
      success: true,
      isArchived: post.isArchived,
      message: post.isArchived ? "Post moved to archive" : "Post unarchived to feed",
    });
  } catch (error) {
    return res.status(500).json({ message: `toggleArchive error: ${error.message}` });
  }
};

// 4. Get Private Archived Posts Controller
export const getArchivedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.userId, isArchived: true })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified");

    return res.status(200).json({ success: true, posts });
  } catch (error) {
    return res.status(500).json({ message: `getArchived error: ${error.message}` });
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
    const collections = await Collection.find({ author: req.userId }).populate("posts");
    return res.status(200).json({ success: true, collections });
  } catch (error) {
    return res.status(500).json({ message: `getUserCollections error: ${error.message}` });
  }
};

export const addPostToCollection = async (req, res) => {
  try {
    const { collectionId, postId } = req.body;

    const collection = await Collection.findById(collectionId);
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    if (collection.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const index = collection.posts.indexOf(postId);
    if (index === -1) {
      collection.posts.push(postId);
    } else {
      collection.posts.splice(index, 1);
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
    const { caption, location, hashtags, mediaPreview } = req.body;
    const draft = await Draft.create({
      author: req.userId,
      caption,
      location,
      hashtags: parseHashtags(hashtags),
      mediaPreview,
    });
    return res.status(201).json({ success: true, draft, message: "Draft saved!" });
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

// 7. Get All Posts (Public Feed - excluding archived)
export const getAllPosts = async (req, res) => {
  try {
    const blockedUserIds = await getBlockedUserIds(req.userId);
    const privateUsers = await User.find({
      accountType: "private",
      _id: { $ne: req.userId },
      followers: { $ne: req.userId }
    }).select("_id");
    
    const privateUserIds = privateUsers.map(u => u._id);
    const excludedUserIds = [...privateUserIds, ...blockedUserIds];

    const posts = await Post.find({
      isArchived: { $ne: true },
      author: { $nin: excludedUserIds },
      $or: [
        { scheduledPublishTime: { $exists: false } },
        { scheduledPublishTime: null },
        { scheduledPublishTime: { $lte: new Date() } }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("taggedUsers.user", "userName profileImage.url")
      .lean();

    return res.status(200).json({ success: true, error: false, posts });
  } catch (error) {
    return res.status(500).json({ message: `getAllPosts error: ${error.message}` });
  }
};

// 7b. Get Algorithmic Ranked Feed
export const getRankedFeed = async (req, res) => {
  try {
    const { mode = "for-you" } = req.query;
    const currentUser = await User.findById(req.userId);
    const blockedUserIds = await getBlockedUserIds(req.userId);

    const privateUsers = await User.find({
      accountType: "private",
      _id: { $ne: req.userId },
      followers: { $ne: req.userId }
    }).select("_id");
    
    const privateUserIds = privateUsers.map(u => u._id);
    const excludedUserIds = [...privateUserIds, ...blockedUserIds];

    const posts = await Post.find({
      isArchived: { $ne: true },
      author: { $nin: excludedUserIds },
      $or: [
        { scheduledPublishTime: { $exists: false } },
        { scheduledPublishTime: null },
        { scheduledPublishTime: { $lte: new Date() } }
      ]
    })
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("taggedUsers.user", "userName profileImage.url")
      .lean();

    const rankedPosts = rankPostsForUser(posts, currentUser, mode);

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
        { new: true }
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
        { new: true }
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

    const commentObj = { author, message: message.trim() };
    if (clientCommentId) {
      commentObj._id = clientCommentId;
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: commentObj } },
      { new: true }
    )
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified");

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
        { new: true }
      );
      await Post.findByIdAndUpdate(postId, { $inc: { savedCount: -1 } });
    } else {
      user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { savedPosts: postId } },
        { new: true }
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
      { new: true }
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
      { new: true }
    )
      .populate("author", "name userName profileImage.url profileImage.public_id isVerified")
      .populate("comments.author", "name userName profileImage.url profileImage.public_id isVerified");

    const editedComment = post.comments.find(c => c._id.toString() === commentId.toString());
    return res.status(200).json({ success: true, message: "Comment edited", post, comment: editedComment });
  } catch (error) {
    return res.status(500).json({ message: `editComment error: ${error.message}` });
  }
};

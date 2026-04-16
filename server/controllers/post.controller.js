import uploadOnCloudinary from "../config/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";

// upload post controller
export const uploadPost = async (req, res) => {
  try {
    const author = req.userId; // auth middleware
    let { caption, mediaType, location, hashtags, music } = req.body;
    hashtags = parseHashtags(hashtags);

    if (!mediaType) {
      return res.status(400).json({ message: "mediaType is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Media is required" });
    }

    if (!validateMediaTypeWithMimetype(mediaType, req.file.mimetype)) {
      return res.status(400).json({
        message: `mediaType (${mediaType}) doesn't match uploaded file type (${req.file.mimetype})`,
      });
    }

    // Upload to cloudinary
    const media = await uploadOnCloudinary(req.file.path, "VYBE/posts");

    const createdPost = await Post.create({
      caption,
      mediaType,
      media,
      author,
      location,
      hashtags,
      music,
    });

    const user = await User.findById(req.userId);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Author (user) not found" });
    }
    user.posts.push(createdPost._id);
    await user.save();

    const populatedPost = await Post.findById(createdPost._id)
      .populate("author", "name userName profileImage")
      .populate("comments.author");
    return res.status(200).json({
      success: true,
      error: false,
      post: populatedPost,
      message: "Post uploaded successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `uploadPost error: ${error.message}` });
  }
};

// get all posts of current user controller
export const getAllPostsOfLoggedInUser = async (req, res) => {
  try {
    const author = req.userId; // auth middleware
    const posts = await Post.find({ author })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage")
      .populate("comments.author")
      .lean();
    return res.status(200).json({ success: true, error: false, posts });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `getAllPosts error: ${error.message}` });
  }
};

// like controller (atomic)
export const likePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId; // auth middleware

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found!" });
    }

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === userId.toString()
    );
    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      post.likes.push(userId);
    }

    await post.save();
    await post.populate({
      path: "author",
      select: "name userName profileImage.url profileImage.public_id",
    });

    return res.status(200).json({ success: true, error: false, post });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `likePost error: ${error.message}` });
  }
};

// comment controller
export const commentPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const author = req.userId; // auth middleware
    const { message } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (message.length > 1000) {
      return res
        .status(400)
        .json({ message: "Message too long (max 1000 chars)" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found!" });
    }

    post.comments.push({ author, message: message.trim() });
    await post.save();
    await post.populate({
      path: "author",
      select: "name userName profileImage.url profileImage.public_id",
    });

    await post.populate({
      path: "comments.author",
      select: "name userName profileImage.url profileImage.public_id",
    });

    return res.status(200).json({ success: true, error: false, post });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `commentPost error: ${error.message}` });
  }
};

// save post controller
export const savePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const alreadySaved = user.savedPosts.some(
      (id) => id.toString() === postId.toString()
    );

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId.toString()
      );
    } else {
      user.savedPosts.push(postId);
    }

    await user.save();
    // await user.populate("savedPosts savedPosts.author");

    return res.status(200).json({
      success: true,
      error: false,
      savedPosts: user.savedPosts,
      message: `Post ${alreadySaved ? "unsaved" : "saved"}!`,
    });
  } catch (error) {
    return res.status(500).json({
      message: `saved error: ${error.message}`,
    });
  }
};

// get all posts controller (public feed)
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "name userName profileImage.url profileImage.public_id",
      })
      .populate({
        path: "comments.author",
        select: "name userName profileImage.url profileImage.public_id",
      })
      .lean();

    return res.status(200).json({
      success: true,
      error: false,
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      message: `getAllPosts error: ${error.message}`,
    });
  }
};

// delete post controller (only author can delete)
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found!" });
    }

    // Only author can delete
    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    // 🔥 Delete Cloudinary media
    if (post.media?.public_id) {
      const resourceType = post.mediaType === "video" ? "video" : "image";
      await deleteFromCloudinary(post.media.public_id, resourceType);
    }

    // 🔥 1️⃣ Remove post from ALL users' savedPosts
    await User.updateMany(
      { savedPosts: post._id },
      { $pull: { savedPosts: post._id } }
    );

    // 🔥 2️⃣ Remove post from author's posts
    await User.findByIdAndUpdate(post.author, {
      $pull: { posts: post._id },
    });

    // 🔥 3️⃣ Delete post itself
    await Post.findByIdAndDelete(postId);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Post deleted successfully",
      postId,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `deletePost error: ${error.message}` });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (
      comment.author.toString() !== userId.toString() &&
      post.author.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    comment.deleteOne();
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Comment deleted",
      postId,
      commentId,
    });
  } catch (error) {
    return res.status(500).json({
      message: `deleteComment error: ${error.message}`,
    });
  }
};

// edit comment
export const editComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.userId;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    comment.message = message.trim();
    await post.save();

    await post.populate({
      path: "comments.author",
      select: "userName profileImage.url profileImage.public_id",
    });

    const updatedComment = post.comments.id(commentId);

    return res.status(200).json({
      success: true,
      message: "Comment edited",
      postId,
      comment: updatedComment,
    });
  } catch (error) {
    return res.status(500).json({
      message: `editComment error: ${error.message}`,
    });
  }
};

// Helper: sanitize hashtags input
const parseHashtags = (hashtags) => {
  if (!hashtags) return [];
  if (Array.isArray(hashtags))
    return hashtags.map((h) => h.toString().trim()).filter(Boolean);
  if (typeof hashtags === "string") {
    // split by comma or space
    return hashtags
      .split(/[,#\s]+/)
      .map((h) => h.trim())
      .filter(Boolean);
  }
  return [];
};

// Validate mediaType against mimetype (basic)
const validateMediaTypeWithMimetype = (mediaType, mimetype) => {
  if (!mimetype || !mediaType) return true; // skip strict validation if unknown
  if (mediaType === "image" && mimetype.startsWith("image/")) return true;
  if (mediaType === "video" && mimetype.startsWith("video/")) return true;
  if (mediaType === "audio" && mimetype.startsWith("audio/")) return true;
  if (mediaType === "text") return true;
  return false;
};

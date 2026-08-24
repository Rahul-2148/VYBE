import express from "express";
import {
  commentPost,
  likePostComment,
  replyPostComment,
  likePostReply,
  deletePostReply,
  pinPostComment,
  deleteComment,
  deletePost,
  editComment,
  editPost,
  getAllPosts,
  getAllPostsOfLoggedInUser,
  likePost,
  getPostLikers,
  savePost,
  getSavedPosts,
  uploadPost,
  uploadCarouselPost,
  toggleArchivePost,
  getArchivedPosts,
  createCollection,
  getUserCollections,
  addPostToCollection,
  saveDraft,
  getUserDrafts,
  deleteDraft,
  getRankedFeed,
  getPostsByAudio,
  getPostById,
  getTaggedPosts,
} from "../controllers/post.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const postRouter = express.Router();

// Audio Tracks
postRouter.get("/audio/:audioId", isAuthenticated, getPostsByAudio);

// Upload & Feed
postRouter.post("/upload", isAuthenticated, upload.single("media"), uploadPost);
postRouter.post("/upload-carousel", isAuthenticated, upload.array("media", 10), uploadCarouselPost);
postRouter.get("/get-all-posts", isAuthenticated, getAllPosts);
postRouter.get("/ranked-feed", isAuthenticated, getRankedFeed);
postRouter.get("/get-all-Of-logged-in-user", isAuthenticated, getAllPostsOfLoggedInUser);

// Archiving & Private Grid
postRouter.post("/archive/:postId", isAuthenticated, toggleArchivePost);
postRouter.get("/archived-posts", isAuthenticated, getArchivedPosts);

// Edit Post
postRouter.patch("/edit/:postId", isAuthenticated, editPost);

// Custom Collections & Bookmarks
postRouter.get("/saved", isAuthenticated, getSavedPosts);
postRouter.get("/saved-posts", isAuthenticated, getSavedPosts);
postRouter.post("/save-post/:postId", isAuthenticated, savePost);
postRouter.post("/saved/:postId", isAuthenticated, savePost);
postRouter.post("/collections", isAuthenticated, createCollection);
postRouter.get("/collections", isAuthenticated, getUserCollections);
postRouter.post("/collections/add-post", isAuthenticated, addPostToCollection);

// Drafts
postRouter.post("/drafts", isAuthenticated, saveDraft);
postRouter.get("/drafts", isAuthenticated, getUserDrafts);
postRouter.delete("/drafts/:draftId", isAuthenticated, deleteDraft);

// Likes, Likers, Comments & Nested Replies
postRouter.post("/like/:postId", isAuthenticated, likePost);
postRouter.get("/likers/:postId", isAuthenticated, getPostLikers);
postRouter.get("/likes/:postId", isAuthenticated, getPostLikers); // client alias

postRouter.post("/comment/:postId", isAuthenticated, commentPost);
postRouter.post("/comment/like/:postId/:commentId", isAuthenticated, likePostComment);
postRouter.post("/comment/reply/:postId/:commentId", isAuthenticated, replyPostComment);
postRouter.post("/comment/reply-like/:postId/:commentId/:replyId", isAuthenticated, likePostReply);
postRouter.delete("/comment/reply/:postId/:commentId/:replyId", isAuthenticated, deletePostReply);
postRouter.post("/comment/pin/:postId/:commentId", isAuthenticated, pinPostComment);

postRouter.delete("/delete-post/:postId", isAuthenticated, deletePost);
postRouter.delete("/delete/:postId", isAuthenticated, deletePost); // client alias
postRouter.delete("/delete-comment/:postId/:commentId", isAuthenticated, deleteComment);
postRouter.delete("/comment/:postId/:commentId", isAuthenticated, deleteComment); // client alias
postRouter.patch("/edit-comment/:postId/:commentId", isAuthenticated, editComment);
postRouter.put("/comment/:postId/:commentId", isAuthenticated, editComment); // client alias (PUT)

// Tagged Posts
postRouter.get("/tagged/:userId", isAuthenticated, getTaggedPosts);

// Single Post By ID
postRouter.get("/:postId", isAuthenticated, getPostById);

export default postRouter;

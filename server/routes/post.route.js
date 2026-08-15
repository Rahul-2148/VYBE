import express from "express";
import {
  commentPost,
  deleteComment,
  deletePost,
  editComment,
  editPost,
  getAllPosts,
  getAllPostsOfLoggedInUser,
  likePost,
  savePost,
  uploadPost,
  uploadCarouselPost,
  toggleArchivePost,
  getArchivedPosts,
  createCollection,
  getUserCollections,
  addPostToCollection,
  saveDraft,
  getUserDrafts,
  getRankedFeed,
} from "../controllers/post.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const postRouter = express.Router();

// Upload & Feed
postRouter.post("/upload", isAuthenticated, upload.single("media"), uploadPost);
postRouter.post("/upload-carousel", isAuthenticated, upload.array("media", 10), uploadCarouselPost);
postRouter.get("/get-all-posts", isAuthenticated, getAllPosts);
postRouter.get("/ranked-feed", isAuthenticated, getRankedFeed);
postRouter.get("/get-all-Of-logged-in-user", isAuthenticated, getAllPostsOfLoggedInUser);

// Archiving & Private Grid
postRouter.post("/archive/:postId", isAuthenticated, toggleArchivePost);
postRouter.get("/archived-posts", isAuthenticated, getArchivedPosts);

// Edit Post (Instagram-style)
postRouter.patch("/edit/:postId", isAuthenticated, editPost);

// Custom Collections & Bookmarks
postRouter.post("/save-post/:postId", isAuthenticated, savePost);
postRouter.post("/collections", isAuthenticated, createCollection);
postRouter.get("/collections", isAuthenticated, getUserCollections);
postRouter.post("/collections/add-post", isAuthenticated, addPostToCollection);

// Drafts
postRouter.post("/drafts", isAuthenticated, saveDraft);
postRouter.get("/drafts", isAuthenticated, getUserDrafts);

// Likes, Comments & Delete
postRouter.post("/like/:postId", isAuthenticated, likePost);
postRouter.post("/comment/:postId", isAuthenticated, commentPost);
postRouter.delete("/delete-post/:postId", isAuthenticated, deletePost);
postRouter.delete("/delete/:postId", isAuthenticated, deletePost); // client alias
postRouter.delete("/delete-comment/:postId/:commentId", isAuthenticated, deleteComment);
postRouter.delete("/comment/:postId/:commentId", isAuthenticated, deleteComment); // client alias
postRouter.patch("/edit-comment/:postId/:commentId", isAuthenticated, editComment);
postRouter.put("/comment/:postId/:commentId", isAuthenticated, editComment); // client alias (PUT)

// Save post alias (client sends /saved/:postId)
postRouter.post("/saved/:postId", isAuthenticated, savePost);

export default postRouter;

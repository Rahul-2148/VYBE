import express from "express";
import {
  commentPost,
  deleteComment,
  deletePost,
  editComment,
  getAllPosts,
  getAllPostsOfLoggedInUser,
  likePost,
  savePost,
  uploadPost,
} from "../controllers/post.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";

const postRouter = express.Router();

postRouter.post("/upload", isAuthenticated, upload.single("media"), uploadPost);
postRouter.get(
  "/get-all-Of-logged-in-user",
  isAuthenticated,
  getAllPostsOfLoggedInUser
); // get all posts of current user
postRouter.post("/like/:postId", isAuthenticated, likePost);
postRouter.post("/comment/:postId", isAuthenticated, commentPost);
postRouter.post("/save-post/:postId", isAuthenticated, savePost);
postRouter.get("/get-all-posts", isAuthenticated, getAllPosts); // get all posts of all users
postRouter.delete("/delete-post/:postId", isAuthenticated, deletePost);
postRouter.delete(
  "/delete-comment/:postId/:commentId",
  isAuthenticated,
  deleteComment
);
postRouter.patch(
  "/edit-comment/:postId/:commentId",
  isAuthenticated,
  editComment
);

export default postRouter;

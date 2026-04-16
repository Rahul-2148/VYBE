import { createSlice } from "@reduxjs/toolkit";

const postSlice = createSlice({
  name: "post",
  initialState: {
    postData: [],
  },
  reducers: {
    setPostData: (state, action) => {
      state.postData = action.payload;
    },

    editCommentInPost: (state, action) => {
      const { postId, comment } = action.payload;

      const post = state.postData.find((p) => p._id === postId);
      if (!post) return;

      const index = post.comments.findIndex((c) => c._id === comment._id);

      if (index !== -1) {
        post.comments[index] = comment;
      }
    },

    deleteCommentFromPost: (state, action) => {
      const { postId, commentId } = action.payload;

      const post = state.postData.find((p) => p._id === postId);
      if (!post) return;

      post.comments = post.comments.filter((c) => c._id !== commentId);
    },
  },
});

export const { setPostData, editCommentInPost, deleteCommentFromPost } =
  postSlice.actions;

export default postSlice.reducer;

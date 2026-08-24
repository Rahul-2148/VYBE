import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "./axiosBaseQuery";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery({ baseUrl: "" }),
  tagTypes: ["User", "Post", "Reel", "Story", "Notification", "Message", "Explore", "Hashtag", "Ad"],
  keepUnusedDataFor: 300, // 5 minutes default in-memory cache (Stale-While-Revalidate)
  refetchOnReconnect: true,
  refetchOnFocus: false, // Prevents aggressive flashing on tab focus while maintaining cache

  endpoints: (builder) => ({
    // ==========================================
    // 👤 USER & AUTH ENDPOINTS
    // ==========================================
    getCurrentUser: builder.query({
      query: () => ({ url: "/user/current" }),
      providesTags: ["User"],
    }),

    getUserFullProfile: builder.query({
      query: (userName) => ({ url: `/user/getProfile/${userName}` }),
      providesTags: (result, error, userName) => [
        { type: "User", id: userName },
        { type: "Post", id: `USER_${userName}` },
        { type: "Reel", id: `USER_${userName}` },
      ],
    }),

    getUserProfile: builder.query({
      query: (userName) => ({ url: `/user/profile/${userName}` }),
      providesTags: (result, error, userName) => [{ type: "User", id: userName }],
    }),

    getSuggestedUsers: builder.query({
      query: () => ({ url: "/user/suggested" }),
      providesTags: [{ type: "User", id: "SUGGESTED" }],
    }),

    getFollowRequests: builder.query({
      query: () => ({ url: "/user/follow-requests" }),
      providesTags: ["User", "Notification"],
    }),

    followUser: builder.mutation({
      query: (targetUserId) => ({
        url: `/user/follow/${targetUserId}`,
        method: "GET",
      }),
      invalidatesTags: ["User", "Story", "Post", "Reel", { type: "User", id: "SUGGESTED" }],
    }),

    blockUser: builder.mutation({
      query: (targetUserId) => ({
        url: `/user/block/${targetUserId}`,
        method: "POST",
      }),
      invalidatesTags: ["User", "Post", "Reel", "Story"],
    }),

    muteUser: builder.mutation({
      query: (targetUserId) => ({
        url: `/user/mute/${targetUserId}`,
        method: "POST",
      }),
      invalidatesTags: ["User", "Post", "Reel", "Story"],
    }),

    getUserSavedMedia: builder.query({
      query: () => ({ url: "/user/saved" }),
      providesTags: ["Post", "Reel"],
    }),

    // ==========================================
    // 📸 POSTS ENDPOINTS
    // ==========================================
    getFeedPosts: builder.query({
      query: () => ({ url: "/post/feed" }),
      providesTags: (result) =>
        result?.posts
          ? [
              ...result.posts.map(({ _id }) => ({ type: "Post", id: _id })),
              { type: "Post", id: "LIST" },
            ]
          : [{ type: "Post", id: "LIST" }],
    }),

    getRankedFeedPosts: builder.query({
      query: (mode = "for-you") => ({ url: `/post/ranked-feed?mode=${mode}` }),
      providesTags: (result) =>
        result?.posts
          ? [
              ...result.posts.map(({ _id }) => ({ type: "Post", id: _id })),
              { type: "Post", id: "LIST" },
            ]
          : [{ type: "Post", id: "LIST" }],
    }),

    getPostById: builder.query({
      query: (postId) => ({ url: `/post/${postId}` }),
      providesTags: (result, error, postId) => [{ type: "Post", id: postId }],
    }),

    likePost: builder.mutation({
      query: (postId) => ({
        url: `/post/like/${postId}`,
        method: "GET",
      }),
      invalidatesTags: (result, error, postId) => [{ type: "Post", id: postId }],
    }),

    savePost: builder.mutation({
      query: (postId) => ({
        url: `/post/save/${postId}`,
        method: "GET",
      }),
      invalidatesTags: (result, error, postId) => [
        { type: "Post", id: postId },
        { type: "Post", id: "SAVED" },
      ],
    }),

    editPost: builder.mutation({
      query: ({ postId, ...data }) => ({
        url: `/post/edit/${postId}`,
        method: "PATCH",
        data,
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: "LIST" },
      ],
    }),

    deletePost: builder.mutation({
      query: (postId) => ({
        url: `/post/delete/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, postId) => [
        { type: "Post", id: postId },
        { type: "Post", id: "LIST" },
        "User",
      ],
    }),

    toggleArchivePost: builder.mutation({
      query: (postId) => ({
        url: `/post/archive/${postId}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, postId) => [
        { type: "Post", id: postId },
        { type: "Post", id: "LIST" },
        "User",
      ],
    }),

    togglePostComments: builder.mutation({
      query: (postId) => ({
        url: `/post/toggle-comments/${postId}`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, postId) => [{ type: "Post", id: postId }],
    }),

    addPostComment: builder.mutation({
      query: ({ postId, message }) => ({
        url: `/post/comment/${postId}`,
        method: "POST",
        data: { message },
      }),
      invalidatesTags: (result, error, { postId }) => [{ type: "Post", id: postId }],
    }),

    // ==========================================
    // 🎬 REELS ENDPOINTS
    // ==========================================
    getAllReels: builder.query({
      query: (mode = "for-you") => ({ url: `/reel/get-all-reels?mode=${mode}` }),
      providesTags: (result) =>
        result?.reels
          ? [
              ...result.reels.map(({ _id }) => ({ type: "Reel", id: _id })),
              { type: "Reel", id: "LIST" },
            ]
          : [{ type: "Reel", id: "LIST" }],
    }),

    getReelById: builder.query({
      query: (reelId) => ({ url: `/reel/${reelId}` }),
      providesTags: (result, error, reelId) => [{ type: "Reel", id: reelId }],
    }),

    likeReel: builder.mutation({
      query: (reelId) => ({
        url: `/reel/like/${reelId}`,
        method: "GET",
      }),
      invalidatesTags: (result, error, reelId) => [{ type: "Reel", id: reelId }],
    }),

    saveReel: builder.mutation({
      query: (reelId) => ({
        url: `/reel/save/${reelId}`,
        method: "GET",
      }),
      invalidatesTags: (result, error, reelId) => [
        { type: "Reel", id: reelId },
        { type: "Reel", id: "SAVED" },
      ],
    }),

    deleteReel: builder.mutation({
      query: (reelId) => ({
        url: `/reel/delete/${reelId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, reelId) => [
        { type: "Reel", id: reelId },
        { type: "Reel", id: "LIST" },
        "User",
      ],
    }),

    toggleReelComments: builder.mutation({
      query: (reelId) => ({
        url: `/reel/toggle-comments/${reelId}`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, reelId) => [{ type: "Reel", id: reelId }],
    }),

    addReelComment: builder.mutation({
      query: ({ reelId, message }) => ({
        url: `/reel/comment/${reelId}`,
        method: "POST",
        data: { message },
      }),
      invalidatesTags: (result, error, { reelId }) => [{ type: "Reel", id: reelId }],
    }),

    // ==========================================
    // ⭕ STORIES & HIGHLIGHTS ENDPOINTS
    // ==========================================
    getStoriesFeed: builder.query({
      query: () => ({ url: "/story/feed" }),
      providesTags: ["Story"],
    }),

    getUserHighlights: builder.query({
      query: (userName) => ({ url: `/story/highlight/user/${userName}` }),
      providesTags: (result, error, userName) => [{ type: "Story", id: userName }],
    }),

    deleteStory: builder.mutation({
      query: (storyId) => ({
        url: `/story/${storyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Story", "User"],
    }),

    createHighlight: builder.mutation({
      query: (data) => ({
        url: "/story/highlight",
        method: "POST",
        data,
      }),
      invalidatesTags: ["Story", "User"],
    }),

    deleteHighlight: builder.mutation({
      query: (highlightId) => ({
        url: `/story/highlight/${highlightId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Story", "User"],
    }),

    // ==========================================
    // 🔔 NOTIFICATIONS ENDPOINTS
    // ==========================================
    getNotifications: builder.query({
      query: () => ({ url: "/user/notifications" }),
      providesTags: ["Notification"],
    }),

    getNotificationFeed: builder.query({
      query: ({ page = 1, limit = 30 } = {}) => ({
        url: `/notification/feed?page=${page}&limit=${limit}`,
      }),
      providesTags: ["Notification"],
    }),

    getUnreadNotificationCount: builder.query({
      query: () => ({ url: "/user/notifications/unread-count" }),
      providesTags: ["Notification"],
    }),

    markNotificationsAsRead: builder.mutation({
      query: () => ({
        url: "/user/notifications/mark-read",
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),

    // ==========================================
    // 🧭 EXPLORE, SEARCH & MONETIZATION
    // ==========================================
    getExploreFeed: builder.query({
      query: () => ({ url: "/post/explore" }),
      providesTags: ["Explore"],
    }),

    getMonetizationAds: builder.query({
      query: () => ({ url: "/monetization/ad/feed" }),
      providesTags: ["Ad"],
    }),

    searchQuery: builder.query({
      query: (q) => ({ url: `/search/query?q=${encodeURIComponent(q)}` }),
    }),
  }),
});

export const {
  // User hooks
  useGetCurrentUserQuery,
  useGetUserProfileQuery,
  useGetUserFullProfileQuery,
  useGetUserHighlightsQuery,
  useGetUserSavedMediaQuery,
  useGetSuggestedUsersQuery,
  useGetFollowRequestsQuery,
  useFollowUserMutation,
  useBlockUserMutation,
  useMuteUserMutation,

  // Post hooks
  useGetFeedPostsQuery,
  useGetRankedFeedPostsQuery,
  useGetMonetizationAdsQuery,
  useGetPostByIdQuery,
  useLikePostMutation,
  useSavePostMutation,
  useEditPostMutation,
  useDeletePostMutation,
  useToggleArchivePostMutation,
  useTogglePostCommentsMutation,
  useAddPostCommentMutation,

  // Reel hooks
  useGetAllReelsQuery,
  useGetReelByIdQuery,
  useLikeReelMutation,
  useSaveReelMutation,
  useDeleteReelMutation,
  useToggleReelCommentsMutation,
  useAddReelCommentMutation,

  // Story hooks
  useGetStoriesFeedQuery,
  useDeleteStoryMutation,
  useCreateHighlightMutation,
  useDeleteHighlightMutation,

  // Notification hooks
  useGetNotificationsQuery,
  useGetNotificationFeedQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationsAsReadMutation,

  // Explore & Search hooks
  useGetExploreFeedQuery,
  useLazySearchQueryQuery,
} = apiSlice;

export default apiSlice;

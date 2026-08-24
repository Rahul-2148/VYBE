import React, { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft, Archive, Play, RefreshCw, Grid3X3, Loader2, Image as ImageIcon,
  Trash2, SlidersHorizontal, Film, Layers, Calendar, ArrowUpDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
import moment from "moment";
import api from "../lib/axios";
import { useToggleArchivePostMutation, useDeletePostMutation } from "../redux/api/apiSlice";

export const PostArchive = () => {
  const navigate = useNavigate();
  const [toggleArchivePost] = useToggleArchivePostMutation();
  const [deletePostMutation] = useDeletePostMutation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // all, photo, reel, carousel
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest

  useEffect(() => {
    let isMounted = true;
    api
      .get("/post/archived-posts")
      .then((res) => {
        if (isMounted) {
          setPosts(res.data?.success ? res.data.posts || [] : []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to load archived posts:", err);
          snackbar.error("Failed to load archived posts.");
          setPosts([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUnarchive = async (postId) => {
    try {
      const res = await toggleArchivePost(postId).unwrap();
      if (res.success && !res.isArchived) {
        snackbar.success("Post restored to your profile!");
        setPosts((prev) => prev.filter((p) => p._id !== postId));
      }
    } catch {
      snackbar.error("Failed to unarchive post.");
    }
  };

  const [postToDelete, setPostToDelete] = useState(null);

  const handleDelete = (postId) => {
    setPostToDelete(postId);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      const res = await deletePostMutation(postToDelete).unwrap();
      if (res.success) {
        snackbar.success("Post deleted permanently 🗑️");
        setPosts((prev) => prev.filter((p) => p._id !== postToDelete));
      }
    } catch {
      snackbar.error("Failed to delete post.");
    } finally {
      setPostToDelete(null);
    }
  };

  // Counts for filter pills
  const counts = useMemo(() => {
    const photo = posts.filter(
      (p) => p.mediaType !== "video" && (!p.carouselMedia || p.carouselMedia.length <= 1)
    ).length;
    const reel = posts.filter((p) => p.mediaType === "video" || p.postType === "reel").length;
    const carousel = posts.filter(
      (p) => p.mediaType === "carousel" || (p.carouselMedia && p.carouselMedia.length > 1)
    ).length;
    return { all: posts.length, photo, reel, carousel };
  }, [posts]);

  // Filtered & Sorted Posts
  const displayedPosts = useMemo(() => {
    let result = [...posts];

    if (activeFilter === "photo") {
      result = result.filter(
        (p) => p.mediaType !== "video" && (!p.carouselMedia || p.carouselMedia.length <= 1)
      );
    } else if (activeFilter === "reel") {
      result = result.filter((p) => p.mediaType === "video" || p.postType === "reel");
    } else if (activeFilter === "carousel") {
      result = result.filter(
        (p) => p.mediaType === "carousel" || (p.carouselMedia && p.carouselMedia.length > 1)
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [posts, activeFilter, sortOrder]);

  // Resolve thumbnail
  const getPostThumbnail = (post) => {
    if (post.mediaType === "carousel" && post.carouselMedia?.length > 0) {
      return post.carouselMedia[0].url;
    }
    return post.media?.url || null;
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-bg/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-text hover:text-text-secondary rounded-full hover:bg-surface-hover transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="ml-3 flex-1">
            <h1 className="text-base font-bold tracking-tight">Post Archive</h1>
          </div>
        </div>

        {/* Archive Type Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => navigate("/story/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-text border border-border bg-surface hover:bg-surface-hover transition cursor-pointer shrink-0"
          >
            Stories Archive
          </button>
          <button
            onClick={() => navigate("/post/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md cursor-pointer shrink-0"
          >
            Posts & Reels Archive
          </button>
          <button
            onClick={() => navigate("/live/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-text border border-border bg-surface hover:bg-surface-hover transition cursor-pointer shrink-0"
          >
            Live Archive
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Info Banner */}
        <div className="flex items-center justify-between gap-2 p-3 bg-surface rounded-2xl border border-border">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Archive className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Only you can see your archived posts. They stay saved forever until you restore them.</span>
          </div>
        </div>

        {/* Filter Pills & Sort Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                activeFilter === "all"
                  ? "bg-text text-bg border-text font-bold"
                  : "bg-surface text-text-secondary border-border hover:text-text hover:bg-surface-hover"
              }`}
            >
              <span>All</span>
              <span className="text-[10px] opacity-70">({counts.all})</span>
            </button>
            <button
              onClick={() => setActiveFilter("photo")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                activeFilter === "photo"
                  ? "bg-text text-bg border-text font-bold"
                  : "bg-surface text-text-secondary border-border hover:text-text hover:bg-surface-hover"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photos</span>
              <span className="text-[10px] opacity-70">({counts.photo})</span>
            </button>
            <button
              onClick={() => setActiveFilter("reel")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                activeFilter === "reel"
                  ? "bg-text text-bg border-text font-bold"
                  : "bg-surface text-text-secondary border-border hover:text-text hover:bg-surface-hover"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Reels</span>
              <span className="text-[10px] opacity-70">({counts.reel})</span>
            </button>
            <button
              onClick={() => setActiveFilter("carousel")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                activeFilter === "carousel"
                  ? "bg-text text-bg border-text font-bold"
                  : "bg-surface text-text-secondary border-border hover:text-text hover:bg-surface-hover"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Carousels</span>
              <span className="text-[10px] opacity-70">({counts.carousel})</span>
            </button>
          </div>

          {/* Sort Order Button */}
          <button
            onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-secondary hover:text-text rounded-xl border border-border text-xs font-medium transition cursor-pointer"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-rose-400" />
            <span>{sortOrder === "newest" ? "Newest First" : "Oldest First"}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <span className="text-xs font-medium">Loading archive...</span>
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
              <Archive className="w-8 h-8 text-text-muted" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text mb-1">
                {activeFilter === "all" ? "No Archived Posts" : `No Archived ${activeFilter.toUpperCase()}s`}
              </h3>
              <p className="text-xs text-text-secondary max-w-xs">
                Posts and reels you archive from your profile will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-text-secondary font-medium">
              Showing {displayedPosts.length} of {posts.length} archived item{posts.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {displayedPosts.map((post) => {
                const thumbnail = getPostThumbnail(post);
                const isVideo = post.mediaType === "video" || post.postType === "reel";
                const isCarousel = post.mediaType === "carousel" || (post.carouselMedia?.length || 0) > 1;

                return (
                  <div
                    key={post._id}
                    className="relative aspect-square overflow-hidden bg-surface border border-border/70 group cursor-pointer rounded-xl sm:rounded-2xl shadow-xs"
                  >
                    {/* Thumbnail */}
                    {thumbnail ? (
                      isVideo ? (
                        <video
                          src={thumbnail}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-inset">
                        <ImageIcon className="w-8 h-8 text-text-muted" />
                      </div>
                    )}

                    {/* Media Type Badges */}
                    {isVideo && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow">
                        <Play className="w-3 h-3 text-white fill-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Reel</span>
                      </div>
                    )}
                    {isCarousel && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow">
                        <Grid3X3 className="w-3 h-3 text-white" />
                        <span className="text-[10px] font-bold text-white">{post.carouselMedia?.length || 2}</span>
                      </div>
                    )}

                    {/* Date Badge */}
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-semibold text-white/90">
                      {moment(post.createdAt).format("MMM D, YYYY")}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2.5 p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchive(post._id);
                        }}
                        className="w-full max-w-[140px] px-3 py-2 bg-white hover:bg-zinc-100 text-black font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-black" />
                        <span>Show on Profile</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(post._id);
                        }}
                        className="w-full max-w-[140px] px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPostToDelete(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Post Permanently?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Are you sure you want to permanently delete this post? This action cannot be undone.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={confirmDeletePost}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                Delete Post
              </button>
              <button
                onClick={() => setPostToDelete(null)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostArchive;

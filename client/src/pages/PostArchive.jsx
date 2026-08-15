import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Archive, Play, RefreshCw, Grid3X3, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/axios";

export const PostArchive = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArchivedPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/post/archived-posts");
      if (res.data.success) {
        setPosts(res.data.posts || []);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Failed to load archived posts:", err);
      toast.error("Failed to load archived posts.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedPosts();
  }, [fetchArchivedPosts]);

  const handleUnarchive = async (postId) => {
    try {
      const res = await api.post(`/post/archive/${postId}`);
      if (res.data.success && !res.data.isArchived) {
        toast.success("Post restored to your profile!");
        setPosts((prev) => prev.filter((p) => p._id !== postId));
      }
    } catch {
      toast.error("Failed to unarchive post.");
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Permanently delete this post? This action cannot be undone.")) return;
    try {
      const res = await api.delete(`/post/delete/${postId}`);
      if (res.data.success) {
        toast.success("Post deleted permanently.");
        setPosts((prev) => prev.filter((p) => p._id !== postId));
      }
    } catch {
      toast.error("Failed to delete post.");
    }
  };

  // Resolve the best preview image for any post type
  const getPostThumbnail = (post) => {
    if (post.mediaType === "carousel" && post.carouselMedia?.length > 0) {
      return post.carouselMedia[0].url;
    }
    return post.media?.url || null;
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Top Navigation Bar — Instagram-style */}
      <div className="sticky top-0 z-50 bg-bg/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-text hover:text-text-secondary rounded-full hover:bg-surface-hover transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="ml-3 flex-1">
            <h1 className="text-base font-bold tracking-tight">Archive</h1>
          </div>
        </div>

        {/* Archive Type Tabs — Instagram-style toggle */}
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-2">
          <button
            onClick={() => navigate("/story/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-text border border-border bg-surface hover:bg-surface-hover transition cursor-pointer"
          >
            Stories
          </button>
          <button
            onClick={() => navigate("/post/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md cursor-pointer"
          >
            Posts
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <div className="flex items-center gap-2 mb-6 text-text-secondary">
          <Archive className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-xs">Only you can see your archived posts. Unarchive to show on your profile again.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <span className="text-xs font-medium">Loading archive...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
              <Archive className="w-8 h-8 text-text-muted" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text mb-1">No Archived Posts</h3>
              <p className="text-xs text-text-secondary max-w-xs">
                When you archive posts, they'll appear here. Archived posts are hidden from your profile and feed.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-text-secondary mb-4 font-medium">{posts.length} archived post{posts.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {posts.map((post) => {
                const thumbnail = getPostThumbnail(post);
                const isVideo = post.mediaType === "video";
                const isCarousel = post.mediaType === "carousel" && (post.carouselMedia?.length || 0) > 1;

                return (
                  <div
                    key={post._id}
                    className="relative aspect-square overflow-hidden bg-surface border border-border/50 group cursor-pointer rounded-md sm:rounded-xl"
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

                    {/* Type Indicator Badge */}
                    {isVideo && (
                      <div className="absolute top-2 right-2">
                        <Play className="w-4 h-4 text-white drop-shadow-lg fill-white/80" />
                      </div>
                    )}
                    {isCarousel && (
                      <div className="absolute top-2 right-2">
                        <Grid3X3 className="w-4 h-4 text-white drop-shadow-lg" />
                      </div>
                    )}

                    {/* Hover Overlay — Instagram-style */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3 p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchive(post._id);
                        }}
                        className="px-4 py-2 bg-white hover:bg-zinc-100 text-black font-semibold text-xs rounded-lg shadow transition flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Show on Profile</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(post._id);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg shadow transition flex items-center gap-1.5"
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
    </div>
  );
};

export default PostArchive;

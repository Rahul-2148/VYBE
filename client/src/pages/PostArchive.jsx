import React, { useEffect, useState } from "react";
import { ArrowLeft, Archive, Play, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/axios";

export const PostArchive = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedPosts();
  }, []);

  const fetchArchivedPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/post/archived-posts");
      if (res.data.success) {
        setPosts(res.data.posts || []);
      }
    } catch {
      toast.error("Failed to load archived posts.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (postId) => {
    try {
      const res = await api.post(`/post/archive/${postId}`);
      if (res.data.success) {
        toast.success("Post unarchived back to public profile!");
        setPosts(posts.filter((p) => p._id !== postId));
      }
    } catch {
      toast.error("Failed to unarchive post.");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Archive className="w-5 h-5 text-rose-500" />
              <span>Post Archive</span>
            </h1>
            <p className="text-xs text-text-secondary">Only you can see your archived posts.</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-text-muted">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading archive...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-text-muted text-sm">No archived posts. Posts you archive will appear here.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {posts.map((post) => (
            <div key={post._id} className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-border group shadow-lg">
              {post.mediaType === "video" ? (
                <video src={post.media?.url} className="w-full h-full object-cover" />
              ) : (
                <img src={post.media?.url} alt="" className="w-full h-full object-cover" />
              )}

              {/* Hover Actions Overlay */}
              <div className="absolute inset-0 bg-surface-overlay opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-3 p-4">
                <button
                  onClick={() => handleUnarchive(post._id)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-text font-semibold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Unarchive</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostArchive;

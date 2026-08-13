import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Hash, ArrowLeft, Heart, MessageCircle, UserPlus, UserCheck } from "lucide-react";
// framer-motion not used directly in this file
import { toast } from "sonner";
import api from "../lib/axios";

export const HashtagPage = () => {
  const { hashtag } = useParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/search/tag/${hashtag}`);
        if (!mounted) return;
        if (res.data.success) {
          setPosts(res.data.posts || []);
          setPostCount(res.data.postCount || 0);
          setIsFollowing(res.data.isFollowing);
        }
      } catch {
        if (mounted) toast.error("Failed to load hashtag details.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [hashtag]);

  const handleToggleFollow = async () => {
    try {
      const res = await api.post(`/search/follow-tag/${hashtag}`);
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
        toast.success(res.data.message);
      }
    } catch {
      toast.error("Failed to update hashtag follow.");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Hashtag Details</h1>
      </div>

      {/* Hashtag Hero Banner */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-surface border border-border shadow-2xl">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-text shadow-2xl">
          <Hash className="w-12 h-12" />
        </div>

        <div className="text-center sm:text-left space-y-2 flex-1">
          <h2 className="text-3xl font-extrabold tracking-tight">#{hashtag}</h2>
          <p className="text-xs text-text-secondary">{postCount} posts published with this hashtag.</p>

          <button
            onClick={handleToggleFollow}
            className={`px-6 py-2.5 rounded-xl font-semibold text-xs shadow-lg transition flex items-center justify-center gap-2 mx-auto sm:mx-0 ${
              isFollowing
                ? "bg-surface-hover border border-border-strong text-text hover:bg-surface-active"
                : "bg-gradient-to-r from-pink-500 to-rose-600 text-text hover:opacity-95"
            }`}
          >
            {isFollowing ? (
              <>
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Following #{hashtag}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Follow #{hashtag}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Top Posts for #{hashtag}</h3>

        {loading ? (
          <div className="text-center py-20 text-text-muted">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading hashtag posts...
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">No posts found with #{hashtag}.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {posts.map((post) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate(post.mediaType === "video" ? "/reels" : "/")}
                className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group shadow-lg"
              >
                {post.mediaType === "video" ? (
                  <video src={post.media?.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={post.media?.url} alt="" className="w-full h-full object-cover" />
                )}

                <div className="absolute inset-0 bg-surface-overlay opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-6 font-bold text-sm">
                  <div className="flex items-center gap-1">
                    <Heart className="w-5 h-5 fill-white" />
                    <span>{post.likes?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>{post.comments?.length || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HashtagPage;

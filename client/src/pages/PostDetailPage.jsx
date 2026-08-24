import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Compass, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Post from "../components/Post";
import LeftHome from "../components/LeftHome";
import RightHome from "../components/RightHome";
import api from "../lib/axios";
import { triggerHaptic } from "../lib/interactiveEffects";

export const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    let isMounted = true;

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/post/${postId}`);
        if (res.data?.success && isMounted) {
          setPost(res.data.post);
        } else if (isMounted) {
          setError("Post not found or has been removed.");
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Could not load this post.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchRelated = async () => {
      try {
        const res = await api.get("/post/get-all-posts");
        if (res.data?.success && isMounted) {
          const filtered = (res.data.posts || [])
            .filter((p) => p._id !== postId)
            .slice(0, 6);
          setRelatedPosts(filtered);
        }
      } catch (e) {
        console.warn("Could not fetch related posts", e);
      }
    };

    if (postId) {
      fetchPost();
      fetchRelated();
    }

    return () => {
      isMounted = false;
    };
  }, [postId]);

  return (
    <div className="min-h-screen bg-bg text-text pb-20 md:pb-6">
      {/* Desktop Left Navigation */}
      <LeftHome />

      {/* Main Container */}
      <main className="md:ml-[240px] lg:ml-[260px] xl:mr-[340px] px-3 sm:px-6 pt-4 max-w-2xl mx-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-5 border-b border-border pb-3">
          <button
            onClick={() => {
              triggerHaptic("light");
              navigate(-1);
            }}
            className="p-2 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text transition cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h1 className="text-sm font-bold tracking-tight">Post</h1>
            <p className="text-[10px] text-text-muted">VYBE Direct Link</p>
          </div>

          <button
            onClick={() => {
              triggerHaptic("light");
              navigate("/explore");
            }}
            className="p-2 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text transition cursor-pointer"
            title="Explore More"
          >
            <Compass className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-xs text-text-secondary">Loading post...</p>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-3xl p-8 text-center space-y-4 shadow-xl my-8"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">Post Unavailable</h2>
              <p className="text-xs text-text-secondary mt-1">{error}</p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-full shadow-md transition cursor-pointer"
            >
              Back to Home Feed
            </button>
          </motion.div>
        ) : post ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Primary Post Card */}
            <Post post={post} />

            {/* Related / More from Feed */}
            {relatedPosts.length > 0 && (
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    More Posts You Might Like
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {relatedPosts.map((rPost) => {
                    const thumb =
                      rPost.media?.url ||
                      rPost.carouselMedia?.[0]?.url ||
                      rPost.mediaUrl;
                    return (
                      <div
                        key={rPost._id}
                        onClick={() => {
                          triggerHaptic("light");
                          navigate(`/post/${rPost._id}`);
                        }}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer hover:border-rose-500/50 transition"
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-surface-hover flex items-center justify-center text-[10px] text-text-muted p-2 text-center">
                            {rPost.caption || "Post"}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                          View
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </main>

      {/* Desktop Right Sidebar */}
      <RightHome />

      {/* Mobile Bottom Bar */}
      <Navbar />
    </div>
  );
};

export default PostDetailPage;

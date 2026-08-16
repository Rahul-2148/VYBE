import React, { useEffect, useState, useRef } from "react";
import { Search, Compass, Heart, MessageCircle, Play, ArrowLeft, TrendingUp, Grid3X3, Film, Bookmark, Users, Eye, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
import SearchModal from "../components/SearchModal";
import FollowButton from "../components/FollowButton";
import Navbar from "../components/Navbar";
import api from "../lib/axios";
import dp from "../assets/dp3.png";
import VerifiedBadge from "../components/VerifiedBadge";

const CATEGORIES = [
  { id: "all", label: "For You", icon: "✨" },
  { id: "style", label: "Style", icon: "👗" },
  { id: "tech", label: "Tech", icon: "💻" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "fitness", label: "Fitness", icon: "💪" },
  { id: "food", label: "Food", icon: "🍕" },
  { id: "art", label: "Art", icon: "🎨" },
  { id: "music", label: "Music", icon: "🎵" },
  { id: "nature", label: "Nature", icon: "🌿" },
  { id: "beauty", label: "Beauty", icon: "💄" },
  { id: "comedy", label: "Comedy", icon: "😂" },
  { id: "sports", label: "Sports", icon: "⚽" },
];

const TABS = [
  { id: "grid", icon: Grid3X3, label: "Posts" },
  { id: "reels", icon: Film, label: "Reels" },
  { id: "accounts", icon: Users, label: "Accounts" },
];

// ExploreMediaCard handles individual item state, hover play/pause, and touch hold autoplay.
const ExploreMediaCard = ({ post, index, activeTab, navigate, formatCount, getVideoThumbnail }) => {
  const isVideo =
    post.mediaType === "video" ||
    post.audioUrl ||
    post.audioTrack ||
    (post.media?.url &&
      (post.media.url.includes("/video/") ||
        post.media.url.endsWith(".mp4") ||
        post.media.url.endsWith(".mov")));

  const isLarge = activeTab === "grid" && (index % 10 === 0 || index % 10 === 6);
  const thumbnail = isVideo ? getVideoThumbnail(post) : null;
  const videoRef = useRef(null);
  const [, setIsPlaying] = useState(false);

  const getOptimizedImageUrl = (url) => {
    if (url && url.includes("cloudinary.com") && url.includes("/image/upload/")) {
      return url.replace("/image/upload/", "/image/upload/w_400,h_400,c_fill,q_auto,f_auto/");
    }
    return url;
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Video play failed:", err);
        });
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleClick = () => {
    sessionStorage.setItem("explore_scroll_pos", window.scrollY.toString());
    sessionStorage.setItem("explore_active_tab", activeTab);
    if (isVideo) {
      navigate(`/reels?reelId=${post._id}`, { state: { from: "/explore" } });
    } else {
      navigate(`/?postId=${post._id}`, { state: { from: "/explore" } });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.5) }}
      onClick={handleClick}
      onMouseEnter={isVideo ? handlePlay : undefined}
      onMouseLeave={isVideo ? handlePause : undefined}
      onTouchStart={isVideo ? handlePlay : undefined}
      onTouchEnd={isVideo ? handlePause : undefined}
      onTouchCancel={isVideo ? handlePause : undefined}
      className={`relative overflow-hidden bg-surface cursor-pointer group ${
        activeTab === "reels"
          ? "aspect-[9/16] rounded-lg"
          : isLarge
          ? "col-span-2 row-span-2 aspect-square"
          : "aspect-square"
      }`}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={post.media?.url || post.audioUrl}
          className="w-full h-full object-cover"
          muted
          onEnded={(e) => { e.target.currentTime = 0; e.target.play().catch(() => null); }}
          playsInline
          preload="metadata"
          poster={thumbnail || undefined}
        />
      ) : (
        <img
          src={getOptimizedImageUrl(post.media?.url)}
          alt=""
          className="w-full h-full object-cover"
        />
      )}

      {/* Video/Reel indicator with view count */}
      {isVideo && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
          <Play className="w-3.5 h-3.5 text-text fill-white drop-shadow-lg" />
          {(post.views || post.plays) && (
            <span className="text-[11px] text-text font-semibold drop-shadow-lg">
              {formatCount(post.views || post.plays)}
            </span>
          )}
        </div>
      )}

      {/* Multi-image indicator */}
      {post.carouselMedia?.length > 1 && (
        <div className="absolute top-2 right-2 z-10">
          <svg className="w-5 h-5 text-text drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h12v12H4V6zm14-2H6V2h14v14h-2V4z" />
          </svg>
        </div>
      )}

      {/* Hover Overlay with Stats */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-5 font-bold text-sm z-20 text-white">
        <div className="flex items-center gap-1.5">
          <Heart className="w-5 h-5 fill-white text-white" />
          <span>{formatCount(post.likes?.length)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-5 h-5 fill-white text-white" />
          <span>{formatCount(post.comments?.length)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export const Explore = () => {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("explore_active_tab") || "grid"
  );
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const cacheRef = useRef({});
  const categoryScrollRef = useRef(null);

  const fetchExploreFeed = async () => {
    if (cacheRef.current[selectedCategory]) {
      setPosts(cacheRef.current[selectedCategory].posts);
      setReels(cacheRef.current[selectedCategory].reels);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/search/explore?category=${selectedCategory}`);
      if (res.data.success) {
        const p = res.data.posts || [];
        const r = res.data.reels || [];
        cacheRef.current[selectedCategory] = { posts: p, reels: r };
        setPosts(p);
        setReels(r);
      }
    } catch (err) {
      console.warn(err);
      snackbar.error("Failed to load explore feed.");
    } finally {
      setLoading(false);
    }
  };
  const fetchSuggestedUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/user/suggested?category=${selectedCategory}`);
      if (res.data?.success || res.data?.users) {
        setSuggestedUsers(res.data.users || res.data.suggestedUsers || []);
      }
    } catch (err) {
      console.warn(err);
      snackbar.error("Failed to load suggested users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      if (activeTab === "accounts") {
        await fetchSuggestedUsers();
      } else {
        await fetchExploreFeed();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedCategory, activeTab]);

  useEffect(() => {
    const savedPos = sessionStorage.getItem("explore_scroll_pos");
    if (savedPos && !loading) {
      setTimeout(() => {
        window.scrollTo({ top: parseInt(savedPos, 10), behavior: "instant" });
        sessionStorage.removeItem("explore_scroll_pos");
      }, 100);
    }
  }, [loading]);

  const formatCount = (n) => {
    if (!n) return "0";
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  // Filter posts vs reels
  const gridPosts = posts.filter((p) => p.mediaType !== "video" && !p.media?.url?.endsWith(".mp4") && !p.media?.url?.includes("/video/"));
  const reelPosts = reels.concat(posts.filter((p) => p.mediaType === "video" || p.media?.url?.endsWith(".mp4") || p.media?.url?.includes("/video/")));

  const displayPosts = activeTab === "reels" ? reelPosts : gridPosts;

  // Get thumbnail URL for videos
  const getVideoThumbnail = (post) => {
    if (post.thumbnail?.url) return post.thumbnail.url;
    if (post.thumbnailUrl) return post.thumbnailUrl;
    // Cloudinary video thumbnail transformation
    const videoUrl = post.media?.url || post.audioUrl || "";
    if (videoUrl.includes("cloudinary.com") && videoUrl.includes("/video/upload/")) {
      return videoUrl
        .replace("/video/upload/", "/video/upload/so_0,w_400,h_400,c_fill,q_auto,f_jpg/")
        .replace(/\.\w+$/, ".jpg");
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-border/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back Button */}
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/");
              }
            }}
            className="p-2 rounded-full hover:bg-surface-hover transition cursor-pointer shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 text-text" />
          </button>

          {/* Search Bar with VYBE AI Style */}
          <div
            onClick={() => setShowSearchModal(true)}
            className="flex-1 flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-surface border border-border/80 hover:border-primary/50 transition shadow-xs cursor-pointer select-none group"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-rose-500 p-[1.5px] shrink-0 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
              </div>
            </div>
            <span className="text-xs text-text-muted font-medium flex-1 truncate">
              Ask VYBE AI or Search...
            </span>
            <Search className="w-4 h-4 text-text-secondary group-hover:text-text transition shrink-0" />
          </div>
        </div>

        {/* Category Pills — Horizontal scroll */}
        <div ref={categoryScrollRef} className="max-w-6xl mx-auto px-4 pb-2.5 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition capitalize shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-text text-bg"
                  : "bg-surface border border-border text-text-secondary hover:text-text hover:bg-surface-hover"
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-1 sm:px-2 pb-20 md:pb-8">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-border/80 mt-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                  activeTab === tab.id
                    ? "border-current text-text"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-24 text-text-muted">
            <div className="w-8 h-8 border-3 border-input-border border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Curating your explore feed...</p>
          </div>
        ) : displayPosts.length === 0 && activeTab !== "accounts" ? (
          <div className="text-center py-20 space-y-3">
            {activeTab === "reels" ? (
              <>
                <Film className="w-12 h-12 text-rose-500 mx-auto" />
                <p className="text-sm font-bold text-text">
                  {selectedCategory === "all" ? "No reels found yet" : `No reels found for "${selectedCategory}"`}
                </p>
                <p className="text-xs text-text-secondary">
                  {selectedCategory === "all" ? "Be the first creator to share a reel!" : "Try switching categories or view all reels."}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  {selectedCategory !== "all" && (
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className="px-4 py-2 bg-surface border border-border text-xs text-rose-400 hover:text-rose-300 rounded-full cursor-pointer transition font-semibold"
                    >
                      Browse all reels
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/upload")}
                    className="px-5 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-xs text-white rounded-full cursor-pointer transition font-bold shadow-lg hover:opacity-95"
                  >
                    Upload Reel
                  </button>
                </div>
              </>
            ) : (
              <>
                <Compass className="w-12 h-12 text-text-muted mx-auto" />
                <p className="text-sm font-bold text-text">
                  {selectedCategory === "all" ? "No posts found yet" : `No posts found for "${selectedCategory}"`}
                </p>
                <p className="text-xs text-text-secondary">
                  {selectedCategory === "all" ? "Be the first to create a post!" : "Try switching categories or browse all posts."}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  {selectedCategory !== "all" && (
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className="px-4 py-2 bg-surface border border-border text-xs text-rose-400 hover:text-rose-300 rounded-full cursor-pointer transition font-semibold"
                    >
                      Browse all posts
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/upload")}
                    className="px-5 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-xs text-white rounded-full cursor-pointer transition font-bold shadow-lg hover:opacity-95"
                  >
                    Create Post
                  </button>
                </div>
              </>
            )}
          </div>
        ) : activeTab === "accounts" ? (
          /* ===== SUGGESTED ACCOUNTS ===== */
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Discover Creators</span>
              </h2>
            </div>
            {suggestedUsers.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-xs">
                No new creator suggestions found
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-1">
                {suggestedUsers.map((user) => {
                  const avatar = user.profileImage?.url || dp;
                  return (
                    <div
                      key={user._id}
                      className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between gap-3 hover:border-primary/40 transition shadow-xs group"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => navigate(`/profile/${user.userName}`)}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={avatar}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover border border-border"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-text truncate group-hover:text-primary transition flex items-center gap-1">
                              <span>{user.name || user.userName}</span>
                              {user.isVerified && (
                                <VerifiedBadge size="xs" />
                              )}
                            </span>
                          </div>
                          <span className="text-[11px] text-text-secondary block truncate">
                            @{user.userName}
                          </span>
                          {user.followers?.length > 0 && (
                            <span className="text-[10px] text-text-muted block mt-0.5">
                              {formatCount(user.followers.length)} followers
                            </span>
                          )}
                        </div>
                      </div>
                      <FollowButton
                        targetUserId={user._id}
                        tailwind="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-text text-[10px] font-bold py-1.5 rounded-lg text-center group-hover:from-rose-400 group-hover:to-pink-500 transition cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Staggered Media Grid */
          <div className={`grid gap-0.5 ${
            activeTab === "reels"
              ? "grid-cols-2 sm:grid-cols-3"
              : "grid-cols-3"
          }`}>
            {displayPosts.map((post, index) => (
              <ExploreMediaCard
                key={post._id}
                post={post}
                index={index}
                activeTab={activeTab}
                navigate={navigate}
                formatCount={formatCount}
                getVideoThumbnail={getVideoThumbnail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <Navbar />

      {/* Search Modal */}
      {showSearchModal && <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />}
    </div>
  );
};

export default Explore;

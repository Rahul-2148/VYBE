import React, { useEffect, useState, useRef } from "react";
import { Search, Compass, Heart, MessageCircle, Play, ArrowLeft, TrendingUp, Grid3X3, Film, Bookmark, Users, Eye } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SearchModal from "../components/SearchModal";
import FollowButton from "../components/FollowButton";
import api from "../lib/axios";
import dp from "../assets/dp3.png";

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
          loop
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
  const [loops, setLoops] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const cacheRef = useRef({});
  const categoryScrollRef = useRef(null);

  const fetchExploreFeed = async () => {
    if (cacheRef.current[selectedCategory]) {
      setPosts(cacheRef.current[selectedCategory].posts);
      setLoops(cacheRef.current[selectedCategory].loops);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/search/explore?category=${selectedCategory}`);
      if (res.data.success) {
        const p = res.data.posts || [];
        const l = res.data.loops || [];
        cacheRef.current[selectedCategory] = { posts: p, loops: l };
        setPosts(p);
        setLoops(l);
      }
    } catch (err) {
      console.warn(err);
      toast.error("Failed to load explore feed.");
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
      toast.error("Failed to load suggested users.");
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
  const gridPosts = posts.filter((p) => p.mediaType !== "video");
  const reelPosts = posts.filter((p) => p.mediaType === "video").concat(loops);

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

          {/* Search Bar */}
          <div
            onClick={() => setShowSearchModal(true)}
            className="vybe-search-bar"
            style={{ cursor: "pointer" }}
          >
            <Search className="search-icon" />
            <span style={{ fontSize: 14, color: "var(--input-placeholder)", fontWeight: 400, flex: 1, userSelect: "none" }}>Search</span>
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
      <div className="max-w-6xl mx-auto px-1 sm:px-2">
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
            <Compass className="w-12 h-12 text-text-muted mx-auto" />
            <p className="text-sm text-text-muted">No posts found for this category</p>
            <button
              onClick={() => setSelectedCategory("all")}
              className="text-xs text-rose-400 hover:underline cursor-pointer"
            >
              Browse all posts
            </button>
          </div>
        ) : activeTab === "accounts" ? (
          /* ===== SUGGESTED ACCOUNTS - Instagram Style ===== */
          <div className="py-4 px-2 space-y-3">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider px-1">Suggested for you</p>
            {suggestedUsers.length === 0 && !loading ? (
              <div className="text-center py-16 space-y-3">
                <Users className="w-12 h-12 text-text-muted mx-auto" />
                <p className="text-sm text-text-muted">No suggested accounts right now</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {suggestedUsers.map((user) => {
                  const profileImg = typeof user.profileImage === "string"
                    ? user.profileImage
                    : user.profileImage?.url || dp;
                  return (
                    <div
                      key={user._id}
                      className="bg-surface/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:bg-surface-hover/60 transition group"
                    >
                      <div
                        onClick={() => navigate(`/profile/${user.userName}`)}
                        className="cursor-pointer flex flex-col items-center gap-2.5 w-full"
                      >
                        <div className="relative">
                          <img
                            src={profileImg}
                            alt=""
                            className="w-18 h-18 rounded-full object-cover border-2 border-border-strong group-hover:border-purple-500/50 transition"
                          />
                          {user.isVerified && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-bg">
                              <svg className="w-3 h-3 text-text" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-center min-w-0 w-full">
                          <p className="text-xs font-bold truncate">@{user.userName || "user"}</p>
                          <p className="text-[10px] text-text-muted truncate">{user.name || ""}</p>
                          {user.followers?.length > 0 && (
                            <p className="text-[10px] text-text-muted mt-0.5">{formatCount(user.followers.length)} followers</p>
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
          /* Staggered Instagram Grid */
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
      {/* Search Modal */}
      {showSearchModal && <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />}
    </div>
  );
};

export default Explore;

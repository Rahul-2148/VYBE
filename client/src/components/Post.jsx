import { Check, Archive, FolderPlus, Tag, VolumeX, Volume2, BadgeCheck, Sparkles, Info, Bot, X, Music, MapPin } from "lucide-react";
import moment from "moment";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { snackbar } from "../lib/snackbar";
import { GoBookmark, GoBookmarkFill, GoHeart, GoHeartFill } from "react-icons/go";
import { IoSendSharp } from "react-icons/io5";
import { MdDeleteOutline, MdEdit, MdOutlineComment } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import dp from "../assets/dp3.png";
import { setPostData } from "../redux/features/postSlice";
import { setUserData } from "../redux/features/userSlice";
import FollowButton from "./FollowButton";
import VideoPlayer from "./VideoPlayer";
import PostCarousel from "./PostCarousel";
import TaggedUsersOverlay from "./TaggedUsersOverlay";
import CollectionsModal from "./CollectionsModal";
import VerifiedBadge from "./VerifiedBadge";
import AITranslateButton from "./AITranslateButton";
import ShareSheet from "./ShareSheet";
import EditPostModal from "./EditPostModal";
import HeartExplosion from "./HeartExplosion";
import AIInfoModal from "./AIInfoModal";
import LikersModal from "./LikersModal";
import CommentsModal from "./CommentsModal";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import api from "../lib/axios";
import { useToggleArchivePostMutation, useDeletePostMutation } from "../redux/api/apiSlice";

// Ensure Cloudinary image URLs have f_auto,q_auto for browser compatibility (HEIF/WebP)
const ensureCloudinaryAutoFormat = (url) => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("cloudinary.com") || !url.includes("/upload/")) return url;
  if (url.includes("f_auto")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
};

// Render interactive caption with clickable @mentions and #hashtags
const RenderParsedCaption = ({ caption, onNavigate }) => {
  if (!caption) return null;
  const parts = caption.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);

  return (
    <span className="text-xs text-text leading-relaxed font-normal">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const userName = part.slice(1);
          return (
            <span
              key={i}
              onClick={() => onNavigate(`/profile/${userName}`)}
              className="text-rose-400 font-semibold cursor-pointer hover:underline mr-1"
            >
              {part}
            </span>
          );
        }
        if (part.startsWith("#")) {
          const tag = part.slice(1);
          return (
            <span
              key={i}
              onClick={() => onNavigate(`/explore/tag/${tag}`)}
              className="text-rose-400 font-semibold cursor-pointer hover:underline mr-1"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
};

const Post = ({ post }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { postData } = useSelector((state) => state.post);

  const [toggleArchivePost] = useToggleArchivePostMutation();
  const [deletePostMutation] = useDeletePostMutation();

  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [deletePostLoading, setDeletePostLoading] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showTags, setShowTags] = useState(false);

  // Background Audio & Viewport State
  const containerRef = useRef(null);
  const [isInViewport, setIsInViewport] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const audioRef = useRef(null);

  const getMusicObject = (musicField) => {
    if (!musicField) return null;
    if (typeof musicField === "object") return musicField;
    try {
      return JSON.parse(musicField);
    } catch {
      return null;
    }
  };

  const parsedMusic = useMemo(() => getMusicObject(post?.music), [post?.music]);
  const dwellStartRef = useRef(null);

  // Viewport Intersection Observer: pauses audio & tracks behavioral dwell time
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        setIsInViewport(visible);

        if (visible) {
          dwellStartRef.current = Date.now();
        } else {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          if (dwellStartRef.current) {
            const dwellMs = Date.now() - dwellStartRef.current;
            dwellStartRef.current = null;
            if (dwellMs >= 1500 && post?._id) {
              api.post("/user/dwell-track", {
                entityType: "post",
                entityId: post._id,
                text: post.caption || "",
                hashtags: post.hashtags || [],
                location: post.location || "",
                dwellMs,
              }).catch(() => null);
            }
          }
        }
      },
      {
        threshold: [0, 0.35, 0.7],
        rootMargin: "0px",
      }
    );

    observer.observe(el);
    return () => {
      observer.unobserve(el);
      if (dwellStartRef.current && post?._id) {
        const dwellMs = Date.now() - dwellStartRef.current;
        if (dwellMs >= 1500) {
          api.post("/user/dwell-track", {
            entityType: "post",
            entityId: post._id,
            text: post.caption || "",
            hashtags: post.hashtags || [],
            location: post.location || "",
            dwellMs,
          }).catch(() => null);
        }
      }
    };
  }, [post?._id, post?.caption, post?.hashtags, post?.location]);

  // Exclusive audio coordinator: if another post plays audio, pause & mute this post
  useEffect(() => {
    const handleMediaPlaying = (e) => {
      const activePostId = e.detail?.postId;
      if (activePostId && activePostId !== post?._id) {
        setMusicMuted(true);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }
    };

    window.addEventListener("vybe:feed_media_playing", handleMediaPlaying);
    return () => {
      window.removeEventListener("vybe:feed_media_playing", handleMediaPlaying);
    };
  }, [post?._id]);

  // Audio lifecycle & sync with viewport + mute state
  useEffect(() => {
    if (!parsedMusic?.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    if (!audioRef.current) {
      const a = new Audio(parsedMusic.audioUrl);
      a.loop = true;
      audioRef.current = a;
    } else if (audioRef.current.src !== parsedMusic.audioUrl) {
      audioRef.current.pause();
      audioRef.current.src = parsedMusic.audioUrl;
    }

    if (isInViewport && !musicMuted) {
      audioRef.current.play().catch(() => null);
    } else {
      audioRef.current.pause();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [parsedMusic?.audioUrl, musicMuted, isInViewport]);

  const toggleMusicMute = useCallback((e) => {
    if (e) e.stopPropagation();
    triggerHaptic("light");
    setMusicMuted((prev) => {
      const next = !prev;
      if (!next && post?._id) {
        window.dispatchEvent(
          new CustomEvent("vybe:feed_media_playing", {
            detail: { postId: post._id, mediaType: "music" },
          })
        );
      }
      return next;
    });
  }, [post?._id]);


  // Modals state
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAIInfoModal, setShowAIInfoModal] = useState(false);

  const [localLikes, setLocalLikes] = useState(post?.likes || []);

  useEffect(() => {
    const timer = setTimeout(() => setLocalLikes(post?.likes || []), 0);
    return () => clearTimeout(timer);
  }, [post?.likes]);

  const currentUserId = (userData?.user?._id || userData?._id)?.toString();
  const isLiked = Boolean(
    currentUserId &&
    localLikes?.some((like) => {
      const id = (like?._id || like)?.toString();
      return id === currentUserId;
    })
  );

  // Instagram-style Priority Preview Comments Ranking:
  // 1. Pinned comment -> 2. Friends / Followed users -> 3. Most likes -> 4. Recent
  const followingList = useMemo(() => {
    return userData?.user?.following || userData?.following || [];
  }, [userData?.user?.following, userData?.following]);

  const previewComments = useMemo(() => {
    if (!post?.comments || post.comments.length === 0 || post.allowComments === false) return [];
    const sorted = [...post.comments].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const aAuthorId = (a.author?._id || a.author)?.toString();
      const bAuthorId = (b.author?._id || b.author)?.toString();

      const aIsFollowing = followingList.some((id) => (id?._id || id)?.toString() === aAuthorId);
      const bIsFollowing = followingList.some((id) => (id?._id || id)?.toString() === bAuthorId);

      if (aIsFollowing && !bIsFollowing) return -1;
      if (!aIsFollowing && bIsFollowing) return 1;

      const aLikes = a.likes?.length || 0;
      const bLikes = b.likes?.length || 0;
      if (bLikes !== aLikes) return bLikes - aLikes;

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return sorted.slice(0, 2);
  }, [post, followingList]);

  // Inline like/unlike comment directly from post card
  const handleInlineLikeComment = useCallback(async (commentId) => {
    if (!currentUserId) {
      snackbar.error("Please login to like comments");
      return;
    }
    triggerHaptic("like");
    microAudio.playPop();
    try {
      const res = await api.post(`/post/comment/like/${post._id}/${commentId}`);
      if (res.data?.post) {
        const updated = postData?.map((p) => (p._id === post._id ? res.data.post : p));
        dispatch(setPostData(updated));
      }
    } catch {
      snackbar.error("Failed to like comment");
    }
  }, [currentUserId, post._id, postData, dispatch]);

  const handleLike = useCallback(async () => {
    if (!currentUserId) {
      snackbar.error("Please login to like posts");
      return;
    }
    const nextLiked = !isLiked;
    if (nextLiked) {
      triggerHaptic("like");
      microAudio.playPop();
    } else {
      triggerHaptic("light");
    }

    const previousLikes = [...localLikes];
    const optimisticLikes = nextLiked
      ? [...previousLikes, currentUserId]
      : previousLikes.filter((like) => (like?._id || like)?.toString() !== currentUserId);

    setLocalLikes(optimisticLikes);

    const updatedPost = { ...post, likes: optimisticLikes };
    const updatedPosts = postData?.map((p) => (p._id === post._id ? updatedPost : p));
    dispatch(setPostData(updatedPosts));

    try {
      const result = await api.post(`/post/like/${post?._id}`, { action: nextLiked ? "like" : "unlike" });
      if (result.data?.post) {
        const serverPost = result.data.post;
        setLocalLikes(serverPost.likes || []);
        const syncedPosts = postData?.map((p) => (p._id === serverPost._id ? serverPost : p));
        dispatch(setPostData(syncedPosts));
      }
    } catch (error) {
      setLocalLikes(previousLikes);
      const revertedPost = { ...post, likes: previousLikes };
      dispatch(setPostData(postData?.map((p) => (p._id === post._id ? revertedPost : p))));
      snackbar.error(error.response?.data?.message || "Like failed");
    }
  }, [currentUserId, isLiked, localLikes, post, postData, dispatch]);

  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef(null);

  const handleMediaTap = (e) => {
    // If clicking an interactive button/pill, do not intercept
    if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".interactive-tap")) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 350;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double Tap Detected!
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;

      if (!isLiked) {
        handleLike();
      } else {
        triggerHaptic("like");
        microAudio.playLikeBurst();
      }
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
    } else {
      lastTapRef.current = now;
      singleTapTimerRef.current = setTimeout(() => {
        if (post?.taggedUsers && post.taggedUsers.length > 0) {
          setShowTags((prev) => !prev);
        }
        singleTapTimerRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleSaved = async () => {
    try {
      triggerHaptic("medium");
      const result = await api.post(`/post/saved/${post?._id}`);
      dispatch(setUserData(result.data.user));
      snackbar.success(result.data.message);
    } catch (error) {
      snackbar.error(error.response?.data?.message || "Bookmark failed");
    }
  };

  const handleDeletePost = async () => {
    try {
      setDeletePostLoading(true);
      const result = await deletePostMutation(post?._id).unwrap();
      snackbar.success(result.message || "Post deleted");
      const updatedPosts = postData?.filter((p) => p._id !== post._id);
      dispatch(setPostData(updatedPosts));
    } catch (error) {
      snackbar.error(error?.data?.message || "Delete failed");
    } finally {
      setDeletePostLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    try {
      const res = await toggleArchivePost(post?._id).unwrap();
      if (res.success) {
        snackbar.success(res.message);
        if (res.isArchived) {
          const updatedPosts = postData?.filter((p) => p._id !== post._id);
          dispatch(setPostData(updatedPosts));
        }
      }
    } catch (error) {
      snackbar.error(error?.data?.message || "Archive failed");
    }
  };

  const handlePostUpdated = (updatedPost) => {
    const updated = postData?.map((p) => (p._id === updatedPost._id ? updatedPost : p));
    dispatch(setPostData(updated));
  };

  return (
    <div
      ref={containerRef}
      id={`post-${post?._id}`}
      className="w-full flex flex-col bg-surface-inset/90 border border-border/80 shadow-2xl rounded-2xl overflow-hidden my-3 transition-all duration-300"
    >
      {/* POST HEADER */}
      <div className="w-full min-h-[56px] py-2 flex justify-between items-center px-4 border-b border-border/80 bg-bg/40">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border border-border cursor-pointer overflow-hidden shadow shrink-0"
            onClick={() => navigate(`/profile/${post?.author?.userName}`)}
          >
            <img src={post?.author?.profileImage?.url || dp} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col min-w-0">
            <span
              className="font-bold text-xs text-text cursor-pointer hover:underline truncate max-w-[150px] sm:max-w-[200px] flex items-center gap-1"
              onClick={() => navigate(`/profile/${post?.author?.userName}`)}
            >
              {post?.author?.userName}
              {post?.author?.isVerified && (
                <VerifiedBadge size="sm" />
              )}
            </span>

            <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-medium flex-wrap">
              <span>{moment(post?.createdAt).fromNow()}</span>
              {post?.isEdited && (
                <span className="text-[9px] text-text-muted opacity-80 font-semibold">• Edited</span>
              )}
              {post?.aiLabel?.isAIGenerated && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    setShowAIInfoModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[9px] font-bold text-purple-300 active:scale-95 transition-all shadow-xs cursor-pointer ml-1"
                  title="Made with AI • Click for info"
                >
                  <Sparkles className="w-2.5 h-2.5 text-purple-400 fill-purple-400/20 animate-pulse" />
                  <span>AI info</span>
                </button>
              )}
            </div>

            {/* Audio Track Attribution displayed cleanly below username (Instagram Style) */}
            {post?.music && !["1:1", "4:5", "16:9", "original", "none"].includes(post.music) && (
              <span 
                className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 mt-0.5 hover:underline cursor-pointer truncate max-w-[180px] sm:max-w-[240px]"
                onClick={() => {
                  const trackId = typeof post.music === "object" ? post.music.id || post.music.title : post.music;
                  navigate(`/audio/${encodeURIComponent(trackId)}`, {
                    state: { music: parsedMusic },
                  });
                }}
              >
                <Music className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">
                  {typeof post.music === "object" ? `${post.music.title} • ${post.music.artist}` : post.music}
                </span>
              </span>
            )}

            {post?.location && (
              <span
                onClick={() => navigate(`/explore/location/${encodeURIComponent(post.location)}`)}
                className="text-[10px] text-rose-400 font-bold cursor-pointer hover:underline flex items-center gap-1 mt-0.5 truncate interactive-btn"
              >
                <MapPin className="w-2.5 h-2.5 shrink-0 text-rose-500" />
                <span className="truncate">{post.location}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {userData?.user?._id === post?.author?._id ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface transition cursor-pointer"
                title="Edit Post"
              >
                <MdEdit className="w-4 h-4" />
              </button>

              <button
                onClick={handleToggleArchive}
                className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface transition cursor-pointer"
                title="Archive Post"
              >
                <Archive className="w-4 h-4" />
              </button>

              {deletePostLoading ? (
                <ClipLoader size={16} color="white" />
              ) : (
                <button onClick={handleDeletePost} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition cursor-pointer" title="Delete Post">
                  <MdDeleteOutline className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <FollowButton
              targetUserId={post?.author?._id}
              tailwind="px-3.5 py-1 bg-rose-600 hover:bg-rose-500 text-text text-[11px] font-semibold rounded-full shadow"
            />
          )}
        </div>
      </div>

      {/* MEDIA CONTAINER */}
      <div 
        onClick={handleMediaTap}
        className="relative w-full bg-bg flex items-center justify-center overflow-hidden min-h-[300px] cursor-pointer select-none"
      >
        {post?.mediaType === "carousel" ? (
          <PostCarousel mediaList={post?.carouselMedia || []} postId={post?._id} />
        ) : post?.mediaType === "video" ? (
          <VideoPlayer media={post?.media?.url} postId={post?._id} />
        ) : (
          <img src={ensureCloudinaryAutoFormat(post?.media?.url)} alt={post?.altText || "Post Media"} loading="lazy" className="w-full object-cover max-h-[620px]" />
        )}

        {/* Tagged Users Interactive Overlay */}
        <TaggedUsersOverlay taggedUsers={post?.taggedUsers || []} showTags={showTags} setShowTags={setShowTags} />

        {/* Particle Heart Burst on double tap */}
        <HeartExplosion show={showHeartAnim} onComplete={() => setShowHeartAnim(false)} />

        {/* Instagram-style Clean Top-Right Audio Mute/Unmute Button (Only if post has music) */}
        {parsedMusic?.audioUrl && (
          <button
            type="button"
            onClick={toggleMusicMute}
            className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-xl transition cursor-pointer hover:scale-105 active:scale-95 interactive-tap"
            title={musicMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {!musicMuted ? (
              <div className="flex items-center gap-1">
                <Volume2 className="w-4 h-4 text-white animate-pulse" />

                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 bg-rose-400 animate-sound-wave-1 rounded-full" />
                  <span className="w-0.5 bg-rose-300 animate-sound-wave-2 rounded-full" />
                  <span className="w-0.5 bg-rose-400 animate-sound-wave-3 rounded-full" />
                </div>
              </div>
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-300" />
            )}
          </button>
        )}
      </div>

      {/* ACTION BAR */}
      <div className="w-full h-12 flex justify-between items-center px-4 border-t border-border/80 bg-bg/40">
        <div className="flex items-center gap-5">
          {/* Like Button */}
          <button 
            onClick={handleLike} 
            className="text-text hover:text-rose-500 transition cursor-pointer interactive-tap"
            title={isLiked ? "Unlike" : "Like"}
          >
            {isLiked ? (
              <GoHeartFill className="w-5 h-5 text-rose-500 scale-110 animate-heart-burst" />
            ) : (
              <GoHeart className="w-5 h-5" />
            )}
          </button>

          {/* Comment Button (Opens Instagram-style Comments Sheet) */}
          {post?.allowComments !== false ? (
            <button 
              onClick={() => {
                triggerHaptic("light");
                setShowCommentsModal(true);
              }} 
              className="text-text hover:text-rose-500 transition cursor-pointer interactive-tap"
              title="View Comments"
            >
              <MdOutlineComment className="w-5 h-5" />
            </button>
          ) : (
            <div className="text-text-muted cursor-not-allowed">
              <MdOutlineComment className="w-5 h-5 opacity-40" />
            </div>
          )}

          {/* Share Button */}
          <button 
            onClick={() => {
              triggerHaptic("light");
              setShowShareSheet(true);
            }} 
            className="p-1 text-text hover:text-rose-500 transition cursor-pointer interactive-tap" 
            title="Share Post"
          >
            <IoSendSharp className="w-4 h-4 -rotate-45" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic("light");
              setShowCollectionsModal(true);
            }}
            className="p-1.5 text-text-secondary hover:text-rose-400 rounded-full hover:bg-surface transition cursor-pointer interactive-tap"
            title="Save to folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaved}
            className="p-1.5 text-text hover:text-rose-500 rounded-full hover:bg-surface transition cursor-pointer interactive-tap"
            title={post?.savedBy?.includes(userData?.user?._id) ? "Unsave Post" : "Save Post"}
          >
            {userData?.user?.savedPosts?.includes(post?._id) || post?.savedBy?.includes(userData?.user?._id) ? (
              <GoBookmarkFill className="w-5 h-5 text-rose-500 scale-110" />
            ) : (
              <GoBookmark className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* CAPTION & INTERACTION SUMMARY (Exact Instagram Style) */}
      <div className="w-full px-4 pb-3 pt-1 space-y-1.5 bg-bg/20">
        {/* Same-line Compact Likes */}
        {localLikes?.length > 0 && !post?.likesHidden && (
          <div className="flex items-center gap-2 text-xs">
            <span
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                setShowLikersModal(true);
              }}
              className="font-bold text-text cursor-pointer hover:underline transition select-none"
              title="View people who liked this post"
            >
              {localLikes.length} {localLikes.length === 1 ? "like" : "likes"}
            </span>
          </div>
        )}

        {/* Post Caption */}
        {post?.caption && (
          <div className="space-y-1">
            <div className="flex items-start gap-2 text-xs">
              <span className="font-bold text-text cursor-pointer hover:underline flex items-center gap-0.5 shrink-0" onClick={() => navigate(`/profile/${post?.author?.userName}`)}>
                @{post?.author?.userName}
                {post?.author?.isVerified && (
                  <VerifiedBadge size="xs" />
                )}
              </span>
              <RenderParsedCaption caption={post.caption} onNavigate={navigate} />
            </div>
            <AITranslateButton originalText={post.caption} />
          </div>
        )}

        {/* Instagram "View all X comments" Row */}
        {post?.allowComments !== false && post?.comments && post.comments.length > 1 && (
          <p
            onClick={() => {
              triggerHaptic("light");
              setShowCommentsModal(true);
            }}
            className="text-xs text-text-secondary hover:text-text cursor-pointer hover:underline font-medium transition select-none pt-0.5"
          >
            View all {post.comments.length} comments
          </p>
        )}

        {/* Instagram-style Top Priority Preview Comments (Friends / Pinned / Top Liked) */}
        {previewComments.length > 0 && (
          <div className="space-y-1 pt-0.5">
            {previewComments.map((c) => {
              const isCommentLiked = Boolean(
                currentUserId &&
                c.likes?.some((id) => (id?._id || id)?.toString() === currentUserId)
              );

              return (
                <div key={c._id} className="flex items-center justify-between text-xs group/comment">
                  <div className="flex items-baseline gap-1.5 min-w-0 pr-2 overflow-hidden">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${c.author?.userName}`);
                      }}
                      className="font-bold text-text hover:underline cursor-pointer shrink-0"
                    >
                      @{c.author?.userName || "user"}
                    </span>
                    <span
                      onClick={() => {
                        triggerHaptic("light");
                        setShowCommentsModal(true);
                      }}
                      className="text-text-secondary truncate cursor-pointer hover:text-text transition"
                    >
                      {c.message}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInlineLikeComment(c._id);
                    }}
                    className="text-text-muted hover:text-rose-500 transition cursor-pointer shrink-0 p-0.5 active:scale-75"
                    title={isCommentLiked ? "Unlike comment" : "Like comment"}
                  >
                    {isCommentLiked ? (
                      <GoHeartFill className="w-3.5 h-3.5 text-rose-500 scale-110 animate-heart-burst drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                    ) : (
                      <GoHeart className="w-3.5 h-3.5 opacity-60 group-hover/comment:opacity-100 hover:scale-110 transition-transform animate-heart-deflate" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSTAGRAM-STYLE LIKERS MODAL */}
      {showLikersModal && (
        <LikersModal
          isOpen={showLikersModal}
          onClose={() => setShowLikersModal(false)}
          postId={post?._id}
        />
      )}

      {/* INSTAGRAM-STYLE COMMENTS MODAL */}
      {showCommentsModal && (
        <CommentsModal
          isOpen={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          post={post}
        />
      )}

      {/* Collections Modal */}
      {showCollectionsModal && (
        <CollectionsModal isOpen={showCollectionsModal} onClose={() => setShowCollectionsModal(false)} postId={post?._id} />
      )}

      {/* Share Sheet */}
      {showShareSheet && (
        <ShareSheet
          open={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          entity={post}
          entityType="post"
          following={userData?.user?.following || []}
        />
      )}

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          post={post}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* AI Transparency Disclosure Modal */}
      <AIInfoModal
        isOpen={showAIInfoModal}
        onClose={() => setShowAIInfoModal(false)}
        aiLabel={post?.aiLabel}
        authorName={post?.author?.name || `@${post?.author?.userName}` || "The creator"}
      />
    </div>
  );
};

export default Post;

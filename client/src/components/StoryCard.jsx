import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dp from "../assets/dp3.png";
import { useSelector, useDispatch } from "react-redux";
import { FiEye, FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import {
  Send,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Loader2,
  Plus,
  Music,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Trash2,
  Bookmark,
  Share2,
  Download,
  ShieldAlert,
  Volume1,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import {
  removeStoryFromReduxFeed,
  toggleStoryLikeInRedux,
  markStoryAsViewedInRedux,
  setStoryFeed,
} from "../redux/features/storySlice";
import StoryVideoPlayer from "./StoryVideo";
import StoryStickers from "./StoryStickers";
import ShareSheet from "./ShareSheet";
import StoryHighlighterModal from "./StoryHighlighterModal";
import StoryViewersDrawer from "./StoryViewersDrawer";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";

const STORY_IMAGE_DURATION = 6500; // 6.5s per image duration

// Ensure Cloudinary image URLs have f_auto,q_auto for browser compatibility (HEIF/WebP)
const ensureCloudinaryAutoFormat = (url) => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("cloudinary.com") || !url.includes("/upload/")) return url;
  if (url.includes("f_auto")) return url; // already has it
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
};

const isInteractiveTarget = (target) => {
  if (!target) return false;
  let curr = target;
  let depth = 0;
  while (curr && depth < 10) {
    const tagName = (curr.tagName || "").toUpperCase();
    if (
      tagName === "BUTTON" ||
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "FORM" ||
      tagName === "A" ||
      (curr.classList &&
        (curr.classList.contains("interactive-control") ||
          curr.classList.contains("no-tap") ||
          curr.classList.contains("share-sheet-container")))
    ) {
      return true;
    }
    curr = curr.parentElement;
    depth++;
  }
  return false;
};

export const StoryCard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { userData } = useSelector((state) => state.user);
  const { feed: reduxFeed } = useSelector((state) => state.story);

  const [feed, setFeed] = useState([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [isHoldingState, setIsHoldingState] = useState(false);

  // Animated Floating Emoji particles
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const imgRef = useRef(null);

  const intervalRef = useRef(null);
  const storyAudioRef = useRef(null);
  const lastTapTime = useRef(0);

  const pointerDownTime = useRef(0);
  const isHolding = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipeRef = useRef(false);

  // Helper to find first unseen story
  const getFirstUnseenIndex = (userGroup) => {
    if (!userGroup || !userGroup.stories || userGroup.stories.length === 0) return 0;
    const currentUserId = userData?.user?._id;
    const idx = userGroup.stories.findIndex((s) => {
      return !s.viewers?.some(
        (v) => v === currentUserId || v?._id?.toString() === currentUserId
      );
    });
    return idx === -1 ? 0 : idx;
  };

  // Populate Feed
  useEffect(() => {
    if (initialized) return;

    if (location.state?.stories && location.state.stories.length > 0) {
      const storiesList = location.state.stories;
      setFeed([
        {
          author: storiesList[0]?.author || { userName: "Highlight" },
          stories: storiesList,
          isCurrentUser: storiesList[0]?.author?._id === userData?.user?._id,
        },
      ]);
      setCurrentUserIndex(0);
      setCurrentStoryIndex(0);
      setInitialized(true);
    } else if (reduxFeed && reduxFeed.length > 0) {
      setFeed(reduxFeed);
      const initialUserIdx = location.state?.initialUserIndex ?? 0;
      const startUserIdx = Math.min(Math.max(0, initialUserIdx), reduxFeed.length - 1);
      setCurrentUserIndex(startUserIdx);
      if (reduxFeed[startUserIdx]) {
        setCurrentStoryIndex(getFirstUnseenIndex(reduxFeed[startUserIdx]));
      }
      setInitialized(true);
    }
  }, [location.state?.stories, reduxFeed, userData, initialized]);

  const activeGroup = feed[currentUserIndex] || null;
  const storiesList = activeGroup?.stories || [];
  const story = storiesList[currentStoryIndex] || null;
  const isOwnStory =
    story?.author?._id === userData?.user?._id ||
    story?.author?.userName === userData?.user?.userName;

  // Sync Likes & Media Loading State
  useEffect(() => {
    if (story) {
      const currentUserId = userData?.user?._id;
      setIsLiked(story.likes?.some((id) => id === currentUserId || id._id === currentUserId));
      setLikesCount(story.likes?.length || 0);

      if (story.mediaType === "image" && !story.caption && imgRef.current && imgRef.current.complete) {
        setMediaLoading(false);
      } else if (story.mediaType === "text" || (story.mediaType === "image" && story.caption)) {
        setMediaLoading(false);
      } else {
        setMediaLoading(true);
      }
    }
  }, [story, userData]);

  // Mark Story Viewed
  useEffect(() => {
    if (!story?._id) return;
    api
      .post(`/story/view/${story._id}`)
      .then(() => {
        dispatch(markStoryAsViewedInRedux({ storyId: story._id, userId: userData?.user?._id }));
      })
      .catch(() => null);
  }, [story?._id, dispatch, userData]);

  // Story Music Playback Controller
  useEffect(() => {
    if (storyAudioRef.current) {
      storyAudioRef.current.pause();
      storyAudioRef.current = null;
    }

    let musicObj = story?.music;
    if (typeof musicObj === "string") {
      try {
        musicObj = JSON.parse(musicObj);
      } catch {
        musicObj = null;
      }
    }

    if (musicObj?.audioUrl) {
      const audio = new Audio(musicObj.audioUrl);
      audio.onended = () => {
        audio.currentTime = musicObj.startTime || 0;
        audio.play().catch(() => null);
      };
      audio.currentTime = musicObj.startTime || 0;
      audio.muted = isMuted;
      storyAudioRef.current = audio;

      const shouldPlay =
        !isPaused &&
        !mediaLoading &&
        !showViewers &&
        !showShareSheet &&
        !showHighlightModal &&
        !showOptionsMenu;

      if (shouldPlay) {
        audio.play().catch(() => null);
      }
    }

    return () => {
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
      }
    };
  }, [story?._id]);

  // Sync play/pause/mute state
  useEffect(() => {
    if (storyAudioRef.current) {
      storyAudioRef.current.muted = isMuted;
      const shouldPlay =
        !isPaused &&
        !mediaLoading &&
        !showViewers &&
        !showShareSheet &&
        !showHighlightModal &&
        !showOptionsMenu;

      if (shouldPlay) {
        storyAudioRef.current.play().catch(() => null);
      } else {
        storyAudioRef.current.pause();
      }
    }
  }, [isPaused, isMuted, mediaLoading, showViewers, showShareSheet, showHighlightModal, showOptionsMenu]);

  // Navigation Logic
  const handleNextUser = () => {
    if (currentUserIndex < feed.length - 1) {
      const nextUserIdx = currentUserIndex + 1;
      setCurrentUserIndex(nextUserIdx);
      setCurrentStoryIndex(getFirstUnseenIndex(feed[nextUserIdx]));
    } else {
      navigate(-1);
    }
  };

  const handlePrevUser = () => {
    if (currentUserIndex > 0) {
      const prevUserIdx = currentUserIndex - 1;
      setCurrentUserIndex(prevUserIdx);
      const prevGroup = feed[prevUserIdx];
      setCurrentStoryIndex(Math.max(0, (prevGroup.stories?.length || 1) - 1));
    }
  };

  const handleNextStory = () => {
    if (currentStoryIndex < storiesList.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else {
      handleNextUser();
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else {
      handlePrevUser();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === " ") {
        handleNextStory();
      } else if (e.key === "ArrowLeft") {
        handlePrevStory();
      } else if (e.key === "Escape") {
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStoryIndex, currentUserIndex, feed, storiesList]);

  // Progress Timer
  useEffect(() => {
    setProgress(0);
    clearInterval(intervalRef.current);

    if ((story?.mediaType === "image" || story?.mediaType === "text" || story?.caption) && !mediaLoading) {
      intervalRef.current = setInterval(() => {
        if (!isPaused && !showViewers && !showShareSheet && !showHighlightModal && !showOptionsMenu) {
          setProgress((p) => {
            if (p >= 100) {
              handleNextStory();
              return 0;
            }
            return p + 1.5;
          });
        }
      }, STORY_IMAGE_DURATION / 70);
    }

    return () => clearInterval(intervalRef.current);
  }, [currentStoryIndex, currentUserIndex, isPaused, mediaLoading, story, showViewers, showShareSheet, showHighlightModal, showOptionsMenu]);

  // Touch / Pointer Gestures
  const handlePointerDown = (e) => {
    if (isInteractiveTarget(e.target)) return;
    pointerDownTime.current = Date.now();
    isHolding.current = true;
    isSwipeRef.current = false;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    startXRef.current = clientX;
    startYRef.current = clientY;
    setIsPaused(true);
    setIsHoldingState(true);
  };

  const handlePointerMove = (e) => {
    if (!isHolding.current) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const diffX = clientX - startXRef.current;
    const diffY = clientY - startYRef.current;

    if (Math.abs(diffX) > 15 || Math.abs(diffY) > 15) {
      isSwipeRef.current = true;
    }
  };

  const handlePointerUp = (e) => {
    if (!isHolding.current) return;
    isHolding.current = false;
    setIsPaused(false);
    setIsHoldingState(false);

    const duration = Date.now() - pointerDownTime.current;
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);

    const diffX = clientX - startXRef.current;
    const diffY = clientY - startYRef.current;

    if (isSwipeRef.current) {
      if (diffY > 80) {
        navigate(-1);
        return;
      }
      if (Math.abs(diffX) > 60) {
        if (diffX < 0) handleNextUser();
        else handlePrevUser();
      }
    } else {
      if (duration < 250) {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          setShowBigHeart(true);
          if (!isLiked) handleToggleLike();
          setTimeout(() => setShowBigHeart(false), 900);
          lastTapTime.current = 0;
          return;
        }
        lastTapTime.current = now;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const width = rect.width;

        if (clickX < width * 0.35) {
          handlePrevStory();
        } else {
          handleNextStory();
        }
      }
    }
  };

  // Like Toggle
  const handleToggleLike = async () => {
    if (!story?._id) return;
    const prevLiked = isLiked;
    setIsLiked(!prevLiked);
    setLikesCount((c) => (prevLiked ? Math.max(0, c - 1) : c + 1));

    if (!prevLiked) {
      addFloatingEmoji("❤️");
    }

    try {
      const res = await api.post(`/story/like/${story._id}`);
      if (res.data?.success) {
        dispatch(
          toggleStoryLikeInRedux({
            storyId: story._id,
            userId: userData?.user?._id,
            isLiked: res.data.isLiked,
          })
        );
      }
    } catch {
      setIsLiked(prevLiked);
      setLikesCount((c) => (prevLiked ? c + 1 : Math.max(0, c - 1)));
    }
  };

  // Floating Emoji Burst Particle
  const addFloatingEmoji = (emoji) => {
    const id = Date.now() + Math.random();
    const randomX = Math.random() * 60 - 30; // -30px to +30px jitter
    setFloatingEmojis((prev) => [...prev, { id, emoji, x: randomX }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 1800);
  };

  // Quick Emoji Reaction
  const handleEmojiReaction = async (emoji, e) => {
    e?.stopPropagation();
    if (!story?._id) return;
    addFloatingEmoji(emoji);
    snackbar(`Reacted ${emoji}`, { duration: 1200 });

    try {
      await api.post(`/story/react/${story._id}`, { emoji });
    } catch (err) {
      console.warn("React failed:", err);
    }
  };

  // Send Direct Message Reply
  const handleSendDMReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !story?._id) return;

    const message = replyText.trim();
    setReplyText("");
    setIsPaused(false);

    try {
      await api.post(`/story/reply/${story._id}`, { message });
      snackbar.success("Reply sent to Direct Messages! ✈️");
      addFloatingEmoji("💬");
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to send reply");
    }
  };

  // Open Delete Story Confirmation Modal
  const handleDeleteStory = () => {
    if (!story?._id) return;
    setShowOptionsMenu(false);
    setShowViewers(false);
    setIsPaused(true);
    setShowDeleteConfirmModal(true);
  };

  // Perform Actual Story Deletion
  const confirmDeleteStory = async () => {
    if (!story?._id) return;
    setIsDeletingStory(true);

    try {
      await api.delete(`/story/${story._id}`);
      snackbar.success("Story deleted successfully 🗑️");
      dispatch(removeStoryFromReduxFeed({ storyId: story._id }));
      setShowDeleteConfirmModal(false);

      // Re-fetch stories feed from backend to ensure Redux is 100% synchronized
      api.get("/story/feed").then((res) => {
        if (res.data?.success) {
          dispatch(setStoryFeed(res.data.stories || res.data.feed || []));
        }
      }).catch(() => null);

      if (storiesList.length > 1) {
        handleNextStory();
      } else {
        navigate("/");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to delete story");
    } finally {
      setIsDeletingStory(false);
      setIsPaused(false);
    }
  };

  // Save / Download Story Media
  const handleSaveMedia = async () => {
    const url = story?.media?.url;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `vybe-story-${Date.now()}.${story.mediaType === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      snackbar.success("Saved to device!");
      setShowOptionsMenu(false);
    } catch {
      window.open(url, "_blank");
    }
  };

  if (!story || !activeGroup) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs text-zinc-400">Loading story...</p>
      </div>
    );
  }

  const isCF = story.visibleTo === "closeFriends";

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden select-none">
      {/* Desktop Flanking Navigation Arrows */}
      <button
        onClick={handlePrevStory}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition cursor-pointer"
        title="Previous Story"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNextStory}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition cursor-pointer"
        title="Next Story"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main 9:16 Story Stage Card */}
      <div
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className="relative w-full h-full md:max-w-[420px] md:max-h-[92vh] md:rounded-3xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-white/10"
      >
        {/* Story Media Layer */}
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
          {story.mediaType === "video" ? (
            <StoryVideoPlayer
              src={story.media?.url}
              isPaused={isPaused || showViewers || showShareSheet || showHighlightModal || showOptionsMenu}
              isMuted={isMuted}
              onLoadedData={() => setMediaLoading(false)}
              onEnded={handleNextStory}
            />
          ) : story.mediaType === "text" ? (
            (() => {
              const mediaUrl = story.mediaUrl || story.media?.url || "";
              let theme = {
                gradient: "from-amber-500 via-rose-600 to-purple-800",
                textColor: "#ffffff",
                fontClass: "font-extrabold tracking-tight",
                cardClass: "bg-white/20 backdrop-blur-md text-white p-5 rounded-3xl border border-white/30 shadow-2xl",
              };

              if (mediaUrl.includes("cyber") || mediaUrl.includes("neon")) {
                theme = {
                  gradient: "from-cyan-500 via-indigo-900 to-purple-950",
                  textColor: "#22d3ee",
                  fontClass: "font-serif italic font-black",
                  cardClass: "bg-black/85 text-cyan-300 p-5 rounded-3xl border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]",
                };
              } else if (mediaUrl.includes("midnight") || mediaUrl.includes("gold") || mediaUrl.includes("noir")) {
                theme = {
                  gradient: "from-zinc-950 via-neutral-900 to-black",
                  textColor: "#fef08a",
                  fontClass: "font-serif font-bold tracking-normal",
                  cardClass: "bg-black/90 text-yellow-200 p-5 rounded-3xl border border-yellow-500/40 shadow-2xl",
                };
              } else if (mediaUrl.includes("pastel")) {
                theme = {
                  gradient: "from-pink-400 via-purple-300 to-indigo-400",
                  textColor: "#ffffff",
                  fontClass: "font-sans font-bold",
                  cardClass: "bg-white/25 backdrop-blur-md text-white p-5 rounded-3xl border border-white/40 shadow-2xl",
                };
              } else if (mediaUrl.includes("flame") || mediaUrl.includes("energy")) {
                theme = {
                  gradient: "from-red-600 via-orange-600 to-amber-500",
                  textColor: "#ffffff",
                  fontClass: "font-extrabold tracking-tight",
                  cardClass: "bg-black/85 text-white p-5 rounded-3xl border border-white/20 shadow-2xl",
                };
              } else if (mediaUrl.includes("emerald")) {
                theme = {
                  gradient: "from-emerald-950 via-teal-900 to-cyan-950",
                  textColor: "#a7f3d0",
                  fontClass: "font-mono uppercase tracking-widest font-bold",
                  cardClass: "bg-black/90 text-emerald-300 p-5 rounded-3xl border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.4)]",
                };
              } else if (mediaUrl.includes("vintage") || mediaUrl.includes("journal")) {
                theme = {
                  gradient: "from-amber-950 via-stone-900 to-zinc-950",
                  textColor: "#fed7aa",
                  fontClass: "font-mono font-medium",
                  cardClass: "p-4",
                };
              } else if (mediaUrl.includes("aurora") || mediaUrl.includes("hologram")) {
                theme = {
                  gradient: "from-violet-600 via-fuchsia-600 to-cyan-500",
                  textColor: "#ffffff",
                  fontClass: "font-sans font-bold",
                  cardClass: "bg-white/20 backdrop-blur-md text-white p-5 rounded-3xl border border-white/30 shadow-2xl",
                };
              } else if (mediaUrl.includes("minimal")) {
                theme = {
                  gradient: "from-zinc-900 via-zinc-900 to-zinc-950",
                  textColor: "#ffffff",
                  fontClass: "font-sans font-bold",
                  cardClass: "p-4",
                };
              }

              return (
                <div className={`w-full h-full bg-gradient-to-tr ${theme.gradient} flex items-center justify-center p-8 text-center select-none`}>
                  <div className={`max-w-xs ${theme.cardClass}`}>
                    <p
                      className={`text-2xl sm:text-3xl leading-relaxed drop-shadow-lg ${theme.fontClass}`}
                      style={{ color: theme.textColor }}
                    >
                      {story.caption || story.text || ""}
                    </p>
                  </div>
                </div>
              );
            })()
          ) : (
            <img
              ref={imgRef}
              src={ensureCloudinaryAutoFormat(story.media?.url)}
              alt=""
              onLoad={() => setMediaLoading(false)}
              onError={() => setMediaLoading(false)}
              className={`w-full h-full object-cover transition-opacity duration-200 ${mediaLoading ? "opacity-0" : "opacity-100"}`}
            />
          )}

          {/* Interactive Stickers Overlay */}
          {story.stickers && story.stickers.length > 0 && (
            <StoryStickers
              stickers={story.stickers}
              storyId={story._id}
              authorId={story.author?._id}
              currentUserId={userData?.user?._id}
            />
          )}

          {/* Media Loading Spinner */}
          {mediaLoading && story.mediaType !== "text" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}

          {/* Double Tap Big Heart Animation */}
          {showBigHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-scale-up">
              <FaHeart className="text-rose-500 text-8xl drop-shadow-2xl animate-bounce" />
            </div>
          )}

          {/* Floating Emoji Particles Layer */}
          <div className="absolute inset-x-0 bottom-24 pointer-events-none z-40 flex justify-center">
            {floatingEmojis.map((item) => (
              <div
                key={item.id}
                style={{ transform: `translateX(${item.x}px)` }}
                className="absolute text-5xl animate-float-up opacity-90 drop-shadow-2xl"
              >
                {item.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* TOP OVERLAY: Progress Bars + Header HUD */}
        <div
          className={`interactive-control absolute top-0 inset-x-0 p-3.5 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-30 space-y-2.5 transition-opacity duration-200 ${
            isHoldingState ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          }`}
        >
          {/* Segmented Progress Bars */}
          <div className="flex gap-1 px-0.5">
            {storiesList.map((_, i) => (
              <div key={i} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                  style={{
                    width:
                      i < currentStoryIndex
                        ? "100%"
                        : i === currentStoryIndex
                        ? `${progress}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Profile + Action Icons */}
          <div className="flex items-center justify-between pt-1">
            {/* Author Profile */}
            <div className="flex items-center gap-2.5">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${story.author?.userName}`);
                }}
                className={`relative p-0.5 rounded-full cursor-pointer ${
                  isCF
                    ? "bg-gradient-to-tr from-emerald-400 to-green-500"
                    : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                }`}
              >
                <img
                  src={story.author?.profileImage?.url || dp}
                  className="w-8 h-8 rounded-full object-cover bg-zinc-900"
                  alt=""
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${story.author?.userName}`);
                    }}
                    className="text-white text-xs font-bold hover:underline cursor-pointer"
                  >
                    {story.author?.userName}
                  </span>
                  <span className="text-[10px] text-white/70 font-normal">
                    • {story.createdAt ? moment(story.createdAt).fromNow(true) : "now"}
                  </span>
                  {isCF && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-500 text-black text-[9px] font-black rounded-md uppercase tracking-wider">
                      <Star className="w-2.5 h-2.5 fill-black" /> Close Friends
                    </span>
                  )}
                </div>

                {/* Music title pill if present */}
                {story.music && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/audio/${encodeURIComponent(story.music.title || "Audio")}`);
                    }}
                    className="flex items-center gap-1 text-[9px] font-bold text-white/90 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 mt-0.5 cursor-pointer truncate max-w-[170px]"
                  >
                    <Music className="w-2.5 h-2.5 text-white animate-pulse" />
                    <span className="truncate">{story.music.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Right Controls (Mute, Pause, 3-Dots, Close) */}
            <div className="flex items-center gap-1">
              {/* Audio Mute Toggle */}
              {story.music?.audioUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="p-1.5 rounded-full hover:bg-white/15 text-white transition cursor-pointer"
                  title={isMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              {/* Pause Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(!isPaused);
                }}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition cursor-pointer"
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>

              {/* 3-Dots Options Menu */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptionsMenu(true);
                }}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition cursor-pointer"
                title="Story Options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Close (X) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(-1);
                }}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM OVERLAY: Reply Bar or Viewers Counter */}
        <div
          className={`interactive-control absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/55 to-transparent z-30 flex flex-col gap-3 transition-opacity duration-200 ${
            isHoldingState ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          }`}
        >
          {isOwnStory ? (
            /* Viewers & Highlights Dock for Author */
            <div className="flex items-center justify-between text-white">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewers(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-xs font-bold text-white transition cursor-pointer"
              >
                <FiEye className="w-4 h-4 text-purple-400" />
                <span>{story.viewers?.length || 0} Viewers</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHighlightModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-xs font-bold text-white transition cursor-pointer"
                  title="Add to Highlight"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>Highlight</span>
                </button>
              </div>
            </div>
          ) : (
            /* Quick Reactions & DM Reply Bar for Viewers */
            <>
              {/* Emojis Reaction Row */}
              <div className="flex items-center justify-around px-1">
                {["❤️", "😂", "🔥", "😭", "👏", "😮", "🎉", "💯"].map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => handleEmojiReaction(emoji, e)}
                    className="text-2xl hover:scale-130 transition transform active:scale-90 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Message Reply Input + Like + Share */}
              <form onSubmit={handleSendDMReply} className="flex items-center gap-2">
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    placeholder={`Send message to ${story.author?.userName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/50 outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 transition"
                  />
                  {replyText.trim() && (
                    <button
                      type="submit"
                      className="absolute right-2 p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Like Button */}
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title={isLiked ? "Unlike Story" : "Like Story"}
                >
                  {isLiked ? <FaHeart className="w-5 h-5 text-rose-500 scale-110" /> : <FiHeart className="w-5 h-5" />}
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareSheet(true);
                  }}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Share Story"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* 3-DOTS OPTIONS SHEET MODAL */}
      {showOptionsMenu && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setShowOptionsMenu(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-2 text-white animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-center text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Story Options</h3>

            {isOwnStory ? (
              <>
                <button
                  onClick={handleDeleteStory}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 text-red-500 font-semibold text-xs transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Story</span>
                </button>
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setShowHighlightModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white font-semibold text-xs transition"
                >
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>Add to Highlight</span>
                </button>
                <button
                  onClick={handleSaveMedia}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white font-semibold text-xs transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Save to Device</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    snackbar.success(`Muted stories from @${story.author?.userName}`);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white font-semibold text-xs transition"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>Mute @{story.author?.userName}</span>
                </button>
                <button
                  onClick={() => {
                    snackbar.success("Story reported to moderation team.");
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 text-red-400 font-semibold text-xs transition"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Report Inappropriate Content</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowOptionsMenu(false)}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-xs font-bold text-white transition mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Story Viewers & Insights Drawer */}
      {showViewers && (
        <StoryViewersDrawer
          open={showViewers}
          onClose={() => setShowViewers(false)}
          story={story}
          onDeleteStory={handleDeleteStory}
        />
      )}

      {/* Story Highlighter Modal */}
      {showHighlightModal && (
        <StoryHighlighterModal
          isOpen={showHighlightModal}
          onClose={() => setShowHighlightModal(false)}
          story={story}
        />
      )}

      {/* Share Sheet */}
      {showShareSheet && (
        <ShareSheet
          open={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          entity={story}
          entityType="story"
          following={userData?.user?.following || []}
        />
      )}

      {/* Sleek Delete Story Confirmation Dialog */}
      {showDeleteConfirmModal && (
        <div
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            if (!isDeletingStory) {
              setShowDeleteConfirmModal(false);
              setIsPaused(false);
            }
          }}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Delete Story?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Are you sure you want to delete this story? It will be permanently removed from your active feed.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                disabled={isDeletingStory}
                onClick={confirmDeleteStory}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {isDeletingStory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting Story...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Story</span>
                  </>
                )}
              </button>

              <button
                disabled={isDeletingStory}
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setIsPaused(false);
                }}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl text-xs font-bold transition cursor-pointer"
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

export default StoryCard;

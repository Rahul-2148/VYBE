import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Bookmark,
  Download,
  VolumeX,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { FaHeart } from "react-icons/fa";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import {
  removeStoryFromReduxFeed,
  toggleStoryLikeInRedux,
  markStoryAsViewedInRedux,
} from "../redux/features/storySlice";
import { StoryProgressBars } from "./StoryProgressBars";
import { StoryHeaderHUD } from "./StoryHeaderHUD";
import { StoryMediaRenderer } from "./StoryMediaRenderer";
import { StoryViewerDock } from "./StoryViewerDock";
import { StoryAuthorDock } from "./StoryAuthorDock";
import { StoryStickers } from "./StoryStickers";
import { ShareSheet } from "./ShareSheet";
import { StoryHighlighterModal } from "./StoryHighlighterModal";
import { StoryViewersDrawer } from "./StoryViewersDrawer";
import moment from "moment";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

const STORY_IMAGE_DURATION = 6000; // 6.0s per image/text slide

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

  const [feed, setFeed] = useState(() => {
    if (location.state?.stories && location.state.stories.length > 0) {
      const storiesList = location.state.stories;
      return [
        {
          author: storiesList[0]?.author || { userName: "Highlight" },
          stories: storiesList,
          isCurrentUser: storiesList[0]?.author?._id === userData?.user?._id,
        },
      ];
    }
    if (reduxFeed && reduxFeed.length > 0) {
      return reduxFeed;
    }
    return [];
  });

  const [currentUserIndex, setCurrentUserIndex] = useState(() => {
    if (location.state?.stories && location.state.stories.length > 0) return 0;
    if (reduxFeed && reduxFeed.length > 0) {
      const initialUserIdx = location.state?.initialUserIndex ?? 0;
      return Math.min(Math.max(0, initialUserIdx), reduxFeed.length - 1);
    }
    return 0;
  });

  const [currentStoryIndex, setCurrentStoryIndex] = useState(() => {
    if (location.state?.stories && location.state.stories.length > 0) return 0;
    if (reduxFeed && reduxFeed.length > 0) {
      const initialUserIdx = location.state?.initialUserIndex ?? 0;
      const startUserIdx = Math.min(Math.max(0, initialUserIdx), reduxFeed.length - 1);
      const group = reduxFeed[startUserIdx];
      if (group?.stories?.length) {
        const currentUserId = userData?.user?._id;
        const idx = group.stories.findIndex(
          (s) => !s.viewers?.some((v) => (v?._id?.toString() || v?.toString()) === currentUserId?.toString())
        );
        return idx === -1 ? 0 : idx;
      }
    }
    return 0;
  });

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [, setLikesCount] = useState(0);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [isHoldingState, setIsHoldingState] = useState(false);

  // Floating Emoji particles
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [initialized, setInitialized] = useState(() => {
    return Boolean(
      (location.state?.stories && location.state.stories.length > 0) ||
      (reduxFeed && reduxFeed.length > 0)
    );
  });
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
  const getFirstUnseenIndex = useCallback((userGroup) => {
    if (!userGroup || !userGroup.stories || userGroup.stories.length === 0) return 0;
    const currentUserId = userData?.user?._id;
    const idx = userGroup.stories.findIndex((s) => {
      return !s.viewers?.some(
        (v) => (v?._id?.toString() || v?.toString()) === currentUserId?.toString()
      );
    });
    return idx === -1 ? 0 : idx;
  }, [userData?.user?._id]);

  // Populate Feed if loaded asynchronously
  useEffect(() => {
    if (!initialized && reduxFeed && reduxFeed.length > 0) {
      const timer = setTimeout(() => {
        const initialUserIdx = location.state?.initialUserIndex ?? 0;
        const startUserIdx = Math.min(Math.max(0, initialUserIdx), reduxFeed.length - 1);
        setFeed(reduxFeed);
        setCurrentUserIndex(startUserIdx);
        if (reduxFeed[startUserIdx]) {
          setCurrentStoryIndex(getFirstUnseenIndex(reduxFeed[startUserIdx]));
        }
        setInitialized(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialized, reduxFeed, location.state?.initialUserIndex, getFirstUnseenIndex]);

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
      const timer = setTimeout(() => {
        setIsLiked(Boolean(story.likes?.some((id) => (id?._id?.toString() || id?.toString()) === currentUserId?.toString())));
        setLikesCount(story.likes?.length || 0);

        if (story.mediaType === "image" && !story.caption && imgRef.current && imgRef.current.complete) {
          setMediaLoading(false);
        } else if (story.mediaType === "text" || (story.mediaType === "image" && story.caption)) {
          setMediaLoading(false);
        } else {
          setMediaLoading(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [story, userData?.user?._id]);

  // Mark Story as Viewed
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
      audio.loop = true;
      audio.muted = isMuted;
      audio.currentTime = musicObj.startTime || 0;
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
        storyAudioRef.current = null;
      }
    };
  }, [story?._id, story?.music, isMuted, isPaused, mediaLoading, showViewers, showShareSheet, showHighlightModal, showOptionsMenu]);

  // Sync Audio Play / Pause
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
  const handleNextUser = useCallback(() => {
    if (currentUserIndex < feed.length - 1) {
      const nextUserIdx = currentUserIndex + 1;
      setCurrentUserIndex(nextUserIdx);
      setCurrentStoryIndex(getFirstUnseenIndex(feed[nextUserIdx]));
      setProgress(0);
    } else {
      navigate(-1);
    }
  }, [currentUserIndex, feed, navigate, getFirstUnseenIndex]);

  const handlePrevUser = useCallback(() => {
    if (currentUserIndex > 0) {
      const prevUserIdx = currentUserIndex - 1;
      setCurrentUserIndex(prevUserIdx);
      const prevGroup = feed[prevUserIdx];
      setCurrentStoryIndex(Math.max(0, (prevGroup?.stories?.length || 1) - 1));
      setProgress(0);
    }
  }, [currentUserIndex, feed]);

  const handleNextStory = useCallback(() => {
    if (currentStoryIndex < storiesList.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      handleNextUser();
    }
  }, [currentStoryIndex, storiesList.length, handleNextUser]);

  const handlePrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      handlePrevUser();
    }
  }, [currentStoryIndex, handlePrevUser]);

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
  }, [handleNextStory, handlePrevStory, navigate]);

  // Segment Progress Timer
  useEffect(() => {
    clearInterval(intervalRef.current);

    if ((story?.mediaType === "image" || story?.mediaType === "text" || story?.caption) && !mediaLoading) {
      intervalRef.current = setInterval(() => {
        if (!isPaused && !showViewers && !showShareSheet && !showHighlightModal && !showOptionsMenu) {
          setProgress((p) => {
            if (p >= 100) {
              handleNextStory();
              return 0;
            }
            return p + 1.25;
          });
        }
      }, STORY_IMAGE_DURATION / 80);
    }

    return () => clearInterval(intervalRef.current);
  }, [currentStoryIndex, currentUserIndex, isPaused, mediaLoading, story, showViewers, showShareSheet, showHighlightModal, showOptionsMenu, handleNextStory]);

  // Floating Emoji Burst Particle
  const addFloatingEmoji = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    const startX = 30 + Math.random() * 40; // 30% to 70% width
    setFloatingEmojis((prev) => [...prev, { id, emoji, startX }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 1800);
  }, []);

  const handleEmojiReaction = async (emoji, e) => {
    if (e) e.stopPropagation();
    triggerHaptic("light");
    microAudio.playPop();
    addFloatingEmoji(emoji);

    try {
      await api.post(`/story/react/${story._id}`, { emoji });
    } catch {
      // silent fallback
    }
  };

  const handleToggleLike = useCallback(async () => {
    if (!story) return;
    const prevLiked = isLiked;
    setIsLiked(!prevLiked);
    setLikesCount((c) => (prevLiked ? Math.max(0, c - 1) : c + 1));
    triggerHaptic("selection");

    if (!prevLiked) {
      microAudio.playPop();
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
  }, [story, isLiked, addFloatingEmoji, dispatch, userData]);

  // Touch / Pointer Gestures (Hold to Pause, Double Tap Heart, Swipe navigation)
  const handlePointerDown = useCallback((e) => {
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
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isHolding.current) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const diffX = clientX - startXRef.current;
    const diffY = clientY - startYRef.current;

    if (Math.abs(diffX) > 15 || Math.abs(diffY) > 15) {
      isSwipeRef.current = true;
    }
  }, []);

  const handlePointerUp = useCallback((e) => {
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
      if (diffY > 90) {
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
          // Double Tap Big Heart
          triggerHaptic("heavy");
          microAudio.playShimmer();
          setShowBigHeart(true);
          if (!isLiked) handleToggleLike();
          setTimeout(() => setShowBigHeart(false), 900);
        } else {
          // Single Tap Navigation
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = clientX - rect.left;
          const width = rect.width;

          if (clickX < width * 0.35) {
            handlePrevStory();
          } else {
            handleNextStory();
          }
        }
        lastTapTime.current = now;
      }
    }
  }, [handleNextStory, handlePrevStory, handleNextUser, handlePrevUser, handleToggleLike, isLiked, navigate]);

  const handleSendDMReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !story) return;

    const message = replyText.trim();
    setReplyText("");
    triggerHaptic("medium");
    snackbar.success("Message sent! 🚀");

    try {
      await api.post(`/story/reply/${story._id}`, { message, text: message });
    } catch {
      snackbar.error("Failed to send message");
    }
  };

  const handleDeleteStory = () => {
    setShowOptionsMenu(false);
    setShowDeleteConfirmModal(true);
    setIsPaused(true);
  };

  const confirmDeleteStory = async () => {
    if (!story) return;
    setIsDeletingStory(true);
    try {
      const res = await api.delete(`/story/${story._id}`);
      if (res.data?.success) {
        dispatch(removeStoryFromReduxFeed({ storyId: story._id }));
        snackbar.success("Story deleted");
        setShowDeleteConfirmModal(false);

        if (storiesList.length > 1) {
          setFeed((prev) => {
            const next = [...prev];
            if (next[currentUserIndex]) {
              next[currentUserIndex].stories = next[currentUserIndex].stories.filter((s) => s._id !== story._id);
            }
            return next;
          });
          setCurrentStoryIndex((prev) => Math.max(0, prev - 1));
          setProgress(0);
        } else {
          navigate(-1);
        }
      }
    } catch {
      snackbar.error("Failed to delete story");
    } finally {
      setIsDeletingStory(false);
      setIsPaused(false);
    }
  };

  const handleSaveMedia = async () => {
    setShowOptionsMenu(false);
    if (!story?.media?.url) return;
    try {
      const a = document.createElement("a");
      a.href = story.media.url;
      a.download = `vybe_story_${story._id}.${story.mediaType === "video" ? "mp4" : "jpg"}`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      snackbar.success("Media download started! 📥");
    } catch {
      snackbar.error("Failed to save media");
    }
  };

  if (!story) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const isCloseFriends = story.visibleTo === "closeFriends";
  const timeAgo = moment(story.createdAt).fromNow(true);

  return (
    <div className="fixed inset-0 z-[500] bg-black sm:bg-zinc-950 flex items-center justify-center overflow-hidden select-none">
      {/* Desktop Chevron Controls */}
      <button
        type="button"
        onClick={handlePrevUser}
        disabled={currentUserIndex === 0}
        className="hidden md:flex absolute left-8 lg:left-16 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition cursor-pointer backdrop-blur-md"
        title="Previous Account"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={handleNextUser}
        disabled={currentUserIndex === feed.length - 1}
        className="hidden md:flex absolute right-8 lg:right-16 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition cursor-pointer backdrop-blur-md"
        title="Next Account"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main 9:16 Vertical Story Stage */}
      <div
        className="relative w-full h-full sm:max-w-[420px] sm:h-[92vh] sm:max-h-[860px] sm:rounded-[32px] overflow-hidden bg-black shadow-2xl flex flex-col justify-between"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* MEDIA STAGE */}
        <div className="absolute inset-0 z-0">
          <StoryMediaRenderer
            story={story}
            filter={story.filter || "none"}
            isPaused={isPaused || showViewers || showShareSheet || showHighlightModal || showOptionsMenu}
            isMuted={isMuted}
            mediaLoading={mediaLoading}
            onLoadedData={() => setMediaLoading(false)}
            onVideoEnd={handleNextStory}
            imgRef={imgRef}
          />
        </div>

        {/* INTERACTIVE STICKERS OVERLAY */}
        <StoryStickers
          stickers={story.stickers || []}
          storyId={story._id}
          currentUserId={userData?.user?._id}
          pollVotes={story.pollVotes || []}
        />

        {/* DOUBLE TAP GIANT HEART ANIMATION */}
        {showBigHeart && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <FaHeart className="w-28 h-28 text-white drop-shadow-[0_0_35px_rgba(255,48,64,0.95)] animate-double-tap-heart" />
          </div>
        )}

        {/* FLOATING EMOJI STREAM PARTICLES */}
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.startX}%` }}
            className="absolute bottom-20 z-40 text-3xl pointer-events-none animate-float-up"
          >
            {item.emoji}
          </div>
        ))}

        {/* TOP HUD (Progress bar + Author metadata) */}
        <div
          className={`relative z-30 p-4 pt-3 space-y-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-200 ${
            isHoldingState ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <StoryProgressBars
            storiesCount={storiesList.length}
            currentIndex={currentStoryIndex}
            progress={progress}
          />

          <StoryHeaderHUD
            author={story.author}
            isOwnStory={isOwnStory}
            isCloseFriends={isCloseFriends}
            timeAgo={timeAgo}
            music={story.music}
            isMuted={isMuted}
            isPaused={isPaused}
            onToggleMute={() => setIsMuted((m) => !m)}
            onTogglePause={() => setIsPaused((p) => !p)}
            onOpenOptions={() => setShowOptionsMenu(true)}
            onClose={() => navigate(-1)}
          />
        </div>

        {/* BOTTOM HUD (Viewer dock or Author dock) */}
        <div
          className={`relative z-30 p-4 pb-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-200 ${
            isHoldingState ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {isOwnStory ? (
            <StoryAuthorDock
              viewers={story.viewers || []}
              onOpenActivity={() => setShowViewers(true)}
              onOpenHighlight={() => setShowHighlightModal(true)}
            />
          ) : (
            <StoryViewerDock
              isLiked={isLiked}
              replyText={replyText}
              onReplyChange={setReplyText}
              onReplySubmit={handleSendDMReply}
              onReactEmoji={handleEmojiReaction}
              onToggleLike={handleToggleLike}
              onOpenShare={() => setShowShareSheet(true)}
            />
          )}
        </div>
      </div>

      {/* 3-DOTS OPTIONS SHEET MODAL */}
      {showOptionsMenu && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
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
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 text-red-500 font-semibold text-xs transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Story</span>
                </button>
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setShowHighlightModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white font-semibold text-xs transition cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>Add to Highlight</span>
                </button>
                <button
                  onClick={handleSaveMedia}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white font-semibold text-xs transition cursor-pointer"
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
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white font-semibold text-xs transition cursor-pointer"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>Mute @{story.author?.userName}</span>
                </button>
                <button
                  onClick={() => {
                    snackbar.success("Story reported to moderation team");
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 text-red-400 font-semibold text-xs transition cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Report Inappropriate Content</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowOptionsMenu(false)}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-xs font-bold text-white transition mt-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Story Viewers & Activity Drawer */}
      {showViewers && (
        <StoryViewersDrawer
          onClose={() => setShowViewers(false)}
          story={story}
          onDeleteStory={handleDeleteStory}
          onOpenHighlight={() => {
            setShowViewers(false);
            setShowHighlightModal(true);
          }}
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

      {/* Delete Story Confirmation Dialog */}
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

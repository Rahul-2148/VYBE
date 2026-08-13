import React, { useEffect, useRef, useState } from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import dp from "../assets/dp3.png";
import { useSelector, useDispatch } from "react-redux";
import { FiEye, FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { Send, Star, X, ChevronLeft, ChevronRight, Pause, Play, Loader2, Plus, Music } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/axios";
import { 
  removeStoryFromReduxFeed, 
  toggleStoryLikeInRedux, 
  markStoryAsViewedInRedux 
} from "../redux/features/storySlice";
import StoryVideoPlayer from "./StoryVideo";
import StoryStickers from "./StoryStickers";
import ShareSheet from "./ShareSheet";
import StoryHighlighterModal from "./StoryHighlighterModal";
import StoryViewersDrawer from "./StoryViewersDrawer";
import moment from "moment";
import { motion } from "framer-motion";

const STORY_IMAGE_DURATION = 8000; // 8 seconds per image (Instagram Standard)

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

  // Fallback feed structure for Highlights or single story lists passed in state
  const [feed, setFeed] = useState([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isHoldingState, setIsHoldingState] = useState(false);

  // Animated Floating Emoji State
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const imgRef = useRef(null);

  const startY = useRef(0);
  const startX = useRef(0);
  const deltaX = useRef(0);
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
    const idx = userGroup.stories.findIndex((s) => {
      const currentUserId = userData?.user?._id;
      return !s.viewers?.some(
        (v) => v === currentUserId || v?._id?.toString() === currentUserId
      );
    });
    return idx === -1 ? 0 : idx;
  };

  // Populate Feed and setup Initial Indices (Only once or on load)
  useEffect(() => {
    if (initialized) return;

    if (location.state?.stories && location.state.stories.length > 0) {
      const storiesList = location.state.stories;
      // Single Highlight mode
      setFeed([{
        author: storiesList[0]?.author || { userName: "Highlight" },
        stories: storiesList,
        isCurrentUser: storiesList[0]?.author?._id === userData?.user?._id
      }]);
      setCurrentUserIndex(0);
      setCurrentStoryIndex(0);
      setInitialized(true);
    } else if (reduxFeed && reduxFeed.length > 0) {
      // Normal Feed mode
      const activeFeed = reduxFeed;
      setFeed(activeFeed);
      const initialUserIdx = location.state?.initialUserIndex ?? 0;
      const startUserIdx = Math.min(Math.max(0, initialUserIdx), activeFeed.length - 1);
      
      setCurrentUserIndex(startUserIdx);
      if (activeFeed[startUserIdx]) {
        setCurrentStoryIndex(getFirstUnseenIndex(activeFeed[startUserIdx]));
      }
      setInitialized(true);
    }
  }, [location.state?.stories, reduxFeed, userData, initialized]);

  // Window Resize Listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeGroup = feed[currentUserIndex] || null;
  const storiesList = activeGroup?.stories || [];
  const story = storiesList[currentStoryIndex] || null;
  const isOwnStory =
    story?.author?._id === userData?.user?._id ||
    story?.author?.userName === userData?.user?.userName;

  // Sync Likes & handle cached image hit check
  useEffect(() => {
    if (story) {
      const currentUserId = userData?.user?._id;
      setIsLiked(story.likes?.some((id) => id === currentUserId || id._id === currentUserId));
      setLikesCount(story.likes?.length || 0);

      // Check if image is already loaded in browser cache
      if (story.mediaType === "image" && !story.caption && imgRef.current && imgRef.current.complete) {
        setMediaLoading(false);
      } else if (story.mediaType === "text" || (story.mediaType === "image" && story.caption)) {
        setMediaLoading(false);
      } else {
        setMediaLoading(true);
      }
    }
  }, [story, userData]);

  // Mark Story Viewed on Load
  useEffect(() => {
    if (!story?._id) return;
    api.post(`/story/view/${story._id}`)
      .then(() => {
        dispatch(markStoryAsViewedInRedux({ storyId: story._id, userId: userData?.user?._id }));
      })
      .catch(() => null);
  }, [story?._id, dispatch, userData]);

  // Story Music Playback Controller
  useEffect(() => {
    // Stop and clean up any existing audio if the story changes or unmounts
    if (storyAudioRef.current) {
      storyAudioRef.current.pause();
      storyAudioRef.current = null;
    }

    if (story?.music?.audioUrl) {
      const audio = new Audio(story.music.audioUrl);
      audio.loop = true;
      // Start playback from the custom trimmed start time (default 0)
      audio.currentTime = story.music.startTime || 0;
      storyAudioRef.current = audio;

      const shouldPlay =
        !isPaused &&
        !mediaLoading &&
        !showViewers &&
        !showShareSheet &&
        !showHighlightModal;

      if (shouldPlay) {
        audio.play().catch((err) => {
          console.warn("Audio play blocked by browser auto-play policy:", err.message);
        });
      }
    }

    return () => {
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
      }
    };
  }, [story?._id]);

  // Sync play/pause state when the user pauses or opens a modal
  useEffect(() => {
    if (storyAudioRef.current) {
      const shouldPlay =
        !isPaused &&
        !mediaLoading &&
        !showViewers &&
        !showShareSheet &&
        !showHighlightModal;

      if (shouldPlay) {
        storyAudioRef.current.play().catch(() => null);
      } else {
        storyAudioRef.current.pause();
      }
    }
  }, [isPaused, mediaLoading, showViewers, showShareSheet, showHighlightModal]);

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

  // Handle Tab visibility pauses
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Story Timer Progress
  useEffect(() => {
    setProgress(0);
    clearInterval(intervalRef.current);

    if ((story?.mediaType === "image" || story?.mediaType === "text" || story?.caption) && !mediaLoading) {
      intervalRef.current = setInterval(() => {
        if (!isPaused && !showViewers && !showShareSheet && !showHighlightModal) {
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
  }, [currentStoryIndex, currentUserIndex, isPaused, mediaLoading, story, showViewers, showShareSheet, showHighlightModal]);

  // Preload next story image
  useEffect(() => {
    const nextStory = storiesList[currentStoryIndex + 1];
    if (nextStory?.media?.url && nextStory?.mediaType === "image") {
      const img = new Image();
      img.src = nextStory.media.url;
    }
  }, [currentStoryIndex, storiesList]);

  // Handle tap boundaries for transitions
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
      deltaX.current = diffX;
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
      if (diffY > 100) {
        navigate(-1);
        return;
      }
      if (Math.abs(diffX) > 70) {
        if (diffX < 0) {
          handleNextUser();
        } else {
          handlePrevUser();
        }
      }
    } else {
      if (duration < 250) {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
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

        if (clickX < width * 0.30) {
          handlePrevStory();
        } else {
          handleNextStory();
        }
      }
    }
    deltaX.current = 0;
  };

  const handleToggleLike = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    spawnEmojiParticle("❤️");
    try {
      const res = await api.post(`/story/like/${story._id}`);
      if (res.data.success) {
        const nextLiked = res.data.isLiked !== undefined ? res.data.isLiked : !isLiked;
        setIsLiked(nextLiked);
        setLikesCount(res.data.likesCount || 0);
        dispatch(toggleStoryLikeInRedux({ storyId: story._id, userId: userData?.user?._id, isLiked: nextLiked }));
      }
    } catch (err) {
      toast.error("Failed to update story like.");
    }
  };

  const spawnEmojiParticle = (emoji) => {
    const id = Date.now() + Math.random();
    const randomX = Math.random() * 80 + 10;
    setFloatingEmojis((prev) => [...prev, { id, emoji, x: randomX }]);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 1800);
  };

  const handleEmojiReaction = async (emoji, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    spawnEmojiParticle(emoji);

    try {
      await api.post(`/story/react/${story._id}`, { emoji });
      toast.success(`Reacted ${emoji}`);
    } catch (err) {
      console.warn("Reaction sync warning:", err.message);
    }
  };

  const handleDeleteStory = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.confirm("Delete this story permanently?")) return;
    try {
      const res = await api.delete(`/story/${story._id}`);
      if (res.data.success) {
        toast.success("Story deleted");
        dispatch(removeStoryFromReduxFeed({ storyId: story._id }));
        handleNextStory();
      }
    } catch (err) {
      toast.error("Failed to delete story.");
    }
  };

  const handleSendDMReply = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!replyText.trim()) return;

    const msg = replyText.trim();
    setReplyText("");

    try {
      const res = await api.post(`/story/reply/${story._id}`, { text: msg });
      if (res.data.success) {
        toast.success("Reply sent via DM! 📩");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send DM reply.");
    }
  };

  // Helper to render individual story card in the carousel
  const renderStoryCard = (userGroup, isActive) => {
    if (!userGroup || !userGroup.stories || userGroup.stories.length === 0) return null;

    const idx = isActive ? currentStoryIndex : getFirstUnseenIndex(userGroup);
    const cardStory = userGroup.stories[idx] || userGroup.stories[0];
    if (!cardStory) return null;

    const isCF = cardStory.visibleTo === "closeFriends";

    const filterMap = {
      none: "",
      clarendon: "contrast-[1.20] saturate-[1.25] hue-rotate-[-5deg]",
      juno: "sepia-[0.20] contrast-[1.15] saturate-[1.30] hue-rotate-[10deg]",
      lark: "brightness-[1.10] contrast-[0.90] saturate-[0.95]",
      gingham: "brightness-[1.05] contrast-[0.85] sepia-[0.30] saturate-[0.85]",
      crema: "sepia-[0.45] contrast-[0.95] brightness-[1.05] saturate-[0.90]",
      aden: "hue-rotate-[-10deg] saturate-[0.85] contrast-[0.90] brightness-[1.15] sepia-[0.20]",
      ludwig: "contrast-[1.05] saturate-[0.95] sepia-[0.10]",
      slumber: "saturate-[0.60] sepia-[0.40] contrast-[0.80] brightness-[1.00]",
      reyes: "sepia-[0.35] brightness-[1.10] contrast-[0.85] saturate-[0.75]",
      moon: "grayscale-[1.0] contrast-[1.10] brightness-[1.10]",
    };
    const filterClass = filterMap[cardStory.filter] || "";

    return (
      <div
        onPointerDown={isActive ? handlePointerDown : undefined}
        onPointerMove={isActive ? handlePointerMove : undefined}
        onPointerUp={isActive ? handlePointerUp : undefined}
        className="relative w-full h-full select-none overflow-hidden sm:rounded-2xl flex flex-col justify-between bg-[#121212]"
      >
        {/* Loading Spinner */}
        {isActive && mediaLoading && cardStory.mediaType === "image" && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-inset z-20">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        )}

        {/* Media Content */}
        {cardStory.mediaType === "image" && !cardStory.caption && (
          <img
            ref={imgRef}
            src={cardStory.media?.url}
            onLoad={() => setMediaLoading(false)}
            className={`w-full h-full object-cover pointer-events-none ${filterClass}`}
            alt=""
          />
        )}

        {(cardStory.mediaType === "text" || (cardStory.mediaType === "image" && cardStory.caption)) && (
          <div
            className={`w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-tr ${
              cardStory.filter && cardStory.filter.startsWith("from-")
                ? cardStory.filter
                : "from-purple-600 via-pink-600 to-rose-500"
            } text-center select-none`}
            style={{ minHeight: "100%" }}
          >
            <p
              className={`text-3xl sm:text-4xl font-extrabold text-white max-w-[90%] whitespace-pre-wrap leading-snug drop-shadow-lg ${
                cardStory.location || "font-sans"
              }`}
            >
              {cardStory.caption || "VYBE Story"}
            </p>
          </div>
        )}

        {cardStory.mediaType === "video" && (
          <div className={`w-full h-full ${filterClass}`}>
            <StoryVideoPlayer
              media={cardStory.media?.url}
              isPaused={!isActive || isPaused || showViewers || showShareSheet || showHighlightModal}
              onProgress={isActive ? (p) => setProgress(p) : undefined}
              onEnd={isActive ? handleNextStory : undefined}
            />
          </div>
        )}

        {/* Stickers Overlay */}
        <div className={isActive ? "pointer-events-auto z-30" : "pointer-events-none opacity-80 z-30"}>
          <StoryStickers
            stickers={cardStory.stickers}
            storyId={cardStory._id}
            isOwner={isActive && isOwnStory}
            currentUserId={userData?.user?._id}
            pollVotes={cardStory.pollVotes}
            quizAnswers={cardStory.quizAnswers}
          />
        </div>

        {/* Shared Reel / Post Interactive Overlay Badges - Clean Instagram Style */}
        {cardStory.sharedEntity && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (cardStory.sharedEntity.entityType === "reel") {
                navigate(`/loop/${cardStory.sharedEntity.entityId}`);
              } else if (cardStory.sharedEntity.entityType === "post") {
                navigate(`/post/${cardStory.sharedEntity.entityId}`);
              }
            }}
            className="interactive-control cursor-pointer"
          >
            {/* Top Left Author Pill */}
            <div className="absolute top-14 left-4 z-35 flex items-center gap-2 bg-black/65 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95">
              <img
                src={cardStory.sharedEntity.authorAvatar || dp}
                alt=""
                className="w-6 h-6 rounded-full object-cover border border-white/40"
              />
              <span className="text-xs font-bold text-white tracking-tight">
                @{cardStory.sharedEntity.authorName || "user"}
              </span>
            </div>

            {/* Bottom Watch Reel Pill */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-35 flex items-center gap-1.5 bg-black/65 backdrop-blur-md border border-white/25 px-4 py-1.5 rounded-full shadow-xl text-xs font-bold text-white hover:scale-105 transition-transform active:scale-95">
              <span>Watch Reel</span>
              <span className="text-rose-400 font-extrabold">&rarr;</span>
            </div>
          </div>
        )}

        {/* Header Control overlay */}
        {isActive ? (
          <div className={`interactive-control absolute top-0 inset-x-0 p-3.5 bg-gradient-to-b from-black/90 via-black/45 to-transparent z-40 space-y-2.5 transition-opacity duration-200 ${
            isHoldingState ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          }`}>
            {/* Progress Segment Bars */}
            <div className="flex gap-1.5 px-0.5">
              {userGroup.stories.map((_, i) => (
                <div key={i} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-card transition-all duration-100 ease-linear"
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

            {/* Author details */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(-1);
                  }}
                  className="interactive-control text-white p-1 hover:bg-white/10 rounded-full sm:hidden cursor-pointer"
                >
                  <MdOutlineKeyboardBackspace className="w-6 h-6" />
                </button>

                <div className={`relative p-0.5 rounded-full ${
                  isCF
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-400"
                    : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                }`}>
                  <img
                    src={cardStory.author?.profileImage?.url || dp}
                    className="w-8 h-8 rounded-full object-cover bg-bg"
                    alt=""
                  />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-bold">{cardStory.author?.userName}</span>
                    <span className="text-[10px] text-white/60 font-normal">
                      • {cardStory.createdAt ? moment(cardStory.createdAt).fromNow(true) : "now"}
                    </span>
                    {isActive && isOwnStory && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate("/upload?type=story");
                        }}
                        className="interactive-control ml-1.5 p-0.5 bg-white/15 hover:bg-white/25 text-white rounded-full transition cursor-pointer hover:scale-105 active:scale-95"
                        title="Add segment to story"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    {isCF && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 text-text-inverse text-[9px] font-black rounded-md uppercase tracking-wider">
                        <Star className="w-2.5 h-2.5 fill-black" /> Close Friends
                      </span>
                    )}
                  </div>

                  {cardStory.music && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/audio/${encodeURIComponent(cardStory.music.title || "Original Audio")}`);
                      }}
                      className="interactive-control text-[9px] font-black text-white bg-black/35 hover:bg-black/45 px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1 truncate max-w-[170px] cursor-pointer mt-1 shadow-sm transition hover:scale-105 active:scale-95"
                    >
                      <Music className="w-2.5 h-2.5 text-white animate-pulse" />
                      <span className="truncate">{cardStory.music.title || "Original Audio"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Pause button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsPaused(!isPaused);
                  }}
                  className="interactive-control p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Simplified Header for previewing flanking user's story */
          <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/85 to-transparent z-40 flex items-center gap-2.5">
            <div className={`relative p-0.5 rounded-full ${
              isCF
                ? "bg-gradient-to-tr from-emerald-500 to-teal-400"
                : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
            }`}>
              <img
                src={cardStory.author?.profileImage?.url || dp}
                className="w-6 h-6 rounded-full object-cover bg-bg"
                alt=""
              />
            </div>
            <span className="text-white text-xs font-bold shadow-sm">{cardStory.author?.userName}</span>
          </div>
        )}

        {/* Quick Emojis & reply bar for active user story */}
        {isActive && !isOwnStory && (
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={`interactive-control absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/55 to-transparent z-40 flex flex-col gap-3 transition-opacity duration-200 ${
              isHoldingState ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
            }`}
          >
            {/* Quick Reactions */}
            <div className="flex items-center justify-around px-2">
              {["❤️", "😂", "🔥", "😭", "👏", "😮"].map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleEmojiReaction(emoji, e)}
                  className="interactive-control text-2xl hover:scale-125 transition transform active:scale-90 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Message input */}
            <form onSubmit={handleSendDMReply} className="interactive-control flex items-center gap-2">
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  placeholder={`Send message to ${cardStory.author?.userName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  className="interactive-control w-full pl-4 pr-10 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/50 outline-none focus:border-white/50"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleLike}
                className="interactive-control p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                {isLiked ? <FaHeart className="w-5 h-5 text-rose-500" /> : <FiHeart className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowShareSheet(true);
                }}
                className="interactive-control p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Share Story"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>
        )}

        {/* Viewers & actions footer for active user's own story */}
        {isActive && isOwnStory && (
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="interactive-control absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-40 flex items-center justify-between text-white pointer-events-auto"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowViewers(true);
              }}
              className="interactive-control flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-xs font-semibold text-white cursor-pointer"
            >
              <FiEye className="w-4 h-4 text-purple-400" />
              <span>{cardStory.viewers?.length || 0} Viewers</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAllCards = () => {
    return feed.map((userGroup, index) => {
      const diff = index - currentUserIndex;
      if (Math.abs(diff) > 1) return null; // Only render active and adjacent users

      // Hide adjacent preview cards completely on mobile viewport
      if (windowWidth < 640 && diff !== 0) return null;

      let xOffset = 0;
      let rotateY = 0;
      let scale = 1;
      let opacity = 1;
      let zIndex = 10;

      if (diff === -1) {
        xOffset = -330;
        rotateY = 32;
        scale = 0.78;
        opacity = 0.35;
        zIndex = 5;
      } else if (diff === 1) {
        xOffset = 330;
        rotateY = -32;
        scale = 0.78;
        opacity = 0.35;
        zIndex = 5;
      }

      return (
        <motion.div
          key={userGroup.author?._id || index}
          className="absolute w-full sm:w-[400px] h-full sm:h-[720px] sm:max-h-[92vh] sm:rounded-2xl border border-border/50 shadow-2xl flex flex-col justify-between overflow-hidden"
          animate={{
            x: `calc(-50% + ${xOffset}px)`,
            scale,
            rotateY,
            opacity,
          }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          style={{
            transformStyle: "preserve-3d",
            zIndex,
            left: "50%",
            transform: "translateX(-50%)",
          }}
          onClick={(e) => {
            if (diff === -1) {
              e.stopPropagation();
              handlePrevUser();
            } else if (diff === 1) {
              e.stopPropagation();
              handleNextUser();
            }
          }}
        >
          {renderStoryCard(userGroup, diff === 0)}
        </motion.div>
      );
    });
  };

  if (!feed.length || !story) return null;

  return (
    <div
      className="fixed inset-0 bg-[#060606]/98 backdrop-blur-3xl flex justify-center items-center select-none z-[300] overflow-hidden"
      style={{ perspective: "2000px" }}
    >
      {/* Inline styles for Premium Animations */}
      <style>{`
        @keyframes story-emoji-float {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          15% {
            transform: translateY(-50px) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translateY(-450px) scale(0.8) rotate(15deg);
            opacity: 0;
          }
        }
        .animate-story-emoji-float {
          animation: story-emoji-float 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        @keyframes scale-heart {
          0% { transform: scale(0); opacity: 0; }
          15% { transform: scale(1.2); opacity: 1; }
          30% { transform: scale(1); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
        .animate-scale-heart {
          animation: scale-heart 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* Top Right Exit X Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigate(-1);
        }}
        className="interactive-control absolute top-5 right-6 z-[350] p-2.5 rounded-full bg-surface/90 hover:bg-surface-hover text-text hover:text-text transition shadow-xl cursor-pointer"
        title="Exit Story Viewer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Desktop navigation helper buttons */}
      {(currentUserIndex > 0 || currentStoryIndex > 0) && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePrevStory();
          }}
          className="interactive-control hidden md:flex absolute left-8 z-[350] p-3 rounded-full bg-surface/80 hover:bg-surface-hover text-text hover:text-text transition shadow-2xl cursor-pointer hover:scale-110 active:scale-95"
          title="Previous Segment"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {(currentUserIndex < feed.length - 1 || currentStoryIndex < storiesList.length - 1) && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNextStory();
          }}
          className="interactive-control hidden md:flex absolute right-8 z-[350] p-3 rounded-full bg-surface/80 hover:bg-surface-hover text-text hover:text-text transition shadow-2xl cursor-pointer hover:scale-110 active:scale-95"
          title="Next Segment"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Floating Emoji Particles Layer */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.x}%` }}
            className="absolute bottom-20 text-4xl animate-story-emoji-float pointer-events-none"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Double Tap Pulse Heart */}
      {showBigHeart && (
        <div className="absolute z-[320] flex items-center justify-center inset-0 pointer-events-none">
          <FaHeart className="w-28 h-28 text-rose-500 drop-shadow-[0_0_35px_rgba(244,63,94,0.8)] animate-scale-heart" />
        </div>
      )}

      {/* Horizontal Carousel Track */}
      <div className="relative w-full max-w-[1200px] h-full flex justify-center items-center">
        {renderAllCards()}
      </div>

      {/* DRAWER & DIALOG MODALS OVERLAYS */}
      {showViewers && (
        <div onClick={(e) => e.stopPropagation()} className="z-[360]">
          <StoryViewersDrawer
            viewers={story?.viewers}
            onClose={() => setShowViewers(false)}
            onOpenHighlight={() => setShowHighlightModal(true)}
            onDeleteStory={handleDeleteStory}
          />
        </div>
      )}

      {showShareSheet && (
        <div onClick={(e) => e.stopPropagation()} className="z-[360]">
          <ShareSheet
            open={showShareSheet}
            entity={{
              _id: story._id,
              author: story.author,
              media: story.media,
              caption: story.caption || "Check out this story!",
            }}
            entityType="story"
            onClose={() => setShowShareSheet(false)}
          />
        </div>
      )}

      {showHighlightModal && (
        <div onClick={(e) => e.stopPropagation()} className="z-[360]">
          <StoryHighlighterModal
            storyId={story._id}
            onClose={() => setShowHighlightModal(false)}
          />
        </div>
      )}
    </div>
  );
};

export default StoryCard;

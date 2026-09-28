import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Eye,
  Send,
  Bookmark,
  BookmarkCheck,
  Repeat,
  Disc,
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  Pause,
  Zap,
  Trash2,
  MoreVertical,
  MoreHorizontal,
  Loader2,
  MapPin,
  Maximize2,
  Lock,
  Unlock,
  ChevronDown,
  FastForward,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { snackbar } from "../lib/snackbar";
import { GoHeart, GoHeartFill } from "react-icons/go";
import { MdOutlineComment } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import { setReelData, setReelsMuted, setIsModalOpen } from "../redux/features/reelSlice";
import { setUserData } from "../redux/features/userSlice";
import FollowButton from "./FollowButton";
import ShareSheet from "./ShareSheet";
import RemixReelModal from "./RemixReelModal";
import ReelReshareModal from "./ReelReshareModal";
import HeartExplosion from "./HeartExplosion";
import ReelOptionsModal from "./ReelOptionsModal";
import AIInfoModal from "./AIInfoModal";
import LikersModal from "./LikersModal";
import CommentsModal from "./CommentsModal";
import CollectionsModal from "./CollectionsModal";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import { getOptimizedMediaUrl } from "../lib/mediaQualitySettings";
import api from "../lib/axios";
import VerifiedBadge from "./VerifiedBadge";
import { getSocket } from "../lib/socket";

export const ReelCard = ({
  reel,
  isActive = true,
  onNext,
  onPrev,
  autoScroll = false,
  onToggleAutoScroll,
}) => {
  const currentItem = reel;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const reelState = useSelector((state) => state.reel);
  const reelData = reelState?.reelData || [];
  const isMuted = useSelector((state) => state.reel?.isMuted ?? false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const viewCountedRef = useRef(false);
  const endedTriggeredRef = useRef(false);
  const tapTimerRef = useRef(null);
  const pressTimerRef = useRef(null);
  const hasFastForwardedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showVolumeAnim, setShowVolumeAnim] = useState(false);

  // Attached Audio Track URL
  const attachedAudioUrl =
    currentItem?.audioTrack?.audioUrl ||
    (typeof currentItem?.music === "object" ? currentItem?.music?.audioUrl || currentItem?.music?.url : null);

  // Options & Auto-Scroll & Captions State
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [applySpeedToAll, setApplySpeedToAll] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("vybe_reels_speed_apply_all") === "true";
    }
    return false;
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const applyAll = localStorage.getItem("vybe_reels_speed_apply_all") === "true";
      if (applyAll) {
        const savedSpeed = parseFloat(localStorage.getItem("vybe_reels_global_speed"));
        if (!isNaN(savedSpeed) && savedSpeed > 0) return savedSpeed;
      }
    }
    return 1.0;
  });
  const [showCaptions, setShowCaptions] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("vybe_reel_captions");
      return stored === "true"; // Default OFF for reels unless user explicitly enabled it
    }
    return false;
  });
  const [commentsDisabled, setCommentsDisabled] = useState(
    Boolean(currentItem?.commentsDisabled)
  );

  // Real-Time Audio Transcript & Live Captions
  const [reelCaptions, setReelCaptions] = useState(currentItem?.captions || []);
  const [syncedSubtitle, setSyncedSubtitle] = useState({ text: "", activeIndex: -1, words: [], hasContent: false });
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  
  // Heart Burst & Play/Pause Animation State
  const [showHeart, setShowHeart] = useState(false);
  const [showPlayPauseAnim, setShowPlayPauseAnim] = useState(false);

  // Long Press 2X Speed & Slide-to-Lock State
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [is2XLocked, setIs2XLocked] = useState(false);
  const [isNearLockZone, setIsNearLockZone] = useState(false);
  const [isNearUnlockZone, setIsNearUnlockZone] = useState(false);
  const [speedSnackbar, setSpeedSnackbar] = useState(null); // { text, icon, key }
  const speedSnackbarTimerRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchStartXRef = useRef(null);
  const hasMovedRef = useRef(false);
  const unlockGestureActiveRef = useRef(false);
  const mainCardRef = useRef(null);

  // Tap Gesture Counters (Single, Double, Triple Tap)
  const tapCountRef = useRef(0);

  // Drawers & Modals
  const [showComments, setShowComments] = useState(false);
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReshareModal, setShowReshareModal] = useState(false);
  const [showRemixModal, setShowRemixModal] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const dwellStartRef = useRef(null);
  const [showAIInfoModal, setShowAIInfoModal] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const playFadeTimeoutRef = useRef(null);
  const seekBarRef = useRef(null);
  const viewersRef = useRef(null);

  // Playback Rate Sync Effect
  useEffect(() => {
    const activeRate = (isFastForwarding || is2XLocked) ? 2.0 : (playbackSpeed || 1.0);
    if (videoRef.current) {
      videoRef.current.playbackRate = activeRate;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = activeRate;
    }
  }, [playbackSpeed, isFastForwarding, is2XLocked]);

  // Sync speed on new reel navigation
  useEffect(() => {
    if (!currentItem?._id) return;
    let timer;
    if (typeof localStorage !== "undefined") {
      const applyAll = localStorage.getItem("vybe_reels_speed_apply_all") === "true";
      if (applyAll) {
        const savedSpeed = parseFloat(localStorage.getItem("vybe_reels_global_speed"));
        if (!isNaN(savedSpeed) && savedSpeed > 0) {
          timer = setTimeout(() => setPlaybackSpeed(savedSpeed), 0);
          if (videoRef.current) videoRef.current.playbackRate = savedSpeed;
          if (audioRef.current) audioRef.current.playbackRate = savedSpeed;
          return () => clearTimeout(timer);
        }
      }
    }
    // If not applied to all reels, reset to 1.0x on every new reel
    timer = setTimeout(() => setPlaybackSpeed(1.0), 0);
    if (videoRef.current) videoRef.current.playbackRate = 1.0;
    if (audioRef.current) audioRef.current.playbackRate = 1.0;
    return () => clearTimeout(timer);
  }, [currentItem?._id]);

  const handleChangePlaybackSpeed = (newSpeed) => {
    setPlaybackSpeed(newSpeed);
    if (applySpeedToAll) {
      localStorage.setItem("vybe_reels_global_speed", newSpeed.toString());
      window.__vybe_reels_global_speed = newSpeed;
    }
    if (videoRef.current && !isFastForwarding && !is2XLocked) {
      videoRef.current.playbackRate = newSpeed;
    }
    if (audioRef.current && !isFastForwarding && !is2XLocked) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleToggleApplySpeedToAll = (enabled) => {
    setApplySpeedToAll(enabled);
    localStorage.setItem("vybe_reels_speed_apply_all", enabled ? "true" : "false");
    if (enabled) {
      localStorage.setItem("vybe_reels_global_speed", playbackSpeed.toString());
      window.__vybe_reels_global_speed = playbackSpeed;
    }
  };

  const isAnyModalOpen = Boolean(
    showComments ||
    showViewers ||
    showLikersModal ||
    showOptionsModal ||
    showReshareModal ||
    showShare ||
    showRemixModal ||
    showDeleteModal ||
    showAIInfoModal
  );

  useEffect(() => {
    if (isActive) {
      dispatch(setIsModalOpen(isAnyModalOpen));
    }
    return () => {
      if (isActive && isAnyModalOpen) {
        dispatch(setIsModalOpen(false));
      }
    };
  }, [isAnyModalOpen, isActive, dispatch]);

  const handleCloseAllModals = () => {
    setShowComments(false);
    setCommentsExpanded(false);
    setShowViewers(false);
    setShowLikersModal(false);
    setShowOptionsModal(false);
    setShowReshareModal(false);
    setShowShare(false);
    setShowRemixModal(false);
    setShowDeleteModal(false);
    setShowAIInfoModal(false);
  };

  // Optimistic Like & Author State
  const currentUserId = (userData?._id || userData?.user?._id)?.toString();
  const followingList = useMemo(
    () => userData?.user?.following || userData?.following || [],
    [userData?.user?.following, userData?.following]
  );
  const followingIds = useMemo(() => {
    return new Set(followingList.map((f) => (f?._id || f)?.toString()));
  }, [followingList]);
  const authorId = (currentItem?.author?._id || currentItem?.author)?.toString();
  const isAuthor = Boolean(currentUserId && authorId && currentUserId === authorId);
  const isInitiallyLiked = Boolean(
    currentUserId &&
    currentItem?.likes?.some((id) => (id?._id || id)?.toString() === currentUserId)
  );
  const [isLiked, setIsLiked] = useState(isInitiallyLiked);
  const [likesCount, setLikesCount] = useState(currentItem?.likes?.length || 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLiked(
        Boolean(
          currentUserId &&
          currentItem?.likes?.some((id) => (id?._id || id)?.toString() === currentUserId)
        )
      );
      setLikesCount(currentItem?.likes?.length || 0);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentItem, currentUserId]);

  const reelRef = useRef(currentItem);
  const reelDataRef = useRef(reelData);

  useEffect(() => {
    reelRef.current = currentItem;
    reelDataRef.current = reelData;
  });

  // Realtime Socket Sync for Likes & Comments
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentItem?._id) return;

    const handleSocketLike = (data) => {
      const activeReel = reelRef.current;
      const activeReelData = reelDataRef.current;
      if (data.reelId === activeReel?._id) {
        let updatedLikes = [...(activeReel.likes || [])];
        const hasUser = updatedLikes.some((id) => (id._id || id) === data.userId);
        if (data.isLiked && !hasUser) {
          updatedLikes.push({ _id: data.userId });
        } else if (!data.isLiked && hasUser) {
          updatedLikes = updatedLikes.filter((id) => (id._id || id) !== data.userId);
        }

        const updatedReel = { ...activeReel, likes: updatedLikes };
        const updatedReels = activeReelData?.map((r) => (r._id === activeReel._id ? updatedReel : r));
        dispatch(setReelData(updatedReels));
      }
    };

    const handleSocketComment = (data) => {
      const activeReel = reelRef.current;
      const activeReelData = reelDataRef.current;
      if (data.reelId === activeReel?._id && data.comment) {
        const updatedComments = [...(activeReel.comments || []), data.comment];
        const updatedReel = { ...activeReel, comments: updatedComments };
        const updatedReels = activeReelData?.map((r) => (r._id === activeReel._id ? updatedReel : r));
        dispatch(setReelData(updatedReels));
      }
    };

    socket.on("reel-like-updated", handleSocketLike);
    socket.on("reel-comment-updated", handleSocketComment);

    return () => {
      socket.off("reel-like-updated", handleSocketLike);
      socket.off("reel-comment-updated", handleSocketComment);
    };
  }, [currentItem?._id, dispatch]);

  const incrementView = useCallback(async () => {
    if (viewCountedRef.current || !currentItem?._id) return;
    viewCountedRef.current = true;
    try {
      await api.post(`/reel/view/${currentItem._id}`);
    } catch {
      /* ignore view count error */
    }
  }, [currentItem]);

  const handlePlay = () => {
    if (!isActive) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    setIsPlaying(true);
    if (audioRef.current && attachedAudioUrl) {
      audioRef.current.currentTime = videoRef.current?.currentTime || 0;
      audioRef.current.play().catch(() => null);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleTogglePlayPause = () => {
    if (!videoRef.current) return;
    triggerHaptic("light");

    // Show brief transient pulse animation on every toggle
    setShowPlayPauseAnim(true);
    if (playFadeTimeoutRef.current) clearTimeout(playFadeTimeoutRef.current);
    playFadeTimeoutRef.current = setTimeout(() => {
      setShowPlayPauseAnim(false);
    }, 550);

    if (isPlaying) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => null);
      if (audioRef.current && attachedAudioUrl) {
        audioRef.current.currentTime = videoRef.current.currentTime || 0;
        audioRef.current.play().catch(() => null);
      }
      setIsPlaying(true);
    }
  };

  const handleSeek = (clientX) => {
    if (!seekBarRef.current || !videoRef.current || !videoRef.current.duration) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const newTime = pos * videoRef.current.duration;
    setProgress(pos * 100);
    setScrubTime(newTime);
    videoRef.current.currentTime = newTime;
    if (audioRef.current && attachedAudioUrl) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSeekStart = (clientX) => {
    setIsScrubbing(true);
    triggerHaptic("selection");
    handleSeek(clientX);

    const onPointerMove = (moveEvent) => {
      const moveX =
        moveEvent.clientX !== undefined
          ? moveEvent.clientX
          : moveEvent.touches && moveEvent.touches[0]
          ? moveEvent.touches[0].clientX
          : 0;
      handleSeek(moveX);
    };

    const onPointerUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("touchcancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("touchcancel", onPointerUp);
  };

  const handleConfirmDeleteReel = async () => {
    try {
      setDeleteLoading(true);
      triggerHaptic("heavy");
      const res = await api.delete(`/reel/delete/${currentItem._id}`);
      snackbar.success(res.data?.message || "Reel deleted successfully");
      setShowDeleteModal(false);
      setShowOptionsModal(false);
      const updatedReels = reelData.filter((r) => r._id !== currentItem._id);
      dispatch(setReelData(updatedReels));
      if (onNext) onNext();
    } catch (err) {
      snackbar.error(err?.response?.data?.message || "Failed to delete reel");
    } finally {
      setDeleteLoading(false);
    }
  };

  const _handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen fallback
    }
  };

  const renderCaptionWithLinks = (text) => {
    if (!text) return null;
    const tokens = text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_.]+)/g);
    return tokens.map((token, i) => {
      if (token.startsWith("#")) {
        const tag = token.slice(1);
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/explore/hashtag/${tag}`);
            }}
            className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer hover:underline"
          >
            {token}{" "}
          </span>
        );
      }
      if (token.startsWith("@")) {
        const username = token.slice(1);
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${username}`);
            }}
            className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer hover:underline"
          >
            {token}{" "}
          </span>
        );
      }
      return token;
    });
  };

  const toggleMute = useCallback((e) => {
    if (e) e.stopPropagation?.();
    const nextMuted = !isMuted;
    dispatch(setReelsMuted(nextMuted));
    if (videoRef.current) videoRef.current.muted = nextMuted;
    if (audioRef.current) audioRef.current.muted = nextMuted;
    triggerHaptic("light");
    setShowVolumeAnim(true);
    setTimeout(() => setShowVolumeAnim(false), 650);
  }, [dispatch, isMuted]);

  // Sync muted property whenever global isMuted changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Video Playing / Muting / Audio attachment Effects & Behavioral Dwell Tracking
  useEffect(() => {
    let isCancelled = false;

    const videoEl = videoRef.current;
    const audioEl = audioRef.current;

    if (isActive) {
      dwellStartRef.current = Date.now();
      incrementView();
      if (videoEl) {
        videoEl.muted = isMuted;
        videoEl.playbackRate = 1.0;
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (!isCancelled) {
                setIsPlaying((prev) => (!prev ? true : prev));
              }
            })
            .catch(() => {
              if (!isCancelled) {
                setIsPlaying((prev) => (prev ? false : prev));
              }
            });
        }
      }

      if (attachedAudioUrl && audioEl) {
        audioEl.muted = isMuted;
        audioEl.currentTime = videoEl?.currentTime || 0;
        audioEl.play().catch(() => null);
      }
    } else {
      if (videoEl) {
        videoEl.pause();
      }
      if (audioEl) {
        audioEl.pause();
      }
      const resetTimer = setTimeout(() => {
        setIsPlaying(false);
        setIsFastForwarding(false);
        setIs2XLocked(false);
        setIsNearLockZone(false);
        setIsNearUnlockZone(false);
        setSpeedSnackbar(null);
      }, 0);

      if (dwellStartRef.current && currentItem?._id) {
        const dwellMs = Date.now() - dwellStartRef.current;
        dwellStartRef.current = null;
        if (dwellMs >= 1500) {
          api.post("/user/dwell-track", {
            entityType: "reel",
            entityId: currentItem._id,
            text: currentItem.caption || "",
            hashtags: currentItem.hashtags || [],
            location: currentItem.location || "",
            category: currentItem.category || "",
            dwellMs,
          }).catch(() => null);
        }
      }

      return () => {
        isCancelled = true;
        clearTimeout(resetTimer);
        if (videoEl) {
          videoEl.pause();
        }
        if (audioEl) {
          audioEl.pause();
        }
      };
    }

    return () => {
      isCancelled = true;
      if (videoEl) {
        videoEl.pause();
      }
      if (audioEl) {
        audioEl.pause();
      }
      if (dwellStartRef.current && currentItem?._id) {
        const dwellMs = Date.now() - dwellStartRef.current;
        dwellStartRef.current = null;
        if (dwellMs >= 1500) {
          api.post("/user/dwell-track", {
            entityType: "reel",
            entityId: currentItem._id,
            text: currentItem.caption || "",
            hashtags: currentItem.hashtags || [],
            location: currentItem.location || "",
            category: currentItem.category || "",
            dwellMs,
          }).catch(() => null);
        }
      }
    };
  }, [isActive, isMuted, attachedAudioUrl, currentItem?._id, currentItem?.caption, currentItem?.hashtags, currentItem?.location, currentItem?.category, incrementView]);

  useEffect(() => {
    if (currentItem && userData?.user) {
      const saved = Boolean(
        (userData.user.savedReels || [])?.includes(currentItem._id) ||
        currentItem.savedBy?.includes(userData.user._id)
      );
      if (saved !== isSaved) {
        const timer = setTimeout(() => setIsSaved(saved), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [currentItem, userData, isSaved]);

  // Auto-Fetch Real-Time Timed Captions for Current Reel Audio
  useEffect(() => {
    if (isActive && showCaptions && currentItem?._id) {
      if (!reelCaptions || reelCaptions.length === 0) {
        api.get(`/reel/transcript/${currentItem._id}`)
          .then((res) => {
            if (res.data?.captions && Array.isArray(res.data.captions) && res.data.captions.length > 0) {
              setReelCaptions(res.data.captions);
            }
          })
          .catch(() => {});
      }
    }
  }, [isActive, showCaptions, currentItem?._id, reelCaptions]);

  useEffect(() => {
    const handleGlobalCaptionsChange = (e) => {
      if (e.detail && typeof e.detail.enabled === "boolean") {
        setShowCaptions(e.detail.enabled);
      }
    };
    window.addEventListener("vybe_captions_change", handleGlobalCaptionsChange);
    return () => {
      window.removeEventListener("vybe_captions_change", handleGlobalCaptionsChange);
    };
  }, []);

  // Non-passive touch listener to prevent feed scroll during 2X holding or slide-to-unlock gesture
  useEffect(() => {
    const el = mainCardRef.current;
    if (!el) return;

    let startY = 0;

    const handleTouchStartNative = (e) => {
      startY = e.touches[0]?.clientY || 0;
    };

    const handleTouchMoveNative = (e) => {
      const currentY = e.touches[0]?.clientY || 0;
      const deltaY = currentY - startY;

      // While holding for 2X (fast forwarding), prevent page scroll so slide-down-to-lock works
      if (isFastForwarding) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // While 2X is locked, only prevent page scroll if sliding DOWN to unlock (deltaY > 8)
      // Allow swipe UP (deltaY < -8) so user can still scroll to next reel!
      if (is2XLocked && deltaY > 8) {
        if (e.cancelable) e.preventDefault();
      }
    };

    el.addEventListener("touchstart", handleTouchStartNative, { passive: true });
    el.addEventListener("touchmove", handleTouchMoveNative, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStartNative);
      el.removeEventListener("touchmove", handleTouchMoveNative);
    };
  }, [isFastForwarding, is2XLocked]);

  const handleToggleCaptions = () => {
    setShowCaptions((prev) => {
      const next = !prev;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("vybe_reel_captions", String(next));
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vybe_captions_change", { detail: { enabled: next } }));
      }
      triggerHaptic("light");
      return next;
    });
  };

  const handleToggleComments = async () => {
    try {
      const res = await api.patch(`/reel/toggle-comments/${currentItem?._id}`);
      const nextState = res.data.commentsDisabled;
      setCommentsDisabled(nextState);
      snackbar.success(res.data.message);
      const updated = { ...currentItem, commentsDisabled: nextState };
      const updatedReels = reelData.map((r) => (r._id === currentItem._id ? updated : r));
      dispatch(setReelData(updatedReels));
    } catch {
      snackbar.error("Failed to update commenting settings");
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      setDuration(video.duration);
      if (!isScrubbing) {
        const percent = (video.currentTime / video.duration) * 100;
        setProgress(percent);
        setScrubTime(video.currentTime);
      }

      // Sync audio track if drift exceeds 0.35s
      if (audioRef.current && attachedAudioUrl && !audioRef.current.paused && !isScrubbing) {
        if (Math.abs(audioRef.current.currentTime - video.currentTime) > 0.35) {
          audioRef.current.currentTime = video.currentTime;
        }
      }

      // Real-time Audio Transcript & Dynamic Karaoke Subtitles sync
      if (showCaptions) {
        const activeCaptionsList = (reelCaptions && reelCaptions.length > 0) ? reelCaptions : currentItem?.captions;

        // 1. Timed captions array [{ start, end, text }]
        if (Array.isArray(activeCaptionsList) && activeCaptionsList.length > 0) {
          const activeCaption = activeCaptionsList.find(
            (c) => video.currentTime >= (c.start || 0) && video.currentTime <= (c.end || video.duration)
          );
          if (activeCaption && activeCaption.text) {
            const words = activeCaption.text.split(/\s+/).filter(Boolean);
            const segDuration = Math.max(0.2, (activeCaption.end || video.currentTime) - (activeCaption.start || 0));
            const segProgress = Math.min(1, Math.max(0, (video.currentTime - (activeCaption.start || 0)) / segDuration));
            const activeWordIdx = Math.min(words.length - 1, Math.floor(segProgress * words.length));
            setSyncedSubtitle({
              text: activeCaption.text,
              words,
              activeIndex: activeWordIdx,
              hasContent: true,
            });
          } else {
            // Find current fractional segment
            const fallbackCap = activeCaptionsList[Math.min(activeCaptionsList.length - 1, Math.floor((video.currentTime / (video.duration || 15)) * activeCaptionsList.length))];
            if (fallbackCap && fallbackCap.text) {
              const words = fallbackCap.text.split(/\s+/).filter(Boolean);
              setSyncedSubtitle({
                text: fallbackCap.text,
                words,
                activeIndex: Math.min(words.length - 1, Math.floor(((video.currentTime % 2) / 2) * words.length)),
                hasContent: true,
              });
            } else {
              setSyncedSubtitle({ text: "", words: [], activeIndex: -1, hasContent: false });
            }
          }
        }
        // 2. Pre-transcribed speech / transcript field
        else if (currentItem?.transcript || currentItem?.subtitles || currentItem?.audioTranscript) {
          const rawTranscript = (currentItem.transcript || currentItem.subtitles || currentItem.audioTranscript).trim();
          const words = rawTranscript.split(/\s+/).filter(Boolean);
          if (words.length > 0) {
            const totalDuration = video.duration || 15;
            const progressFrac = Math.min(1, Math.max(0, video.currentTime / totalDuration));
            const chunkSize = 5;
            const totalChunks = Math.ceil(words.length / chunkSize);
            const currentChunkIdx = Math.min(totalChunks - 1, Math.floor(progressFrac * totalChunks));
            const chunkWords = words.slice(currentChunkIdx * chunkSize, (currentChunkIdx + 1) * chunkSize);
            const chunkFrac = (progressFrac * totalChunks) - currentChunkIdx;
            const activeWordIdx = Math.min(chunkWords.length - 1, Math.floor(chunkFrac * chunkWords.length));

            setSyncedSubtitle({
              text: chunkWords.join(" "),
              words: chunkWords,
              activeIndex: activeWordIdx,
              hasContent: true,
            });
          } else {
            setSyncedSubtitle({ text: "", words: [], activeIndex: -1, hasContent: false });
          }
        }
        // 4. Fallback to Reel Caption text if available
        else if (currentItem?.caption && currentItem.caption.trim()) {
          const rawCaption = currentItem.caption.replace(/#\w+/g, "").trim();
          const words = rawCaption.split(/\s+/).filter(Boolean);
          if (words.length > 0) {
            const totalDuration = video.duration || 15;
            const progressFrac = Math.min(1, Math.max(0, video.currentTime / totalDuration));
            const chunkSize = 4;
            const totalChunks = Math.ceil(words.length / chunkSize);
            const currentChunkIdx = Math.min(totalChunks - 1, Math.floor(progressFrac * totalChunks));
            const chunkWords = words.slice(currentChunkIdx * chunkSize, (currentChunkIdx + 1) * chunkSize);
            const chunkFrac = (progressFrac * totalChunks) - currentChunkIdx;
            const activeWordIdx = Math.min(chunkWords.length - 1, Math.floor(chunkFrac * chunkWords.length));

            setSyncedSubtitle({
              text: chunkWords.join(" "),
              words: chunkWords,
              activeIndex: activeWordIdx,
              hasContent: true,
            });
          } else {
            setSyncedSubtitle({ text: "", words: [], activeIndex: -1, hasContent: false });
          }
        }
        // 5. No speech / transcript available
        else {
          setSyncedSubtitle({ text: "", words: [], activeIndex: -1, hasContent: false });
        }
      }

      // Auto-scroll trigger when video finishes (within 0.35s of end)
      if (
        autoScroll &&
        onNext &&
        !endedTriggeredRef.current &&
        video.duration > 1 &&
        video.currentTime >= video.duration - 0.35
      ) {
        endedTriggeredRef.current = true;
        onNext();
      }
    }
  };

  // Zero-Jitter Optimistic Like Handler (Toggle for Heart Button)
  const handleOptimisticLike = async (e) => {
    if (e) {
      e.stopPropagation?.();
      e.preventDefault?.();
    }
    if (!currentUserId) {
      snackbar.error("Please login to like reels");
      return;
    }
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    if (nextLiked) {
      triggerHaptic("like");
      microAudio.playPop();
    } else {
      triggerHaptic("light");
    }

    // Instant Zero-Jitter UI Update
    setIsLiked(nextLiked);
    setLikesCount(nextCount);

    // Update Redux immediately
    const updatedReel = {
      ...currentItem,
      likes: nextLiked
        ? [...(currentItem.likes || []), currentUserId]
        : (currentItem.likes || []).filter((id) => (id?._id || id)?.toString() !== currentUserId),
    };
    const updatedReels = reelData?.map((r) => (r._id === currentItem._id ? updatedReel : r));
    dispatch(setReelData(updatedReels));

    // Emit Socket.IO event in realtime
    const socket = getSocket();
    if (socket) {
      socket.emit("reel-like-toggle", {
        reelId: currentItem._id,
        userId: currentUserId,
        isLiked: nextLiked,
        likesCount: nextCount,
      });
    }

    try {
      const res = await api.post(`/reel/like/${currentItem?._id}`, { action: nextLiked ? "like" : "unlike" });
      if (res.data?.reel) {
        const serverReel = res.data.reel;
        const syncedReels = reelData?.map((r) => (r._id === serverReel._id ? serverReel : r));
        dispatch(setReelData(syncedReels));
      }
    } catch {
      // Rollback on network failure
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
      snackbar.error("Failed to update like");
    }
  };

  // Dedicated Double Tap Like (Always forces like state + Heart Burst)
  const forceDoubleTapLike = async () => {
    triggerHaptic("like");
    microAudio.playPop();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 900);

    if (!isLiked && currentUserId) {
      const nextCount = likesCount + 1;
      setIsLiked(true);
      setLikesCount(nextCount);

      const updatedReel = {
        ...currentItem,
        likes: [...(currentItem.likes || []), currentUserId],
      };
      const updatedReels = reelData?.map((r) => (r._id === currentItem._id ? updatedReel : r));
      dispatch(setReelData(updatedReels));

      const socket = getSocket();
      if (socket) {
        socket.emit("reel-like-toggle", {
          reelId: currentItem._id,
          userId: currentUserId,
          isLiked: true,
          likesCount: nextCount,
        });
      }

      try {
        const res = await api.post(`/reel/like/${currentItem?._id}`, { action: "like" });
        if (res.data?.reel) {
          const serverReel = res.data.reel;
          const syncedReels = reelData?.map((r) => (r._id === serverReel._id ? serverReel : r));
          dispatch(setReelData(syncedReels));
        }
      } catch {
        setIsLiked(false);
        setLikesCount(likesCount);
      }
    }
  };

  // Tap Gesture Handler: Single Tap (Play/Pause), Double Tap (Like), Triple Tap (Comments Modal)
  // Instagram 2026 behavior: Single tap = pause/resume, Double tap = like, Mute only via button
  const handleVideoTap = (e) => {
    if (isAnyModalOpen) return;

    // Ignore taps originating from buttons, links, controls, or action bars
    if (e?.target?.closest) {
      if (
        e.target.closest(
          'button, a, input, textarea, select, [role="button"], .interactive-btn, .action-dock, .interactive-overlay, .seek-bar, [data-interactive="true"]'
        )
      ) {
        return;
      }
    }

    // If long-press fast forward or a slide gesture was performed, do NOT register as tap
    if (hasFastForwardedRef.current || hasMovedRef.current) {
      hasFastForwardedRef.current = false;
      hasMovedRef.current = false;
      return;
    }

    // If 2X is currently locked, tap still toggles play/pause (does NOT unlock)
    // Unlock only happens via slide-down gesture
    tapCountRef.current += 1;

    if (tapCountRef.current === 1) {
      // Set a timer to check if single, double, or triple tap
      tapTimerRef.current = setTimeout(() => {
        if (tapCountRef.current === 1) {
          // Single Tap -> Toggle Play / Pause (Instagram 2026 behavior)
          handleTogglePlayPause();
        } else if (tapCountRef.current === 2) {
          // Double Tap -> Force Like & Burst Heart
          forceDoubleTapLike();
        } else if (tapCountRef.current >= 3) {
          // Triple Tap -> Open Comments Modal
          setShowComments(true);
        }
        tapCountRef.current = 0;
      }, 250);
    }
  };

  // Instagram/Facebook-style transparent speed snackbar helper
  const showSpeedSnackbar = useCallback((text, type = "speed") => {
    if (speedSnackbarTimerRef.current) clearTimeout(speedSnackbarTimerRef.current);
    setSpeedSnackbar({ text, type, key: Date.now() });
    speedSnackbarTimerRef.current = setTimeout(() => {
      setSpeedSnackbar(null);
    }, 2200);
  }, []);

  // Touch & Pointer handlers for Long Press 2X Fast-Forwarding & Slide Down Lock/Unlock
  const handleTouchStart = (e) => {
    if (isAnyModalOpen) return;

    // Ignore gestures on buttons, links, controls, or action bars
    if (e?.target?.closest) {
      if (
        e.target.closest(
          'button, a, input, textarea, select, [role="button"], .interactive-btn, .action-dock, .interactive-overlay, .seek-bar, [data-interactive="true"]'
        )
      ) {
        return;
      }
    }

    const clientY = e?.clientY ?? (e?.touches ? e.touches[0]?.clientY : null);
    const clientX = e?.clientX ?? (e?.touches ? e.touches[0]?.clientX : null);
    if (clientY === null) return;

    touchStartYRef.current = clientY;
    touchStartXRef.current = clientX;
    hasFastForwardedRef.current = false;
    hasMovedRef.current = false;
    setIsNearLockZone(false);
    setIsNearUnlockZone(false);

    // If already locked, track for slide-down unlock gesture
    if (is2XLocked) {
      unlockGestureActiveRef.current = true;
      return;
    }

    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      hasFastForwardedRef.current = true;
      setIsFastForwarding(true);
      triggerHaptic("medium");
      showSpeedSnackbar("Playing at 2× speed", "speed");
      if (videoRef.current) videoRef.current.playbackRate = 2.0;
      if (audioRef.current) audioRef.current.playbackRate = 2.0;
      touchStartYRef.current = clientY;
    }, 380);
  };

  const handlePointerDown = handleTouchStart;

  const handlePointerMove = (e) => {
    const clientY = e?.clientY ?? (e?.touches ? e.touches[0]?.clientY : null);
    const clientX = e?.clientX ?? (e?.touches ? e.touches[0]?.clientX : null);
    if (clientY === null || touchStartYRef.current === null) return;

    const deltaY = clientY - touchStartYRef.current; // positive = finger moved DOWN
    const deltaX = (clientX !== null && touchStartXRef.current !== null) ? clientX - touchStartXRef.current : 0;

    // If moved significantly, mark hasMovedRef
    if (Math.abs(deltaY) > 12 || Math.abs(deltaX) > 12) {
      hasMovedRef.current = true;
    }

    // While neither fast forwarding nor locked, cancel long-press if user starts scrolling feed
    if (!isFastForwarding && !is2XLocked) {
      if (Math.abs(deltaY) > 10 || Math.abs(deltaX) > 10) {
        if (pressTimerRef.current) {
          clearTimeout(pressTimerRef.current);
          pressTimerRef.current = null;
        }
      }
      return;
    }

    // CASE A: User is holding for 2X (not yet locked) -> slide DOWN to lock
    if (isFastForwarding && !is2XLocked) {
      const nearLock = deltaY > 38;
      if (nearLock !== isNearLockZone) {
        triggerHaptic("selection");
      }
      setIsNearLockZone(nearLock);
      setIsNearUnlockZone(false);
      return;
    }

    // CASE B: 2X is currently locked -> slide DOWN to unlock
    if (is2XLocked && unlockGestureActiveRef.current) {
      const nearUnlock = deltaY > 38;
      if (nearUnlock !== isNearUnlockZone) {
        triggerHaptic("selection");
      }
      setIsNearUnlockZone(nearUnlock);
      setIsNearLockZone(false);
    }
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    const wasFastForwarding = isFastForwarding;
    const wasLocked = is2XLocked;
    const wasNearLock = isNearLockZone;
    const wasNearUnlock = isNearUnlockZone;

    unlockGestureActiveRef.current = false;
    setIsNearLockZone(false);
    setIsNearUnlockZone(false);

    // CASE 1: Currently locked → check if user slid down to unlock
    if (wasLocked) {
      if (wasNearUnlock) {
        // Unlock! Return to normal speed
        setIs2XLocked(false);
        setIsFastForwarding(false);
        hasFastForwardedRef.current = false;
        hasMovedRef.current = true; // Prevents tap handler from toggling play/pause!
        triggerHaptic("medium");
        showSpeedSnackbar("Back to normal speed", "normal");
        const normalRate = playbackSpeed || 1.0;
        if (videoRef.current) videoRef.current.playbackRate = normalRate;
        if (audioRef.current) audioRef.current.playbackRate = normalRate;
      }
      touchStartYRef.current = null;
      touchStartXRef.current = null;
      return;
    }

    // CASE 2: Was fast-forwarding (holding) → check if user slid DOWN to lock
    if (wasFastForwarding && wasNearLock) {
      // Lock 2x speed!
      setIs2XLocked(true);
      setIsFastForwarding(false);
      hasMovedRef.current = true; // Prevents tap handler from toggling play/pause!
      triggerHaptic("heavy");
      showSpeedSnackbar("2× speed locked", "locked");
      if (videoRef.current) videoRef.current.playbackRate = 2.0;
      if (audioRef.current) audioRef.current.playbackRate = 2.0;
      touchStartYRef.current = null;
      touchStartXRef.current = null;
      return;
    }

    // CASE 3: Was fast-forwarding but released without locking → back to normal
    if (wasFastForwarding && !wasLocked) {
      setIsFastForwarding(false);
      setIs2XLocked(false);
      const normalRate = playbackSpeed || 1.0;
      if (videoRef.current) videoRef.current.playbackRate = normalRate;
      if (audioRef.current) audioRef.current.playbackRate = normalRate;
    }

    touchStartYRef.current = null;
    touchStartXRef.current = null;
  };

  const handlePointerUp = handleTouchEnd;

  const handleToggleSave = async (e) => {
    if (e) {
      e.stopPropagation?.();
      e.preventDefault?.();
    }
    try {
      const res = await api.post(`/reel/save/${currentItem?._id}`);
      if (res.data.success) {
        setIsSaved(res.data.isSaved);
        if (res.data.user) {
          dispatch(setUserData(res.data.user));
        }
        if (res.data.isSaved) {
          snackbar.success(res.data.message || "Saved to your bookmarks");
        } else {
          snackbar.info("Removed from saved reels");
        }
      }
    } catch {
      snackbar.error("Failed to update bookmark.");
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        isAnyModalOpen ||
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          } else {
            video.pause();
            setIsPlaying(false);
          }
          setShowPlayPauseAnim(true);
          setTimeout(() => setShowPlayPauseAnim(false), 550);
        }
      } else if (e.code === "ArrowDown" && onNext) {
        onNext();
      } else if (e.code === "ArrowUp" && onPrev) {
        onPrev();
      } else if (e.code === "KeyM") {
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnyModalOpen, onNext, onPrev, toggleMute]);

  if (!currentItem || !currentItem._id) return null;

  return (
    <div ref={containerRef} className="relative flex items-center justify-center h-[100dvh] md:h-[calc(100dvh-32px)] md:max-h-[760px] my-auto">
      {/* DESKTOP-ONLY LEFT-BOTTOM AUTHOR & CAPTION INFO (COMPACT & ANCHORED TO LEFT OF CENTERED VIDEO) */}
      <div
        data-interactive="true"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="hidden md:flex flex-col justify-end w-[180px] lg:w-[210px] xl:w-[240px] max-w-[240px] absolute right-full mr-3.5 lg:mr-4.5 bottom-0 pb-3 space-y-2 text-text pointer-events-auto select-text z-40"
      >
        {/* Author Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <img
            src={currentItem?.author?.profileImage?.url || dp}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-border cursor-pointer hover:opacity-90 transition shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${currentItem?.author?.userName}`);
            }}
          />
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span
              className="text-text text-xs lg:text-[13px] font-bold cursor-pointer hover:underline flex items-center gap-1 truncate max-w-[100px] lg:max-w-[125px]"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${currentItem?.author?.userName}`);
              }}
            >
              {currentItem?.author?.userName}
              {currentItem?.author?.isVerified && <VerifiedBadge size="xs" />}
            </span>

            {currentItem?.author?._id !== userData?.user?._id && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 shrink-0"
              >
                <span className="text-text-secondary text-xs">•</span>
                <FollowButton
                  targetUserId={currentItem?.author?._id}
                  tailwind="text-primary hover:text-primary-hover text-xs lg:text-[13px] font-bold bg-transparent p-0 shadow-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        {currentItem?.location && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/explore/location/${encodeURIComponent(currentItem.location)}`);
            }}
            className="text-[10px] lg:text-[11px] text-text-secondary font-medium cursor-pointer hover:underline flex items-center gap-1 truncate max-w-[160px]"
          >
            <span>📍</span> <span className="truncate">{currentItem.location}</span>
          </div>
        )}

        {/* Caption */}
        {currentItem?.caption && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-text font-normal leading-snug break-words max-h-[110px] lg:max-h-[130px] overflow-y-auto hide-scrollbar pr-1"
          >
            <span>{renderCaptionWithLinks(currentItem.caption)}</span>
          </div>
        )}

        {/* Tagged People */}
        {currentItem?.taggedUsers && currentItem.taggedUsers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] lg:text-xs text-text-secondary font-medium flex items-center gap-0.5">
              <span>🏷️</span>
              <span>with</span>
            </span>
            {currentItem.taggedUsers.map((tu, i) => {
              const u = tu?.userName ? tu : { userName: tu };
              return (
                <button
                  key={u?.userName || `tag_${i}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${u.userName}`);
                  }}
                  className="px-1.5 py-0.5 rounded-full bg-surface-hover hover:bg-surface-active border border-border text-[10px] lg:text-xs font-semibold text-text transition cursor-pointer"
                >
                  <span>@{u.userName}</span>
                  {u?.isVerified && <VerifiedBadge size="xs" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Audio Track */}
        {(() => {
          let trackObj = currentItem?.audioTrack || currentItem?.music;
          if (typeof trackObj === "string") {
            try {
              trackObj = JSON.parse(trackObj);
            } catch {
              trackObj = { title: trackObj };
            }
          }
          const title = trackObj?.title || `${currentItem?.author?.userName || "Original"} • Audio`;
          const trackParam = trackObj?.id || trackObj?.title || `${currentItem?.author?.userName}-original`;

          return (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/audio/${encodeURIComponent(trackParam)}`, {
                  state: { music: trackObj },
                });
              }}
              className="flex items-center gap-1.5 cursor-pointer text-[10px] lg:text-[11px] text-text-secondary hover:text-text transition w-fit pt-0.5"
            >
              <Disc className="w-3 h-3 animate-spin-slow text-text-secondary shrink-0" />
              <span className="truncate max-w-[160px] lg:max-w-[190px] font-medium">{title}</span>
            </div>
          );
        })()}
      </div>

      {/* 9:16 MAIN REEL VIDEO CARD (CENTERED ANCHOR) */}
      <div
        ref={mainCardRef}
        onClick={handleVideoTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        className={`w-full md:w-[330px] lg:w-[360px] xl:w-[390px] h-[100dvh] md:h-full flex ${
          isAnyModalOpen ? "flex-col justify-start items-center" : "items-center justify-center"
        } border-0 md:border md:border-white/10 md:rounded-md relative overflow-hidden bg-black select-none cursor-pointer group/card md:shadow-[0_8px_30px_rgba(0,0,0,0.5)] shrink-0 transition-all duration-300`}
      >
      {/* INSTAGRAM/FACEBOOK-STYLE TRANSPARENT SPEED SNACKBAR */}
      <AnimatePresence>
        {speedSnackbar && (
          <motion.div
            key={speedSnackbar.key}
            initial={{ opacity: 0, y: -16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute top-5 left-1/2 -translate-x-1/2 z-[170] pointer-events-none"
          >
            <div className="px-4 py-2 rounded-full bg-black/75 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-2.5">
              {speedSnackbar.type === "speed" && (
                <FastForward className="w-3.5 h-3.5 text-white/90" />
              )}
              {speedSnackbar.type === "locked" && (
                <Lock className="w-3.5 h-3.5 text-white/90" />
              )}
              {speedSnackbar.type === "normal" && (
                <Play className="w-3.5 h-3.5 text-white/90 fill-white/90" />
              )}
              <span className="text-[12px] font-semibold text-white/95 tracking-wide">{speedSnackbar.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2X SPEED PILL — While holding (slide down to lock) */}
      {isFastForwarding && !is2XLocked && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[160] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div
            className={`px-4 py-1.5 rounded-full backdrop-blur-2xl border text-[11px] font-semibold flex items-center gap-2 shadow-2xl transition-all duration-200 ${
              isNearLockZone
                ? "bg-white/25 text-white border-white/40 scale-105 shadow-white/10"
                : "bg-black/70 text-white/90 border-white/15"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 transition-colors ${
              isNearLockZone ? "fill-white text-white" : "fill-white/80 text-white/80"
            }`} />
            <span className="font-bold text-white tracking-wide">2×</span>
            <span className="text-white/40 text-[10px]">|</span>
            <span className="text-white/80 text-[11px] font-medium">
              {isNearLockZone ? "Release to lock" : "Slide down to lock"}
            </span>
            {isNearLockZone ? (
              <Lock className="w-3.5 h-3.5 text-white" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-white/60 animate-bounce" />
            )}
          </div>
        </div>
      )}

      {/* 2X LOCKED PILL — Persistent while locked (slide down to unlock) */}
      {is2XLocked && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[160] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div
            className={`px-4 py-1.5 rounded-full backdrop-blur-2xl border text-[11px] font-semibold flex items-center gap-2 shadow-2xl transition-all duration-200 ${
              isNearUnlockZone
                ? "bg-white/25 text-white border-white/40 scale-105 shadow-white/10"
                : "bg-black/70 text-white/90 border-white/15"
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-white/90 text-white/90" />
            <span className="font-bold text-white tracking-wide">
              {isNearUnlockZone ? "1×" : "2× Locked"}
            </span>
            <span className="text-white/40 text-[10px]">|</span>
            <span className="text-white/80 text-[11px] font-medium">
              {isNearUnlockZone ? "Release to unlock" : "Slide down to unlock"}
            </span>
            {isNearUnlockZone ? (
              <Unlock className="w-3.5 h-3.5 text-white" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-white/70" />
            )}
          </div>
        </div>
      )}

      {/* INSTAGRAM CENTER PLAY BUTTON (Persistent while paused — shows Play icon) */}
      {!isPlaying && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none flex items-center justify-center animate-in zoom-in-75 fade-in duration-200">
          <div className="w-18 h-18 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            <Play className="w-9 h-9 text-white fill-white ml-1 drop-shadow-md" />
          </div>
        </div>
      )}

      {/* PLAY / PAUSE TRANSIENT PULSE OVERLAY (Brief flash on tap — shows what just happened) */}
      {showPlayPauseAnim && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center justify-center animate-scale-pulse">
          <div className="w-18 h-18 rounded-full bg-black/75 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            {isPlaying ? (
              <Play className="w-9 h-9 text-white fill-white ml-0.5 drop-shadow-md" />
            ) : (
              <Pause className="w-9 h-9 text-white fill-white drop-shadow-md" />
            )}
          </div>
        </div>
      )}

      {/* VOLUME MUTE / UNMUTE CENTER OVERLAY ANIMATION */}
      {showVolumeAnim && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center justify-center animate-scale-pulse">
          <div className="w-20 h-20 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
            {isMuted ? (
              <VolumeX className="w-10 h-10 text-white stroke-[2.5]" />
            ) : (
              <Volume2 className="w-10 h-10 text-white stroke-[2.5]" />
            )}
          </div>
        </div>
      )}

      {/* Particle Heart Burst on double-tap */}
      <HeartExplosion show={showHeart} onComplete={() => setShowHeart(false)} />

      {/* OVERLAY BACKDROP FOR VIEWERS DRAWER */}
      {showViewers && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowViewers(false);
          }}
          className="absolute inset-0 bg-bg/40 z-[150] backdrop-blur-[2px] transition-opacity cursor-pointer"
        />
      )}

      {/* VIEWERS DRAWER */}
      <div
        ref={viewersRef}
        onClick={(e) => e.stopPropagation()}
        className={`absolute z-[200] bottom-0 w-full h-[450px] p-4 rounded-t-3xl bg-surface-inset/95 border-t border-border transition-transform duration-300 ease-out left-0 shadow-2xl flex flex-col justify-between ${
          showViewers ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h1 className="text-text text-sm font-bold flex items-center gap-2">
            <Eye className="w-4 h-4 text-rose-500" />
            <span>Reel Views ({currentItem?.viewedBy?.length || currentItem?.views || 0})</span>
          </h1>
          <button onClick={() => setShowViewers(false)} className="text-xs text-text-secondary hover:text-text font-semibold cursor-pointer">
            Done
          </button>
        </div>

        <div className="w-full flex-1 overflow-y-auto flex flex-col gap-2 py-3">
          {!currentItem?.viewedBy || currentItem?.viewedBy?.length === 0 ? (
            <div className="text-center text-text-muted text-xs font-medium mt-12">No views recorded yet</div>
          ) : (
            [...currentItem.viewedBy]
              .sort((a, b) => {
                const aFollow = followingIds.has((a?._id || a)?.toString()) ? 1 : 0;
                const bFollow = followingIds.has((b?._id || b)?.toString()) ? 1 : 0;
                return bFollow - aFollow;
              })
              .map((viewer, idx) => {
                const isFollowed = followingIds.has((viewer?._id || viewer)?.toString());
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface/60 transition">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                      onClick={() => navigate(`/profile/${viewer?.userName}`)}
                    >
                      <img
                        src={viewer?.profileImage?.url || dp}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                      />
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-text flex items-center gap-1.5 truncate">
                          <span>@{viewer?.userName}</span>
                          {isFollowed && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                              Following
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-secondary truncate">{viewer?.name}</div>
                      </div>
                    </div>
                    {viewer?._id !== userData?.user?._id && (
                      <FollowButton
                        targetUserId={viewer?._id}
                        tailwind="px-3 py-1 bg-surface-hover hover:bg-surface-active text-text text-[10px] font-semibold rounded-full shrink-0"
                      />
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* VIDEO PLAYER (MAINTAINS 9:16 PROPORTIONS - PURE INSTAGRAM BEHAVIOR) */}
      <div
        onClick={(e) => {
          if (isAnyModalOpen) {
            e.stopPropagation();
            handleCloseAllModals();
          }
        }}
        className={`w-full flex items-center justify-center transition-all duration-300 ease-out ${
          isAnyModalOpen
            ? commentsExpanded
              ? "opacity-0 pointer-events-none h-0"
              : "h-[38dvh] md:h-[42dvh] pt-2 pb-1 px-2 z-30 cursor-pointer"
            : "h-full p-0 z-0"
        }`}
      >
        <div
          className={`relative transition-all duration-300 ease-out overflow-hidden flex items-center justify-center ${
            isAnyModalOpen
              ? "h-full aspect-[9/16] rounded-2xl md:rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.9)] ring-1 ring-white/20 bg-black"
              : "w-full h-full rounded-none"
          }`}
        >
          <video
            onPlay={handlePlay}
            onPause={handlePause}
            ref={videoRef}
            preload={isActive ? "auto" : "metadata"}
            muted={isMuted}
            onEnded={(e) => {
              if (autoScroll && onNext) {
                if (!endedTriggeredRef.current) {
                  endedTriggeredRef.current = true;
                  onNext();
                }
              } else {
                e.target.currentTime = 0;
                if (isActive) {
                  e.target.play().catch(() => null);
                }
              }
            }}
            playsInline
            src={getOptimizedMediaUrl(currentItem?.media?.url, "video")}
            className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-300 ${
              isFastForwarding ? "brightness-110" : ""
            }`}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* Mini creator header & expand icon when in split view */}
          {isAnyModalOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-30"
            >
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/15 shadow-md">
                <img
                  src={currentItem?.author?.profileImage?.url || dp}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className="text-[10px] font-bold text-white max-w-[90px] truncate">
                  @{currentItem?.author?.userName}
                </span>
                {currentItem?.author?.isVerified && <VerifiedBadge size="xs" />}
              </div>

              <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/15 text-white/90 shadow-md">
                <Maximize2 className="w-3 h-3" />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* SYNCHRONIZED AUDIO TRACK (Background / Music) */}
      {attachedAudioUrl && (
        <audio
          ref={audioRef}
          src={attachedAudioUrl}
          preload={isActive ? "auto" : "none"}
          muted={isMuted}
          loop
          playsInline
        />
      )}

      {/* INSTAGRAM COMPACT KINETIC REELS SUBTITLES */}
      <AnimatePresence>
        {showCaptions && !isAnyModalOpen && syncedSubtitle.hasContent && syncedSubtitle.words && syncedSubtitle.words.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute bottom-24 md:bottom-20 inset-x-3 sm:inset-x-6 z-35 pointer-events-none flex items-center justify-center select-none"
          >
            <div className="max-w-[88%] px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
              {syncedSubtitle.words.map((word, idx) => {
                const isWordActive = idx === syncedSubtitle.activeIndex;
                const isPast = idx < syncedSubtitle.activeIndex;
                return (
                  <span
                    key={idx}
                    className={`text-xs sm:text-sm md:text-[13px] tracking-normal transition-all duration-100 transform ${
                      isWordActive
                        ? "text-yellow-300 font-extrabold scale-105 inline-block drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]"
                        : isPast
                        ? "text-white font-semibold"
                        : "text-white/60 font-medium"
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP-RIGHT CONTROLS (CC SUBTITLES & VOLUME - EXACT INSTAGRAM POSITION ON MOBILE & DESKTOP) */}
      {!isFastForwarding && (
        <div
          data-interactive="true"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex absolute top-3.5 right-3.5 md:top-4 md:right-4 z-[100] items-center gap-2 pointer-events-auto"
        >
          {/* Quick 1-Tap CC Toggle Button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCaptions();
            }}
            className={`h-8 px-2.5 rounded-full border text-xs font-black transition-all flex items-center justify-center cursor-pointer shadow-lg active:scale-90 ${
              showCaptions
                ? "bg-white text-black border-white shadow-white/20"
                : "bg-black/60 backdrop-blur-md border-white/20 text-white/70 hover:text-white"
            }`}
            title={showCaptions ? "Turn off subtitles (CC)" : "Turn on subtitles (CC)"}
          >
            <span className="text-[11px] font-extrabold tracking-tighter">CC</span>
          </button>

          {/* Mute / Unmute Button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleMute(e);
            }}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-lg"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Non-interactive progress bar removed — the interactive seek bar at the bottom handles both display and scrubbing */}

      {/* MOBILE-ONLY BOTTOM INFO OVERLAY (INSIDE VIDEO CARD) */}
      {!isFastForwarding && (
        <div
          data-interactive="true"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`flex md:hidden w-full absolute bottom-0 inset-x-0 px-3.5 pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-12 flex justify-between items-end z-30 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none transition-opacity duration-200 ${
            isAnyModalOpen ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          }`}
        >
          <div
            data-interactive="true"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="space-y-3 max-w-[75%] pointer-events-auto"
          >
            {/* Author */}
            <div className="flex items-center gap-2.5">
              <img
                src={currentItem?.author?.profileImage?.url || dp}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-border-strong cursor-pointer interactive-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${currentItem?.author?.userName}`);
                }}
              />
              <span
                className="text-white text-xs font-bold cursor-pointer hover:underline interactive-btn flex items-center gap-0.5"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${currentItem?.author?.userName}`);
                }}
              >
                @{currentItem?.author?.userName}
                {currentItem?.author?.isVerified && (
                  <VerifiedBadge size="sm" />
                )}
              </span>

              {currentItem?.author?._id !== userData?.user?._id && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FollowButton
                    targetUserId={currentItem?.author?._id}
                    tailwind="px-3 py-1 bg-rose-600 text-white text-[11px] font-semibold rounded-full shadow interactive-btn"
                  />
                </div>
              )}
            </div>

            {/* Location */}
            {currentItem?.location && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/explore/location/${encodeURIComponent(currentItem.location)}`);
                }}
                className="text-[10px] text-white/90 font-bold cursor-pointer hover:text-white flex items-center gap-1 mt-0.5 interactive-btn bg-black/40 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur w-fit shadow-xs"
              >
                <MapPin className="w-2.5 h-2.5 text-rose-400 fill-rose-400/20 shrink-0" />
                <span className="truncate max-w-[170px]">{currentItem.location}</span>
              </div>
            )}

            {/* Interactive Caption with clickable #hashtags and @mentions + Instagram-style "...more / less" */}
            {currentItem?.caption && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-white font-normal leading-relaxed pointer-events-auto break-words mt-0.5"
              >
                {(() => {
                  const cap = currentItem.caption;
                  const isLong = cap.length > 85;
                  if (!isLong || isCaptionExpanded) {
                    return (
                      <>
                        <span>{renderCaptionWithLinks(cap)}</span>
                        {isLong && (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCaptionExpanded(false);
                            }}
                            className="text-zinc-400 font-semibold hover:text-white ml-1.5 cursor-pointer text-[11px]"
                          >
                            less
                          </button>
                        )}
                      </>
                    );
                  }
                  return (
                    <>
                      <span>{renderCaptionWithLinks(cap.slice(0, 80))}</span>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCaptionExpanded(true);
                        }}
                        className="text-zinc-300 font-bold hover:text-white ml-1 cursor-pointer text-[11px]"
                      >
                        ...more
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Tagged People Pill */}
            {currentItem?.taggedUsers && currentItem.taggedUsers.length > 0 && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 flex-wrap pointer-events-auto mt-0.5"
              >
                <span className="text-[11px] text-zinc-300 font-medium flex items-center gap-0.5">
                  <span>🏷️</span>
                  <span>with</span>
                </span>
                {currentItem.taggedUsers.map((tu, i) => {
                  const u = tu?.userName ? tu : { userName: tu };
                  return (
                    <button
                      key={u?.userName || `mobile_tag_${i}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${u.userName}`);
                      }}
                      className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-bold text-white flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>@{u.userName}</span>
                      {u?.isVerified && <VerifiedBadge size="xs" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Made with AI Pill Badge */}
            {currentItem?.aiLabel?.isAIGenerated && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  setShowAIInfoModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-purple-400/40 text-[10px] font-semibold text-purple-300 active:scale-95 transition-all shadow-md cursor-pointer pointer-events-auto"
                title="Made with AI • Click for info"
              >
                <Sparkles className="w-2.5 h-2.5 text-purple-400 fill-purple-400/20 animate-pulse" />
                <span>AI info</span>
              </button>
            )}

            {/* Audio Track & Spinning Disc */}
            {(() => {
              let trackObj = currentItem?.audioTrack || currentItem?.music;
              if (typeof trackObj === "string") {
                try {
                  trackObj = JSON.parse(trackObj);
                } catch {
                  trackObj = { title: trackObj };
                }
              }
              const title = trackObj?.title || `${currentItem?.author?.userName || "Original"} • Audio`;
              const trackParam = trackObj?.id || trackObj?.title || `${currentItem?.author?.userName}-original`;

              return (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/audio/${encodeURIComponent(trackParam)}`, {
                      state: { music: trackObj },
                    });
                  }}
                  className="flex items-center gap-2 cursor-pointer text-xs text-white hover:text-white/80 transition interactive-btn bg-black/40 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur w-fit"
                >
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center animate-spin-slow shrink-0">
                    <Disc className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="truncate max-w-[170px] font-bold text-[11px]">{title}</span>
                </div>
              );
            })()}
          </div>

          {/* MOBILE-ONLY RIGHT SIDE ACTION BUTTONS (INSIDE VIDEO CARD) */}
          <div
            data-interactive="true"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="flex md:hidden flex-col items-center gap-2.5 text-white pointer-events-auto pb-1"
          >

            {/* Like */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center"
            >
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptimisticLike(e);
                }}
                className="p-1 group cursor-pointer active:scale-75 transition-transform"
                title={isLiked ? "Unlike" : "Like"}
              >
                {isLiked ? (
                  <GoHeartFill className="w-6 h-6 text-[#ff3040] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] animate-heart-burst" />
                ) : (
                  <GoHeart className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:text-rose-300 transition-colors" />
                )}
              </button>
              <span
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  setShowLikersModal(true);
                }}
                className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] cursor-pointer hover:underline"
                title="View likes"
              >
                {likesCount > 0 ? likesCount : "0"}
              </span>
            </div>

            {/* Comment */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center"
            >
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComments(true);
                }}
                className="p-1 group cursor-pointer active:scale-75 transition-transform"
                title="Comments"
              >
                <MdOutlineComment className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:text-rose-300 transition-colors" />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {(currentItem?.comments || []).reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
              </span>
            </div>

            {/* Share */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center"
            >
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShare(true);
                }}
                className="p-1 group cursor-pointer active:scale-75 transition-transform"
                title="Share"
              >
                <Send className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] -rotate-12 group-hover:text-rose-300 transition-colors" />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {currentItem?.forwards || 0}
              </span>
            </div>

            {/* Save Bookmark */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSave(e);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCollectionsModal(true);
              }}
              className="p-1 group cursor-pointer active:scale-75 transition-transform"
              title={isSaved ? "Saved (Right click for Collection)" : "Save Bookmark"}
            >
              {isSaved ? (
                <BookmarkCheck className="w-5 h-5 text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
              ) : (
                <Bookmark className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:text-amber-300 transition-colors" />
              )}
            </button>

            {/* Reshare & Repost */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setShowReshareModal(true);
              }}
              className="p-1 group cursor-pointer active:scale-75 transition-transform"
              title="Reshare & Repost Reel"
            >
              <Repeat className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:text-rose-400 group-hover:rotate-180 transition-all duration-300" />
            </button>

            {/* Views & Insights */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center"
            >
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewers(true);
                }}
                className="p-1 group cursor-pointer active:scale-75 transition-transform"
                title="Views & Insights"
              >
                <Eye className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:text-cyan-300 transition-colors" />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {currentItem?.views || 0}
              </span>
            </div>

            {/* 3-Dot Options & Settings */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsModal(true);
              }}
              className="p-1 group cursor-pointer active:scale-75 transition-transform"
              title="More Options"
            >
              <MoreVertical className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:text-rose-300 transition-colors" />
            </button>

            {/* Delete Reel (Owner only) */}
            {isAuthor && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="p-1 group cursor-pointer active:scale-75 transition-transform"
                title="Delete Reel"
              >
                <Trash2 className="w-5 h-5 text-rose-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] hover:text-rose-300 transition-colors" />
              </button>
            )}

            {/* Spinning Audio Album Art (Instagram Style) */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                let trackObj = currentItem?.audioTrack || currentItem?.music;
                if (typeof trackObj === "string") {
                  try {
                    trackObj = JSON.parse(trackObj);
                  } catch {
                    trackObj = { title: trackObj };
                  }
                }
                const trackParam = trackObj?.id || trackObj?.title || `${currentItem?.author?.userName}-original`;
                navigate(`/audio/${encodeURIComponent(trackParam)}`, {
                  state: { music: trackObj },
                });
              }}
              className="w-6 h-6 rounded-md overflow-hidden border border-white/90 shadow-md cursor-pointer animate-spin-slow active:scale-80 transition-transform bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 flex items-center justify-center mt-0.5"
              title="Audio Track"
            >
              {currentItem?.author?.profileImage?.url ? (
                <img src={currentItem.author.profileImage.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Disc className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEEK & PROGRESS BAR OVERLAY — Positioned cleanly above mobile navbar with smooth touch scrubbing */}
      <div
        ref={seekBarRef}
        data-interactive="true"
        onPointerDown={(e) => {
          e.stopPropagation();
          handleSeekStart(e.clientX);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          if (touch) {
            handleSeekStart(touch.clientX);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className={`seek-bar absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-[140] h-8 md:h-6 flex items-end cursor-pointer group/seek pointer-events-auto select-none ${
          isAnyModalOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ touchAction: "none" }}
      >
        {/* Scrubber Tooltip when dragging */}
        {isScrubbing && (
          <div
            className="absolute -top-8 transform -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white shadow-xl pointer-events-none"
            style={{ left: `${Math.min(95, Math.max(5, progress))}%` }}
          >
            {formatTime(scrubTime)} / {formatTime(duration)}
          </div>
        )}

        {/* Track Background — Comfortable hit area for finger dragging */}
        <div className={`w-full relative overflow-visible transition-all ${
          isScrubbing ? "h-[6px]" : "h-[3px] group-hover/seek:h-[5px]"
        } bg-white/25`}>
          {/* Filled Progress Bar */}
          <div
            className="h-full bg-white relative transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          >
            {/* Scrubber Thumb — Always visible and scaled up when scrubbing */}
            <div
              className={`absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-lg transition-all duration-150 ${
                isScrubbing
                  ? "w-4 h-4 opacity-100 scale-110"
                  : isHovered
                  ? "w-3.5 h-3.5 opacity-100 scale-100"
                  : "w-3 h-3 opacity-0 group-hover/seek:opacity-100 scale-75 group-hover/seek:scale-100"
              }`}
            />
          </div>
        </div>
      </div>
      </div>

      {/* DESKTOP-ONLY RIGHT ACTION BAR (ANCHORED TO RIGHT OF CENTERED VIDEO - EXACT INSTAGRAM WEB) */}
      <div
        data-interactive="true"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="action-dock hidden md:flex flex-col items-center justify-end absolute left-full ml-4 lg:ml-6 bottom-0 pb-2 gap-3 text-text select-none shrink-0 z-40"
      >
        {/* 1. Like */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center"
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleOptimisticLike(e);
            }}
            className="p-2 group cursor-pointer active:scale-75 transition-transform text-text"
            title={isLiked ? "Unlike" : "Like"}
          >
            {isLiked ? (
              <GoHeartFill className="w-7 h-7 text-[#ff3040] animate-heart-burst" />
            ) : (
              <GoHeart className="w-7 h-7 group-hover:opacity-70 transition-opacity" />
            )}
          </button>
          <span
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              setShowLikersModal(true);
            }}
            className="text-xs font-medium text-text cursor-pointer hover:underline -mt-0.5"
            title="View likes"
          >
            {likesCount > 0 ? likesCount : "0"}
          </span>
        </div>

        {/* 2. Comment */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center"
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            className="p-2 group cursor-pointer active:scale-75 transition-transform text-text"
            title="Comments"
          >
            <MdOutlineComment className="w-7 h-7 group-hover:opacity-70 transition-opacity" />
          </button>
          <span className="text-xs font-medium text-text -mt-0.5">
            {(currentItem?.comments || []).reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
          </span>
        </div>

        {/* 3. Repost / Reshare */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center"
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowReshareModal(true);
            }}
            className="p-2 group cursor-pointer active:scale-75 transition-transform text-text"
            title="Reshare & Repost Reel"
          >
            <Repeat className="w-6 h-6 group-hover:opacity-70 transition-opacity" />
          </button>
          <span className="text-xs font-medium text-text -mt-0.5">
            {currentItem?.forwards || 0}
          </span>
        </div>

        {/* 4. Share / Send */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center"
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowShare(true);
            }}
            className="p-2 group cursor-pointer active:scale-75 transition-transform text-text"
            title="Share"
          >
            <Send className="w-6 h-6 -rotate-12 group-hover:opacity-70 transition-opacity" />
          </button>
        </div>

        {/* 5. Save Bookmark */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleSave(e);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCollectionsModal(true);
          }}
          className="p-2 group cursor-pointer active:scale-75 transition-transform text-text"
          title={isSaved ? "Saved (Right click for Collection)" : "Save Bookmark"}
        >
          {isSaved ? (
            <BookmarkCheck className="w-6 h-6 text-amber-500 fill-amber-500" />
          ) : (
            <Bookmark className="w-6 h-6 group-hover:opacity-70 transition-opacity" />
          )}
        </button>

        {/* 6. Views & Insights */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center"
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowViewers(true);
            }}
            className="p-2 group cursor-pointer active:scale-75 transition-transform text-text"
            title="Views & Insights"
          >
            <Eye className="w-6 h-6 group-hover:opacity-70 transition-opacity" />
          </button>
          <span className="text-xs font-medium text-text -mt-0.5">
            {currentItem?.views || 0}
          </span>
        </div>

        {/* 7. 3-Dot Options */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowOptionsModal(true);
          }}
          className="p-2 group cursor-pointer active:scale-75 transition-transform text-text"
          title="More Options"
        >
          <MoreHorizontal className="w-6 h-6 group-hover:opacity-70 transition-opacity" />
        </button>

        {/* 8. Delete Reel (Owner only) */}
        {isAuthor && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="p-2 group cursor-pointer active:scale-75 transition-transform text-rose-500"
            title="Delete Reel"
          >
            <Trash2 className="w-6 h-6 hover:text-rose-400 transition-colors" />
          </button>
        )}

        {/* 9. Audio Album Art / Disc */}
        {(() => {
          let trackObj = currentItem?.audioTrack || currentItem?.music;
          if (typeof trackObj === "string") {
            try {
              trackObj = JSON.parse(trackObj);
            } catch {
              trackObj = { title: trackObj };
            }
          }
          const trackParam = trackObj?.id || trackObj?.title || `${currentItem?.author?.userName}-original`;

          return (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/audio/${encodeURIComponent(trackParam)}`, {
                  state: { music: trackObj },
                });
              }}
              className="w-7 h-7 rounded-md overflow-hidden border-2 border-text/60 mt-1 cursor-pointer hover:scale-105 active:scale-90 transition-transform shrink-0 shadow-md"
              title="Audio track"
            >
              {currentItem?.author?.profileImage?.url ? (
                <img
                  src={currentItem.author.profileImage.url}
                  alt=""
                  className="w-full h-full object-cover animate-spin-slow"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center">
                  <Disc className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Modals with AnimatePresence for Smooth Enter & Exit Animations */}
      <AnimatePresence>
        {/* Share Sheet */}
        {showShare && (
          <ShareSheet
            open={showShare}
            onClose={() => setShowShare(false)}
            entity={currentItem}
            entityType="reel"
            following={userData?.user?.following}
          />
        )}

        {/* Reshare & Repost Modal */}
        {showReshareModal && (
          <ReelReshareModal
            isOpen={showReshareModal}
            onClose={() => setShowReshareModal(false)}
            reel={currentItem}
            onOpenRemix={() => setShowRemixModal(true)}
            onOpenShare={() => setShowShare(true)}
            onSuccess={(data) => {
              if (data?.isReshared) {
                const updated = { ...currentItem, forwards: (currentItem.forwards || 0) + 1 };
                const updatedReels = reelData.map((r) => (r._id === currentItem._id ? updated : r));
                dispatch(setReelData(updatedReels));
              }
            }}
          />
        )}

        {/* Remix Modal */}
        {showRemixModal && (
          <RemixReelModal
            isOpen={showRemixModal}
            onClose={() => setShowRemixModal(false)}
            originalReel={currentItem}
            onSuccess={() => snackbar.success("Remix created!")}
          />
        )}

        {/* Reel 3-Dot Options & Auto-Scroll Modal */}
        {showOptionsModal && (
          <ReelOptionsModal
            isOpen={showOptionsModal}
            onClose={() => setShowOptionsModal(false)}
            reel={currentItem}
            isAuthor={isAuthor}
            isSaved={isSaved}
            onToggleSave={handleToggleSave}
            onOpenRemix={() => setShowRemixModal(true)}
            onOpenReshare={() => setShowReshareModal(true)}
            onOpenShare={() => setShowShare(true)}
            onOpenViewers={() => setShowViewers(true)}
            playbackSpeed={playbackSpeed}
            onChangePlaybackSpeed={handleChangePlaybackSpeed}
            applySpeedToAll={applySpeedToAll}
            onToggleApplySpeedToAll={handleToggleApplySpeedToAll}
            autoScroll={autoScroll}
            onToggleAutoScroll={onToggleAutoScroll}
            showCaptions={showCaptions}
            onToggleCaptions={handleToggleCaptions}
            onDeleteReel={() => {
              setShowOptionsModal(false);
              setShowDeleteModal(true);
            }}
            onNotInterested={() => {
              if (onNext) onNext();
            }}
            onToggleComments={handleToggleComments}
            commentsDisabled={commentsDisabled}
          />
        )}

        {/* AI Transparency Disclosure Modal */}
        {showAIInfoModal && (
          <AIInfoModal
            isOpen={showAIInfoModal}
            onClose={() => setShowAIInfoModal(false)}
            aiLabel={currentItem?.aiLabel}
            authorName={currentItem?.author?.name || `@${currentItem?.author?.userName}` || "The creator"}
          />
        )}

        {/* Likers Modal for Reels */}
        {showLikersModal && (
          <LikersModal
            isOpen={showLikersModal}
            onClose={() => setShowLikersModal(false)}
            reelId={currentItem?._id}
          />
        )}

        {/* Advanced Nested Comments Modal for Reels */}
        {showComments && (
          <CommentsModal
            isOpen={showComments}
            onClose={() => {
              setShowComments(false);
              setCommentsExpanded(false);
            }}
            reel={currentItem}
            isExpanded={commentsExpanded}
            onExpandChange={setCommentsExpanded}
          />
        )}

        {/* Save Reel to Custom Collections Modal */}
        {showCollectionsModal && (
          <CollectionsModal
            isOpen={showCollectionsModal}
            onClose={() => setShowCollectionsModal(false)}
            reelId={currentItem?._id}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <motion.div
            key="delete-reel-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowDeleteModal(false)}
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#181d28] border border-white/15 rounded-3xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Delete Reel?</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Are you sure you want to permanently delete this reel? This action cannot be undone and will delete all associated comments, likes, and analytics.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2.5 px-4 bg-white/10 hover:bg-white/15 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleConfirmDeleteReel}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReelCard;

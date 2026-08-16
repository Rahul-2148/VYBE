import axios from "axios";
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
  MessageCircle,
  X,
  Play,
  Pause,
  Zap,
  BadgeCheck,
  Trash2,
  MoreVertical,
  MoreHorizontal,
  Subtitles,
  Smartphone,
} from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { snackbar } from "../lib/snackbar";
import { GoHeart, GoHeartFill } from "react-icons/go";
import { IoSendSharp } from "react-icons/io5";
import { MdOutlineComment } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { SERVER_URL } from "../App";
import dp from "../assets/dp3.png";
import { setReelData } from "../redux/features/reelSlice";
import { setUserData } from "../redux/features/userSlice";
import FollowButton from "./FollowButton";
import ShareSheet from "./ShareSheet";
import RemixReelModal from "./RemixReelModal";
import HeartExplosion from "./HeartExplosion";
import ReelOptionsModal from "./ReelOptionsModal";
import AIInfoModal from "./AIInfoModal";
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
  const commentRef = useRef(null);
  const { userData } = useSelector((state) => state.user);
  const reelState = useSelector((state) => state.reel);
  const reelData = reelState?.reelData || [];

  const videoRef = useRef(null);
  const viewCountedRef = useRef(false);
  const endedTriggeredRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(() => {
    return window.__vybe_reels_muted !== undefined ? window.__vybe_reels_muted : true;
  });
  const [progress, setProgress] = useState(0);

  // Options & Auto-Scroll & Captions State
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showCaptions, setShowCaptions] = useState(() => {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem("vybe_reel_captions") === "true"
      : false;
  });
  const [commentsDisabled, setCommentsDisabled] = useState(
    Boolean(currentItem?.commentsDisabled)
  );
  
  // Heart Burst & Play/Pause Animation State
  const [showHeart, setShowHeart] = useState(false);
  const [showPlayPauseAnim, setShowPlayPauseAnim] = useState(false);
  const [playPauseIcon, setPlayPauseIcon] = useState("play");

  // Long Press 2X Speed State
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const longPressTimerRef = useRef(null);

  // Tap Gesture Counters (Single, Double, Triple Tap)
  const clickTimerRef = useRef(null);
  const tapCountRef = useRef(0);

  // Drawers & Modals
  const [showComments, setShowComments] = useState(false);
  const [message, setMessage] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showRemixModal, setShowRemixModal] = useState(false);
  const [showAIInfoModal, setShowAIInfoModal] = useState(false);
  const viewersRef = useRef(null);

  // Optimistic Like State
  const currentUserId = userData?._id || userData?.user?._id;
  const isInitiallyLiked = currentItem?.likes?.some((id) => (id._id || id) === currentUserId);
  const [isLiked, setIsLiked] = useState(isInitiallyLiked);
  const [likesCount, setLikesCount] = useState(currentItem?.likes?.length || 0);

  useEffect(() => {
    setIsLiked(currentItem?.likes?.some((id) => (id._id || id) === currentUserId));
    setLikesCount(currentItem?.likes?.length || 0);
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

  useEffect(() => {
    if (isActive) {
      endedTriggeredRef.current = false;
      const playPromise = videoRef.current?.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
      incrementView();
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
      endedTriggeredRef.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    if (currentItem && userData?.user) {
      const saved = (userData.user.savedReels || [])?.includes(currentItem._id) || currentItem.savedBy?.includes(userData.user._id);
      setIsSaved(saved);
    }
  }, [currentItem, userData]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = isFastForwarding ? 2.0 : playbackSpeed;
    }
  }, [playbackSpeed, isFastForwarding, isActive]);

  const handleToggleCaptions = () => {
    setShowCaptions((prev) => {
      const next = !prev;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("vybe_reel_captions", String(next));
      }
      return next;
    });
  };

  const handleToggleComments = async () => {
    try {
      const res = await api.patch(`/reel/toggle-comments/${currentItem?._id}`);
      setCommentsDisabled(res.data.commentsDisabled);
      snackbar.success(res.data.message);
    } catch {
      snackbar.error("Failed to update commenting settings");
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      const percent = (video.currentTime / video.duration) * 100;
      setProgress(percent);

      // Auto-scroll trigger when video finishes (within 0.25s of end)
      if (
        autoScroll &&
        onNext &&
        !endedTriggeredRef.current &&
        video.duration > 1 &&
        video.currentTime >= video.duration - 0.25
      ) {
        endedTriggeredRef.current = true;
        onNext();
      }
    }
  };

  // Zero-Jitter Optimistic Like Handler (Toggle for Heart Button)
  const handleOptimisticLike = async () => {
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
        : (currentItem.likes || []).filter((id) => (id._id || id) !== currentUserId),
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
      await api.post(`/reel/like/${currentItem?._id}`);
    } catch (error) {
      // Rollback on network failure
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
      snackbar.error("Failed to update like");
    }
  };

  // Dedicated Double Tap Like (Always forces like state + Heart Burst)
  const forceDoubleTapLike = async () => {
    setShowHeart(true);

    if (!isLiked) {
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
        await api.post(`/reel/like/${currentItem?._id}`);
      } catch (error) {
        setIsLiked(false);
        setLikesCount(likesCount);
      }
    }
  };

  // Tap Gesture Handler: Single Tap (Play/Pause), Double Tap (Like), Triple Tap (Comments)
  const handleVideoTap = (e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea") || e.target.closest("a")) return;

    tapCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    clickTimerRef.current = setTimeout(() => {
      const count = tapCountRef.current;
      tapCountRef.current = 0;

      if (count === 1) {
        if (showComments || showViewers || showShare) {
          setShowComments(false);
          setShowViewers(false);
          setShowShare(false);
          return;
        }

        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            setPlayPauseIcon("play");
          } else {
            video.pause();
            setIsPlaying(false);
            setPlayPauseIcon("pause");
          }
          setShowPlayPauseAnim(true);
          setTimeout(() => setShowPlayPauseAnim(false), 550);
        }

      } else if (count === 2) {
        forceDoubleTapLike();
      } else if (count >= 3) {
        setShowComments(true);
      }
    }, 350);
  };

  // Long Press Handler for 2X Speed & Lock
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("input")) return;

    longPressTimerRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.playbackRate = 2.0;
        setIsFastForwarding(true);
      }
    }, 300);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (isFastForwarding) {
      if (videoRef.current) {
        videoRef.current.playbackRate = 1.0;
      }
      setIsFastForwarding(false);
    }
  };

  const handleDeleteReel = async () => {
    try {
      const res = await api.delete(`/reel/delete/${currentItem?._id}`);
      if (res.data.success) {
        snackbar.success("Reel deleted successfully 🗑️");
        const updatedReels = reelData.filter((r) => r._id !== currentItem._id);
        dispatch(setReelData(updatedReels));
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to delete Reel");
    }
  };

  const handleToggleSave = async () => {
    try {
      const res = await api.post(`/reel/save/${currentItem?._id}`);
      if (res.data.success) {
        setIsSaved(res.data.isSaved);
        if (res.data.user) {
          dispatch(setUserData(res.data.user));
        }
        snackbar.success(res.data.message);
      }
    } catch (err) {
      snackbar.error("Failed to update bookmark.");
    }
  };

  const handleComment = async () => {
    if (!message.trim()) return;

    try {
      setCommentLoading(true);
      const result = await api.post(`/reel/comment/${currentItem?._id}`, { message });
      const updatedReel = result.data.reel;
      const updatedReels = reelData.map((r) => (r._id === currentItem._id ? updatedReel : r));

      dispatch(setReelData(updatedReels));

      const socket = getSocket();
      if (socket && result.data?.comment) {
        socket.emit("reel-comment-send", { reelId: currentItem._id, comment: result.data.comment });
      }

      setMessage("");
    } catch (error) {
      snackbar.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const incrementView = async () => {
    if (viewCountedRef.current) return;
    try {
      viewCountedRef.current = true;
      await api.post(`/reel/view/${currentItem?._id}`);
    } catch (error) {
      console.log("View increment failed");
    }
  };

  const watchStartRef = useRef(null);

  const handlePlay = () => {
    watchStartRef.current = Date.now();
  };

  const handlePause = async () => {
    if (!watchStartRef.current) return;
    const duration = Math.floor((Date.now() - watchStartRef.current) / 1000);
    watchStartRef.current = null;
    await api.post(`/reel/watch/${currentItem._id}`, { duration }).catch(() => null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            setPlayPauseIcon("play");
          } else {
            video.pause();
            setIsPlaying(false);
            setPlayPauseIcon("pause");
          }
          setShowPlayPauseAnim(true);
          setTimeout(() => setShowPlayPauseAnim(false), 550);
        }
      } else if (e.code === "ArrowDown" && onNext) {
        onNext();
      } else if (e.code === "ArrowUp" && onPrev) {
        onPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, showComments, showViewers, showShare, onNext, onPrev]);

  const audioId = currentItem?.audioTrack?.id || (typeof currentItem?.music === 'object' && currentItem?.music ? currentItem.music.id || currentItem.music.title : currentItem?.music) || "original";
  const audioName = currentItem?.audioTrack?.title || (typeof currentItem?.music === 'object' && currentItem?.music ? `${currentItem.music.title} - ${currentItem.music.artist}` : currentItem?.music) || "Original Audio";

  if (!currentItem || !currentItem._id) return null;

  return (
    <div
      onClick={handleVideoTap}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      className="w-full lg:w-[460px] h-[100vh] flex items-center justify-center border-x border-border relative overflow-hidden bg-bg select-none cursor-pointer"
    >
      
      {/* 2X SPEED BADGE OVERLAY */}
      {isFastForwarding && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[160] px-4 py-1.5 rounded-full bg-surface-overlay backdrop-blur border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-2 shadow-2xl animate-pulse pointer-events-none">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>2X SPEED</span>
        </div>
      )}

      {/* PLAY / PAUSE OVERLAY ANIMATION CIRCLE */}
      {showPlayPauseAnim && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-surface-overlay backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl animate-scale-pulse">
            {playPauseIcon === "play" ? (
              <Play className="w-10 h-10 text-text fill-white ml-1" />
            ) : (
              <Pause className="w-10 h-10 text-text fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Particle Heart Burst on double-tap */}
      <HeartExplosion show={showHeart} onComplete={() => setShowHeart(false)} />

      {/* OVERLAY BACKDROP FOR DRAWERS */}
      {(showComments || showViewers) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(false);
            setShowViewers(false);
            setShowShare(false);
          }}
          className="absolute inset-0 bg-bg/40 z-[150] backdrop-blur-[2px] transition-opacity cursor-pointer"
        />
      )}

      {/* COMMENTS DRAWER */}
      <div
        ref={commentRef}
        onClick={(e) => e.stopPropagation()}
        className={`absolute z-[200] bottom-0 w-full h-[500px] p-4 rounded-t-3xl bg-surface-inset/95 border-t border-border transition-transform duration-300 ease-out left-0 shadow-2xl flex flex-col justify-between ${
          showComments ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h1 className="text-text text-sm font-bold">Comments ({currentItem?.comments?.length || 0})</h1>
          <button
            onClick={() => setShowComments(false)}
            className="text-xs text-text-secondary hover:text-text font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>

        <div className="w-full flex-1 overflow-y-auto flex flex-col gap-3 py-3">
          {currentItem?.comments?.length === 0 ? (
            <div className="text-center text-text-muted text-sm font-medium mt-12">No comments yet. Be the first!</div>
          ) : (
            currentItem?.comments?.map((comment, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-xl bg-surface/50">
                <img
                  src={comment?.author?.profileImage?.url || dp}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover cursor-pointer"
                  onClick={() => navigate(`/profile/${comment?.author?.userName}`)}
                />
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text flex items-center gap-0.5">
                      {comment?.author?.userName}
                      {comment?.author?.isVerified && (
                        <VerifiedBadge size="xs" />
                      )}
                    </span>
                    <span className="text-[10px] text-text-muted">{moment(comment?.createdAt).fromNow()}</span>
                  </div>
                  <p className="text-text">{comment?.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input */}
        {commentsDisabled ? (
          <div className="w-full py-3 text-center text-xs text-text-muted font-semibold border-t border-border">
            Commenting is turned off for this reel
          </div>
        ) : (
          <div className="w-full pt-2 flex items-center gap-2 border-t border-border">
            <input
              type="text"
              className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-full text-xs text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
              placeholder="Add a comment..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleComment();
              }}
            />
            {message.trim() && (
              <button disabled={commentLoading} onClick={handleComment} className="p-2.5 bg-primary hover:bg-primary-hover rounded-full text-white cursor-pointer transition shadow-xs disabled:opacity-50">
                {commentLoading ? <ClipLoader size={16} color="white" /> : <IoSendSharp className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>

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
            currentItem.viewedBy.map((viewer, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface/60 transition">
                <div
                  className="flex items-center gap-2.5 cursor-pointer"
                  onClick={() => navigate(`/profile/${viewer?.userName}`)}
                >
                  <img
                    src={viewer?.profileImage?.url || dp}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-border"
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold text-text">@{viewer?.userName}</div>
                    <div className="text-[10px] text-text-secondary">{viewer?.name}</div>
                  </div>
                </div>
                {viewer?._id !== userData?.user?._id && (
                  <FollowButton
                    targetUserId={viewer?._id}
                    tailwind="px-3 py-1 bg-surface-hover hover:bg-surface-active text-text text-[10px] font-semibold rounded-full"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* VIDEO PLAYER WITH SMOOTH DRAWER TRANSITION & GESTURES */}
      <video
        onPlay={handlePlay}
        onPause={handlePause}
        ref={videoRef}
        autoPlay
        muted={isMuted}
        onEnded={(e) => {
          if (autoScroll && onNext) {
            if (!endedTriggeredRef.current) {
              endedTriggeredRef.current = true;
              onNext();
            }
          } else {
            e.target.currentTime = 0;
            e.target.play().catch(() => null);
          }
        }}
        playsInline
        src={getOptimizedMediaUrl(currentItem?.media?.url, "video")}
        className={`w-full h-full object-cover transition-all duration-300 ${
          showComments || showViewers ? "scale-[0.95] translate-y-[-24px] rounded-2xl" : "scale-100 translate-y-0"
        } ${isFastForwarding ? "brightness-110" : ""}`}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* CAPTIONS & SUBTITLES OVERLAY */}
      {showCaptions && currentItem?.caption && (
        <div className="absolute bottom-28 left-4 right-16 z-30 pointer-events-none animate-fade-in">
          <div className="inline-block px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white text-xs font-semibold border border-white/15 shadow-xl max-w-full truncate">
            💬 {currentItem.caption}
          </div>
        </div>
      )}

      {/* TOP CONTROLS */}
      {!isFastForwarding && (
        <div className="absolute top-4 right-4 z-[100] flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              window.__vybe_reels_muted = nextMuted;
            }}
            className="p-2 rounded-full bg-surface-overlay backdrop-blur text-white hover:bg-surface-overlay transition cursor-pointer interactive-btn"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* PROGRESS BAR */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-surface z-50">
        <div className="h-full bg-rose-500 transition-all duration-150 ease-linear" style={{ width: `${progress}%` }} />
      </div>

      {/* BOTTOM INFO OVERLAY */}
      {!isFastForwarding && (
        <div className="w-full absolute bottom-4 inset-x-0 p-4 flex justify-between items-end z-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
          <div className="space-y-3 max-w-[75%] pointer-events-auto">
            {/* Author */}
            <div className="flex items-center gap-2.5">
              <img
                src={currentItem?.author?.profileImage?.url || dp}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-border-strong cursor-pointer interactive-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${currentItem?.author?.userName}`);
                }}
              />
              <span
                className="text-white text-xs font-bold cursor-pointer hover:underline interactive-btn flex items-center gap-0.5"
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
                <FollowButton
                  targetUserId={currentItem?.author?._id}
                  tailwind="px-3 py-1 bg-rose-600 text-white text-[11px] font-semibold rounded-full shadow interactive-btn"
                />
              )}
            </div>

            {/* Location */}
            {currentItem?.location && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/explore/location/${encodeURIComponent(currentItem.location)}`);
                }}
                className="text-[10px] text-rose-400 font-semibold cursor-pointer hover:underline flex items-center gap-0.5 mt-0.5 interactive-btn"
              >
                📍 {currentItem.location}
              </div>
            )}

            {/* Caption */}
            {currentItem?.caption && <p className="text-xs text-white font-normal line-clamp-2 pointer-events-none">{currentItem.caption}</p>}

            {/* Made with AI Pill Badge */}
            {currentItem?.aiLabel?.isAIGenerated && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  setShowAIInfoModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-purple-400/40 text-[10px] font-semibold text-purple-300 active:scale-95 transition-all shadow-md cursor-pointer pointer-events-auto"
                title="Made with AI • Click for info"
              >
                <Sparkles className="w-2.5 h-2.5 text-purple-400 fill-purple-400/20 animate-pulse" />
                <span>Made with AI</span>
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
              const artist = trackObj?.artist || "Original Audio";
              const trackParam = trackObj?.id || trackObj?.title || `${currentItem?.author?.userName}-original`;

              return (
                <div
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

          {/* RIGHT SIDE ACTION BUTTONS */}
          <div className="flex flex-col items-center gap-5 text-white pointer-events-auto">
            {/* Like */}
            <button onClick={handleOptimisticLike} className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur group-hover:bg-surface-overlay transition">
                {isLiked ? (
                  <GoHeartFill className="w-6 h-6 text-rose-500 scale-110 transition-transform" />
                ) : (
                  <GoHeart className="w-6 h-6 text-white group-hover:text-rose-400 transition" />
                )}
              </div>
              <span className="text-[11px] font-semibold">{likesCount}</span>
            </button>

            {/* Comment */}
            <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur group-hover:bg-surface-overlay transition">
                <MdOutlineComment className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-semibold">{currentItem?.comments?.length || 0}</span>
            </button>

            {/* Share */}
            <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur group-hover:bg-surface-overlay transition">
                <Send className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold">{currentItem?.forwards || 0}</span>
            </button>

            {/* Save Bookmark */}
            <button onClick={handleToggleSave} className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur group-hover:bg-surface-overlay transition">
                {isSaved ? <BookmarkCheck className="w-5 h-5 text-amber-400" /> : <Bookmark className="w-5 h-5 text-white" />}
              </div>
            </button>

            {/* Remix */}
            <button onClick={() => setShowRemixModal(true)} className="flex flex-col items-center gap-1 group cursor-pointer" title="Remix Reel">
              <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur group-hover:bg-surface-overlay transition">
                <Repeat className="w-5 h-5 text-rose-400" />
              </div>
            </button>

            {/* Views & Insights */}
            <button onClick={() => setShowViewers(true)} className="flex flex-col items-center gap-1 group cursor-pointer" title="Reel Views & Insights">
              <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur group-hover:bg-surface-overlay transition">
                <Eye className="w-5 h-5 text-white group-hover:text-rose-400 transition" />
              </div>
              <span className="text-[11px] font-semibold">{currentItem?.views || 0}</span>
            </button>

            {/* 3-Dot Options & Settings */}
            <button
              onClick={() => setShowOptionsModal(true)}
              className="flex flex-col items-center gap-1 group cursor-pointer"
              title="Reel Options & Auto-Scroll"
            >
              <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur group-hover:bg-surface-overlay transition text-white group-hover:text-rose-400">
                <MoreVertical className="w-5 h-5" />
              </div>
            </button>

            {/* Delete Reel (Owner only) */}
            {(currentItem?.author?._id === currentUserId || currentItem?.author === currentUserId) && (
              <button onClick={handleDeleteReel} className="flex flex-col items-center gap-1 group cursor-pointer" title="Delete Reel">
                <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur hover:bg-rose-950/80 transition text-rose-500 hover:text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Share Sheet */}
      <ShareSheet open={showShare} onClose={() => setShowShare(false)} entity={currentItem} entityType="reel" following={userData?.user?.following} />

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
      <ReelOptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        reel={currentItem}
        isAuthor={currentItem?.author?._id === currentUserId || currentItem?.author === currentUserId}
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
        onOpenRemix={() => setShowRemixModal(true)}
        onOpenShare={() => setShowShare(true)}
        playbackSpeed={playbackSpeed}
        onChangePlaybackSpeed={setPlaybackSpeed}
        autoScroll={autoScroll}
        onToggleAutoScroll={onToggleAutoScroll}
        showCaptions={showCaptions}
        onToggleCaptions={handleToggleCaptions}
        onDeleteReel={handleDeleteReel}
        onNotInterested={() => {
          if (onNext) onNext();
        }}
        onToggleComments={handleToggleComments}
        commentsDisabled={commentsDisabled}
      />

      {/* AI Transparency Disclosure Modal */}
      <AIInfoModal
        isOpen={showAIInfoModal}
        onClose={() => setShowAIInfoModal(false)}
        aiLabel={currentItem?.aiLabel}
        authorName={currentItem?.author?.name || `@${currentItem?.author?.userName}` || "The creator"}
      />
    </div>
  );
};

export default ReelCard;

import axios from "axios";
import { Eye, Send, Bookmark, BookmarkCheck, Repeat, Disc, Volume2, VolumeX, Sparkles, MessageCircle, X, Play, Pause, Zap, BadgeCheck, Trash2 } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GoHeart, GoHeartFill } from "react-icons/go";
import { IoSendSharp } from "react-icons/io5";
import { MdOutlineComment } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { SERVER_URL } from "../App";
import dp from "../assets/dp3.png";
import { setLoopData } from "../redux/features/loopSlice";
import FollowButton from "./FollowButton";
import ShareSheet from "./ShareSheet";
import RemixReelModal from "./RemixReelModal";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";

export const LoopCard = ({ loop, isActive = true, onNext, onPrev }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const commentRef = useRef(null);
  const { userData } = useSelector((state) => state.user);
  const { loopData } = useSelector((state) => state.loop);

  const videoRef = useRef(null);
  const viewCountedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(() => {
    return window.__vybe_reels_muted !== undefined ? window.__vybe_reels_muted : true;
  });
  const [progress, setProgress] = useState(0);
  
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
  const viewersRef = useRef(null);

  // Optimistic Like State
  const currentUserId = userData?._id || userData?.user?._id;
  const isInitiallyLiked = loop?.likes?.some((id) => (id._id || id) === currentUserId);
  const [isLiked, setIsLiked] = useState(isInitiallyLiked);
  const [likesCount, setLikesCount] = useState(loop?.likes?.length || 0);

  useEffect(() => {
    setIsLiked(loop?.likes?.some((id) => (id._id || id) === currentUserId));
    setLikesCount(loop?.likes?.length || 0);
  }, [loop, currentUserId]);

  const loopRef = useRef(loop);
  const loopDataRef = useRef(loopData);

  useEffect(() => {
    loopRef.current = loop;
    loopDataRef.current = loopData;
  });

  // Realtime Socket Sync for Likes & Comments
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !loop?._id) return;

    const handleSocketLike = (data) => {
      const currentLoop = loopRef.current;
      const currentLoopData = loopDataRef.current;
      if (data.loopId === currentLoop?._id) {
        let updatedLikes = [...(currentLoop.likes || [])];
        const hasUser = updatedLikes.some((id) => (id._id || id) === data.userId);
        if (data.isLiked && !hasUser) {
          updatedLikes.push({ _id: data.userId });
        } else if (!data.isLiked && hasUser) {
          updatedLikes = updatedLikes.filter((id) => (id._id || id) !== data.userId);
        }

        const updatedLoop = { ...currentLoop, likes: updatedLikes };
        const updatedLoops = currentLoopData?.map((l) => (l._id === currentLoop._id ? updatedLoop : l));
        dispatch(setLoopData(updatedLoops));
      }
    };

    const handleSocketComment = (data) => {
      const currentLoop = loopRef.current;
      const currentLoopData = loopDataRef.current;
      if (data.loopId === currentLoop?._id && data.comment) {
        const updatedComments = [...(currentLoop.comments || []), data.comment];
        const updatedLoop = { ...currentLoop, comments: updatedComments };
        const updatedLoops = currentLoopData?.map((l) => (l._id === currentLoop._id ? updatedLoop : l));
        dispatch(setLoopData(updatedLoops));
      }
    };

    socket.on("loop-like-updated", handleSocketLike);
    socket.on("loop-comment-updated", handleSocketComment);

    return () => {
      socket.off("loop-like-updated", handleSocketLike);
      socket.off("loop-comment-updated", handleSocketComment);
    };
  }, [loop?._id, dispatch]);

  useEffect(() => {
    if (isActive) {
      const playPromise = videoRef.current?.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
      incrementView();
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (loop && userData?.user) {
      const saved = userData.user.savedLoops?.includes(loop._id) || loop.savedBy?.includes(userData.user._id);
      setIsSaved(saved);
    }
  }, [loop, userData]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      const percent = (video.currentTime / video.duration) * 100;
      setProgress(percent);
    }
  };

  // Zero-Jitter Optimistic Like Handler (Toggle for Heart Button)
  const handleOptimisticLike = async () => {
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    // Instant Zero-Jitter UI Update
    setIsLiked(nextLiked);
    setLikesCount(nextCount);

    // Update Redux immediately
    const updatedLoop = {
      ...loop,
      likes: nextLiked
        ? [...(loop.likes || []), currentUserId]
        : (loop.likes || []).filter((id) => (id._id || id) !== currentUserId),
    };
    const updatedLoops = loopData?.map((l) => (l._id === loop._id ? updatedLoop : l));
    dispatch(setLoopData(updatedLoops));

    // Emit Socket.IO event in realtime
    const socket = getSocket();
    if (socket) {
      socket.emit("loop-like-toggle", {
        loopId: loop._id,
        userId: currentUserId,
        isLiked: nextLiked,
        likesCount: nextCount,
      });
    }

    try {
      await api.post(`/loop/like/${loop?._id}`);
    } catch (error) {
      // Rollback on network failure
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
      toast.error("Failed to update like");
    }
  };

  // Dedicated Instagram-Style Double Tap Like (Always forces like state + Heart Burst)
  const forceDoubleTapLike = async () => {
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 650);

    if (!isLiked) {
      const nextCount = likesCount + 1;
      setIsLiked(true);
      setLikesCount(nextCount);

      const updatedLoop = {
        ...loop,
        likes: [...(loop.likes || []), currentUserId],
      };
      const updatedLoops = loopData?.map((l) => (l._id === loop._id ? updatedLoop : l));
      dispatch(setLoopData(updatedLoops));

      const socket = getSocket();
      if (socket) {
        socket.emit("loop-like-toggle", {
          loopId: loop._id,
          userId: currentUserId,
          isLiked: true,
          likesCount: nextCount,
        });
      }

      try {
        await api.post(`/loop/like/${loop?._id}`);
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
        // SINGLE TAP: Toggle Play / Pause with Instagram Circle Animation Overlay!
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
        // DOUBLE TAP: Trigger Instagram Heart Burst & Force Like!
        forceDoubleTapLike();

      } else if (count >= 3) {
        // TRIPLE TAP: Open Comments Drawer!
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

  const handleDeleteLoop = async () => {
    if (!window.confirm("Are you sure you want to delete this Reel? This action cannot be undone.")) return;
    try {
      const res = await api.delete(`/loop/delete/${loop?._id}`);
      if (res.data.success) {
        toast.success("Reel deleted successfully");
        const updatedLoops = loopData.filter((l) => l._id !== loop._id);
        dispatch(setLoopData(updatedLoops));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete Reel");
    }
  };

  const handleToggleSave = async () => {
    try {
      const res = await api.post(`/loop/save/${loop?._id}`);
      if (res.data.success) {
        setIsSaved(res.data.isSaved);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error("Failed to update bookmark.");
    }
  };

  const handleComment = async () => {
    if (!message.trim()) return;

    try {
      setCommentLoading(true);
      const result = await api.post(`/loop/comment/${loop?._id}`, { message });
      const updatedLoop = result.data.loop;
      const updatedLoops = loopData.map((l) => (l._id === loop._id ? updatedLoop : l));

      dispatch(setLoopData(updatedLoops));

      const socket = getSocket();
      if (socket && result.data?.comment) {
        socket.emit("loop-comment-send", { loopId: loop._id, comment: result.data.comment });
      }

      setMessage("");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const incrementView = async () => {
    if (viewCountedRef.current) return;
    try {
      viewCountedRef.current = true;
      await api.post(`/loop/view/${loop?._id}`);
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
    await api.post(`/loop/watch/${loop._id}`, { duration }).catch(() => null);
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

  const audioId = loop?.audioTrack?.id || (typeof loop?.music === 'object' && loop?.music ? loop.music.id || loop.music.title : loop?.music) || "original";
  const audioName = loop?.audioTrack?.title || (typeof loop?.music === 'object' && loop?.music ? `${loop.music.title} - ${loop.music.artist}` : loop?.music) || "Original Audio";

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

      {/* INSTAGRAM PLAY / PAUSE OVERLAY ANIMATION CIRCLE */}
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

      {/* 60 FPS HEART BURST DOUBLE-TAP ANIMATION */}
      {showHeart && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 heart-animation z-50 pointer-events-none">
          <GoHeartFill className="w-28 h-28 text-rose-500 drop-shadow-2xl animate-ping" />
        </div>
      )}

      {/* OVERLAY BACKDROP FOR DRAWERS */}
      {(showComments || showViewers) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(false);
            setShowViewers(false);
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
          <h1 className="text-text text-sm font-bold">Comments ({loop?.comments?.length || 0})</h1>
          <button
            onClick={() => setShowComments(false)}
            className="text-xs text-text-secondary hover:text-text font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>

        <div className="w-full flex-1 overflow-y-auto flex flex-col gap-3 py-3">
          {loop?.comments?.length === 0 ? (
            <div className="text-center text-text-muted text-sm font-medium mt-12">No comments yet. Be the first!</div>
          ) : (
            loop?.comments?.map((comment, index) => (
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
                        <BadgeCheck className="h-3.5 w-3.5 fill-[#0095f6] text-white shrink-0" />
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
        <div className="w-full pt-2 flex items-center gap-2 border-t border-border">
          <input
            type="text"
            className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-full text-xs text-text outline-none focus:border-rose-500"
            placeholder="Add a comment..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleComment();
            }}
          />
          {message.trim() && (
            <button disabled={commentLoading} onClick={handleComment} className="p-2.5 bg-rose-600 hover:bg-rose-500 rounded-full text-text cursor-pointer transition">
              {commentLoading ? <ClipLoader size={16} color="white" /> : <IoSendSharp className="w-4 h-4" />}
            </button>
          )}
        </div>
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
            <span>Reel Views ({loop?.viewedBy?.length || loop?.views || 0})</span>
          </h1>
          <button onClick={() => setShowViewers(false)} className="text-xs text-text-secondary hover:text-text font-semibold cursor-pointer">
            Done
          </button>
        </div>

        <div className="w-full flex-1 overflow-y-auto flex flex-col gap-2 py-3">
          {!loop?.viewedBy || loop?.viewedBy?.length === 0 ? (
            <div className="text-center text-text-muted text-xs font-medium mt-12">No views recorded yet</div>
          ) : (
            loop.viewedBy.map((viewer, idx) => (
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

      {/* VIDEO PLAYER WITH INSTAGRAM-STYLE SMOOTH DRAWER TRANSITION & GESTURES */}
      <video
        onPlay={handlePlay}
        onPause={handlePause}
        ref={videoRef}
        autoPlay
        preload="metadata"
        muted={isMuted}
        loop
        playsInline
        src={loop?.media?.url}
        className={`w-full h-full object-cover transition-all duration-300 ${
          showComments || showViewers ? "scale-[0.95] translate-y-[-24px] rounded-2xl" : "scale-100 translate-y-0"
        } ${isFastForwarding ? "brightness-110" : ""}`}
        onTimeUpdate={handleTimeUpdate}
      />

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
                src={loop?.author?.profileImage?.url || dp}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-border-strong cursor-pointer interactive-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${loop?.author?.userName}`);
                }}
              />
              <span
                className="text-white text-xs font-bold cursor-pointer hover:underline interactive-btn flex items-center gap-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${loop?.author?.userName}`);
                }}
              >
                @{loop?.author?.userName}
                {loop?.author?.isVerified && (
                  <BadgeCheck className="h-4 w-4 fill-[#0095f6] text-white shrink-0" />
                )}
              </span>

              {loop?.author?._id !== userData?.user?._id && (
                <FollowButton
                  targetUserId={loop?.author?._id}
                  tailwind="px-3 py-1 bg-rose-600 text-white text-[11px] font-semibold rounded-full shadow interactive-btn"
                />
              )}
            </div>

            {/* Location */}
            {loop?.location && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/explore/location/${encodeURIComponent(loop.location)}`);
                }}
                className="text-[10px] text-rose-400 font-semibold cursor-pointer hover:underline flex items-center gap-0.5 mt-0.5 interactive-btn"
              >
                📍 {loop.location}
              </div>
            )}

            {/* Caption */}
            {loop?.caption && <p className="text-xs text-white font-normal line-clamp-2 pointer-events-none">{loop.caption}</p>}

            {/* Audio Track & Spinning Disc */}
            {(() => {
              let trackObj = loop?.audioTrack || loop?.music;
              if (typeof trackObj === "string") {
                try {
                  trackObj = JSON.parse(trackObj);
                } catch {
                  trackObj = { title: trackObj };
                }
              }
              const title = trackObj?.title || `${loop?.author?.userName || "Original"} • Audio`;
              const artist = trackObj?.artist || "Original Audio";
              const trackParam = trackObj?.id || trackObj?.title || `${loop?.author?.userName}-original`;

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
              <span className="text-[11px] font-semibold">{loop?.comments?.length || 0}</span>
            </button>

            {/* Share */}
            <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur group-hover:bg-surface-overlay transition">
                <Send className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold">{loop?.forwards || 0}</span>
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
              <span className="text-[11px] font-semibold">{loop?.views || 0}</span>
            </button>

            {/* Delete Reel (Owner only) */}
            {(loop?.author?._id === currentUserId || loop?.author === currentUserId) && (
              <button onClick={handleDeleteLoop} className="flex flex-col items-center gap-1 group cursor-pointer" title="Delete Reel">
                <div className="p-2.5 rounded-full bg-bg/40 backdrop-blur hover:bg-rose-950/80 transition text-rose-500 hover:text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Share Sheet */}
      <ShareSheet open={showShare} onClose={() => setShowShare(false)} entity={loop} entityType="reel" following={userData?.user?.following} />

      {/* Remix Modal */}
      {showRemixModal && (
        <RemixReelModal
          isOpen={showRemixModal}
          onClose={() => setShowRemixModal(false)}
          originalLoop={loop}
          onSuccess={() => toast.success("Remix created!")}
        />
      )}
    </div>
  );
};

export default LoopCard;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Eye, Heart, Send, X, Volume2, VolumeX,
  Share2, Pin
} from "lucide-react";
import { useSelector } from "react-redux";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import VerifiedBadge from "../components/VerifiedBadge";
import FollowButton from "../components/FollowButton";
import dp from "../assets/dp3.png";

/**
 * LiveRoom — Instagram-Accurate Live Stream Viewer Room
 * 
 * - Fullscreen dark video viewport with WebRTC remote track
 * - Top bar: Host identity, Verified badge, Follow button, Live badge & viewer count
 * - Double tap screen to burst heart ripple
 * - Floating ascending hearts on right
 * - Semi-transparent bottom-left scrolling comments
 * - Clean view toggle (tap screen to hide/show UI)
 * - Post-live ended summary screen
 */
export const LiveRoom = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const { userData } = useSelector((state) => state.user);
  const currentUser = userData?.user || userData;

  // Stream Info & State
  const [liveStream, setLiveStream] = useState(null);
  const [streamEnded, setStreamEnded] = useState(false);
  const [endStats, setEndStats] = useState(null);
  const [viewerCount, setViewerCount] = useState(1);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [_loading, setLoading] = useState(true);

  // In-Stream Interactions
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [pinnedComment, setPinnedComment] = useState(null);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [screenRippleHeart, setScreenRippleHeart] = useState(null);
  const [cleanViewMode, setCleanViewMode] = useState(false);

  // Audio / Video
  const [isMuted, setIsMuted] = useState(false);
  const [showAutoplayPrompt, setShowAutoplayPrompt] = useState(false);
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const heartIntervalRef = useRef(null);

  // 3. Heart Burst Generation & Ripple
  const triggerFloatingHeart = useCallback(() => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const colors = ["#ec4899", "#f43f5e", "#a855f7", "#3b82f6", "#eab308", "#10b981", "#ff007f", "#8b5cf6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setFloatingHearts((prev) => [
      ...prev,
      { id, x: Math.random() * 40 - 20, color: randomColor, size: 24 + Math.random() * 14 },
    ]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  }, []);

  const handleSendHeart = (burst = 1) => {
    for (let i = 0; i < burst; i++) {
      triggerFloatingHeart();
    }
    const socket = getSocket();
    socket?.emit("send-live-heart", { streamId, count: burst });
  };

  // 2. Join Stream & WebRTC Signal Handling
  useEffect(() => {
    if (!streamId) return;

    let mounted = true;
    const socket = getSocket();
    if (!socket) return;

    api
      .get(`/live/details/${streamId}`)
      .then((res) => {
        if (mounted && res.data?.success && res.data.live) {
          setLiveStream(res.data.live);
          setViewerCount(res.data.live.viewers?.length || 1);
          setPinnedComment(res.data.live.pinnedComment || null);
          setCommentsDisabled(Boolean(res.data.live.commentsDisabled));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.warn("fetchLiveDetails error", err);
          snackbar.error("Live video is unavailable or has ended.");
          navigate("/explore");
          setLoading(false);
        }
      });

    socket.emit("join-live-stream", {
      streamId,
      user: {
        _id: currentUser?._id,
        userName: currentUser?.userName,
        profileImage: currentUser?.profileImage,
      },
    });

    const handleSignalReceived = async ({ sdp, candidate }) => {
      if (!pcRef.current) return;
      try {
        if (sdp) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          if (sdp.type === "offer") {
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socket.emit("live:signal", { streamId, sdp: answer });
          }
        }
        if (candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn("Viewer WebRTC signal error:", err);
      }
    };

    const handleCommentReceived = ({ comment }) => {
      setComments((prev) => [...prev, comment]);
    };

    const handleHeartReceived = ({ count = 1 }) => {
      for (let i = 0; i < count; i++) {
        triggerFloatingHeart();
      }
    };

    const handleViewerCountUpdated = ({ viewerCount: newCount }) => {
      if (newCount) setViewerCount(newCount);
    };

    const handlePinnedCommentUpdated = ({ pinnedComment: newPin }) => {
      setPinnedComment(newPin);
    };

    const handleCommentsToggled = ({ commentsDisabled: isDisabled }) => {
      setCommentsDisabled(isDisabled);
      snackbar.info(isDisabled ? "Host turned off commenting" : "Host turned on commenting");
    };

    const handleStreamEnded = ({ stats }) => {
      setStreamEnded(true);
      setEndStats(stats || {});
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };

    socket.on("live:signal-received", handleSignalReceived);
    socket.on("live-comment-received", handleCommentReceived);
    socket.on("live-heart-received", handleHeartReceived);
    socket.on("live:viewer-count-updated", handleViewerCountUpdated);
    socket.on("live:pinned-comment-updated", handlePinnedCommentUpdated);
    socket.on("live:comments-toggled", handleCommentsToggled);
    socket.on("live-stream-ended", handleStreamEnded);

    const heartInterval = heartIntervalRef.current;

    return () => {
      socket.emit("leave-live-stream", { streamId });
      socket.off("live:signal-received", handleSignalReceived);
      socket.off("live-comment-received", handleCommentReceived);
      socket.off("live-heart-received", handleHeartReceived);
      socket.off("live:viewer-count-updated", handleViewerCountUpdated);
      socket.off("live:pinned-comment-updated", handlePinnedCommentUpdated);
      socket.off("live:comments-toggled", handleCommentsToggled);
      socket.off("live-stream-ended", handleStreamEnded);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (heartInterval) clearInterval(heartInterval);
      mounted = false;
    };
  }, [streamId, triggerFloatingHeart, currentUser?._id, currentUser?.userName, currentUser?.profileImage, navigate]);

  // Double Tap Video to Heart Burst with Ripple
  const handleDoubleTapScreen = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setScreenRippleHeart({ x, y, id: Date.now() });
    setTimeout(() => setScreenRippleHeart(null), 900);
    handleSendHeart(3);
  };

  const handleSendComment = (e) => {
    e?.preventDefault();
    if (!commentInput.trim() || !streamId || commentsDisabled) return;

    const socket = getSocket();
    const commentPayload = {
      text: commentInput.trim(),
      user: currentUser?._id,
      userName: currentUser?.userName || "Viewer",
      userAvatar: currentUser?.profileImage?.url || "",
      isVerified: currentUser?.isVerified,
    };

    socket?.emit("send-live-comment", {
      streamId,
      comment: commentPayload,
    });

    setComments((prev) => [...prev, { ...commentPayload, _id: Date.now().toString(), createdAt: new Date() }]);
    setCommentInput("");
  };

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `${hostUser?.userName}'s Live Stream`,
        text: `Watch @${hostUser?.userName}'s live stream on VYBE!`,
        url: window.location.href,
      }).catch(() => null);
    } else {
      navigator.clipboard.writeText(window.location.href);
      snackbar.success("Live link copied to clipboard!");
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      if (!videoRef.current.muted) {
        setShowAutoplayPrompt(false);
      }
    }
  };

  const hostUser = liveStream?.host;

  return (
    <div className="fixed inset-0 z-[700] bg-black flex items-center justify-center select-none overflow-hidden p-0 sm:p-4">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* STREAM ENDED SCREEN */}
      {/* ───────────────────────────────────────────────────────────── */}
      {streamEnded ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-sm p-6 bg-zinc-950 border border-zinc-800 rounded-3xl text-center space-y-4 shadow-2xl m-4"
        >
          <div className="w-16 h-16 rounded-full bg-rose-600/20 text-rose-500 mx-auto flex items-center justify-center">
            <Radio className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Live Video Has Ended</h2>
          <p className="text-xs text-zinc-400">
            Thank you for watching @{hostUser?.userName || "Creator"}'s live stream.
          </p>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-around text-center">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Peak Viewers</span>
              <p className="text-lg font-extrabold text-white">{endStats?.peakViewers || viewerCount}</p>
            </div>
            <div className="w-[1px] h-8 bg-zinc-800" />
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Comments</span>
              <p className="text-lg font-extrabold text-white">{endStats?.totalComments || comments.length}</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/explore")}
            className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-bold rounded-2xl shadow-xl hover:opacity-95 transition cursor-pointer"
          >
            Explore More Creators
          </button>
        </motion.div>
      ) : (
        /* ───────────────────────────────────────────────────────────── */
        /* ACTIVE VIEWER BROADCAST ROOM */
        /* ───────────────────────────────────────────────────────────── */
        <div className="relative w-full max-w-md h-full sm:h-[94vh] bg-black sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-zinc-900">
          {/* Main WebRTC Video Viewport */}
          <div
            onDoubleClick={handleDoubleTapScreen}
            onClick={() => setCleanViewMode(!cleanViewMode)}
            className="absolute inset-0 bg-zinc-950 overflow-hidden flex items-center justify-center cursor-pointer"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Tap to Unmute Overlay */}
            {showAutoplayPrompt && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                  <VolumeX className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold bg-white/10 px-4 py-2 rounded-full border border-white/20">
                  Tap to Unmute Audio 🔊
                </span>
              </button>
            )}

            {/* Double Tap Heart Ripple */}
            <AnimatePresence>
              {screenRippleHeart && (
                <motion.div
                  key={screenRippleHeart.id}
                  initial={{ scale: 0, opacity: 0.9 }}
                  animate={{ scale: [0.5, 1.4, 1.1], opacity: [1, 0.9, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ left: screenRippleHeart.x - 40, top: screenRippleHeart.y - 40 }}
                  className="absolute pointer-events-none z-30"
                >
                  <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* OVERLAY UI (HIDDEN IN CLEAN VIEW MODE) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {!cleanViewMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 w-full h-full flex flex-col justify-between p-3 sm:p-4 pointer-events-none"
              >
                {/* Top Bar: Host info, Follow, Live Badge, Viewers, Exit */}
                <div className="flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-2">
                    {/* Host Avatar & Name */}
                    <div
                      onClick={() => hostUser?._id && navigate(`/profile/${hostUser.userName}`)}
                      className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1 pr-3 rounded-full border border-white/10 cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-rose-500">
                        <img
                          src={hostUser?.profileImage?.url || hostUser?.profileImage || dp}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white max-w-[90px] truncate">
                          {hostUser?.userName || "Creator"}
                        </span>
                        {hostUser?.isVerified && <VerifiedBadge size="sm" />}
                      </div>
                    </div>

                    {/* Follow Button */}
                    {hostUser?._id && currentUser?._id !== hostUser._id && (
                      <FollowButton
                        targetUserId={hostUser._id}
                        variant="minimal"
                        className="scale-90"
                      />
                    )}
                  </div>

                  {/* Right Header: LIVE pill, Viewer count, Mute, Close */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-rose-600/40 animate-pulse">
                      <Radio className="w-3 h-3" />
                      <span>LIVE</span>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[11px] font-bold border border-white/10">
                      <Eye className="w-3 h-3 text-zinc-300" />
                      <span>{viewerCount}</span>
                    </div>

                    <button
                      onClick={toggleMute}
                      className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => navigate("/explore")}
                      className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pinned Comment Banner */}
                {pinnedComment && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="my-2 p-2.5 bg-black/75 backdrop-blur-md border border-white/15 rounded-2xl flex items-center gap-2 shadow-xl pointer-events-auto"
                  >
                    <Pin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <p className="text-xs text-white truncate">
                      <span className="font-bold text-pink-300 mr-1.5">@{pinnedComment.userName}:</span>
                      {pinnedComment.text}
                    </p>
                  </motion.div>
                )}

                {/* Floating Hearts Ascending Stream */}
                <div className="absolute right-4 bottom-20 pointer-events-none w-16 h-72 overflow-hidden z-20 flex flex-col justify-end items-center">
                  <AnimatePresence>
                    {floatingHearts.map((heart) => (
                      <motion.div
                        key={heart.id}
                        initial={{ opacity: 1, y: 0, scale: 0.6, x: heart.x }}
                        animate={{ opacity: 0, y: -240, scale: 1.2, x: heart.x * 1.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.8, ease: "easeOut" }}
                        className="absolute"
                      >
                        <Heart
                          className="fill-current drop-shadow-md"
                          style={{ color: heart.color, width: heart.size, height: heart.size }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Bottom Comments & Input Controls */}
                <div className="space-y-3 pointer-events-auto">
                  {/* Comments Feed */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-none flex flex-col-reverse">
                    <AnimatePresence>
                      {[...comments].reverse().slice(0, 8).map((c, idx) => (
                        <motion.div
                          key={c._id || c.id || `${c.userName || "user"}_${c.text || ""}_${idx}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="inline-flex items-center gap-2 max-w-[85%] px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md text-white text-xs"
                        >
                          <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/20">
                            <img src={c.userAvatar || dp} alt="" className="w-full h-full object-cover" />
                          </div>
                          <p className="truncate">
                            <span className="font-bold text-zinc-200 mr-1.5">@{c.userName}</span>
                            <span>{c.text}</span>
                          </p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center gap-2">
                    {/* Comment Input */}
                    {!commentsDisabled ? (
                      <form onSubmit={handleSendComment} className="flex-1 flex items-center">
                        <div className="w-full flex items-center bg-black/60 backdrop-blur-md rounded-full border border-white/15 px-3 py-1.5">
                          <input
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full bg-transparent text-white text-xs placeholder:text-zinc-400 focus:outline-none"
                          />
                          {commentInput.trim() && (
                            <button type="submit" className="text-pink-400 hover:text-pink-300 ml-1">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </form>
                    ) : (
                      <div className="flex-1 py-2 px-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[11px] text-zinc-400 text-center">
                        Host turned off commenting
                      </div>
                    )}

                    {/* Share Button */}
                    <button
                      onClick={handleShareLink}
                      className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Heart Button */}
                    <button
                      onClick={() => handleSendHeart(1)}
                      className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-pink-400 hover:scale-110 active:scale-95 transition cursor-pointer"
                    >
                      <Heart className="w-5 h-5 fill-pink-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default LiveRoom;

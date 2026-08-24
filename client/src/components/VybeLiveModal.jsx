import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Eye, Heart, Send, X, Users, MessageSquare, Mic, MicOff, Video,
  VideoOff, RefreshCw, Pin, PinOff, MessageSquareOff, Download,
  Share2, ArrowRight, CheckCircle2, Flame, Sparkles, UserPlus, Sliders,
  Lock, Globe, Shield, Trash2, AlertCircle
} from "lucide-react";
import { useSelector } from "react-redux";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import VerifiedBadge from "./VerifiedBadge";
import ShareLiveAsReelModal from "./ShareLiveAsReelModal";
import dp from "../assets/dp3.png";

/**
 * VybeLiveModal — Instagram-Accurate Go Live Experience
 * 
 * 1. Preview: Fullscreen camera, Audience (Everyone / Close Friends), Title, Go Live CTA
 * 2. Live: Real-time broadcast, WebRTC signaling, MediaRecorder local capture, chat & hearts
 * 3. Ended: Post-broadcast summary with Share as Reel, Download, and Archive
 */
export const VybeLiveModal = ({ isOpen, onClose }) => {
  const { userData } = useSelector((state) => state.user);
  const currentUser = userData?.user || userData;

  // Lifecycle Stage: "preview" | "countdown" | "live" | "ended"
  const [stage, setStage] = useState("preview");
  const [countdown, setCountdown] = useState(3);

  // Setup Options
  const [streamTitle, setStreamTitle] = useState("");
  const [audience, setAudience] = useState("everyone"); // "everyone" | "close_friends"
  const [facingMode, setFacingMode] = useState("user");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Stream Info & Stats
  const [streamId, setStreamId] = useState(null);
  const [duration, setDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(1);
  const [viewersList, setViewersList] = useState([]);
  const [streamStats, setStreamStats] = useState(null);
  const [totalHeartsCount, setTotalHeartsCount] = useState(0);

  // In-Stream Interactions
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [pinnedComment, setPinnedComment] = useState(null);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);

  // Drawers & Modals
  const [activeDrawer, setActiveDrawer] = useState(null); // null | "viewers" | "settings"
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Media & Recording Refs
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // viewerSocketId -> RTCPeerConnection
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const timerRef = useRef(null);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Camera Lifecycle (Preview & Live)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    const startCamera = async () => {
      try {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: true,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera init failed:", err);
        snackbar.error("Camera and microphone permissions are required to go live.");
      }
    };

    startCamera();

    return () => {
      isSubscribed = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, facingMode]);

  // Duration Timer
  useEffect(() => {
    if (stage === "live") {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  // 3. Floating Heart Animation Generator
  const triggerFloatingHeart = useCallback(() => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const colors = ["#ec4899", "#f43f5e", "#a855f7", "#3b82f6", "#eab308", "#10b981", "#ff007f", "#8b5cf6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setFloatingHearts((prev) => [
      ...prev,
      { id, x: Math.random() * 40 - 20, color: randomColor, size: 24 + Math.random() * 12 },
    ]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Real-Time Socket Event Handlers
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleViewerJoined = async (data) => {
      const { socketId, userId, user, viewerCount: newCount } = data;
      if (newCount) setViewerCount(newCount);
      else setViewerCount((prev) => prev + 1);

      const userObj = user || {};
      const userName = userObj.userName || data.userName || "Viewer";
      const userAvatar = userObj.profileImage?.url || userObj.profileImage || data.userAvatar || "";
      const viewerUserId = userObj._id || userId;

      setViewersList((prev) => {
        if (prev.some((v) => v.socketId === socketId || (viewerUserId && v.userId === viewerUserId))) return prev;
        return [...prev, { socketId, userId: viewerUserId, userName, userAvatar }];
      });

      // System notification in chat
      setComments((prev) => [
        ...prev,
        {
          _id: `join_${Date.now()}_${Math.random()}`,
          isSystem: true,
          text: `@${userName} joined`,
          userName,
          socketId,
        },
      ]);

      // Establish WebRTC connection to new viewer
      if (!localStreamRef.current) return;

      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });

        peerConnections.current[socketId] = pc;

        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("live:signal", {
              toSocketId: socketId,
              signal: { type: "candidate", candidate: event.candidate },
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("live:signal", {
          toSocketId: socketId,
          signal: { type: "offer", sdp: pc.localDescription },
        });
      } catch (err) {
        console.error("[Host] WebRTC offer error:", err);
      }
    };

    const handleViewerLeft = ({ socketId, viewerCount: newCount }) => {
      if (newCount) setViewerCount(newCount);
      else setViewerCount((prev) => Math.max(1, prev - 1));
      setViewersList((prev) => prev.filter((v) => v.socketId !== socketId));
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
    };

    const handleSignalReceived = async ({ fromSocketId, signal }) => {
      const pc = peerConnections.current[fromSocketId];
      if (!pc) return;

      try {
        if (signal.type === "answer") {
          const sdp = signal.sdp || signal;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } else if (signal.type === "candidate") {
          const candidate = new RTCIceCandidate(signal.candidate);
          await pc.addIceCandidate(candidate).catch(() => null);
        }
      } catch (err) {
        console.error("[Host] WebRTC signal error:", err);
      }
    };

    const handleCommentReceived = ({ comment }) => {
      setComments((prev) => [...prev, comment]);
    };

    const handleHeartReceived = ({ count = 1 }) => {
      setTotalHeartsCount((prev) => prev + count);
      for (let i = 0; i < count; i++) {
        triggerFloatingHeart();
      }
    };

    socket.on("live-viewer-joined", handleViewerJoined);
    socket.on("live-viewer-left", handleViewerLeft);
    socket.on("live:signal-received", handleSignalReceived);
    socket.on("live-comment-received", handleCommentReceived);
    socket.on("live-heart-received", handleHeartReceived);

    return () => {
      socket.off("live-viewer-joined", handleViewerJoined);
      socket.off("live-viewer-left", handleViewerLeft);
      socket.off("live:signal-received", handleSignalReceived);
      socket.off("live-comment-received", handleCommentReceived);
      socket.off("live-heart-received", handleHeartReceived);
    };
  }, [triggerFloatingHeart]);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Start & End Broadcast Flows
  // ──────────────────────────────────────────────────────────────────────────
  const handleStartCountdown = () => {
    setStage("countdown");
    let count = 3;
    setCountdown(3);

    const interval = setInterval(async () => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        await startActualBroadcast();
      }
    }, 1000);
  };

  const startActualBroadcast = async () => {
    try {
      const res = await api.post("/live/start", {
        title: streamTitle.trim() || "Live Video",
        audience,
      });

      if (res.data.success && res.data.live) {
        const stream = res.data.live;
        setStreamId(stream._id);
        setStage("live");

        // Start client-side MediaRecorder for replay capture
        startMediaRecorder();

        const socket = getSocket();
        socket?.emit("start-live-stream", {
          streamId: stream._id,
          title: stream.title,
          host: stream.host,
        });

        snackbar.success("You are now LIVE! 🔴");
      }
    } catch (err) {
      console.error("Start live error:", err);
      snackbar.error(err.response?.data?.message || "Failed to start live broadcast");
      setStage("preview");
    }
  };

  // Client-side recording via MediaRecorder
  const startMediaRecorder = () => {
    if (!localStreamRef.current) return;
    recordedChunksRef.current = [];

    try {
      const options = { mimeType: "video/webm;codecs=vp8,opus" };
      let recorder;
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        recorder = new MediaRecorder(localStreamRef.current, options);
      } else {
        recorder = new MediaRecorder(localStreamRef.current);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/mp4" });
        setRecordedBlob(blob);
      };

      recorder.start(1000); // 1s slices
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn("MediaRecorder init failed:", e);
    }
  };

  const handleEndBroadcast = async () => {
    setShowEndConfirm(false);
    if (!streamId) {
      handleCloseModal();
      return;
    }

    try {
      // Stop MediaRecorder to finalize blob
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      const res = await api.post(`/live/end/${streamId}`, {
        totalHearts: totalHeartsCount,
      });

      const stats = res.data.stats || {
        durationSeconds: duration,
        peakViewers: viewerCount,
        totalUniqueViewers: viewersList.length + 1,
        totalComments: comments.length,
        totalHearts: totalHeartsCount,
      };

      setStreamStats(stats);
      setStage("ended");

      const socket = getSocket();
      socket?.emit("end-live-stream", { streamId, stats });

      // Close WebRTC peer connections
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
    } catch (err) {
      console.error("End live error:", err);
      snackbar.error("Error ending live broadcast");
      handleCloseModal();
    }
  };

  const handleCloseModal = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setStage("preview");
    setStreamId(null);
    setRecordedBlob(null);
    onClose();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Controls & Interaction Handlers
  // ──────────────────────────────────────────────────────────────────────────
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleToggleComments = async () => {
    if (!streamId) return;
    try {
      const targetState = !commentsDisabled;
      await api.patch(`/live/comments/toggle/${streamId}`, { disabled: targetState });
      setCommentsDisabled(targetState);
      const socket = getSocket();
      socket?.emit("live:toggle-comments", { streamId, disabled: targetState });
      snackbar.success(targetState ? "Comments turned off" : "Comments turned on");
    } catch {
      snackbar.error("Failed to toggle comments");
    }
  };

  const handleSendComment = (e) => {
    e?.preventDefault();
    if (!commentInput.trim() || !streamId || commentsDisabled) return;

    const socket = getSocket();
    const commentPayload = {
      text: commentInput.trim(),
      user: currentUser?._id,
      userName: currentUser?.userName || "Host",
      userAvatar: currentUser?.profileImage?.url || "",
      isHost: true,
      isVerified: currentUser?.isVerified,
    };

    socket?.emit("send-live-comment", { streamId, comment: commentPayload });
    setComments((prev) => [...prev, { ...commentPayload, _id: Date.now().toString(), createdAt: new Date() }]);
    setCommentInput("");
  };

  const handleSendHeart = () => {
    triggerFloatingHeart();
    setTotalHeartsCount((prev) => prev + 1);
    const socket = getSocket();
    socket?.emit("send-live-heart", { streamId, count: 1 });
  };

  const handleTogglePinComment = async (comment) => {
    if (!streamId) return;
    try {
      const newPin = pinnedComment?._id === comment?._id ? null : comment;
      await api.patch(`/live/pin-comment/${streamId}`, { comment: newPin });
      setPinnedComment(newPin);
      const socket = getSocket();
      socket?.emit("live:pin-comment", { streamId, pinnedComment: newPin });
      snackbar.success(newPin ? "Comment pinned" : "Comment unpinned");
    } catch {
      snackbar.error("Failed to pin comment");
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[750] bg-black flex items-center justify-center select-none overflow-hidden p-0 sm:p-4">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN CONTAINER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-md h-full sm:h-[94vh] bg-black sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-zinc-900">
        {/* Fullscreen Camera Feed */}
        <div className="absolute inset-0 bg-zinc-950 overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
          />

          {isVideoOff && (
            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-3">
              <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <VideoOff className="w-8 h-8" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">Camera is turned off</p>
            </div>
          )}

          {/* Vignette overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STAGE: PREVIEW (Pre-Live Setup) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {stage === "preview" && (
          <div className="relative z-10 w-full h-full flex flex-col justify-between p-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleCloseModal}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Audience Selector Pill (Instagram Style) */}
              <div className="flex items-center p-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                <button
                  type="button"
                  onClick={() => setAudience("everyone")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    audience === "everyone"
                      ? "bg-white text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Everyone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("close_friends")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    audience === "close_friends"
                      ? "bg-emerald-500 text-black shadow font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Close Friends</span>
                </button>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFlipCamera}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleMic}
                  className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition cursor-pointer ${
                    isMicMuted
                      ? "bg-rose-600 border-rose-500 text-white"
                      : "bg-black/50 border-white/10 text-white hover:bg-black/80"
                  }`}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bottom Setup & Go Live CTA */}
            <div className="space-y-4">
              {/* Title Input */}
              <div className="p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10">
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="Add a title to your live video..."
                  maxLength={100}
                  className="w-full bg-transparent text-white text-xs placeholder:text-zinc-400 focus:outline-none"
                />
              </div>

              {/* Big Pulsing Go Live Button (Instagram Style) */}
              <button
                onClick={handleStartCountdown}
                className="group relative w-full py-4 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white font-extrabold text-sm tracking-wider uppercase rounded-2xl shadow-2xl shadow-rose-600/40 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Radio className="w-5 h-5 animate-pulse" />
                  <span>Go Live</span>
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STAGE: COUNTDOWN (3.. 2.. 1..) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {stage === "countdown" && (
          <div className="relative z-20 w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-8xl font-black text-white drop-shadow-[0_0_35px_rgba(244,63,94,0.8)]"
            >
              {countdown}
            </motion.div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STAGE: LIVE BROADCASTING */}
        {/* ───────────────────────────────────────────────────────────── */}
        {stage === "live" && (
          <div className="relative z-10 w-full h-full flex flex-col justify-between p-3 sm:p-4">
            {/* Top Bar: LIVE badge, Viewer count, Duration, End */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Red LIVE Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 rounded-full text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-rose-600/40 animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  <span>LIVE</span>
                </div>

                {/* Viewer Count */}
                <button
                  onClick={() => setActiveDrawer("viewers")}
                  className="flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[11px] font-bold border border-white/10 hover:bg-black/80 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-300" />
                  <span>{viewerCount}</span>
                </button>

                {/* Timer */}
                <div className="px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full text-zinc-300 text-[11px] font-medium border border-white/5">
                  {formatDuration(duration)}
                </div>

                {audience === "close_friends" && (
                  <div className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 text-[10px] font-bold">
                    ⭐️ CF
                  </div>
                )}
              </div>

              {/* End Broadcast Button */}
              <button
                onClick={() => setShowEndConfirm(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-lg transition cursor-pointer"
              >
                End
              </button>
            </div>

            {/* Pinned Comment Banner */}
            {pinnedComment && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-2 p-2.5 bg-black/75 backdrop-blur-md border border-white/15 rounded-2xl flex items-center justify-between gap-2 shadow-xl"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Pin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <p className="text-xs text-white truncate">
                    <span className="font-bold text-pink-300 mr-1.5">@{pinnedComment.userName}:</span>
                    {pinnedComment.text}
                  </p>
                </div>
                <button
                  onClick={() => handleTogglePinComment(pinnedComment)}
                  className="text-[10px] text-zinc-400 hover:text-white shrink-0 px-2 py-0.5 bg-white/10 rounded-md"
                >
                  Unpin
                </button>
              </motion.div>
            )}

            {/* Floating Hearts Rising Canvas */}
            <div className="absolute right-4 bottom-24 pointer-events-none w-16 h-80 overflow-hidden z-20 flex flex-col justify-end items-center">
              <AnimatePresence>
                {floatingHearts.map((heart) => (
                  <motion.div
                    key={heart.id}
                    initial={{ opacity: 1, y: 0, scale: 0.6, x: heart.x }}
                    animate={{ opacity: 0, y: -260, scale: 1.2, x: heart.x * 1.8 }}
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

            {/* Comments Stream (Instagram Style scrolling from bottom left) */}
            <div className="space-y-3">
              <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-none flex flex-col-reverse">
                <AnimatePresence>
                  {[...comments].reverse().slice(0, 8).map((c, idx) => (
                    <motion.div
                      key={c._id || c.id || `${c.userName || "user"}_${c.text || ""}_${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={() => !c.isSystem && handleTogglePinComment(c)}
                      className={`inline-flex items-center gap-2 max-w-[85%] px-3 py-1.5 rounded-2xl backdrop-blur-md cursor-pointer transition ${
                        c.isSystem
                          ? "bg-black/40 text-zinc-400 text-[11px]"
                          : "bg-black/60 text-white text-xs hover:bg-black/80"
                      }`}
                    >
                      {!c.isSystem && (
                        <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/20">
                          <img
                            src={c.userAvatar || dp}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="truncate">
                        {!c.isSystem && (
                          <span className="font-bold text-zinc-200 mr-1.5">
                            @{c.userName}
                          </span>
                        )}
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
                        placeholder="Comment as host..."
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
                    Commenting is turned off
                  </div>
                )}

                {/* Heart Button */}
                <button
                  onClick={handleSendHeart}
                  className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-pink-400 hover:scale-110 active:scale-95 transition cursor-pointer"
                >
                  <Heart className="w-5 h-5 fill-pink-500" />
                </button>

                {/* Flip Camera */}
                <button
                  onClick={handleFlipCamera}
                  className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Host Settings Menu */}
                <button
                  onClick={() => setActiveDrawer("settings")}
                  className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STAGE: ENDED (Post-Broadcast Summary & Options) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {stage === "ended" && (
          <div className="relative z-20 w-full h-full flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm text-center space-y-4"
            >
              {/* Creator DP */}
              <div className="relative w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-tr from-pink-500 to-rose-500">
                <img
                  src={currentUser?.profileImage?.url || currentUser?.profileImage || dp}
                  alt=""
                  className="w-full h-full rounded-full object-cover border-2 border-zinc-950"
                />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Live Video Ended</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Your broadcast is saved in your Live Archive (30 days)</p>
              </div>

              {/* Stats Card */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Duration</span>
                  <p className="text-sm font-bold text-white">
                    {streamStats?.durationSeconds ? formatDuration(streamStats.durationSeconds) : formatDuration(duration)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Peak Viewers</span>
                  <p className="text-sm font-bold text-rose-400">{streamStats?.peakViewers || viewerCount}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Hearts</span>
                  <p className="text-sm font-bold text-pink-400">{streamStats?.totalHearts || totalHeartsCount}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {/* Share as Reel */}
                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-bold rounded-2xl shadow-xl shadow-pink-600/25 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share as Reel</span>
                </button>

                {/* Done / Close */}
                <button
                  onClick={handleCloseModal}
                  className="w-full py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-2xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL: END STREAM CONFIRMATION */}
        {/* ───────────────────────────────────────────────────────────── */}
        {showEndConfirm && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-3xl p-5 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-rose-600/20 text-rose-500 mx-auto flex items-center justify-center">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">End live video?</h4>
                <p className="text-xs text-zinc-400 mt-1">Your video will end and you can choose to share it as a Reel.</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleEndBroadcast}
                  className="w-full py-3 bg-rose-600 text-white text-xs font-bold rounded-2xl hover:bg-rose-700 transition cursor-pointer"
                >
                  End Now
                </button>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="w-full py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-2xl hover:bg-zinc-700 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* DRAWER: HOST SETTINGS */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeDrawer === "settings" && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col justify-end">
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h4 className="text-sm font-bold text-white">Live Controls</h4>
                <button onClick={() => setActiveDrawer(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleToggleComments}
                  className="w-full p-3 bg-zinc-800/80 rounded-2xl flex items-center justify-between text-xs text-white hover:bg-zinc-800 transition"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                    <span>Turn Off Commenting</span>
                  </div>
                  <span className="text-[11px] text-pink-400 font-semibold">
                    {commentsDisabled ? "Off" : "On"}
                  </span>
                </button>

                <button
                  onClick={handleToggleMic}
                  className="w-full p-3 bg-zinc-800/80 rounded-2xl flex items-center justify-between text-xs text-white hover:bg-zinc-800 transition"
                >
                  <div className="flex items-center gap-2">
                    {isMicMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-zinc-400" />}
                    <span>Mute Microphone</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">{isMicMuted ? "Muted" : "Active"}</span>
                </button>

                <button
                  onClick={handleToggleVideo}
                  className="w-full p-3 bg-zinc-800/80 rounded-2xl flex items-center justify-between text-xs text-white hover:bg-zinc-800 transition"
                >
                  <div className="flex items-center gap-2">
                    {isVideoOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4 text-zinc-400" />}
                    <span>Pause Video</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">{isVideoOff ? "Off" : "Active"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* DRAWER: VIEWERS LIST */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeDrawer === "viewers" && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col justify-end">
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 max-h-[70%] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>Viewers ({viewersList.length})</span>
                </h4>
                <button onClick={() => setActiveDrawer(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1 scrollbar-none">
                {viewersList.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">Waiting for viewers to join...</p>
                ) : (
                  viewersList.map((v) => (
                    <div key={v.socketId} className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700">
                          <img src={v.userAvatar || dp} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-semibold text-white">@{v.userName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* POST-BROADCAST: SHARE AS REEL MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showShareModal && (
        <ShareLiveAsReelModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            handleCloseModal();
          }}
          streamId={streamId}
          recordedBlob={recordedBlob}
          stats={streamStats || { durationSeconds: duration, peakViewers: viewerCount, totalHearts: totalHeartsCount }}
          streamTitle={streamTitle || "Live Video"}
        />
      )}
    </div>
  );
};

export default VybeLiveModal;

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Eye, Heart, Send, X, Users, MessageSquare } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";

export const VybeLiveModal = ({ isOpen, onClose }) => {
  const [streamTitle, setStreamTitle] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [streamId, setStreamId] = useState(null);
  const [viewerCount, setViewerCount] = useState(1);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [floatingHearts, setFloatingHearts] = useState([]);

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // viewerSocketId -> RTCPeerConnection

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // A viewer joined -> create WebRTC connection and push our local stream to them
    const handleViewerJoined = async ({ socketId, userId }) => {
      setViewerCount((prev) => prev + 1);
      console.log(`[Live Host] Viewer joined: ${socketId}. Setting up Peer Connection...`);

      if (!localStreamRef.current) {
        console.warn("[Live Host] No local stream ready to broadcast yet");
        return;
      }

      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });

        peerConnections.current[socketId] = pc;

        // Add local tracks
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });

        // ICE candidate
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("live:signal", {
              toSocketId: socketId,
              signal: { type: "candidate", candidate: event.candidate },
            });
          }
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("live:signal", {
          toSocketId: socketId,
          signal: { type: "offer", sdp: pc.localDescription },
        });
      } catch (err) {
        console.error("[Live Host] Failed to create PC for viewer:", err);
      }
    };

    // Received signal from viewer (answer or candidate)
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
        console.error("[Live Host] Error handling signal from viewer:", err);
      }
    };

    socket.on("live-viewer-joined", handleViewerJoined);
    socket.on("live:signal-received", handleSignalReceived);

    socket.on("live-comment-received", ({ comment }) => {
      setComments((prev) => [...prev, comment]);
    });

    socket.on("live-heart-received", () => {
      triggerFloatingHeart();
    });

    return () => {
      socket.off("live-viewer-joined", handleViewerJoined);
      socket.off("live:signal-received", handleSignalReceived);
      socket.off("live-comment-received");
      socket.off("live-heart-received");
    };
  }, []);

  const triggerFloatingHeart = () => {
    const id = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev, { id, x: Math.random() * 40 - 20 }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  };

  const handleStartLive = async () => {
    try {
      const res = await api.post("/live/start", { title: streamTitle || "VYBE Live Broadcast" });
      if (res.data.success) {
        setStreamId(res.data.live._id);
        setIsLive(true);

        const socket = getSocket();
        socket?.emit("start-live-stream", { streamId: res.data.live._id, title: streamTitle });

        // Start Local Video Feed
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        snackbar.success("🔴 YOU ARE NOW LIVE!");
      }
    } catch {
      snackbar.error("Failed to start live broadcast.");
    }
  };

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !streamId) return;

    const socket = getSocket();
    socket?.emit("send-live-comment", {
      streamId,
      comment: { text: commentInput.trim(), user: "You" },
    });

    setComments((prev) => [...prev, { text: commentInput.trim(), user: "You" }]);
    setCommentInput("");
  };

  const handleSendHeart = () => {
    triggerFloatingHeart();
    const socket = getSocket();
    socket?.emit("send-live-heart", { streamId });
  };

  const handleEndLive = async () => {
    // Stop local camera tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all viewer connections
    Object.keys(peerConnections.current).forEach((sid) => {
      peerConnections.current[sid].close();
    });
    peerConnections.current = {};

    if (streamId) {
      try {
        await api.post(`/live/end/${streamId}`);
        const socket = getSocket();
        socket?.emit("end-live-stream", { streamId });
      } catch (e) {
        console.warn("VybeLiveModal: handleEndLive API call failed", e);
      }
    }
    setIsLive(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[750] flex items-center justify-center bg-bg/90 backdrop-blur-xl p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg h-[85vh] bg-surface-inset border border-border rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
            {isLive ? (
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-rose-600 font-extrabold text-xs text-text rounded-full flex items-center gap-1.5 shadow animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  <span>LIVE</span>
                </span>
                <span className="px-3 py-1 bg-surface-overlay border border-border text-xs font-bold text-text rounded-full flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-rose-500" />
                  <span>{viewerCount} Viewers</span>
                </span>
              </div>
            ) : (
              <h2 className="text-base font-bold text-text">Go Live</h2>
            )}

            <button onClick={handleEndLive} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Container & Floating Hearts */}
          <div className="relative flex-1 bg-surface overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

            {!isLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-surface-overlay backdrop-blur-sm space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-text shadow-2xl">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-xl font-extrabold text-text">Start Live Broadcast</h3>
                <input
                  type="text"
                  placeholder="Enter stream title (e.g. Q&A Session)..."
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  className="w-full bg-surface border border-border p-3 rounded-2xl text-xs text-text outline-none focus:border-rose-500"
                />
                <button
                  onClick={handleStartLive}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-text font-bold rounded-2xl shadow-xl hover:opacity-95 transition"
                >
                  Go Live Now
                </button>
              </div>
            )}

            {/* Floating Heart Reaction Animations */}
            <div className="absolute right-4 bottom-20 flex flex-col items-center pointer-events-none">
              {floatingHearts.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -180, x: h.x, scale: 1.4 }}
                  transition={{ duration: 1.8 }}
                  className="text-rose-500"
                >
                  <Heart className="w-8 h-8 fill-rose-500" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Live Chat & Interaction Bar */}
          {isLive && (
            <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent space-y-3">
              {/* Comment Stream */}
              <div className="max-h-36 overflow-y-auto space-y-2 text-xs">
                {comments.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-bg/40 backdrop-blur px-3 py-1.5 rounded-full w-fit">
                    <span className="font-bold text-rose-400">@{c.user}</span>
                    <span className="text-text">{c.text}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input & Heart Button */}
              <form onSubmit={handleSendComment} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Comment live..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 bg-surface border border-border px-4 py-2.5 rounded-full text-xs text-text outline-none focus:border-rose-500"
                />
                <button type="submit" className="p-2.5 bg-surface-hover hover:bg-surface-active text-text rounded-full">
                  <Send className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSendHeart}
                  className="p-2.5 bg-rose-600 text-text rounded-full shadow hover:scale-110 transition"
                >
                  <Heart className="w-4 h-4 fill-white" />
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VybeLiveModal;

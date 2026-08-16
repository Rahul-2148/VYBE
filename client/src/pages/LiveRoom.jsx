import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Radio, Eye, Heart, Send, ArrowLeft, Users } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";

export const LiveRoom = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const [liveStream, setLiveStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");

  const videoRef = useRef(null);
  const pcRef = useRef(null);

  const fetchLiveDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get("/live/active");
      if (res.data.success) {
        const active = res.data.lives?.find((l) => l._id === streamId);
        setLiveStream(active || null);
      }
    } catch (err) {
      snackbar.error("Failed to load live stream.");
      console.warn('fetchLiveDetails error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchLiveDetails();
    })();

    const socket = getSocket();
    if (!socket) return;

    socket.emit("join-live-stream", { streamId });

    // Handle incoming WebRTC signal from host
    const handleSignalReceived = async ({ fromSocketId, signal }) => {
      let pc = pcRef.current;

      if (!pc) {
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        pcRef.current = pc;

        // Ice candidate
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("live:signal", {
              toSocketId: fromSocketId,
              signal: { type: "candidate", candidate: event.candidate },
            });
          }
        };

        // When remote stream tracks arrive -> bind to local video element
        pc.ontrack = (event) => {
          console.log("[Live Viewer] Stream track received from host!");
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
        };
      }

      try {
        if (signal.type === "offer") {
          const sdp = signal.sdp || signal;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("live:signal", {
            toSocketId: fromSocketId,
            signal: { type: "answer", sdp: pc.localDescription },
          });
        } else if (signal.type === "candidate") {
          const candidate = new RTCIceCandidate(signal.candidate);
          await pc.addIceCandidate(candidate).catch(() => null);
        }
      } catch (err) {
        console.error("[Live Viewer] Error handling WebRTC signal:", err);
      }
    };

    socket.on("live:signal-received", handleSignalReceived);

    socket.on("live-comment-received", ({ comment }) => {
      setComments((prev) => [...prev, comment]);
    });

    socket.on("live-stream-ended", () => {
      snackbar.error("Live broadcast has ended.");
      navigate("/explore");
    });

    return () => {
      socket.off("live:signal-received", handleSignalReceived);
      socket.off("live-comment-received");
      socket.off("live-stream-ended");
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      mounted = false;
    };
  }, [streamId]);

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const socket = getSocket();
    socket?.emit("send-live-comment", {
      streamId,
      comment: { text: commentInput.trim(), user: "Viewer" },
    });

    setComments((prev) => [...prev, { text: commentInput.trim(), user: "Viewer" }]);
    setCommentInput("");
  };

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <button onClick={() => navigate(-1)} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Live Stream Broadcast</h1>
      </div>

      {loading ? (
        <div className="text-center py-24 text-text-muted">Connecting to live stream...</div>
      ) : (
        <div className="relative aspect-[9/16] bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          
          <div className="flex items-center justify-between z-10">
            <span className="px-3 py-1 bg-rose-600 font-extrabold text-xs text-text rounded-full flex items-center gap-1.5 shadow animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>LIVE</span>
            </span>
          </div>

          <div className="space-y-3 z-10">
            <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
              {comments.map((c, idx) => (
                <div key={idx} className="bg-surface-overlay backdrop-blur px-3 py-1.5 rounded-full w-fit">
                  <span className="font-bold text-rose-400">@{c.user}</span> <span className="text-text">{c.text}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Comment live..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 bg-surface border border-border px-4 py-2.5 rounded-full text-xs text-text outline-none"
              />
              <button type="submit" className="p-2.5 bg-rose-600 text-text rounded-full">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveRoom;

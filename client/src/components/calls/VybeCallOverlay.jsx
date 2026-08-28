import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  PhoneOff,
  Maximize2,
} from "lucide-react";
import dp from "../../assets/dp3.png";
import { formatCallDuration } from "../../lib/webrtcCore";
import { triggerHaptic } from "../../lib/interactiveEffects";
import { getSocket } from "../../lib/socket";
import FloatingReactions from "./FloatingReactions";
import AddPeopleModal from "./AddPeopleModal";
import ScreenShareModal from "./ScreenShareModal";
import VybeVoiceCallView from "./VybeVoiceCallView";
import VybeVideoCallView from "./VybeVideoCallView";

const RemoteAudioPlayer = React.memo(({ stream }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }

    el.muted = false;
    el.volume = 1.0;

    const playAudio = () => {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[WebRTC Audio] Remote audio play deferred by browser policy:", err?.message);
        });
      }
    };

    playAudio();

    // Auto-unlock audio on user touch or click (Mobile Safari / Android Chrome Autoplay Unlock)
    const unlockOnInteraction = () => {
      if (el && el.paused) {
        playAudio();
      }
    };

    window.addEventListener("touchstart", unlockOnInteraction, { passive: true, once: true });
    window.addEventListener("click", unlockOnInteraction, { passive: true, once: true });

    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    return () => {
      window.removeEventListener("touchstart", unlockOnInteraction);
      window.removeEventListener("click", unlockOnInteraction);
    };
  }, [stream]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      className="sr-only"
    />
  );
});

export const VybeCallOverlay = ({
  room,
  callType = "video", // "voice" | "video"
  targetUser,
  currentUserId,
  localStream,
  screenStream,
  peers = {},
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  activeSpeaker,
  connectionQuality = "good",
  videoFilter = "none",
  changeVideoFilter,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onFlipCamera,
  onEndCall,
}) => {
  const [currentCallType, setCurrentCallType] = useState(callType);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showScreenShareConfirm, setShowScreenShareConfirm] = useState(false);

  // Extract peers list (strictly excluding local user)
  const peerList = useMemo(() => {
    const myIdStr = currentUserId?.toString();
    return Object.values(peers || {}).filter(
      (p) => p && (!p.userId || !myIdStr || p.userId.toString() !== myIdStr)
    );
  }, [peers, currentUserId]);
  const primaryPeer = peerList[0];
  const isConnected = peerList.length > 0;
  const isVideo = (currentCallType || callType) === "video";

  // Recipient details
  const userName =
    primaryPeer?.userName || targetUser?.userName || targetUser?.name || "User";
  const userAvatar =
    primaryPeer?.profilePicture ||
    targetUser?.profileImage?.url ||
    (typeof targetUser?.profileImage === "string" ? targetUser.profileImage : "") ||
    targetUser?.profilePicture?.url ||
    (typeof targetUser?.profilePicture === "string" ? targetUser.profilePicture : "") ||
    dp;

  // Duration Timer
  useEffect(() => {
    if (!isConnected) {
      return;
    }
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [isConnected]);

  // Floating Reaction Emojis
  const handleSendReaction = (emoji) => {
    triggerHaptic("light");
    const socket = getSocket();
    if (socket && room) {
      socket.emit("call:send-reaction", {
        room,
        emoji,
        userId: currentUserId,
      });
    }
  };

  // WhatsApp-style screen share prompt handler
  const handleScreenShareClick = () => {
    if (isScreenSharing) {
      onToggleScreenShare?.();
    } else {
      setShowScreenShareConfirm(true);
    }
  };

  // Switch voice to video call in-place
  const handleSwitchToVideo = () => {
    setCurrentCallType("video");
    if (isVideoOff) {
      onToggleVideo?.();
    }
  };

  return (
    <>
      {/* Background Remote Audio Players (Always active across Video, Audio, Fullscreen, and PiP) */}
      {peerList.map((peer) => {
        if (!peer?.stream) return null;
        return (
          <RemoteAudioPlayer
            key={`remote-audio-${peer.socketId || peer.userId || peer.stream.id}`}
            stream={peer.stream}
          />
        );
      })}

      {isMinimized ? (
        /* ================= 1. MINIMIZED PICTURE-IN-PICTURE (PiP) FLOATING WIDGET ================= */
        <motion.div
          drag
          dragConstraints={{
            left: 12,
            right: window.innerWidth - 260,
            top: 12,
            bottom: window.innerHeight - 120,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="fixed bottom-6 right-6 z-[999999] bg-zinc-950/95 border border-zinc-700/80 backdrop-blur-2xl p-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-white cursor-grab active:cursor-grabbing select-none"
        >
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10 flex items-center justify-center">
            {isVideo && primaryPeer?.stream && !primaryPeer?.videoOff ? (
              <video
                autoPlay
                playsInline
                muted={true}
                ref={(el) => {
                  if (el && el.srcObject !== primaryPeer.stream) {
                    el.srcObject = primaryPeer.stream;
                  }
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            )}
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-pulse" />
          </div>

          <div className="flex flex-col min-w-[95px]">
            <span className="text-xs font-bold text-white truncate max-w-[100px]">
              {peerList.length > 1 ? `Group (${peerList.length + 1})` : `@${userName}`}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              {isConnected ? formatCallDuration(callDuration) : "Calling..."}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                onToggleMute?.();
              }}
              className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                isMuted ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("medium");
                setIsMinimized(false);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Expand Call"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("heavy");
                onEndCall?.();
              }}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
              title="End Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        /* ================= 2. FULLSCREEN IMMERSIVE CALL VIEW ================= */
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-zinc-950 flex flex-col justify-between overflow-hidden select-none font-sans"
          >
            {/* Real-time Floating Reactions Stream */}
            <FloatingReactions room={room} />

            {/* Render either Voice Call or Video Call View */}
            {isVideo ? (
              <VybeVideoCallView
                room={room}
                targetUser={targetUser}
                primaryPeer={primaryPeer}
                peerList={peerList}
                isConnected={isConnected}
                callDuration={callDuration}
                localStream={localStream}
                screenStream={screenStream}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                isScreenSharing={isScreenSharing}
                activeSpeaker={activeSpeaker}
                videoFilter={videoFilter}
                changeVideoFilter={changeVideoFilter}
                onToggleMute={onToggleMute}
                onToggleVideo={onToggleVideo}
                onToggleScreenShare={handleScreenShareClick}
                onFlipCamera={onFlipCamera}
                onAddPeople={() => setShowAddPeople(true)}
                onMinimize={() => setIsMinimized(true)}
                onEndCall={onEndCall}
                onSendReaction={handleSendReaction}
              />
            ) : (
              <VybeVoiceCallView
                room={room}
                targetUser={targetUser}
                primaryPeer={primaryPeer}
                peerList={peerList}
                isConnected={isConnected}
                callDuration={callDuration}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
                onSwitchToVideo={handleSwitchToVideo}
                onAddPeople={() => setShowAddPeople(true)}
                onMinimize={() => setIsMinimized(true)}
                onEndCall={onEndCall}
                onSendReaction={handleSendReaction}
              />
            )}

            {/* Add People Modal Sheet */}
            <AddPeopleModal
              isOpen={showAddPeople}
              onClose={() => setShowAddPeople(false)}
              room={room}
              callType={currentCallType}
              peers={peers}
              currentUserId={currentUserId}
            />

            {/* Screen Share Confirmation Modal */}
            <ScreenShareModal
              isOpen={showScreenShareConfirm}
              onClose={() => setShowScreenShareConfirm(false)}
              onConfirm={() => onToggleScreenShare?.()}
              targetUserName={userName}
            />
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
};

export default VybeCallOverlay;


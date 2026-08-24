import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  RefreshCw,
  Sparkles,
  UserPlus,
  Smile,
  MonitorUp,
  MonitorOff,
} from "lucide-react";
import dp from "../../assets/dp3.png";
import { formatCallDuration } from "../../lib/webrtcCore";
import { filterStyleMap } from "../../constants/callFilters";
import { triggerHaptic } from "../../lib/interactiveEffects";

const VideoPlayer = React.memo(({ stream, muted = false, className = "", style = {}, mirror = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
      if (stream) {
        el.play().catch(() => {});
      }
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      style={style}
      className={`${className} ${mirror ? "-scale-x-100" : ""}`}
    />
  );
});

export const VybeVideoCallView = ({
  room,
  targetUser,
  primaryPeer,
  peerList = [],
  isConnected = false,
  callDuration = 0,
  localStream,
  screenStream,
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  activeSpeaker,
  videoFilter = "none",
  changeVideoFilter,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onFlipCamera,
  onAddPeople,
  onMinimize,
  onEndCall,
  onSendReaction,
}) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showFiltersBar, setShowFiltersBar] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [isLocalSwapped, setIsLocalSwapped] = useState(false);
  const idleTimerRef = useRef(null);

  // Recipient details
  const userName =
    primaryPeer?.userName || targetUser?.userName || targetUser?.name || "User";
  const displayName =
    primaryPeer?.name || targetUser?.name || `@${userName}`;
  const userAvatar =
    primaryPeer?.profilePicture ||
    targetUser?.profileImage?.url ||
    (typeof targetUser?.profileImage === "string" ? targetUser.profileImage : "") ||
    targetUser?.profilePicture?.url ||
    (typeof targetUser?.profilePicture === "string" ? targetUser.profilePicture : "") ||
    dp;

  // Screen Sharing Peer Check
  const screenSharingPeer = peerList.find((p) => p.screenSharing && (p.screenStream || p.stream));
  const hasActiveScreenShare = isScreenSharing || Boolean(screenSharingPeer);
  const activeScreenStream = isScreenSharing ? screenStream : (screenSharingPeer?.screenStream || screenSharingPeer?.stream);

  // Auto-hide controls after 4s idle
  const resetIdleTimer = () => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setShowFiltersBar(false);
      setShowReactionsBar(false);
    }, 4500);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <div
      onClick={resetIdleTimer}
      className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black text-white select-none"
    >
      {/* ================= TOP HEADER BAR ================= */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent"
          >
            {/* Header info */}
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  onMinimize?.();
                }}
                className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition cursor-pointer active:scale-95"
                title="Minimize Call"
              >
                <Minimize2 className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                  {peerList.length > 1 ? `Group Call (${peerList.length + 1})` : displayName}
                </h3>
                <p className="text-xs font-mono font-bold text-emerald-400">
                  {isConnected ? formatCallDuration(callDuration) : "Calling..."}
                </p>
              </div>
            </div>

            {/* Add People Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("medium");
                onAddPeople?.();
              }}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition cursor-pointer active:scale-95 flex items-center gap-1.5 px-3.5"
              title="Add People"
            >
              <UserPlus className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-bold hidden sm:inline">Add</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN VIDEO CANVAS ================= */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* A. SCREEN SHARING ACTIVE VIEW */}
        {hasActiveScreenShare && activeScreenStream ? (
          <div className="relative w-full h-full bg-zinc-950 flex flex-col items-center justify-center">
            {/* Screen Share Video in Center Stage */}
            <div className="w-full h-full flex items-center justify-center p-1 sm:p-4">
              <VideoPlayer
                stream={activeScreenStream}
                className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl border border-zinc-800/80"
              />
            </div>

            {/* Banner when Local User is sharing */}
            {isScreenSharing ? (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-blue-600/90 backdrop-blur-md px-4 py-2 rounded-full border border-blue-400/40 shadow-xl flex items-center gap-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MonitorUp className="w-4 h-4" /> You are sharing your screen
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("medium");
                    onToggleScreenShare?.();
                  }}
                  className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-md cursor-pointer"
                >
                  Stop Sharing
                </button>
              </div>
            ) : screenSharingPeer ? (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-xl flex items-center gap-2">
                <MonitorUp className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-xs font-bold text-white">
                  @{screenSharingPeer.userName || "Participant"} is sharing screen
                </span>
              </div>
            ) : null}

            {/* Floating Participant Tiles Strip in Bottom Corner */}
            <div className="absolute bottom-24 right-4 flex items-center gap-2 z-30 pointer-events-auto">
              {!isVideoOff && localStream && (
                <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden border-2 border-white/30 bg-zinc-900 shadow-xl relative">
                  <VideoPlayer stream={localStream} mirror={true} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.2 rounded text-[9px] font-bold text-white">
                    You
                  </span>
                </div>
              )}
              {screenSharingPeer && primaryPeer?.stream && !primaryPeer?.videoOff && (
                <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden border-2 border-white/30 bg-zinc-900 shadow-xl relative">
                  <VideoPlayer stream={primaryPeer.stream} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.2 rounded text-[9px] font-bold text-white">
                    @{primaryPeer.userName || "User"}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : isConnected && peerList.length === 1 ? (
          /* B. 1-TO-1 VIDEO CALL (Fullscreen Remote + Draggable Local PiP) */
          <div className="relative w-full h-full bg-black">
            {/* Fullscreen Remote Video */}
            {primaryPeer?.stream && !primaryPeer?.videoOff ? (
              <VideoPlayer
                stream={isLocalSwapped ? localStream : primaryPeer.stream}
                mirror={isLocalSwapped}
                style={{ filter: isLocalSwapped ? filterStyleMap[videoFilter || "none"] || "none" : undefined }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-900 to-black">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                  <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-bold text-white">@{userName}'s camera is off</p>
              </div>
            )}

            {/* Floating Draggable Picture-in-Picture (PiP) Local Video Card */}
            {!isVideoOff && localStream && (
              <motion.div
                drag
                dragConstraints={{
                  left: 12,
                  right: window.innerWidth - 140,
                  top: 70,
                  bottom: window.innerHeight - 180,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLocalSwapped(!isLocalSwapped);
                }}
                className="absolute top-20 right-4 sm:right-6 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-zinc-900 z-30 cursor-grab active:cursor-grabbing group select-none"
              >
                <VideoPlayer
                  stream={isLocalSwapped ? primaryPeer?.stream : localStream}
                  mirror={!isLocalSwapped}
                  style={{ filter: !isLocalSwapped ? filterStyleMap[videoFilter || "none"] || "none" : undefined }}
                  className="w-full h-full object-cover"
                />

                {/* Flip camera button directly on local PiP */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onFlipCamera?.();
                  }}
                  className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition cursor-pointer"
                  title="Flip camera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                  {isLocalSwapped ? `@${userName}` : "You"}
                </span>
              </motion.div>
            )}
          </div>
        ) : isConnected && peerList.length > 1 ? (
          /* C. GROUP VIDEO CALL (Instagram Dynamic Split Grid) */
          <div
            className={`w-full h-full p-3 sm:p-4 grid gap-3 ${
              peerList.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : peerList.length <= 4
                ? "grid-cols-2 grid-rows-2"
                : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            {/* Local Video Card */}
            <div className={`relative w-full h-full bg-zinc-900 rounded-3xl overflow-hidden border transition-all duration-200 flex items-center justify-center shadow-xl ${
              activeSpeaker === "local" ? "border-emerald-500 ring-2 ring-emerald-500/40" : "border-zinc-800"
            }`}>
              {!isVideoOff && localStream ? (
                <VideoPlayer
                  stream={localStream}
                  mirror={true}
                  style={{ filter: filterStyleMap[videoFilter || "none"] || "none" }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    You
                  </div>
                  <span className="text-xs text-zinc-400 font-medium">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5">
                <span>You</span>
                {isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
              </div>
            </div>

            {/* Remote Peers Cards */}
            {peerList.map((peer) => {
              const isSpeaker = activeSpeaker === peer.userId;
              return (
                <div
                  key={peer.socketId}
                  className={`relative w-full h-full bg-zinc-900 rounded-3xl overflow-hidden border transition-all duration-200 flex items-center justify-center shadow-xl ${
                    isSpeaker ? "border-emerald-500 ring-2 ring-emerald-500/40" : "border-zinc-800"
                  }`}
                >
                  {!peer.videoOff && peer.stream ? (
                    <VideoPlayer stream={peer.stream} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={peer.profilePicture || dp}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20 shadow-lg"
                      />
                      <span className="text-xs font-bold text-white">@{peer.userName}</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5">
                    <span>@{peer.userName}</span>
                    {peer.muted && <MicOff className="w-3 h-3 text-rose-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* D. OUTGOING RINGING LOCAL CAMERA PREVIEW */
          <div className="relative w-full h-full bg-zinc-950 flex flex-col items-center justify-center">
            {!isVideoOff && localStream ? (
              <VideoPlayer
                stream={localStream}
                mirror={true}
                className="w-full h-full object-cover brightness-50 blur-sm"
              />
            ) : null}

            <div className="absolute z-20 flex flex-col items-center gap-4 text-center p-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                <img src={userAvatar} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-white">{displayName}</h2>
                <p className="text-sm text-zinc-300 animate-pulse mt-1">Calling video...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= FLOATING REACTION EMOJIS TRAY ================= */}
      {showReactionsBar && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-black/85 backdrop-blur-2xl px-4 py-2 rounded-full border border-white/15 shadow-2xl flex items-center gap-3"
        >
          {["❤️", "🔥", "👏", "😂", "😮", "🎉"].map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                onSendReaction?.(emoji);
              }}
              className="text-2xl hover:scale-130 active:scale-90 transition transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

      {/* ================= FACE EFFECTS / FILTERS CAROUSEL ================= */}
      {showFiltersBar && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-black/85 backdrop-blur-2xl px-4 py-2 rounded-full border border-white/15 shadow-2xl flex items-center gap-2 max-w-[90vw] overflow-x-auto hide-scrollbar"
        >
          {["none", "warm", "cool", "beauty", "cinema", "sepia", "grayscale", "contrast"].map((f) => (
            <button
              key={f}
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                changeVideoFilter?.(f);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                videoFilter === f
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>
      )}

      {/* ================= BOTTOM CONTROLS TRAY ================= */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative z-40 pb-8 pt-4 px-4 flex items-center justify-center bg-gradient-to-t from-black via-black/80 to-transparent"
          >
            <div className="flex items-center gap-2 sm:gap-3.5 bg-zinc-900/85 backdrop-blur-2xl p-2.5 rounded-full border border-white/15 shadow-2xl">
              {/* 1. Mute / Unmute Microphone */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  onToggleMute?.();
                }}
                className={`p-3.5 rounded-full transition cursor-pointer active:scale-90 shadow-md ${
                  isMuted
                    ? "bg-rose-600 text-white shadow-rose-600/30"
                    : "bg-white/15 hover:bg-white/25 text-white"
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* 2. Toggle Camera */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  onToggleVideo?.();
                }}
                className={`p-3.5 rounded-full transition cursor-pointer active:scale-90 shadow-md ${
                  isVideoOff
                    ? "bg-rose-600 text-white shadow-rose-600/30"
                    : "bg-white/15 hover:bg-white/25 text-white"
                }`}
                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* 3. Flip Camera (Front / Back) */}
              {!isVideoOff && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onFlipCamera?.();
                  }}
                  className="p-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition cursor-pointer active:scale-90 shadow-md"
                  title="Flip Camera"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}

              {/* 4. Screen Share */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("medium");
                  onToggleScreenShare?.();
                }}
                className={`p-3.5 rounded-full transition cursor-pointer active:scale-90 shadow-md ${
                  isScreenSharing
                    ? "bg-blue-600 text-white shadow-blue-600/30"
                    : "bg-white/15 hover:bg-white/25 text-white"
                }`}
                title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
              </button>

              {/* 5. Face Effects / Filters Carousel */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  setShowFiltersBar(!showFiltersBar);
                  setShowReactionsBar(false);
                }}
                className={`p-3.5 rounded-full transition cursor-pointer active:scale-90 shadow-md ${
                  showFiltersBar
                    ? "bg-pink-600 text-white shadow-pink-600/30"
                    : "bg-white/15 hover:bg-white/25 text-white"
                }`}
                title="Face Effects & Filters"
              >
                <Sparkles className="w-5 h-5 text-pink-400" />
              </button>

              {/* 6. Emoji Reactions */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  setShowReactionsBar(!showReactionsBar);
                  setShowFiltersBar(false);
                }}
                className={`p-3.5 rounded-full transition cursor-pointer active:scale-90 shadow-md ${
                  showReactionsBar
                    ? "bg-amber-600 text-white shadow-amber-600/30"
                    : "bg-white/15 hover:bg-white/25 text-white"
                }`}
                title="Send Reaction"
              >
                <Smile className="w-5 h-5 text-amber-400" />
              </button>

              {/* 7. End Call Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("heavy");
                  onEndCall?.();
                }}
                className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/40 transition active:scale-90 cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VybeVideoCallView;

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Video,
  UserPlus,
  Minimize2,
  Shield,
  Smile,
} from "lucide-react";
import dp from "../../assets/dp3.png";
import { formatCallDuration } from "../../lib/webrtcCore";
import { triggerHaptic } from "../../lib/interactiveEffects";

export const VybeVoiceCallView = ({
  room,
  targetUser,
  primaryPeer,
  peerList = [],
  isConnected = false,
  callDuration = 0,
  isMuted = false,
  onToggleMute,
  onSwitchToVideo,
  onAddPeople,
  onMinimize,
  onEndCall,
  onSendReaction,
}) => {
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showReactionsBar, setShowReactionsBar] = useState(false);

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

  const handleSpeakerToggle = () => {
    triggerHaptic("light");
    setIsSpeakerOn(!isSpeakerOn);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white select-none">

      {/* ================= TOP HEADER ================= */}
      <div className="relative z-30 flex items-center justify-between p-5 sm:p-6 bg-gradient-to-b from-black/80 to-transparent">
        {/* Minimize Action */}
        <button
          onClick={() => {
            triggerHaptic("light");
            onMinimize?.();
          }}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer active:scale-95"
          title="Minimize Call"
        >
          <Minimize2 className="w-5 h-5" />
        </button>

        {/* Center Title & Security Pill */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
            {peerList.length > 1 ? `Group Audio Call (${peerList.length + 1})` : "Vybe Audio Call"}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400 font-medium bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
            <Shield className="w-2.5 h-2.5 text-emerald-400" />
            <span>End-to-end encrypted</span>
          </div>
        </div>

        {/* Add People Action */}
        <button
          onClick={() => {
            triggerHaptic("medium");
            onAddPeople?.();
          }}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer active:scale-95 flex items-center gap-1.5 px-3.5"
          title="Add People to Call"
        >
          <UserPlus className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-bold hidden sm:inline">Add</span>
        </button>
      </div>

      {/* ================= CENTER STAGE (Audio Visualizer) ================= */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
        {/* Pulsing Avatar with Sonar Ripple Rings */}
        <div className="relative flex items-center justify-center">
          {/* Animated sonar wave ripples */}
          <div className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-pink-500/20 via-purple-500/10 to-indigo-500/20 animate-ping opacity-60 pointer-events-none" />
          <div className="absolute w-48 h-48 rounded-full bg-gradient-to-tr from-pink-500/25 to-rose-500/20 animate-pulse pointer-events-none" />

          {/* Central Avatar */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-gradient-to-tr from-pink-500 to-rose-600 p-0.5 z-10">
            <img
              src={userAvatar}
              alt=""
              className="w-full h-full object-cover rounded-full bg-zinc-900"
            />
          </div>
        </div>

        {/* Name, Handle & Status */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {peerList.length > 1 ? `Group (${peerList.length + 1} People)` : displayName}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium">
            {peerList.length <= 1 && `@${userName} · `}
            <span className="text-emerald-400 font-mono font-bold">
              {isConnected ? formatCallDuration(callDuration) : "Calling..."}
            </span>
          </p>
        </div>

        {/* Real-time Dynamic Audio Equalizer Bars */}
        {isConnected ? (
          <div className="flex items-center gap-1.5 h-10 mt-1">
            {[40, 75, 100, 65, 90, 50, 85, 60, 100, 45, 80, 55].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: isMuted ? 4 : [6, h * 0.38, 6] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.75,
                  delay: i * 0.06,
                  ease: "easeInOut",
                }}
                className={`w-1 rounded-full ${
                  isMuted
                    ? "bg-zinc-700"
                    : "bg-gradient-to-t from-pink-500 via-rose-400 to-amber-300 shadow-sm"
                }`}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 animate-pulse">Waiting for answer...</p>
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
              onClick={() => onSendReaction?.(emoji)}
              className="text-2xl hover:scale-130 active:scale-90 transition transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

      {/* ================= BOTTOM ACTION TRAY ================= */}
      <div className="relative z-30 pb-8 pt-4 px-4 flex items-center justify-center bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center gap-3 sm:gap-4 bg-zinc-900/85 backdrop-blur-2xl px-5 py-3 rounded-full border border-white/15 shadow-2xl">
          {/* 1. Speaker Toggle (Loudspeaker / Earpiece) */}
          <button
            onClick={handleSpeakerToggle}
            className={`p-3.5 sm:p-4 rounded-full transition cursor-pointer active:scale-90 shadow-md ${
              isSpeakerOn
                ? "bg-white/20 text-white"
                : "bg-white/10 text-zinc-400 hover:text-white"
            }`}
            title={isSpeakerOn ? "Speaker On" : "Speaker Off"}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* 2. Switch to Video Call (1-tap upgrade) */}
          <button
            onClick={() => {
              triggerHaptic("medium");
              onSwitchToVideo?.();
            }}
            className="p-3.5 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-90 shadow-md"
            title="Switch to Video Call"
          >
            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
          </button>

          {/* 3. Mute / Unmute Microphone */}
          <button
            onClick={() => {
              triggerHaptic("light");
              onToggleMute?.();
            }}
            className={`p-3.5 sm:p-4 rounded-full transition cursor-pointer active:scale-90 shadow-md ${
              isMuted
                ? "bg-rose-600 text-white shadow-rose-600/30"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* 4. Emoji Reactions Bar Toggle */}
          <button
            onClick={() => {
              triggerHaptic("light");
              setShowReactionsBar(!showReactionsBar);
            }}
            className={`p-3.5 sm:p-4 rounded-full transition cursor-pointer active:scale-90 shadow-md ${
              showReactionsBar
                ? "bg-amber-600 text-white shadow-amber-600/30"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title="Send Reaction"
          >
            <Smile className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          </button>

          {/* 5. End Call Button */}
          <button
            onClick={() => {
              triggerHaptic("heavy");
              onEndCall?.();
            }}
            className="p-3.5 sm:p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/40 transition active:scale-90 cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VybeVoiceCallView;

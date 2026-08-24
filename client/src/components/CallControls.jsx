import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Smile,
  Hand,
  Sparkles,
  MoreVertical,
  ChevronUp,
  Info,
  Users,
  MessageSquare,
  LayoutGrid,
  Settings,
  Maximize2,
  Minimize2,
  Check,
} from "lucide-react";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import { snackbar } from "../lib/snackbar";
import { AnimatedEmoji, StaticNotoEmoji } from "./CallReactionStream";

/**
 * Hover-to-Animate Emoji Reaction Button (Static Google Noto Emoji by Default, Animated on Hover)
 */
const InteractiveEmojiButton = ({ emoji, onSelect }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      onClick={(e) => onSelect(emoji, e)}
      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center p-1 rounded-full hover:bg-white/15 hover:scale-130 active:scale-90 transform transition-all duration-150 cursor-pointer"
      title={`Send ${emoji}`}
    >
      {isHovered ? (
        <AnimatedEmoji emoji={emoji} className="w-6 h-6 sm:w-7 sm:h-7 pointer-events-none" />
      ) : (
        <StaticNotoEmoji emoji={emoji} className="w-5.5 h-5.5 sm:w-6 sm:h-6 pointer-events-none" />
      )}
    </button>
  );
};
/**
 * Google Meet Official Hand Icon
 */
export const GoogleMeetHandIcon = ({ className = "w-5 h-5", isRaised = false }) => (
  <svg
    viewBox="0 0 24 24"
    fill={isRaised ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={isRaised ? "0.5" : "1.8"}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      fill={isRaised ? "currentColor" : "none"}
      d="M13 24c-3.258 0-6.169-1.271-8.32-3.334l-4.68-4.666 1.414-1.414 4.586 3.586v-13.172c0-.552.448-1 1-1s1 .448 1 1v7h1v-10c0-.552.448-1 1-1s1 .448 1 1v10h1v-11c0-.552.448-1 1-1s1 .448 1 1v11h1v-9c0-.552.448-1 1-1s1 .448 1 1v13.5c0 3.584-2.916 6.5-6.5 6.5z"
    />
  </svg>
);

export const CallControls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isHandRaised,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onEndCall,
  onSendReaction,
  activeSidebar, // 'chat', 'activities', 'people', 'info', or null
  onToggleSidebar, // (sidebarName) => void
  unreadChatCount = 0,
  participantCount = 1,
  roomTitle = "VYBE Meeting",
  onOpenSettings,
  onToggleFullscreen,
  isFullscreen = false,
  isFloating = false,
  audioInputDevices = [],
  videoDevices = [],
  selectedAudioInput,
  setSelectedAudioInput,
  selectedVideo,
  setSelectedVideo,
  isHost = false,
  hostSettings = {
    allowScreenShare: true,
    allowChat: true,
    allowMic: true,
    allowCamera: true,
    allowReactions: true,
  },
}) => {
  const [showReactionsPill, setShowReactionsPill] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);
  const [showVideoDropdown, setShowVideoDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const reactionsList = ["💖", "👍", "🎉", "👏", "😂", "😮", "😢", "👎", "💯", "🔥", "✨"];
  const moreMenuRef = useRef(null);

  // Live Time Formatter (GMeet format: 11:45 PM)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
        setShowAudioDropdown(false);
        setShowVideoDropdown(false);
        setShowReactionsPill(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const handleReactionClick = (emoji, e) => {
    triggerHaptic("medium");
    microAudio?.playPop?.();
    let originPercent = 50;
    if (e && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickCenterX = rect.left + rect.width / 2;
      originPercent = Math.max(8, Math.min(92, (clickCenterX / window.innerWidth) * 100));
    }
    onSendReaction?.(emoji, originPercent);
  };

  return (
    <div
      ref={moreMenuRef}
      className={
        isFloating || isFullscreen
          ? "flex items-center gap-1.5 sm:gap-2.5 bg-[#181a1d]/90 backdrop-blur-2xl border border-white/20 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-2xl text-white select-none relative animate-in fade-in zoom-in-95 duration-200"
          : "w-full bg-[#1e1f20] border-t border-zinc-700/80 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between z-50 text-white select-none shadow-2xl relative"
      }
    >
      {/* ============================================================
          1. LEFT SECTION: TIME & MEETING INFO (Hidden in floating mode)
          ============================================================ */}
      {!isFloating && !isFullscreen && (
        <div className="flex items-center gap-3 min-w-0 shrink-0 hidden md:flex">
          <span className="text-xs font-semibold text-zinc-300 font-mono tracking-tight">
            {currentTime || "12:00 PM"}
          </span>
          <span className="text-zinc-600 text-xs">|</span>
          <span className="text-xs font-bold text-white truncate max-w-[160px] lg:max-w-[240px]">
            {roomTitle}
          </span>
        </div>
      )}

      {/* ============================================================
          2. CORE CALL BUTTONS
          ============================================================ */}
      <div className={`flex items-center gap-1.5 sm:gap-2.5 relative ${isFloating || isFullscreen ? "" : "mx-auto"}`}>
        {/* FLOATING GMEET REACTION BAR (EMOJI PILL) */}
        {showReactionsPill && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#28292a]/95 backdrop-blur-2xl border border-zinc-700 px-3 py-1.5 rounded-full shadow-2xl animate-in zoom-in-95 duration-150 z-50">
            {reactionsList.map((emoji) => (
              <InteractiveEmojiButton
                key={emoji}
                emoji={emoji}
                onSelect={handleReactionClick}
              />
            ))}
          </div>
        )}

        {/* 🎤 MICROPHONE BUTTON + DEVICE SELECTOR */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              if (!isHost && hostSettings.allowMic === false && isMuted) {
                snackbar.warning("The meeting host has turned off microphones for attendees 🔇");
                return;
              }
              triggerHaptic("selection");
              onToggleMute();
            }}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
              isMuted
                ? "bg-[#ea4335] hover:bg-[#d93025] text-white ring-2 ring-rose-400/40"
                : "bg-[#3c4043] hover:bg-[#474b50] text-white"
            }`}
            title={isMuted ? "Turn on microphone" : "Turn off microphone"}
          >
            {isMuted ? <MicOff className="w-4.5 h-4.5 sm:w-5 sm:h-5" /> : <Mic className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
          </button>
          
          {audioInputDevices.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setShowAudioDropdown(!showAudioDropdown);
                setShowVideoDropdown(false);
                setShowMoreMenu(false);
              }}
              className="p-1 -ml-1 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Select Microphone"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {/* AUDIO INPUT DEVICE POPUP */}
          {showAudioDropdown && (
            <div className="absolute bottom-full mb-3 left-0 w-64 bg-[#28292a]/95 backdrop-blur-2xl border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl animate-in zoom-in-95 duration-150 z-50 text-white space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-700/50">
                Select Microphone
              </div>
              {audioInputDevices.map((d) => (
                <button
                  key={d.deviceId}
                  type="button"
                  onClick={() => {
                    setSelectedAudioInput?.(d.deviceId);
                    setShowAudioDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                    selectedAudioInput === d.deviceId
                      ? "bg-purple-600/30 text-purple-300 font-bold border border-purple-500/40"
                      : "hover:bg-white/10 text-zinc-300"
                  }`}
                >
                  <span className="truncate pr-2">{d.label || `Microphone (${d.deviceId.slice(0, 8)}...)`}</span>
                  {selectedAudioInput === d.deviceId && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 📹 CAMERA BUTTON + DEVICE SELECTOR */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              if (!isHost && hostSettings?.allowCamera === false && isVideoOff) {
                snackbar.warning("The meeting host has turned off cameras for attendees 📷");
                return;
              }
              triggerHaptic("selection");
              onToggleVideo();
            }}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
              isVideoOff
                ? "bg-[#ea4335] hover:bg-[#d93025] text-white ring-2 ring-rose-400/40"
                : "bg-[#3c4043] hover:bg-[#474b50] text-white"
            }`}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff className="w-4.5 h-4.5 sm:w-5 sm:h-5" /> : <Video className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
          </button>

          {videoDevices.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setShowVideoDropdown(!showVideoDropdown);
                setShowAudioDropdown(false);
                setShowMoreMenu(false);
              }}
              className="p-1 -ml-1 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Select Camera"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {/* VIDEO DEVICE POPUP */}
          {showVideoDropdown && (
            <div className="absolute bottom-full mb-3 left-0 w-64 bg-[#28292a]/95 backdrop-blur-2xl border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl animate-in zoom-in-95 duration-150 z-50 text-white space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-700/50">
                Select Camera
              </div>
              {videoDevices.map((d) => (
                <button
                  key={d.deviceId}
                  type="button"
                  onClick={() => {
                    setSelectedVideo?.(d.deviceId);
                    setShowVideoDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                    selectedVideo === d.deviceId
                      ? "bg-purple-600/30 text-purple-300 font-bold border border-purple-500/40"
                      : "hover:bg-white/10 text-zinc-300"
                  }`}
                >
                  <span className="truncate pr-2">{d.label || `Camera (${d.deviceId.slice(0, 8)}...)`}</span>
                  {selectedVideo === d.deviceId && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ✋ RAISE HAND BUTTON */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            onToggleHand();
          }}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
            isHandRaised
              ? "bg-[#8ab4f8] text-[#202124] ring-2 ring-blue-400/50 shadow-blue-500/30"
              : "bg-[#3c4043] hover:bg-[#474b50] text-white"
          }`}
          title={isHandRaised ? "Lower hand" : "Raise hand"}
        >
          <GoogleMeetHandIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" isRaised={isHandRaised} />
        </button>

        {/* 😊 EMOJI / REACTION BUTTON */}
        <button
          type="button"
          onClick={() => {
            if (!isHost && hostSettings.allowReactions === false) {
              snackbar.warning("The meeting host has disabled emoji reactions 🚫");
              return;
            }
            triggerHaptic("selection");
            setShowReactionsPill(!showReactionsPill);
            setShowMoreMenu(false);
          }}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
            showReactionsPill
              ? "bg-[#8ab4f8] text-[#202124]"
              : "bg-[#3c4043] hover:bg-[#474b50] text-white"
          }`}
          title="Send a reaction"
        >
          <Smile className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </button>

        {/* 🖥️ PRESENT NOW / SCREEN SHARE */}
        <button
          type="button"
          onClick={() => {
            if (!isHost && hostSettings.allowScreenShare === false && !isScreenSharing) {
              snackbar.warning("The meeting host has disabled screen sharing 🛑");
              return;
            }
            triggerHaptic("selection");
            onToggleScreenShare();
          }}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
            isScreenSharing
              ? "bg-[#8ab4f8] text-[#202124] ring-2 ring-blue-400/50"
              : "bg-[#3c4043] hover:bg-[#474b50] text-white"
          }`}
          title={isScreenSharing ? "Stop presenting" : "Present now (Share Screen)"}
        >
          <Monitor className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </button>

        {/* IN FLOATING / FULLSCREEN MODE: INTEGRATE CHAT & ACTIVITIES DIRECTLY */}
        {(isFloating || isFullscreen) && (
          <>
            {/* 💬 In-Call Chat */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onToggleSidebar(activeSidebar === "chat" ? null : "chat");
              }}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer relative hover:scale-105 active:scale-95 ${
                activeSidebar === "chat"
                  ? "bg-[#8ab4f8] text-[#202124]"
                  : "bg-[#3c4043] hover:bg-[#474b50] text-white"
              }`}
              title="Chat with everyone"
            >
              <MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              {unreadChatCount > 0 && activeSidebar !== "chat" && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse shadow-md">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* 👥 People */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onToggleSidebar(activeSidebar === "people" ? null : "people");
              }}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer relative hover:scale-105 active:scale-95 ${
                activeSidebar === "people"
                  ? "bg-[#8ab4f8] text-[#202124]"
                  : "bg-[#3c4043] hover:bg-[#474b50] text-white"
              }`}
              title="Participants"
            >
              <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              {participantCount > 1 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {participantCount}
                </span>
              )}
            </button>

            {/* ▦ Activities (9-Dot) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onToggleSidebar(activeSidebar === "activities" ? null : "activities");
              }}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
                activeSidebar === "activities"
                  ? "bg-[#8ab4f8] text-[#202124]"
                  : "bg-[#3c4043] hover:bg-[#474b50] text-white"
              }`}
              title="Activities (Whiteboard, Recording, Polls, Q&A, Effects)"
            >
              <LayoutGrid className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* ⚙️ MORE OPTIONS (3 DOTS) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setShowMoreMenu(!showMoreMenu);
              setShowAudioDropdown(false);
              setShowVideoDropdown(false);
            }}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
              showMoreMenu
                ? "bg-[#8ab4f8] text-[#202124]"
                : "bg-[#3c4043] hover:bg-[#474b50] text-white"
            }`}
            title="More options"
          >
            <MoreVertical className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>

          {/* MORE OPTIONS DROPDOWN (GMEET STYLE) */}
          {showMoreMenu && (
            <div className="absolute bottom-full mb-3 right-0 sm:left-1/2 sm:-translate-x-1/2 w-60 bg-[#28292a]/95 backdrop-blur-2xl border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl animate-in zoom-in-95 duration-150 z-50 text-white space-y-1">
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onToggleSidebar("activities");
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 transition cursor-pointer text-left"
              >
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Visual Effects & Backgrounds</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onToggleFullscreen?.();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 transition cursor-pointer text-left"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-blue-400" />
                    <span>Exit Full screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-blue-400" />
                    <span>Full screen</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenSettings?.();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 transition cursor-pointer text-left"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Call Settings</span>
              </button>
            </div>
          )}
        </div>

        {/* 🔴 END CALL (RED PILL) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("heavy");
            onEndCall();
          }}
          className="h-10 sm:h-11 px-4 sm:px-6 rounded-full bg-[#ea4335] hover:bg-[#d93025] active:scale-95 text-white flex items-center justify-center transition shadow-lg shadow-rose-600/30 cursor-pointer"
          title="Leave call"
        >
          <PhoneOff className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* ============================================================
          3. RIGHT SECTION: SIDEBAR TOGGLES (Normal mode only)
          ============================================================ */}
      {!isFloating && !isFullscreen && (
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* ℹ️ Meeting Info */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              onToggleSidebar(activeSidebar === "info" ? null : "info");
            }}
            className={`p-2 sm:p-2.5 rounded-full transition cursor-pointer ${
              activeSidebar === "info"
                ? "bg-[#8ab4f8] text-[#202124]"
                : "text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title="Meeting details"
          >
            <Info className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>

          {/* 👥 People / Participants */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              onToggleSidebar(activeSidebar === "people" ? null : "people");
            }}
            className={`relative p-2 sm:p-2.5 rounded-full transition cursor-pointer ${
              activeSidebar === "people"
                ? "bg-[#8ab4f8] text-[#202124]"
                : "text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title="People"
          >
            <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            {participantCount > 1 && (
              <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {participantCount}
              </span>
            )}
          </button>

          {/* 💬 In-Call Messages / Chat Sidebar */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              onToggleSidebar(activeSidebar === "chat" ? null : "chat");
            }}
            className={`relative p-2 sm:p-2.5 rounded-full transition cursor-pointer ${
              activeSidebar === "chat"
                ? "bg-[#8ab4f8] text-[#202124]"
                : "text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title="Chat with everyone"
          >
            <MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            {unreadChatCount > 0 && activeSidebar !== "chat" && (
              <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* ▦ Activities / 9-Dot Button (Google Meet Iconic) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              onToggleSidebar(activeSidebar === "activities" ? null : "activities");
            }}
            className={`p-2 sm:p-2.5 rounded-full transition cursor-pointer ${
              activeSidebar === "activities"
                ? "bg-[#8ab4f8] text-[#202124]"
                : "text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title="Activities (Whiteboard, Recording, Polls, Q&A, Effects)"
          >
            <LayoutGrid className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CallControls;


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
  Shapes,
  Shield,
} from "lucide-react";
import { triggerHaptic, microAudio } from "../../lib/interactiveEffects";
import { snackbar } from "../../lib/snackbar";
import { AnimatedEmoji, StaticNotoEmoji } from "../CallReactionStream";

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
      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center p-1 rounded-full hover:bg-white/15 hover:scale-125 active:scale-90 transform transition-all duration-150 cursor-pointer"
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

/**
 * Google Meet Official Closed Captions (CC) Icon
 */
export const GoogleMeetCCIcon = ({ className = "w-5 h-5", active = false }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1z" />
  </svg>
);

export const MeetControls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isHandRaised,
  isCaptionsOn = false,
  onToggleCaptions,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onEndCall,
  onSendReaction,
  activeSidebar, // 'chat', 'activities', 'people', 'info', 'gemini', or null
  onToggleSidebar, // (sidebarName) => void
  unreadChatCount = 0,
  participantCount = 1,
  roomTitle = "VYBE Meeting",
  onOpenSettings,
  onToggleFullscreen,
  isFullscreen = false,
  isHost = false,
  layoutMode = "tiled", // 'tiled' | 'spotlight' | 'sidebar'
  onChangeLayoutMode,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const reactionRef = useRef(null);
  const moreMenuRef = useRef(null);

  const emojiList = ["❤️", "👍", "🎉", "👏", "😂", "😮", "😢", "🤔", "👎"];

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (reactionRef.current && !reactionRef.current.contains(e.target)) {
        setShowReactions(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReactionClick = (emoji, e) => {
    e?.stopPropagation();
    triggerHaptic("light");
    onSendReaction?.(emoji);
  };

  return (
    <div className="w-full bg-[#1e1f20] border-t border-zinc-700/80 px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 select-none font-sans transition-all duration-300">
      {/* 1. Left: Meeting Info / Title */}
      <div className="hidden md:flex items-center gap-3 min-w-0">
        <h2 className="text-sm font-semibold text-white truncate max-w-[200px] xl:max-w-[280px]">
          {roomTitle}
        </h2>
      </div>

      {/* 2. Center: Core Communication Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 mx-auto md:mx-0">
        {/* Microphone Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onToggleMute();
          }}
          className={`p-3 rounded-full transition-all duration-200 cursor-pointer ${
            isMuted
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
          }`}
          title={isMuted ? "Turn on microphone" : "Turn off microphone"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Camera Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onToggleVideo();
          }}
          className={`p-3 rounded-full transition-all duration-200 cursor-pointer ${
            isVideoOff
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
          }`}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Live Closed Captions (CC) Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            onToggleCaptions?.();
          }}
          className={`p-3 rounded-full transition-all duration-200 cursor-pointer ${
            isCaptionsOn
              ? "bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/50 shadow-md shadow-blue-600/30"
              : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
          }`}
          title={isCaptionsOn ? "Turn off captions (c)" : "Turn on captions (c)"}
        >
          <GoogleMeetCCIcon className="w-5 h-5" active={isCaptionsOn} />
        </button>

        {/* Screen Share Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            onToggleScreenShare();
          }}
          className={`hidden sm:flex p-3 rounded-full transition-all duration-200 cursor-pointer ${
            isScreenSharing
              ? "bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/50"
              : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
          }`}
          title={isScreenSharing ? "Stop presenting" : "Present now (Screen Share)"}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Hand Raise Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onToggleHand();
          }}
          className={`p-3 rounded-full transition-all duration-200 cursor-pointer ${
            isHandRaised
              ? "bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold"
              : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
          }`}
          title={isHandRaised ? "Lower hand" : "Raise hand"}
        >
          <GoogleMeetHandIcon className="w-5 h-5" isRaised={isHandRaised} />
        </button>

        {/* Emoji Reactions Trigger & Flyout */}
        <div className="relative" ref={reactionRef}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setShowReactions(!showReactions);
            }}
            className={`p-3 rounded-full transition-all duration-200 cursor-pointer ${
              showReactions
                ? "bg-blue-600 text-white"
                : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
            }`}
            title="Send a reaction"
          >
            <Smile className="w-5 h-5" />
          </button>

          {showReactions && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#2d2e30]/95 border border-zinc-600/80 backdrop-blur-xl px-2 py-1.5 rounded-full shadow-2xl flex items-center gap-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              {emojiList.map((emoji) => (
                <InteractiveEmojiButton
                  key={emoji}
                  emoji={emoji}
                  onSelect={(em, e) => handleReactionClick(em, e)}
                />
              ))}
            </div>
          )}
        </div>

        {/* More Options Menu (Layout, Fullscreen, Settings) */}
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            data-testid="meet-more-options-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              setShowMoreMenu((prev) => !prev);
            }}
            className={`p-3 rounded-full transition cursor-pointer ${
              showMoreMenu ? "bg-blue-600 text-white" : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
            }`}
            title="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMoreMenu && (
            <div
              data-testid="meet-more-options-menu"
              className="absolute bottom-16 right-0 sm:left-1/2 sm:-translate-x-1/2 w-60 bg-[#2d2e30] border border-zinc-700/90 rounded-2xl shadow-2xl p-2 z-50 text-xs font-semibold text-white space-y-1.5 backdrop-blur-md"
            >
              {/* Change Layout Option */}
              <div className="px-2 py-0.5 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Change Layout
              </div>
              <div className="grid grid-cols-3 gap-1 px-1.5 pb-1 border-b border-zinc-700/80">
                {[
                  { id: "tiled", label: "Tiled" },
                  { id: "spotlight", label: "Spotlight" },
                  { id: "sidebar", label: "Sidebar" },
                ].map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => {
                      onChangeLayoutMode?.(layout.id);
                      triggerHaptic("light");
                      setShowMoreMenu(false);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition cursor-pointer ${
                      layoutMode === layout.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-[#383a3d] hover:bg-white/10 text-zinc-300"
                    }`}
                  >
                    {layout.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenSettings?.();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition cursor-pointer"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Audio & Video Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onToggleFullscreen?.();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition cursor-pointer"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-zinc-400" />
                    <span>Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-zinc-400" />
                    <span>Fullscreen</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* End / Leave Call Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("heavy");
            onEndCall();
          }}
          className="px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold transition shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer ml-1 sm:ml-2"
          title="Leave call"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden sm:inline text-xs">Leave</span>
        </button>
      </div>

      {/* 3. Right: Workspace Drawers Toggles (Gemini, Info, People, Chat, Activities) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Ask Gemini in Meet */}
        <button
          type="button"
          data-testid="meet-gemini-btn"
          onClick={() => {
            triggerHaptic("medium");
            onToggleSidebar(activeSidebar === "gemini" ? null : "gemini");
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full transition cursor-pointer font-bold text-xs ${
            activeSidebar === "gemini"
              ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
              : "bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30"
          }`}
          title="Ask Gemini (AI Notes & Summary)"
        >
          <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
          <span className="hidden md:inline text-[11px]">Gemini</span>
        </button>

        {/* Info Sidebar Toggle */}
        <button
          type="button"
          data-testid="meet-info-btn"
          onClick={() => {
            triggerHaptic("light");
            onToggleSidebar(activeSidebar === "info" ? null : "info");
          }}
          className={`p-2 sm:p-2.5 rounded-full transition cursor-pointer ${
            activeSidebar === "info"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
          title="Meeting details"
        >
          <Info className="w-5 h-5" />
        </button>

        {/* People Sidebar Toggle with Count Badge */}
        <button
          type="button"
          data-testid="meet-people-btn"
          onClick={() => {
            triggerHaptic("light");
            onToggleSidebar(activeSidebar === "people" ? null : "people");
          }}
          className={`relative p-2 sm:p-2.5 rounded-full transition cursor-pointer ${
            activeSidebar === "people"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
          title="Participants"
        >
          <Users className="w-5 h-5" />
          {participantCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 bg-zinc-700 text-white text-[10px] font-bold rounded-full border border-zinc-600">
              {participantCount}
            </span>
          )}
        </button>

        {/* In-Meeting Chat Toggle with Unread Badge */}
        <button
          type="button"
          data-testid="meet-chat-btn"
          onClick={() => {
            triggerHaptic("light");
            onToggleSidebar(activeSidebar === "chat" ? null : "chat");
          }}
          className={`relative p-2 sm:p-2.5 rounded-full transition cursor-pointer ${
            activeSidebar === "chat"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
          title="Chat with everyone"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatCount > 0 && activeSidebar !== "chat" && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Activities Drawer Toggle (Polls, Whiteboard, Breakouts) */}
        <button
          type="button"
          data-testid="meet-activities-btn"
          onClick={() => {
            triggerHaptic("light");
            onToggleSidebar(activeSidebar === "activities" ? null : "activities");
          }}
          className={`p-2 sm:p-2.5 rounded-full transition cursor-pointer ${
            activeSidebar === "activities"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
          title="Activities (Whiteboard, Polls, Breakout Rooms)"
        >
          <Shapes className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default MeetControls;

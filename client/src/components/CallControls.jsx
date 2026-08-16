import React, { useState, useRef, useEffect } from "react";
import {
  Mic, MicOff, Video, VideoOff, Monitor, Settings, PhoneOff,
  Smile, Hand, ShieldAlert, Tv, Sparkles, MoreHorizontal, X, ChevronUp
} from "lucide-react";

export const CallControls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  audioInputDevices,
  videoDevices,
  audioOutputDevices,
  selectedAudioInput,
  setSelectedAudioInput,
  selectedVideo,
  setSelectedVideo,
  selectedAudioOutput,
  setSelectedAudioOutput,
  onSendReaction,
  onToggleHand,
  isHandRaised,
  isHost,
  onMuteAll,
  onToggleWatchParty,
  isWatchPartyActive,
  videoFilter,
  onChangeVideoFilter,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  const reactionsList = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

  // Close "More" menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMoreMenu]);

  // Close all panels when "More" menu is closed
  const closeAllPanels = () => {
    setShowSettings(false);
    setShowReactions(false);
    setShowFilters(false);
  };

  const toggleMoreMenu = () => {
    if (showMoreMenu) {
      closeAllPanels();
    }
    setShowMoreMenu(!showMoreMenu);
  };

  // Count active secondary features for badge indicator on "More" button
  const activeSecondaryCount = [isHandRaised, isWatchPartyActive, videoFilter !== "none"].filter(Boolean).length;

  return (
    <div className="relative flex flex-col items-center gap-2 w-full max-w-2xl mx-auto z-50" ref={moreMenuRef}>

      {/* ============================================================
          POPOVERS â€” Positioned above the control bar
          ============================================================ */}

      {/* Settings Panel Popover */}
      {showSettings && (
        <div className="absolute bottom-full mb-3 left-4 right-4 md:left-auto md:right-auto md:w-80 bg-surface border border-border p-4 rounded-2xl shadow-2xl flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Device Settings
            </h4>
            <button onClick={() => setShowSettings(false)} className="text-text-muted hover:text-text cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Camera Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted">Camera Input</label>
            <select
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              className="bg-bg text-text text-xs p-2 rounded-lg border border-border outline-none"
            >
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
              ))}
            </select>
          </div>

          {/* Microphone Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted">Microphone Input</label>
            <select
              value={selectedAudioInput}
              onChange={(e) => setSelectedAudioInput(e.target.value)}
              className="bg-bg text-text text-xs p-2 rounded-lg border border-border outline-none"
            >
              {audioInputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
              ))}
            </select>
          </div>

          {/* Speaker Output */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted">Speaker Output</label>
            <select
              value={selectedAudioOutput}
              onChange={(e) => setSelectedAudioOutput(e.target.value)}
              className="bg-bg text-text text-xs p-2 rounded-lg border border-border outline-none"
            >
              {audioOutputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 5)}`}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Emoji Drawer Popover */}
      {showReactions && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex gap-2 bg-surface border border-border px-3 py-2 rounded-full shadow-2xl animate-in zoom-in duration-200 z-50">
          {reactionsList.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSendReaction(emoji);
                setShowReactions(false);
                setShowMoreMenu(false);
              }}
              className="text-2xl hover:scale-125 active:scale-95 transition transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Visual Filters Popover */}
      {showFilters && (
        <div className="absolute bottom-full mb-3 left-4 right-4 md:left-auto md:right-auto bg-surface border border-border p-4 rounded-2xl shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 w-72">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              Video Effects
            </h4>
            <button onClick={() => setShowFilters(false)} className="text-text-muted hover:text-text cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "none", label: "Normal" },
              { id: "grayscale", label: "Noir" },
              { id: "sepia", label: "Vintage" },
              { id: "invert", label: "Cyber" },
              { id: "contrast", label: "Drama" },
              { id: "warm", label: "Warm" },
              { id: "cool", label: "Cool" },
              { id: "blur", label: "Blur" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChangeVideoFilter(opt.id);
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition cursor-pointer ${
                  videoFilter === opt.id
                    ? "bg-pink-600/10 border border-pink-500/40 text-pink-400 font-bold scale-105"
                    : "bg-bg border border-border text-text hover:bg-surface-inset"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${
                  opt.id === "grayscale" ? "bg-zinc-600" :
                  opt.id === "sepia" ? "bg-amber-700/80" :
                  opt.id === "invert" ? "bg-indigo-600" :
                  opt.id === "contrast" ? "bg-emerald-600" :
                  opt.id === "warm" ? "bg-orange-400" :
                  opt.id === "cool" ? "bg-sky-400" :
                  opt.id === "blur" ? "bg-zinc-800/40 blur-[1.5px]" : "bg-zinc-800"
                }`} />
                <span className="text-[9px] truncate w-full text-center">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          "MORE" MENU â€” Secondary actions grid (Google Meet / Zoom style)
          Opens above the primary bar
          ============================================================ */}
      {showMoreMenu && (
        <div className="w-full bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            
            {/* Screen Share â€” visible in More menu on MOBILE only (desktop has it in primary bar) */}
            <button
              onClick={() => { onToggleScreenShare(); setShowMoreMenu(false); }}
              className="md:hidden flex flex-col items-center gap-1.5 p-3 rounded-2xl transition cursor-pointer group"
            >
              <div className={`p-2.5 rounded-xl transition border ${
                isScreenSharing
                  ? "bg-purple-600/20 border-purple-500 text-purple-400"
                  : "bg-white/5 border-white/10 text-white group-hover:bg-white/10"
              }`}>
                <Monitor className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-semibold text-text-muted">{isScreenSharing ? "Stop" : "Share"}</span>
            </button>

            {/* Watch Party */}
            <button
              onClick={() => { onToggleWatchParty(); setShowMoreMenu(false); }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition cursor-pointer group"
            >
              <div className={`p-2.5 rounded-xl transition border ${
                isWatchPartyActive
                  ? "bg-pink-600/20 border-pink-500 text-pink-400"
                  : "bg-white/5 border-white/10 text-white group-hover:bg-white/10"
              }`}>
                <Tv className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-semibold text-text-muted">Watch Party</span>
            </button>

            {/* Raise Hand */}
            <button
              onClick={() => { onToggleHand(); setShowMoreMenu(false); }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition cursor-pointer group"
            >
              <div className={`p-2.5 rounded-xl transition border ${
                isHandRaised
                  ? "bg-amber-600/20 border-amber-500 text-amber-500"
                  : "bg-white/5 border-white/10 text-white group-hover:bg-white/10"
              }`}>
                <Hand className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-semibold text-text-muted">{isHandRaised ? "Lower" : "Raise"} Hand</span>
            </button>

            {/* Reactions */}
            <button
              onClick={() => {
                setShowReactions(!showReactions);
                setShowSettings(false);
                setShowFilters(false);
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition cursor-pointer group"
            >
              <div className={`p-2.5 rounded-xl transition border ${
                showReactions
                  ? "bg-amber-600/20 border-amber-500 text-amber-500"
                  : "bg-white/5 border-white/10 text-white group-hover:bg-white/10"
              }`}>
                <Smile className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-semibold text-text-muted">Reactions</span>
            </button>

            {/* Video Effects */}
            <button
              onClick={() => {
                setShowFilters(!showFilters);
                setShowReactions(false);
                setShowSettings(false);
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition cursor-pointer group"
            >
              <div className={`p-2.5 rounded-xl transition border ${
                showFilters || (videoFilter && videoFilter !== "none")
                  ? "bg-pink-600/20 border-pink-500 text-pink-400"
                  : "bg-white/5 border-white/10 text-white group-hover:bg-white/10"
              }`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-semibold text-text-muted">Effects</span>
            </button>

            {/* Device Settings */}
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setShowReactions(false);
                setShowFilters(false);
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition cursor-pointer group"
            >
              <div className={`p-2.5 rounded-xl transition border ${
                showSettings
                  ? "bg-blue-600/20 border-blue-500 text-blue-400"
                  : "bg-white/5 border-white/10 text-white group-hover:bg-white/10"
              }`}>
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-semibold text-text-muted">Settings</span>
            </button>

            {/* Host Controls */}
            {isHost && (
              <button
                onClick={() => { onMuteAll(); setShowMoreMenu(false); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-400 group-hover:bg-rose-900/40 transition">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-semibold text-rose-400">Mute All</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          PRIMARY CONTROL BAR â€” Always visible, most important actions
          Layout: [Mic] [Video] [Screen Share (desktop)] ... [More â‹¯] [End Call]
          
          UX Pattern: Google Meet, Zoom, Discord â€” critical actions never hidden
          - Mic & Video: Most used, always visible
          - Screen Share: Important enough for desktop primary bar
          - End Call: MUST always be visible and prominent (red)
          - Everything else: "More" menu
          ============================================================ */}
      <div className="flex items-center justify-center gap-3 md:gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-3 md:p-4 rounded-3xl w-full shadow-2xl">
        
        {/* Toggle Audio â€” ALWAYS VISIBLE */}
        <button
          onClick={onToggleMute}
          className={`p-3 md:p-3.5 rounded-2xl transition border ${
            isMuted
              ? "bg-rose-600/20 border-rose-500 text-rose-500 hover:bg-rose-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Video â€” ALWAYS VISIBLE */}
        <button
          onClick={onToggleVideo}
          className={`p-3 md:p-3.5 rounded-2xl transition border ${
            isVideoOff
              ? "bg-rose-600/20 border-rose-500 text-rose-500 hover:bg-rose-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share â€” Visible on DESKTOP only, hidden on mobile (in More menu) */}
        <button
          onClick={onToggleScreenShare}
          className={`hidden md:flex p-3.5 rounded-2xl transition border ${
            isScreenSharing
              ? "bg-purple-600/20 border-purple-500 text-purple-400 hover:bg-purple-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* MORE BUTTON â€” Opens secondary actions grid */}
        <button
          onClick={toggleMoreMenu}
          className={`relative p-3 md:p-3.5 rounded-2xl transition border ${
            showMoreMenu
              ? "bg-blue-600/20 border-blue-500 text-blue-400"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title="More Actions"
        >
          {showMoreMenu ? <ChevronUp className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
          {/* Activity badge â€” shows count of active secondary features */}
          {activeSecondaryCount > 0 && !showMoreMenu && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
              {activeSecondaryCount}
            </span>
          )}
        </button>

        {/* END CALL â€” ALWAYS VISIBLE, prominent red */}
        <button
          onClick={onEndCall}
          className="p-3 md:p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-xl transform active:scale-95 border border-rose-500"
          title="Hang Up"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CallControls;


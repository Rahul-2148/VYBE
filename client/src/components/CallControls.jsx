import React, { useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, Monitor, Settings, PhoneOff,
  Smile, Hand, ShieldAlert, Volume2, Tv, Sparkles
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

  const reactionsList = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

  return (
    <div className="relative flex flex-col items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl w-full max-w-2xl shadow-2xl mx-auto z-50">
      
      {/* Settings Panel Popover */}
      {showSettings && (
        <div className="absolute bottom-20 left-4 right-4 md:left-auto md:right-auto md:w-80 bg-surface border border-border p-4 rounded-2xl shadow-2xl flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            Device Settings
          </h4>

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
        <div className="absolute bottom-20 flex gap-2 bg-surface border border-border px-3 py-2 rounded-full shadow-2xl animate-in zoom-in duration-200">
          {reactionsList.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSendReaction(emoji);
                setShowReactions(false);
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
        <div className="absolute bottom-20 bg-surface border border-border p-4 rounded-2xl shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 w-72">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            Video Effects
          </h4>
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

      {/* Main Action Control Bar */}
      <div className="flex items-center justify-between w-full md:gap-8 gap-4 px-2">
        {/* Toggle Audio */}
        <button
          onClick={onToggleMute}
          className={`p-3.5 rounded-2xl transition border ${
            isMuted
              ? "bg-rose-600/20 border-rose-500 text-rose-500 hover:bg-rose-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Video */}
        <button
          onClick={onToggleVideo}
          className={`p-3.5 rounded-2xl transition border ${
            isVideoOff
              ? "bg-rose-600/20 border-rose-500 text-rose-500 hover:bg-rose-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Share Screen */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3.5 rounded-2xl transition border ${
            isScreenSharing
              ? "bg-purple-600/20 border-purple-500 text-purple-400 hover:bg-purple-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Watch Party / Co-Watching */}
        <button
          onClick={onToggleWatchParty}
          className={`p-3.5 rounded-2xl transition border ${
            isWatchPartyActive
              ? "bg-pink-600/20 border-pink-500 text-pink-400 hover:bg-pink-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title={isWatchPartyActive ? "Close Watch Party" : "Watch Party"}
        >
          <Tv className="w-5 h-5" />
        </button>

        {/* Raise Hand */}
        <button
          onClick={onToggleHand}
          className={`p-3.5 rounded-2xl transition border ${
            isHandRaised
              ? "bg-amber-600/20 border-amber-500 text-amber-500 hover:bg-amber-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title="Raise Hand"
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* Emoji Reactions */}
        <button
          onClick={() => {
            setShowReactions(!showReactions);
            setShowSettings(false);
            setShowFilters(false);
          }}
          className={`p-3.5 rounded-2xl transition border ${
            showReactions
              ? "bg-amber-600/20 border-amber-500 text-amber-500 hover:bg-amber-600/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title="Reactions"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Video Effects */}
        <button
          onClick={() => {
            setShowFilters(!showFilters);
            setShowReactions(false);
            setShowSettings(false);
          }}
          className={`p-3.5 rounded-2xl transition border ${
            showFilters
              ? "bg-pink-600/20 border-pink-500 text-pink-400"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title="Video Effects"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Device Settings */}
        <button
          onClick={() => {
            setShowSettings(!showSettings);
            setShowReactions(false);
          }}
          className={`p-3.5 rounded-2xl transition border ${
            showSettings
              ? "bg-blue-600/20 border-blue-500 text-blue-400"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Host Moderation Controls */}
        {isHost && (
          <button
            onClick={onMuteAll}
            className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-400 hover:bg-rose-900/40 transition"
            title="Mute All (Moderator)"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
        )}

        {/* End Call / Leave Room */}
        <button
          onClick={onEndCall}
          className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-xl transform active:scale-95 border border-rose-500"
          title="Hang Up"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CallControls;

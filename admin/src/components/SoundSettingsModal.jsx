import React, { useState } from "react";
import {
  Volume2,
  VolumeX,
  Check,
  Play,
  X,
  Sliders,
  Mic,
  MicOff,
  Sparkles,
  Radio,
  ShieldAlert,
  Crown,
  Flame,
} from "lucide-react";
import { useSound, SOUND_PRESETS } from "../context/SoundContext";

export const SoundSettingsModal = ({ isOpen, onClose }) => {
  const {
    isMuted,
    volume,
    selectedSound,
    voiceEnabled,
    toggleMute,
    toggleVoice,
    setSoundVolume,
    setSoundPreset,
    playSound,
  } = useSound();

  const [activeCategory, setActiveCategory] = useState("all");
  const [playingId, setPlayingId] = useState(null);

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Chimes", icon: Sparkles },
    { id: "signature", label: "Signature", icon: Flame },
    { id: "safety", label: "Trust & Safety", icon: ShieldAlert },
    { id: "creator", label: "VIP & Creator", icon: Crown },
    { id: "viral", label: "Viral & Memes", icon: Radio },
  ];

  const filteredPresets = SOUND_PRESETS.filter((p) => {
    if (activeCategory === "all") return true;
    return p.category === activeCategory;
  });

  const handlePreview = (id) => {
    setPlayingId(id);
    playSound(id);
    setTimeout(() => setPlayingId(null), 600);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md select-none font-sans animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0c1017] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up relative"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* ── Fixed Header ── */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#0c1017]/95 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white font-['Outfit'] tracking-tight truncate">
                  Operations Chimes & SoundBox
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[9px] font-bold uppercase hidden sm:inline">
                  Telemetry Audio
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                Incident chimes, violation alerts, and viral voice drops
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 hide-scrollbar relative z-10">
          {/* Master Controls Card */}
          <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                    !isMuted
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-500/20"
                      : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div>
                  <p className="text-xs font-bold text-white">
                    {isMuted ? "Incident Chimes Muted" : "Real-time Audio Active"}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {isMuted ? "Audio muted for all telemetry alerts" : "Synthesizer active on incoming events"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    voiceEnabled
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-white/[0.03] text-zinc-500 border-white/[0.06]"
                  }`}
                >
                  {voiceEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{voiceEnabled ? "Voice Drops On" : "Voice Drops Off"}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    isMuted
                      ? "bg-white/[0.06] hover:bg-white/[0.1] text-white border-white/10"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30"
                  }`}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="space-y-1 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Master Volume</span>
                <span className="font-mono text-zinc-300 text-[11px]">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={isMuted}
                value={volume}
                onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-30"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-white/[0.12] text-white border border-white/[0.15] shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sound Presets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredPresets.map((preset) => {
              const isSelected = selectedSound === preset.id;
              const isPlaying = playingId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSoundPreset(preset.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                    isSelected
                      ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30"
                      : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? "text-purple-300" : "text-white"}`}>
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(preset.id);
                      }}
                      title="Preview Sound"
                      className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
                        isPlaying
                          ? "bg-purple-500 text-white border-purple-400 scale-105"
                          : "bg-white/[0.05] hover:bg-purple-600 hover:text-white text-zinc-300 border-white/[0.08]"
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.03]">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.04]">
                      {preset.badge}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Fixed Footer ── */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between shrink-0 bg-[#090c12] relative z-10">
          <button
            type="button"
            onClick={() => handlePreview(selectedSound)}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Active Preset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SoundSettingsModal;

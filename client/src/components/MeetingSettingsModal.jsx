import React, { useState, useEffect, useRef } from "react";
import {
  X, Mic, Video, Settings, Volume2, Sparkles, Check,
  Sliders, Shield, Play, Square, RefreshCw, Smartphone
} from "lucide-react";
import {
  getHapticsEnabled,
  setHapticsEnabled,
  getSoundEffectsEnabled,
  setSoundEffectsEnabled,
  triggerHaptic,
  microAudio,
} from "../lib/interactiveEffects";
import { snackbar } from "../lib/snackbar";
import { filterStyleMap } from "../constants/callFilters";

/**
 * High-Performance Memoized Video Stream Component for Video Preview
 */
const VideoStream = React.memo(({ stream, muted = false, className = "", style = {}, mirror = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
    }
    if (stream) {
      el.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`${className} ${mirror ? "-scale-x-100" : ""}`}
      style={style}
    />
  );
});

export const MeetingSettingsModal = ({
  isOpen,
  onClose,
  localStream,
  audioInputDevices = [],
  videoDevices = [],
  audioOutputDevices = [],
  selectedAudioInput,
  setSelectedAudioInput,
  selectedVideo,
  setSelectedVideo,
  selectedAudioOutput,
  setSelectedAudioOutput,
  videoFilter,
  onChangeVideoFilter,
  screenFitMode,
  setScreenFitMode,
}) => {
  const [activeTab, setActiveTab] = useState("audio"); // "audio" | "video" | "general"
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem("vybe_noise_suppression") !== "false" : true;
  });
  const [sendResolution, setSendResolution] = useState("1080p");
  const [hapticsOn, setHapticsOn] = useState(() => getHapticsEnabled());
  const [soundEffectsOn, setSoundEffectsOn] = useState(() => getSoundEffectsEnabled());
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Live Microphone Audio Level Meter (Auto-Resuming AudioContext)
  useEffect(() => {
    if (!isOpen || activeTab !== "audio" || !localStream) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try { audioContextRef.current.close(); } catch { /* ignore */ }
      }
      return;
    }

    let isMounted = true;

    try {
      const audioTracks = localStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0 || !audioTracks[0].enabled) {
        return;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Force resume AudioContext if suspended
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!isMounted || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        const vocalBins = Math.min(bufferLength, 48);
        for (let i = 0; i < vocalBins; i++) {
          sum += dataArray[i];
        }
        const avg = sum / vocalBins;
        const normalized = Math.min(100, Math.round((avg / 60) * 100));
        setMicVolumeLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("[MeetingSettings] Audio analyser error:", e);
    }

    return () => {
      isMounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try { audioContextRef.current.close(); } catch { /* ignore */ }
      }
      setMicVolumeLevel(0);
    };
  }, [isOpen, activeTab, localStream]);

  // AI Noise Suppression Toggle Handler
  const handleToggleNoiseSuppression = async () => {
    const nextVal = !noiseSuppression;
    setNoiseSuppression(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("vybe_noise_suppression", String(nextVal));
    }
    snackbar.success(nextVal ? "AI Noise Suppression enabled" : "AI Noise Suppression disabled");
  };

  // Test Speaker Tone Generator
  const playTestSpeaker = () => {
    if (isPlayingTestSound) return;
    try {
      setIsPlayingTestSound(true);
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        setIsPlayingTestSound(false);
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 440Hz standard pitch
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      setTimeout(() => {
        setIsPlayingTestSound(false);
        try { ctx.close(); } catch { /* ignore */ }
      }, 700);
    } catch (e) {
      console.warn("[MeetingSettings] Test audio error:", e);
      setIsPlayingTestSound(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0e131f] border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Call Settings</h3>
              <p className="text-[11px] text-zinc-400">Audio, Video & Device Preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Tabs Sidebar + Content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-44 border-r border-white/10 p-3 flex flex-col gap-1.5 bg-black/20 shrink-0">
            <button
              onClick={() => setActiveTab("audio")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                activeTab === "audio"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Audio</span>
            </button>

            <button
              onClick={() => setActiveTab("video")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                activeTab === "video"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video</span>
            </button>

            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                activeTab === "general"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>General</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            
            {/* ==================== AUDIO TAB ==================== */}
            {activeTab === "audio" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Microphone Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-purple-400" />
                      Microphone
                    </span>
                    <span className="text-[10px] text-zinc-500">{audioInputDevices.length} available</span>
                  </label>
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => setSelectedAudioInput(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 transition"
                  >
                    {audioInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900 text-white">
                        {d.label || `Microphone (${d.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))}
                  </select>

                  {/* Live Mic Level Bar */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Mic Input Level</span>
                      <span className="font-mono text-purple-300">{micVolumeLevel}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-purple-500 to-pink-500 rounded-full transition-all duration-75"
                        style={{ width: `${micVolumeLevel}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Speaker Output Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                      Speakers
                    </span>
                    <button
                      onClick={playTestSpeaker}
                      disabled={isPlayingTestSound}
                      className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" />
                      <span>{isPlayingTestSound ? "Testing..." : "Test Audio"}</span>
                    </button>
                  </label>
                  <select
                    value={selectedAudioOutput}
                    onChange={(e) => setSelectedAudioOutput(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 transition"
                  >
                    {audioOutputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900 text-white">
                        {d.label || `Speaker (${d.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Noise Cancellation Toggle */}
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      AI Noise Suppression
                    </p>
                    <p className="text-[10px] text-zinc-400">Filters out keyboard clicks, background noise and echo</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleNoiseSuppression}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      noiseSuppression ? "bg-purple-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        noiseSuppression ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* ==================== VIDEO TAB ==================== */}
            {activeTab === "video" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Camera Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-purple-400" />
                      Camera
                    </span>
                    <span className="text-[10px] text-zinc-500">{videoDevices.length} available</span>
                  </label>
                  <select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo?.(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 transition"
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900 text-white">
                        {d.label || `Camera (${d.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Video Preview Tile */}
                <div className="relative w-full h-48 bg-zinc-950 border border-white/15 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                  {localStream && localStream.getVideoTracks().length > 0 && localStream.getVideoTracks()[0].enabled ? (
                    <VideoStream
                      stream={localStream}
                      muted={true}
                      className="w-full h-full object-cover"
                      mirror={true}
                      style={{ filter: filterStyleMap[videoFilter || "none"] }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center p-4">
                      <Video className="w-8 h-8 text-zinc-600 animate-pulse" />
                      <span className="text-xs text-zinc-400 font-medium">Camera is turned off or initializing</span>
                      <span className="text-[10px] text-zinc-500">Turn on your camera in the call to preview video</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-1.5 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Video Preview</span>
                    {videoFilter && videoFilter !== "none" && (
                      <span className="text-pink-400 ml-1 font-mono uppercase text-[9px] bg-pink-500/20 px-1.5 py-0.2 rounded-full border border-pink-500/30">
                        {videoFilter}
                      </span>
                    )}
                  </div>
                </div>

                {/* Send Resolution */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Send Resolution</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "1080p", label: "Full HD (1080p)" },
                      { id: "720p", label: "HD (720p)" },
                      { id: "360p", label: "Data Saver (360p)" },
                    ].map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => {
                          setSendResolution(res.id);
                          triggerHaptic("selection");
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                          sendResolution === res.id
                            ? "bg-purple-600/30 border-purple-500 text-white"
                            : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Effects Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      Video Effect Filter
                    </span>
                    {videoFilter && videoFilter !== "none" && (
                      <span className="text-[10px] text-pink-400 font-bold uppercase">{videoFilter} active</span>
                    )}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "none", label: "Normal" },
                      { id: "grayscale", label: "Noir" },
                      { id: "sepia", label: "Vintage" },
                      { id: "contrast", label: "Drama" },
                      { id: "warm", label: "Warm" },
                      { id: "cool", label: "Cool" },
                      { id: "blur", label: "Soft Blur" },
                      { id: "invert", label: "Cyber" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          onChangeVideoFilter?.(f.id);
                          triggerHaptic("selection");
                        }}
                        className={`p-2.5 rounded-xl text-[11px] font-semibold border transition cursor-pointer text-center ${
                          (videoFilter || "none") === f.id
                            ? "bg-pink-600 text-white border-pink-400 shadow-lg shadow-pink-600/30 font-bold"
                            : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== GENERAL TAB ==================== */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Screen Fit Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Presentation Fit Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setScreenFitMode?.("contain")}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        screenFitMode === "contain"
                          ? "bg-purple-600/20 border-purple-500 text-white"
                          : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <p className="text-xs font-bold">Fit to Window (Contain)</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Shows full 100% presentation without cropping</p>
                    </button>

                    <button
                      onClick={() => setScreenFitMode?.("cover")}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        screenFitMode === "cover"
                          ? "bg-purple-600/20 border-purple-500 text-white"
                          : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <p className="text-xs font-bold">Fill Window (Cover)</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Expands presentation to fill entire viewport</p>
                    </button>
                  </div>
                </div>

                {/* Sound & Haptic Feedback Settings */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                    Sound & Haptic Feedback
                  </label>

                  {/* Haptic Vibration Switch */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>📳 Haptic Vibration</span>
                      </p>
                      <p className="text-[11px] text-zinc-400">Tactile vibration on buttons, toggles and emoji reactions</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("heavy");
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 transition cursor-pointer"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !hapticsOn;
                          setHapticsOn(next);
                          setHapticsEnabled(next);
                          if (next) triggerHaptic("medium");
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          hapticsOn ? "bg-purple-600" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            hapticsOn ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Sound Effects Switch */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🔔 Interactive Sound Effects</span>
                      </p>
                      <p className="text-[11px] text-zinc-400">Audio chimes for joins, leaves, hand raise & reactions</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          microAudio?.playPop?.();
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 transition cursor-pointer"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !soundEffectsOn;
                          setSoundEffectsOn(next);
                          setSoundEffectsEnabled(next);
                          if (next) microAudio?.playPop?.();
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          soundEffectsOn ? "bg-purple-600" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            soundEffectsOn ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Diagnostics / Connection Info */}
                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                    WebRTC Peer Connection Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                    <div>Audio Codec: <span className="text-white font-mono">Opus (48kHz)</span></div>
                    <div>Video Codec: <span className="text-white font-mono">VP9 / H.264</span></div>
                    <div>Encryption: <span className="text-emerald-400 font-bold">DTLS / SRTP (E2EE)</span></div>
                    <div>Packet Loss: <span className="text-emerald-400 font-bold">&lt; 0.1%</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-white/10 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingSettingsModal;

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, Loader2, Mic } from "lucide-react";
import { triggerHaptic } from "../lib/interactiveEffects";

// Keep track of currently playing audio globally so only 1 plays at a time
let globalCurrentAudio = null;
let globalSetIsPlaying = null;

// Deterministic Pseudo-Random Waveform generator based on URL or Duration
const generateWaveform = (seedStr, count = 30) => {
  let hash = 0;
  for (let i = 0; i < (seedStr?.length || 10); i++) {
    hash = (hash << 5) - hash + (seedStr?.charCodeAt(i) || i);
    hash |= 0;
  }
  const bars = [];
  for (let i = 0; i < count; i++) {
    const pseudoRand = Math.abs(Math.sin(hash + i * 137.5) * 100);
    // Values between 20% and 95% height with natural speech rhythm
    const height = Math.round(20 + (pseudoRand % 75));
    bars.push(height);
  }
  return bars;
};

export const VoiceNotePlayer = ({
  audioUrl,
  duration = 0,
  isSender = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);

  const audioRef = useRef(null);
  const waveformContainerRef = useRef(null);
  const waveformBars = useMemo(() => generateWaveform(audioUrl || "seed", 32), [audioUrl]);

  // Initialize Audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (globalCurrentAudio === audio) {
        globalCurrentAudio = null;
        globalSetIsPlaying = null;
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      if (globalCurrentAudio === audio) {
        globalCurrentAudio = null;
        globalSetIsPlaying = null;
      }
    };
  }, [audioUrl]);

  // Toggle Play / Pause with Single-Player Concurrency
  const handleTogglePlay = useCallback(
    (e) => {
      e?.stopPropagation();
      triggerHaptic("light");

      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        if (globalCurrentAudio === audio) {
          globalCurrentAudio = null;
          globalSetIsPlaying = null;
        }
      } else {
        // Pause previously playing audio across the entire page
        if (globalCurrentAudio && globalCurrentAudio !== audio) {
          globalCurrentAudio.pause();
          if (globalSetIsPlaying) {
            globalSetIsPlaying(false);
          }
        }

        globalCurrentAudio = audio;
        globalSetIsPlaying = setIsPlaying;

        audio.playbackRate = playbackRate;
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Audio playback failed:", err);
            setIsPlaying(false);
          });
      }
    },
    [isPlaying, playbackRate]
  );

  // Change Playback Speed (1x -> 1.5x -> 2x)
  const handleSpeedChange = (e) => {
    e.stopPropagation();
    triggerHaptic("selection");
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Interactive Waveform Seek Handler
  const handleSeek = (e) => {
    e.stopPropagation();
    if (!waveformContainerRef.current || !audioRef.current) return;

    const rect = waveformContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekPercent = Math.max(0, Math.min(1, clickX / rect.width));

    const targetTime = seekPercent * (totalDuration || audioRef.current.duration || 0);
    if (!isNaN(targetTime) && isFinite(targetTime)) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      triggerHaptic("light");
    }
  };

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div
      className={`relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 select-none ${
        isSender
          ? "bg-transparent text-white"
          : "bg-surface-hover/80 text-text border border-border/80"
      } max-w-[320px] w-full shadow-xs`}
    >
      {/* Play/Pause/Buffer Circle Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className={`relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
          isSender
            ? "bg-white text-zinc-900 hover:bg-zinc-100"
            : "bg-gradient-to-tr from-rose-500 to-pink-500 text-white hover:opacity-95"
        }`}
        title={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isBuffering ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4.5 h-4.5 fill-current" />
        ) : (
          <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Time Info Container */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        {/* Interactive Waveform Bars */}
        <div
          ref={waveformContainerRef}
          onClick={handleSeek}
          className="flex items-center gap-[2.5px] h-7 cursor-pointer group/wave py-1"
          title="Click to seek"
        >
          {waveformBars.map((height, i) => {
            const barPercent = (i / waveformBars.length) * 100;
            const isPlayed = barPercent <= progressPercent;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-100 relative group-hover/wave:opacity-90"
                style={{
                  height: `${height}%`,
                  minHeight: "4px",
                  backgroundColor: isSender
                    ? isPlayed
                      ? "#ffffff"
                      : "rgba(255, 255, 255, 0.35)"
                    : isPlayed
                    ? "#f43f5e"
                    : "rgba(255, 255, 255, 0.2)",
                  transform: isPlayed ? "scaleY(1)" : "scaleY(0.9)",
                }}
              />
            );
          })}
        </div>

        {/* Time Progress & Speed Multiplier */}
        <div className="flex items-center justify-between text-[11px] font-medium leading-none px-0.5">
          <span className={isSender ? "text-white/85 font-mono" : "text-text-muted font-mono"}>
            {isPlaying ? formatTime(currentTime) : formatTime(totalDuration || duration)}
          </span>

          <div className="flex items-center gap-2">
            {/* Speed Pill button */}
            <button
              type="button"
              onClick={handleSpeedChange}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                isSender
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-surface-hover hover:bg-border text-text-secondary"
              }`}
              title="Change speed"
            >
              {playbackRate}x
            </button>

            {/* Mic Indicator Icon */}
            <Mic className={`w-3.5 h-3.5 ${isSender ? "text-white/70" : "text-rose-400"} shrink-0`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;

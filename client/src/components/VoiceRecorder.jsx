import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Send, Trash2, Play, Pause, ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import { triggerHaptic } from "../lib/interactiveEffects";

export const VoiceRecorder = ({ onSendVoiceNote, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [audioLevels, setAudioLevels] = useState(new Array(24).fill(12));

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const dragStartXRef = useRef(0);

  // Audio Context refs for live visualizer
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  const cleanupVisualizerOnly = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close(); } catch { /* ignore */ }
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("VoiceRecorder: failed to stop media recorder", e);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    cleanupVisualizerOnly();
  }, [cleanupVisualizerOnly]);

  const startTimer = useCallback(() => {
    setDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const setupVisualizer = useCallback((stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        const levels = [];
        const barCount = 24;
        const step = Math.floor(bufferLength / barCount) || 1;

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          const percent = Math.max(12, Math.min(100, (val / 255) * 100));
          levels.push(percent);
        }

        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (e) {
      console.warn("Failed to initialize AudioContext visualizer. Falling back to animated bars.", e);
      const interval = setInterval(() => {
        setAudioLevels(Array.from({ length: 24 }, () => Math.max(15, Math.random() * 85)));
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setIsPreviewMode(false);
        startTimer();
        setupVisualizer(stream);
      } catch (e) {
        if (!cancelled) {
          console.warn("VoiceRecorder: startRecording failed", e);
          snackbar.error("Microphone access denied or error starting recording.");
          onCancel();
        }
      }
    };

    initRecording();

    return () => {
      cancelled = true;
      stopTimer();
      cleanupMedia();
    };
  }, [onCancel, setupVisualizer, startTimer, stopTimer, cleanupMedia]);

  const handleStopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    triggerHaptic("selection");
    stopTimer();

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(audioBlob);
      const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: "audio/webm" });

      setAudioUrl(url);
      setAudioFile(file);
      setIsRecording(false);
      setIsPreviewMode(true);
    };

    mediaRecorderRef.current.stop();
    cleanupVisualizerOnly();
  };

  const handleSend = () => {
    triggerHaptic("success");
    if (isPreviewMode && audioFile) {
      onSendVoiceNote(audioFile, duration);
      handleDiscard();
      return;
    }

    stopTimer();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: "audio/webm" });
        onSendVoiceNote(file, duration);
        cleanupMedia();
        setIsRecording(false);
        setIsPreviewMode(false);
      };
      mediaRecorderRef.current.stop();
    }
  };

  const handleDiscard = () => {
    triggerHaptic("selection");
    stopTimer();
    cleanupMedia();
    setIsRecording(false);
    setIsPreviewMode(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    onCancel();
  };

  const togglePreviewPlayback = () => {
    if (!audioUrl) return;
    triggerHaptic("selection");

    if (!audioPlayerRef.current) {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.ontimeupdate = () => {
        setPlaybackTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setPlaybackTime(0);
      };
    }

    if (isPlayingPreview) {
      audioPlayerRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // Touch / Drag slide-to-cancel gestures
  const handleDragStart = (e) => {
    if (isPreviewMode) return;
    setIsDragging(true);
    dragStartXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleDragMove = (e) => {
    if (!isDragging || isPreviewMode) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = currentX - dragStartXRef.current;

    // Drag left: Cancel
    if (diff < 0) {
      const offset = Math.max(diff, -140);
      setDragOffset(offset);
      if (offset < -110) {
        setIsDragging(false);
        setDragOffset(0);
        handleDiscard();
        snackbar.error("Recording discarded 🗑️");
      }
    }
    // Drag right: Send
    else if (diff > 0) {
      const offset = Math.min(diff, 140);
      setDragOffset(offset);
      if (offset > 110) {
        setIsDragging(false);
        setDragOffset(0);
        handleSend();
        snackbar.success("Voice note sent! 🚀");
      }
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOffset(0);
  };

  const formatTimer = (seconds) => {
    const s = Math.round(seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      style={{ transform: `translateX(${dragOffset}px)` }}
      className="flex items-center gap-2.5 w-full bg-zinc-900/95 dark:bg-black/90 border border-purple-500/30 rounded-full px-3.5 py-1.5 text-white shadow-2xl transition-transform duration-75 select-none backdrop-blur-2xl relative overflow-hidden"
    >
      {/* Live recording slide hint background */}
      {isRecording && !isPreviewMode && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-3 z-0 opacity-20">
          <div className={`flex items-center text-rose-500 transition-opacity ${dragOffset < -20 ? "opacity-100 font-bold" : "opacity-40"}`}>
            <ChevronLeft className="w-4 h-4 animate-pulse" />
            <span className="text-[9px] uppercase tracking-wider">Slide to discard</span>
          </div>
          <div className={`flex items-center text-purple-400 transition-opacity ${dragOffset > 20 ? "opacity-100 font-bold" : "opacity-40"}`}>
            <span className="text-[9px] uppercase tracking-wider">Slide to send</span>
            <ChevronRight className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      )}

      {/* Discard Button */}
      <button
        type="button"
        onClick={handleDiscard}
        className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition cursor-pointer shrink-0 z-10 active:scale-95"
        title="Discard recording"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* LIVE RECORDING STATE */}
      {isRecording && !isPreviewMode && (
        <>
          {/* Animated Red Recording Dot & Live Timer */}
          <div className="flex items-center gap-2 shrink-0 z-10 bg-black/40 px-2.5 py-1 rounded-full border border-rose-500/20 shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            </span>
            <span className="text-xs font-mono font-bold text-rose-400 tracking-wider">
              {formatTimer(duration)}
            </span>
          </div>

          {/* Real-time Dynamic Waveform Equalizer */}
          <div className="flex-1 flex items-center justify-center gap-[2.5px] h-7 min-w-0 px-1 z-10">
            {audioLevels.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-purple-500 via-pink-500 to-rose-500 rounded-full transition-all duration-75 shadow-[0_0_4px_rgba(244,63,94,0.3)]"
                style={{
                  height: `${height}%`,
                  minHeight: "4px",
                }}
              />
            ))}
          </div>

          {/* Stop / Preview Button */}
          <button
            type="button"
            onClick={handleStopRecording}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-amber-400 transition cursor-pointer shrink-0 z-10 border border-amber-400/30 hover:scale-105 active:scale-95 shadow-sm"
            title="Stop & preview"
          >
            <Square className="w-3.5 h-3.5 fill-amber-400" />
          </button>
        </>
      )}

      {/* PREVIEW MODE (RECORDING COMPLETED) */}
      {isPreviewMode && (
        <div className="flex-1 flex items-center gap-3 min-w-0 z-10">
          {/* Play / Pause Preview Button */}
          <button
            type="button"
            onClick={togglePreviewPlayback}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-rose-500 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-lg hover:scale-105 active:scale-95"
            title={isPlayingPreview ? "Pause" : "Play preview"}
          >
            {isPlayingPreview ? (
              <Pause className="w-3.5 h-3.5 fill-white text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
            )}
          </button>

          {/* Progress Bar & Durations */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span>{formatTimer(playbackTime)}</span>
              <span>{formatTimer(duration)}</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-rose-500 transition-all duration-100 rounded-full"
                style={{ width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Send Button */}
      <button
        type="button"
        onClick={handleSend}
        className="p-2.5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0 z-10"
        title="Send voice note"
      >
        <Send className="w-4 h-4 fill-white text-white" />
      </button>
    </div>
  );
};

export default VoiceRecorder;

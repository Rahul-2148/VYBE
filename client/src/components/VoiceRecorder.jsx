import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, Trash2, Play, Pause, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

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
  const [audioLevels, setAudioLevels] = useState(new Array(20).fill(10));

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

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      cleanupMedia();
    };
  }, []);

  const cleanupMedia = () => {
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    // Stop tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    // Pause player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    // Stop visualizer animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    // Disconnect audio context sources
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
  };

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

      // Set up real-time audio visualizer
      setupVisualizer(stream);
    } catch (err) {
      toast.error("Microphone access denied or error starting recording.");
      onCancel();
    }
  };

  const setupVisualizer = (stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Low fftSize gives us fewer frequency bins (perfect for visualizer bars)
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

        // Map frequency data to 20 visualizer bars
        const levels = [];
        const barCount = 20;
        const step = Math.floor(bufferLength / barCount) || 1;

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          // Normalize value to percentage height (10% to 100%)
          const percent = Math.max(10, Math.min(100, (val / 255) * 100));
          levels.push(percent);
        }

        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (e) {
      console.warn("Failed to initialize AudioContext visualizer. Falling back to CSS animation.", e);
      // Fallback: animated levels
      let interval = setInterval(() => {
        setAudioLevels(Array.from({ length: 20 }, () => Math.max(15, Math.random() * 90)));
      }, 100);
      return () => clearInterval(interval);
    }
  };

  // Stop recording and switch to Preview Mode
  const handleStopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
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

  const cleanupVisualizerOnly = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
  };

  // Send voice note (from live recording or preview mode)
  const handleSend = () => {
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
      };
      mediaRecorderRef.current.stop();
    }
  };

  const handleDiscard = () => {
    stopTimer();
    cleanupMedia();
    setIsRecording(false);
    setIsPreviewMode(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    onCancel();
  };

  const togglePreviewPlayback = () => {
    if (!audioUrl) return;

    if (!audioPlayerRef.current) {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.ontimeupdate = () => {
        setPlaybackTime(Math.floor(audio.currentTime));
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

  // Drag / Slide gesture handlers
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
      const offset = Math.max(diff, -150);
      setDragOffset(offset);
      
      // If dragged past threshold, cancel recording
      if (offset < -120) {
        setIsDragging(false);
        setDragOffset(0);
        handleDiscard();
        toast.error("Recording discarded 🗑️");
      }
    } 
    // Drag right: Send
    else if (diff > 0) {
      const offset = Math.min(diff, 150);
      setDragOffset(offset);

      // If dragged past threshold, send recording
      if (offset > 120) {
        setIsDragging(false);
        setDragOffset(0);
        handleSend();
        toast.success("Voice note sent! 🚀");
      }
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOffset(0);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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
      className="flex items-center gap-3 w-full bg-surface-inset/90 border border-border/80 rounded-full px-4 py-2 text-text shadow-2xl transition-transform duration-75 select-none backdrop-blur-xl relative overflow-hidden"
    >
      {/* Live recording active drag guides */}
      {isRecording && !isPreviewMode && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-4 z-0 opacity-25">
          <div className={`flex items-center text-red-500 transition-opacity ${dragOffset < -20 ? "opacity-100" : "opacity-40"}`}>
            <ChevronLeft className="w-4 h-4 animate-pulse" />
            <span className="text-[9px] font-bold">Release to discard</span>
          </div>
          <div className={`flex items-center text-blue-500 transition-opacity ${dragOffset > 20 ? "opacity-100" : "opacity-40"}`}>
            <span className="text-[9px] font-bold">Release to send</span>
            <ChevronRight className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      )}

      {/* Discard / Delete Button */}
      <button
        type="button"
        onClick={handleDiscard}
        className="p-2 rounded-full hover:bg-surface text-text-secondary hover:text-red-500 transition cursor-pointer shrink-0 z-10"
        title="Discard recording"
      >
        <Trash2 className="w-4.5 h-4.5" />
      </button>

      {/* LIVE RECORDING STATE */}
      {isRecording && !isPreviewMode && (
        <>
          {/* Animated Red Recording Dot & Live Timer */}
          <div className="flex items-center gap-2 shrink-0 z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-red-400">{formatTimer(duration)}</span>
          </div>

          {/* Real-time Dynamic Waveform visualizer */}
          <div className="flex-1 flex items-end justify-center gap-[3px] h-7 min-w-0 px-2 z-10 pb-0.5">
            {audioLevels.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-pink-500 via-rose-500 to-purple-600 rounded-full transition-all duration-75"
                style={{
                  height: `${height}%`,
                }}
              />
            ))}
          </div>

          {/* Drag instructions */}
          <div className="hidden sm:flex items-center gap-0.5 text-[10px] text-text-muted font-bold shrink-0 animate-pulse z-10">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Swipe left to discard, right to send</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>

          {/* Stop Recording button */}
          <button
            type="button"
            onClick={handleStopRecording}
            className="p-2 rounded-full bg-surface hover:bg-surface-hover text-text transition cursor-pointer shrink-0 z-10 border border-border"
            title="Stop and preview"
          >
            <Square className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          </button>
        </>
      )}

      {/* PREVIEW MODE (RECORDING STOPPED) */}
      {isPreviewMode && (
        <div className="flex-1 flex items-center gap-3 min-w-0 z-10">
          {/* Play / Pause Preview Button */}
          <button
            type="button"
            onClick={togglePreviewPlayback}
            className="p-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-text transition cursor-pointer shrink-0 shadow-lg hover:scale-105 active:scale-95"
            title={isPlayingPreview ? "Pause preview" : "Play preview"}
          >
            {isPlayingPreview ? (
              <Pause className="w-3.5 h-3.5 fill-white text-text" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white text-text ml-0.5" />
            )}
          </button>

          {/* Audio Playback Progress Bar */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary mb-0.5">
              <span>{formatTimer(playbackTime)}</span>
              <span>{formatTimer(duration)}</span>
            </div>
            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-100"
                style={{ width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Send Voice Note Button */}
      <button
        type="button"
        onClick={handleSend}
        className="p-2.5 rounded-full bg-blue-600 text-text shadow-lg hover:bg-blue-500 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0 z-10"
        title="Send voice note"
      >
        <Send className="w-4 h-4 fill-white text-text" />
      </button>
    </div>
  );
};

export default VoiceRecorder;

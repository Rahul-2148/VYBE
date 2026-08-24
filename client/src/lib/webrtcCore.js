import api from "./axios";

// Default public STUN servers fallback
export const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

let cachedIceServers = null;
let lastFetchedAt = 0;
const ICE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

/**
 * Fetch dynamic TURN/STUN credentials from backend with in-memory caching
 */
export const getIceServers = async () => {
  if (cachedIceServers && Date.now() - lastFetchedAt < ICE_CACHE_TTL) {
    return cachedIceServers;
  }
  try {
    const res = await api.get("/call/turn-credentials");
    if (res.data?.success && Array.isArray(res.data.iceServers) && res.data.iceServers.length > 0) {
      cachedIceServers = res.data.iceServers;
      lastFetchedAt = Date.now();
      return cachedIceServers;
    }
  } catch (err) {
    console.warn("[WebRTC Core] Failed to load TURN credentials, using STUN fallbacks:", err?.message);
  }
  return DEFAULT_ICE_SERVERS;
};

// Studio Audio Constraints (Echo cancellation + Noise suppression)
export const STUDIO_AUDIO_CONSTRAINTS = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  channelCount: { ideal: 2 },
  sampleRate: { ideal: 48000 },
};

// High-definition Screen Sharing Constraints (1080p-1440p 30-60fps)
export const SCREEN_SHARE_CONSTRAINTS = {
  video: {
    width: { ideal: 1920, max: 2560 },
    height: { ideal: 1080, max: 1440 },
    frameRate: { ideal: 30, max: 60 },
    cursor: "always",
    displaySurface: "monitor",
  },
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
};

// Social 1-to-1 Video Call Constraints (Mobile-optimized 720p/1080p)
export const SOCIAL_CALL_VIDEO_CONSTRAINTS = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
  facingMode: "user",
};

/**
 * Enumerate available audio and video devices
 */
export const enumerateDevices = async () => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioInputs: devices.filter((d) => d.kind === "audioinput"),
      videoInputs: devices.filter((d) => d.kind === "videoinput"),
      audioOutputs: devices.filter((d) => d.kind === "audiooutput"),
    };
  } catch (err) {
    console.warn("[WebRTC Core] Device enumeration failed:", err);
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }
};

/**
 * Format call duration from total elapsed seconds (e.g. 125 -> "02:05", 3665 -> "01:01:05")
 */
export const formatCallDuration = (totalSeconds = 0) => {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  const pad = (n) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
};

/**
 * Create Web Audio analyser for speaking voice detection
 */
export const createVoiceActivityDetector = (stream, onVolumeChange) => {
  if (!stream || typeof window === "undefined") return () => {};
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return () => {};

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return () => {};

    const audioCtx = new AudioContextClass();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    let animationFrameId = null;

    const checkVolume = () => {
      analyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i];
      }
      const average = sum / buffer.length;
      onVolumeChange(average); // average 0 to 255
      animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      try {
        source.disconnect();
        analyser.disconnect();
        audioCtx.close();
      } catch {}
    };
  } catch (e) {
    console.warn("[WebRTC Core] AudioContext volume detection failed:", e);
    return () => {};
  }
};

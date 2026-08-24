import api from "./axios";

// High-availability global STUN server pool (Google & Cloudflare)
export const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:global.stun.twilio.com:3478" },
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
    console.warn("[WebRTC Core] Failed to load dynamic TURN credentials, using STUN pool:", err?.message);
  }
  return DEFAULT_ICE_SERVERS;
};

/**
 * WhatsApp / Instagram / Discord Standard Voice Constraints
 * CRITICAL: Mono channel (channelCount: 1) ensures Mobile OS (Android & iOS) Hardware Acoustic
 * Echo Canceler (AEC) is fully engaged, preventing speakerphone echo and voice feedback loops.
 */
export const ULTRA_AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1, // Single channel activates hardware DSP AEC on all smartphones & PCs!
  sampleRate: 48000,
  // Chromium / Android DSP optimizations
  googEchoCancellation: true,
  googAutoGainControl: true,
  googNoiseSuppression: true,
  googHighpassFilter: true,
  googTypingNoiseDetection: true,
  googAudioMirroring: false,
};

// Aliased for full backwards compatibility
export const STUDIO_AUDIO_CONSTRAINTS = ULTRA_AUDIO_CONSTRAINTS;

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
 * Tune WebRTC SDP with Opus Inband FEC (Forward Error Correction) & DTX
 * This is what enables crystal-clear real-time voice calls across cities (e.g. Delhi to Mumbai)
 * and over unstable mobile 4G/5G networks by reconstructing lost packets on-the-fly.
 */
export const tuneOpusSdp = (sdp) => {
  if (!sdp || typeof sdp !== "string") return sdp;

  // Locate Opus payload type in SDP (usually 111)
  const opusMatch = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000\/2/i);
  if (!opusMatch) return sdp;

  const opusPt = opusMatch[1];
  const fmtpRegex = new RegExp(`a=fmtp:${opusPt}\\s+(.*)`, "i");
  const fmtpMatch = sdp.match(fmtpRegex);

  const desiredParams = [
    "minptime=10",
    "useinbandfec=1", // Inband Forward Error Correction (recovers lost audio packets)
    "usedtx=1",       // Discontinuous Transmission (saves bandwidth & silences static noise)
    "maxaveragebitrate=64000", // 64kbps HD wideband voice
    "stereo=0",       // Mono voice ensures phase cancellation doesn't cause muffled speech
    "sprop-stereo=0",
    "cng=1",          // Comfort Noise Generator
  ];

  if (fmtpMatch) {
    const existingParams = fmtpMatch[1].split(";").map((p) => p.trim()).filter(Boolean);
    const paramMap = new Map();

    existingParams.forEach((param) => {
      const [k, v] = param.split("=");
      if (k) paramMap.set(k.trim().toLowerCase(), v ? v.trim() : "");
    });

    desiredParams.forEach((param) => {
      const [k, v] = param.split("=");
      if (k) paramMap.set(k.trim().toLowerCase(), v ? v.trim() : "");
    });

    const newFmtpLine = `a=fmtp:${opusPt} ${Array.from(paramMap.entries())
      .map(([k, v]) => (v ? `${k}=${v}` : k))
      .join(";")}`;

    return sdp.replace(fmtpRegex, newFmtpLine);
  } else {
    const rtpmapLine = `a=rtpmap:${opusPt} opus/48000/2`;
    const newFmtpLine = `${rtpmapLine}\r\na=fmtp:${opusPt} ${desiredParams.join(";")}`;
    return sdp.replace(rtpmapLine, newFmtpLine);
  }
};

/**
 * Resume global AudioContext on first user interaction (Mobile Safari & Chrome autoplay unlock)
 */
export const unlockAudioContext = (audioCtx) => {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    const resume = () => {
      audioCtx.resume().catch(() => {});
      if (typeof window !== "undefined") {
        window.removeEventListener("touchstart", resume);
        window.removeEventListener("click", resume);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("touchstart", resume, { once: true, passive: true });
      window.addEventListener("click", resume, { once: true, passive: true });
    }
    audioCtx.resume().catch(() => {});
  }
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
    unlockAudioContext(audioCtx);

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

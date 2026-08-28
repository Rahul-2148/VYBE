import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  Settings,
  Copy,
  Check,
  ShieldCheck,
  ChevronDown,
  Volume2,
} from "lucide-react";
import { snackbar } from "../../lib/snackbar";
import { triggerHaptic } from "../../lib/interactiveEffects";
import {
  STUDIO_AUDIO_CONSTRAINTS,
  enumerateDevices,
  createVoiceActivityDetector,
} from "../../lib/webrtcCore";
import { filterStyleMap } from "../../constants/callFilters";
import dp from "../../assets/dp3.png";

export const MeetLobby = ({
  meeting,
  meetingId,
  isHost,
  currentUser,
  onJoinMeeting,
}) => {
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [videoFilter, setVideoFilter] = useState("none");
  const [audioInputs, setAudioInputs] = useState([]);
  const [videoInputs, setVideoInputs] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  const [showEffectsPicker, setShowEffectsPicker] = useState(false);
  const [backgroundEffect, setBackgroundEffect] = useState("none"); // 'none' | 'slight-blur' | 'blur' | 'deep-blur' | 'office' | 'library' | 'cafe' | 'cyberpunk' | 'custom' | 'studio-warm' | 'studio-cool' | 'studio-glow'
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState(null);

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioContextCleanerRef = useRef(null);

  // Initialize preview stream
  const initPreview = useCallback(async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextCleanerRef.current) {
        audioContextCleanerRef.current();
        audioContextCleanerRef.current = null;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioInput
            ? { deviceId: { exact: selectedAudioInput }, ...STUDIO_AUDIO_CONSTRAINTS }
            : STUDIO_AUDIO_CONSTRAINTS,
          video: selectedVideo
            ? { deviceId: { exact: selectedVideo }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (err1) {
        console.warn("[MeetLobby] High-res getUserMedia failed, attempting fallback:", err1);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Voice Activity Detection
      try {
        const cleanupVAD = createVoiceActivityDetector(stream, (vol) => {
          setMicVolume(vol);
        });
        audioContextCleanerRef.current = cleanupVAD;
      } catch (e) {
        console.warn("[MeetLobby] VAD failed:", e);
      }
    } catch (err) {
      console.warn("[MeetLobby] Preview init error:", err);
      snackbar.error("Could not access camera or microphone. Please check permissions.");
    }
  }, [selectedAudioInput, selectedVideo]);

  // Initial stream setup & device enumeration
  useEffect(() => {
    initPreview();
    enumerateDevices().then(({ audioInputs, videoInputs }) => {
      setAudioInputs(audioInputs);
      setVideoInputs(videoInputs);
    });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextCleanerRef.current) {
        audioContextCleanerRef.current();
      }
    };
  }, [initPreview]);

  // Keep videoRef.srcObject synced with localStream
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Toggle Mic
  const toggleMute = () => {
    triggerHaptic("light");
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = isMuted; // If currently muted (true), set enabled to true (unmuted)
      });
    }
    setIsMuted((prev) => !prev);
  };

  // Toggle Video
  const toggleVideo = () => {
    triggerHaptic("light");
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = isVideoOff; // If currently off (true), set enabled to true (camera turned on)
      });
    }
    setIsVideoOff((prev) => !prev);
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/meet/${meetingId}`;
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      triggerHaptic("success");
      snackbar.success("Meeting link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      snackbar.error("Could not copy link");
    }
  };

  const handleJoin = (mode = "normal") => {
    triggerHaptic("medium");
    onJoinMeeting({
      isMuted: mode === "companion" ? true : isMuted,
      isVideoOff: mode === "companion" ? true : isVideoOff,
      videoFilter: videoFilter !== "none" ? videoFilter : backgroundEffect,
      customBackgroundUrl,
      selectedAudioInput,
      selectedVideo,
      presentOnJoin: mode === "present",
      companionMode: mode === "companion",
    });
  };

  const activeParticipants = meeting?.participants?.filter((p) => p.status === "joined") || [];

  return (
    <div className="w-full h-full flex flex-col lg:flex-row items-center justify-center gap-8 md:gap-12 p-4 md:p-8 max-w-6xl mx-auto select-none">
      {/* LEFT: Live Video Preview Tile with Camera/Mic Controls */}
      <div className="w-full max-w-lg flex flex-col items-center gap-4">
        <div className="relative w-full aspect-video bg-[#121212] rounded-3xl overflow-hidden border-2 border-zinc-700 shadow-2xl flex items-center justify-center">
          {/* Always keep video mounted so srcObject is retained */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              filter:
                backgroundEffect === "blur"
                  ? "blur(4px)"
                  : filterStyleMap[videoFilter || "none"] || "none",
              display: isVideoOff || !localStream ? "none" : "block",
            }}
            className="w-full h-full object-cover -scale-x-100 transition-all duration-300"
          />

          {(isVideoOff || !localStream) && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl">
                {(currentUser?.userName || currentUser?.name || "U")[0].toUpperCase()}
              </div>
              <span className="text-xs text-zinc-400 font-medium">Camera is off</span>
            </div>
          )}

          {/* Bottom Floating Preview Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-xl px-4 py-2 rounded-full border border-white/15 shadow-xl z-20">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition cursor-pointer active:scale-95 ${
                isMuted ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30" : "bg-white/20 hover:bg-white/30 text-white"
              }`}
              title={isMuted ? "Turn mic on" : "Turn mic off"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition cursor-pointer active:scale-95 ${
                isVideoOff ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30" : "bg-white/20 hover:bg-white/30 text-white"
              }`}
              title={isVideoOff ? "Turn camera on" : "Turn camera off"}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Visual Effects & Backgrounds Toggle */}
            <button
              onClick={() => setShowEffectsPicker((p) => !p)}
              className={`p-3 rounded-full transition cursor-pointer active:scale-95 ${
                showEffectsPicker || backgroundEffect !== "none"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }`}
              title="Apply visual effects"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>

          {/* Real-time Voice Volume Indicator (Green dot pulse) */}
          {!isMuted && micVolume > 15 && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500/30 z-20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Speaking</span>
            </div>
          )}
        </div>

        {/* Visual Effects & Backgrounds Bar (Google Meet Green Room Parity) */}
        {showEffectsPicker ? (
          <div className="w-full p-3.5 rounded-2xl bg-[#282a2c] border border-zinc-700/80 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visual Effects & Backgrounds</span>
              </span>
              <button
                onClick={() => setShowEffectsPicker(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Hidden Custom Background Upload Input */}
            <input
              type="file"
              id="lobby-custom-bg-input"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setBackgroundEffect("custom");
                    setCustomBackgroundUrl(reader.result);
                    snackbar.success("Custom background loaded! 🖼️");
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            {/* Effect Pills Row */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {[
                { id: "none", label: "No Effect" },
                { id: "slight-blur", label: "Slight Blur" },
                { id: "blur", label: "Blur" },
                { id: "deep-blur", label: "Deep Bokeh" },
                { id: "office", label: "Office" },
                { id: "library", label: "Library" },
                { id: "cafe", label: "Cafe" },
                { id: "cyberpunk", label: "Cyberpunk" },
                { id: "custom", label: "+ Custom Image" },
                { id: "studio-warm", label: "Studio Warm" },
                { id: "studio-cool", label: "Studio Cool" },
                { id: "studio-glow", label: "Radiance Glow" },
              ].map((eff) => (
                <button
                  key={eff.id}
                  onClick={() => {
                    if (eff.id === "custom") {
                      document.getElementById("lobby-custom-bg-input")?.click();
                    } else {
                      setBackgroundEffect(eff.id);
                      setVideoFilter(eff.id);
                    }
                    triggerHaptic("selection");
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                    backgroundEffect === eff.id
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                  }`}
                >
                  {eff.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* RIGHT: Meeting Info & Join Actions */}
      <div className="w-full max-w-md flex flex-col gap-5 text-left">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Vybe Meet Room</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {meeting?.title || "Ready to join?"}
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Room Code: <span className="font-mono text-zinc-200">{meetingId}</span>
          </p>
        </div>

        {/* Presence Preview (Google Meet "Who is in this call" Parity) */}
        <div className="p-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/80 space-y-2">
          <div className="flex items-center gap-2.5">
            {activeParticipants.length > 0 ? (
              <>
                <div className="flex -space-x-2">
                  {activeParticipants.slice(0, 3).map((p, i) => (
                    <img
                      key={i}
                      src={p.user?.profileImage?.url || dp}
                      alt=""
                      className="w-8 h-8 rounded-full border-2 border-zinc-800 object-cover"
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-200 font-medium">
                  {activeParticipants[0]?.user?.userName || "Someone"}{" "}
                  {activeParticipants.length > 1
                    ? `and ${activeParticipants.length - 1} other${activeParticipants.length > 2 ? "s" : ""} in this call`
                    : "is in this call"}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>No one else is here yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Primary & Secondary Join Actions */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleJoin("normal")}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-extrabold text-sm shadow-xl shadow-rose-600/30 transition transform active:scale-95 cursor-pointer text-center"
            >
              {isHost ? "Start Meeting" : "Join Now"}
            </button>

            <button
              onClick={handleCopyLink}
              className={`w-full sm:w-auto py-3.5 px-5 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                isCopied
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
              }`}
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>

          {/* Other Join Modes (Google Meet Parity: Present Directly / Companion Mode) */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleJoin("present")}
              className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer text-center"
              title="Join directly presenting your screen"
            >
              💻 Present Now
            </button>

            <button
              onClick={() => handleJoin("companion")}
              className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer text-center"
              title="Join audio-muted for secondary display"
            >
              📱 Use Companion Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetLobby;

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  MicOff,
  Monitor,
  MessageSquare,
  Sparkles,
  X,
  Pin,
  Send,
  Paperclip,
  Download,
  Radio,
  ExternalLink,
  Crown,
  Settings,
  Maximize2,
  Minimize2,
  Minus,
  Mic,
  Video,
  VideoOff,
  PhoneOff,
} from "lucide-react";
import MeetControls, { GoogleMeetHandIcon } from "./MeetControls";
import MeetingSettingsModal from "../MeetingSettingsModal";
import CallReactionStream from "../CallReactionStream";
import CallActivitiesDrawer from "../CallActivitiesDrawer";
import CallPeopleSidebar from "../CallPeopleSidebar";
import CallInfoSidebar from "../CallInfoSidebar";
import MeetGeminiDrawer from "./MeetGeminiDrawer";
import { getSocket } from "../../lib/socket";
import { snackbar } from "../../lib/snackbar";
import dp from "../../assets/dp3.png";
import { filterStyleMap } from "../../constants/callFilters";
import { triggerHaptic } from "../../lib/interactiveEffects";

// URL regex that matches http://, https://, and www. links
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const renderMessageTextWithLinks = (text, isMe = false) => {
  if (!text) return null;

  const parts = text.split(URL_REGEX);
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, index) => {
        if (part && part.match(URL_REGEX)) {
          const match = part.match(/^(.*?)([.,!?:;)"']*)$/);
          const rawUrl = match ? match[1] : part;
          const trailingPunct = match ? match[2] : "";

          const href =
            rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
              ? rawUrl
              : `https://${rawUrl}`;

          return (
            <React.Fragment key={index}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-0.5 underline font-semibold underline-offset-2 break-all transition ${
                  isMe
                    ? "text-cyan-200 hover:text-white"
                    : "text-blue-400 hover:text-blue-300"
                }`}
                title={href}
              >
                <span>{rawUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-80 inline ml-0.5" />
              </a>
              {trailingPunct}
            </React.Fragment>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};

const AudioEqualizerBars = () => (
  <div className="flex items-end gap-0.5 h-3.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-emerald-500/30">
    <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite_ease-in-out]" style={{ height: "60%" }} />
    <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_ease-in-out]" style={{ height: "100%" }} />
    <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.5s_infinite_ease-in-out]" style={{ height: "80%" }} />
  </div>
);

const RemoteAudioPlayer = React.memo(({ stream }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }

    el.muted = false;
    el.volume = 1.0;

    const playAudio = () => {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[MeetRoomView WebRTC] Remote audio play deferred:", err?.message);
        });
      }
    };

    playAudio();

    // Auto-unlock audio on user interaction
    const unlockOnInteraction = () => {
      if (el && el.paused) {
        playAudio();
      }
    };

    window.addEventListener("touchstart", unlockOnInteraction, { passive: true, once: true });
    window.addEventListener("click", unlockOnInteraction, { passive: true, once: true });

    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    return () => {
      window.removeEventListener("touchstart", unlockOnInteraction);
      window.removeEventListener("click", unlockOnInteraction);
    };
  }, [stream]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      className="sr-only"
    />
  );
});

/**
 * High-Performance Memoized Video Stream
 */
const VideoStream = React.memo(({ stream, muted = true, className = "", style = {}, mirror = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = Boolean(muted);
    el.defaultMuted = Boolean(muted);
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");

    if (el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
    }

    if (stream) {
      const playVideo = () => {
        const p = el.play();
        if (p !== undefined) {
          p.catch((err) => {
            console.warn("[VideoStream WebRTC] Autoplay deferred:", err?.message);
          });
        }
      };

      playVideo();
      el.onloadedmetadata = playVideo;
      el.oncanplay = playVideo;

      const unlock = () => {
        if (el && el.paused) {
          playVideo();
        }
      };
      window.addEventListener("touchstart", unlock, { passive: true, once: true });
      window.addEventListener("click", unlock, { passive: true, once: true });

      return () => {
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("click", unlock);
      };
    }
  }, [stream, muted]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      webkit-playsinline="true"
      muted={muted}
      className={`${className} ${mirror ? "-scale-x-100" : ""}`}
      style={style}
    />
  );
});

/**
 * Participant Avatar Component
 */
const ParticipantAvatar = ({ avatar, name, size = "lg", className = "" }) => {
  const [imgError, setImgError] = useState(false);
  const cleanName = (name || "").replace(/^@/, "").trim();
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : "U";
  const displayAvatar = avatar || dp;

  const sizeClasses = {
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-20 h-20 text-2xl",
    xl: "w-28 h-28 text-3xl",
  };

  if (displayAvatar && !imgError) {
    return (
      <img
        src={displayAvatar}
        alt={cleanName || "User"}
        onError={() => setImgError(true)}
        className={`${sizeClasses[size] || sizeClasses.lg} rounded-full object-cover border-2 border-white/20 shadow-2xl ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size] || sizeClasses.lg} rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white shadow-2xl border-2 border-white/20 ${className}`}
    >
      <span>{initial}</span>
    </div>
  );
};

export const MeetRoomView = ({
  meetingId,
  roomTitle = "VYBE Meeting",
  isHost = false,
  hostUserId = null,
  localStream,
  screenStream,
  peers = {},
  isMuted,
  isVideoOff,
  isScreenSharing,
  isHandRaised,
  handRaisedAt,
  activeSpeaker,
  connectionQuality,
  videoFilter,
  audioInputDevices = [],
  videoDevices = [],
  audioOutputDevices = [],
  selectedAudioInput,
  setSelectedAudioInput,
  selectedVideo,
  setSelectedVideo,
  selectedAudioOutput,
  setSelectedAudioOutput,
  onToggleMute,
  onToggleVideo,
  onFlipCamera,
  isFrontCamera = true,
  onToggleScreenShare,
  onToggleHand,
  onChangeVideoFilter,
  onMinimize,
  onEndCall,
}) => {
  const { userData } = useSelector((s) => s.user || {});
  const currentUserId = userData?.user?._id || userData?._id;
  const currentUserName = userData?.user?.userName || userData?.userName || "You";
  const currentUserAvatar =
    userData?.user?.profileImage?.url ||
    (typeof userData?.user?.profileImage === "string" ? userData.user.profileImage : "") ||
    dp;

  const [activeSidebar, setActiveSidebar] = useState(null); // 'chat' | 'people' | 'info' | 'activities' | 'gemini' | null
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pinnedTile, setPinnedTile] = useState(null); // socketId | 'me' | 'screen' | null
  const [layoutMode, setLayoutMode] = useState(() => {
    try {
      return localStorage.getItem("vybe_meet_layout_mode") || "tiled";
    } catch {
      return "tiled";
    }
  }); // 'tiled' | 'spotlight' | 'sidebar'
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [liveCaptions, setLiveCaptions] = useState([]); // [{ id, userName, avatar, text, timestamp }]
  const [messages, setMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [reactionsList, setReactionsList] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Breakout Rooms State (Google Meet Parity)
  const [breakoutSession, setBreakoutSession] = useState(null);
  const [myBreakoutRoom, setMyBreakoutRoom] = useState(null);
  const [breakoutBroadcast, setBreakoutBroadcast] = useState(null);
  const [breakoutRemainingSeconds, setBreakoutRemainingSeconds] = useState(null);

  const handleSetLayoutMode = useCallback((mode) => {
    setLayoutMode(mode);
    try {
      localStorage.setItem("vybe_meet_layout_mode", mode);
    } catch {}
  }, []);

  const [transcriptLog, setTranscriptLog] = useState([]);

  const chatScrollRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  // Breakout Countdown Timer Loop
  useEffect(() => {
    if (!breakoutSession?.timerExpiresAt) return;
    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((breakoutSession.timerExpiresAt - Date.now()) / 1000));
      setBreakoutRemainingSeconds(diff);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => {
      clearInterval(interval);
      setBreakoutRemainingSeconds(null);
    };
  }, [breakoutSession?.timerExpiresAt]);

  // Fullscreen Management
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Time Clock in Header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcut ('c' for Captions) - Google Meet Parity
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        triggerHaptic("medium");
        setIsCaptionsOn((prev) => {
          const next = !prev;
          snackbar.info(`Live Captions ${next ? "Turned ON" : "Turned OFF"}`);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [captionLanguage, setCaptionLanguage] = useState(() => {
    try {
      return localStorage.getItem("vybe_meet_caption_lang") || "en-IN";
    } catch {
      return "en-IN";
    }
  });
  const [speechNotice, setSpeechNotice] = useState(null);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const isRecognizingRef = useRef(false);

  // Real-time Voice Activity Detection on local microphone stream
  useEffect(() => {
    if (!localStream || isMuted || !isCaptionsOn) return;

    let audioContext = null;
    let analyser = null;
    let source = null;
    let animFrame = null;

    try {
      const audioTrack = localStream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudio = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setIsSpeakingAudio(avg > 12);
        animFrame = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (err) {
      console.warn("[MeetRoomView] VAD AudioContext init:", err);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (source) {
        try { source.disconnect(); } catch {}
      }
      if (audioContext && audioContext.state !== "closed") {
        try { audioContext.close(); } catch {}
      }
      setIsSpeakingAudio(false);
    };
  }, [localStream, isMuted, isCaptionsOn]);

  // Web Speech Recognition for Real-Time Closed Captions (CC)
  useEffect(() => {
    if (!isCaptionsOn || isMuted) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const timer = setTimeout(() => {
        setSpeechNotice("Speech recognition is not supported in this browser");
      }, 0);
      return () => clearTimeout(timer);
    }

    let recognition = null;
    let isCancelled = false;

    const startEngine = () => {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = captionLanguage || "en-IN";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isRecognizingRef.current = true;
          setSpeechNotice(null);
        };

        recognition.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            const trans = item?.[0]?.transcript || "";
            if (item.isFinal) {
              finalTranscript += trans;
            } else {
              interimTranscript += trans;
            }
          }

          const activeText = finalTranscript || interimTranscript;
          if (activeText && activeText.trim()) {
            const isFinal = Boolean(finalTranscript);
            const capObj = {
              id: `caption_${currentUserId || "me"}_${Date.now()}`,
              speakerId: currentUserId || "me",
              userName: currentUserName,
              avatar: currentUserAvatar,
              text: activeText.trim(),
              isFinal,
              timestamp: Date.now(),
            };

            if (isFinal) {
              setTranscriptLog((prev) => [
                ...prev,
                {
                  userName: currentUserName,
                  text: activeText.trim(),
                  timestamp: Date.now(),
                },
              ]);
            }

            setLiveCaptions((prev) => {
              const filtered = prev.filter(
                (c) => c.userName !== capObj.userName || Date.now() - c.timestamp < 7000
              );
              return [...filtered, capObj];
            });

            const socket = getSocket();
            socket?.emit("meeting:caption", {
              meetingId,
              speakerId: currentUserId || "me",
              speakerName: currentUserName,
              speakerAvatar: currentUserAvatar,
              text: activeText.trim(),
              isFinal,
              language: captionLanguage,
            });
          }
        };

        recognition.onerror = (e) => {
          isRecognizingRef.current = false;
          if (e.error === "not-allowed") {
            setSpeechNotice("Microphone permission denied for speech recognition");
          } else if (e.error === "network") {
            setSpeechNotice("Network reconnecting speech service...");
          } else if (e.error !== "no-speech" && e.error !== "aborted") {
            console.warn("[MeetRoomView] Captions speech notice:", e.error);
          }
        };

        recognition.onend = () => {
          isRecognizingRef.current = false;
          if (!isCancelled && isCaptionsOn && !isMuted) {
            setTimeout(() => {
              if (!isCancelled && isCaptionsOn && !isMuted && speechRecognitionRef.current && !isRecognizingRef.current) {
                try {
                  speechRecognitionRef.current.start();
                } catch {}
              }
            }, 250);
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (err) {
        console.warn("[MeetRoomView] SpeechRecognition start failed:", err);
      }
    };

    startEngine();

    return () => {
      isCancelled = true;
      if (recognition) {
        try {
          recognition.abort();
        } catch {}
      }
      isRecognizingRef.current = false;
    };
  }, [isCaptionsOn, isMuted, captionLanguage, meetingId, currentUserId, currentUserName, currentUserAvatar]);

  // Clean expired captions every 1.5 seconds
  useEffect(() => {
    if (liveCaptions.length === 0) return;
    const timer = setInterval(() => {
      setLiveCaptions((prev) => prev.filter((c) => Date.now() - c.timestamp < 6000));
    }, 1500);
    return () => clearInterval(timer);
  }, [liveCaptions.length]);

  // Listen to Meeting Chat, Captions, and Reactions via Socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !meetingId) return;

    const handleChatReceived = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (activeSidebar !== "chat") {
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    const handleReactionReceived = ({ emoji, senderName, senderId, leftPercent, driftX }) => {
      // Ignore reactions sent by self to prevent 2x duplicate emojis!
      if (senderId && (senderId.toString() === currentUserId?.toString() || senderId === socket?.id)) {
        return;
      }
      const id = `${Date.now()}_${Math.random()}`;
      setReactionsList((prev) => [
        ...prev,
        {
          id,
          emoji,
          senderName: senderName || "Participant",
          leftPercent: typeof leftPercent === "number" ? leftPercent : Math.random() * 46 + 27,
          driftX: typeof driftX === "number" ? driftX : (Math.random() - 0.5) * 80,
        },
      ]);
      setTimeout(() => {
        setReactionsList((prev) => prev.filter((r) => r.id !== id));
      }, 2600);
    };

    const handleCaptionReceived = (data) => {
      if (!data || !data.text) return;
      const capObj = {
        id: data.id || `caption_${Date.now()}`,
        speakerId: data.speakerId || "remote",
        userName: data.speakerName || "Participant",
        avatar: data.speakerAvatar || dp,
        text: data.text,
        isFinal: Boolean(data.isFinal),
        timestamp: data.timestamp || Date.now(),
      };

      if (data.isFinal) {
        setTranscriptLog((prev) => [
          ...prev,
          {
            userName: data.speakerName || "Participant",
            text: data.text,
            timestamp: data.timestamp || Date.now(),
          },
        ]);
      }

      setLiveCaptions((prev) => {
        const filtered = prev.filter(
          (c) => c.userName !== capObj.userName || Date.now() - c.timestamp < 6000
        );
        return [...filtered, capObj];
      });
    };

    const handleActionBroadcast = (data) => {
      if (data?.action === "caption" && data?.caption) {
        if (data.caption.isFinal) {
          setTranscriptLog((prev) => [
            ...prev,
            {
              userName: data.caption.userName || "Participant",
              text: data.caption.text,
              timestamp: data.caption.timestamp || Date.now(),
            },
          ]);
        }
        setLiveCaptions((prev) => {
          const filtered = prev.filter(
            (c) => c.userName !== data.caption.userName || Date.now() - c.timestamp < 6000
          );
          return [...filtered, data.caption];
        });
      }
    };

    const handleBreakoutStarted = ({ session, timerExpiresAt }) => {
      setBreakoutSession({ ...session, timerExpiresAt });
      triggerHaptic("medium");
      snackbar.info(`🚪 Breakout rooms opened (${session?.durationMinutes || 10}m)`);
    };

    const handleBreakoutBroadcast = (data) => {
      setBreakoutBroadcast(data);
      triggerHaptic("heavy");
      snackbar.info(`📢 Host Broadcast: ${data.message}`);
      setTimeout(() => setBreakoutBroadcast(null), 8000);
    };

    const handleBreakoutReassigned = ({ newRoomId, newRoomName }) => {
      setMyBreakoutRoom({ id: newRoomId, name: newRoomName });
      triggerHaptic("medium");
      snackbar.info(`Assigned to ${newRoomName}`);
    };

    const handleBreakoutEnded = () => {
      setBreakoutSession(null);
      setMyBreakoutRoom(null);
      setBreakoutBroadcast(null);
      triggerHaptic("light");
      snackbar.info("🏠 Breakout rooms closed. Returned to main meeting");
    };

    socket.on("meeting:chat-message-received", handleChatReceived);
    socket.on("meeting:reaction-received", handleReactionReceived);
    socket.on("meeting:caption-received", handleCaptionReceived);
    socket.on("meeting:action-broadcast", handleActionBroadcast);
    socket.on("meeting:breakout-started", handleBreakoutStarted);
    socket.on("meeting:breakout-broadcast-received", handleBreakoutBroadcast);
    socket.on("meeting:breakout-reassigned", handleBreakoutReassigned);
    socket.on("meeting:breakout-ended", handleBreakoutEnded);

    return () => {
      socket.off("meeting:chat-message-received", handleChatReceived);
      socket.off("meeting:reaction-received", handleReactionReceived);
      socket.off("meeting:caption-received", handleCaptionReceived);
      socket.off("meeting:action-broadcast", handleActionBroadcast);
      socket.off("meeting:breakout-started", handleBreakoutStarted);
      socket.off("meeting:breakout-broadcast-received", handleBreakoutBroadcast);
      socket.off("meeting:breakout-reassigned", handleBreakoutReassigned);
      socket.off("meeting:breakout-ended", handleBreakoutEnded);
    };
  }, [meetingId, activeSidebar, currentUserId]);

  // Send In-Meeting Chat
  const handleSendChat = (e, customText) => {
    e?.preventDefault?.();
    const textToSend = typeof customText === "string" ? customText : chatInput;
    if (!textToSend || !textToSend.trim()) return;

    const socket = getSocket();
    const msgObj = {
      meetingId,
      id: Date.now().toString(),
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: textToSend.trim(),
      time: new Date().toISOString(),
    };

    socket?.emit("meeting:chat-message", msgObj);
    setMessages((prev) => [...prev, { ...msgObj, from: currentUserId || "me" }]);
    if (typeof customText !== "string") {
      setChatInput("");
    }
    triggerHaptic("light");
  };

  // Send Floating Reaction (Google Meet Organic Float & Physics)
  const handleSendReaction = (emoji) => {
    const socket = getSocket();
    const leftPercent = Math.random() * 46 + 27; // Scatter organically across 27% - 73% width
    const driftX = (Math.random() - 0.5) * 80; // Natural sway left/right
    const id = `${Date.now()}_${Math.random()}`;

    socket?.emit("meeting:reaction", {
      meetingId,
      emoji,
      leftPercent,
      driftX,
    });

    setReactionsList((prev) => [
      ...prev,
      { id, emoji, senderName: "You", leftPercent, driftX }
    ]);

    setTimeout(() => {
      setReactionsList((prev) => prev.filter((r) => r.id !== id));
    }, 2600);
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeSidebar]);

  // Peer entries (strictly excluding local user to prevent audio loopback/echo)
  const peerList = useMemo(() => {
    const myIdStr = currentUserId?.toString();
    return Object.values(peers || {}).filter(
      (p) => p && (!p.userId || !myIdStr || p.userId.toString() !== myIdStr)
    );
  }, [peers, currentUserId]);
  const totalParticipants = peerList.length + 1; // peers + self

  // Compute Grid Layout Class based on participant count
  const getGridColsClass = () => {
    if (pinnedTile) return "grid-cols-1";
    if (totalParticipants === 1) return "grid-cols-1 max-w-4xl";
    if (totalParticipants === 2) return "grid-cols-1 md:grid-cols-2 max-w-5xl";
    if (totalParticipants <= 4) return "grid-cols-2 max-w-5xl";
    if (totalParticipants <= 6) return "grid-cols-2 md:grid-cols-3 max-w-6xl";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-7xl";
  };

  // Minimized Floating Mini-Call Window (PIP Mode)
  if (isMinimized) {
    const activePeer = peerList.find((p) => p.userId === activeSpeaker) || peerList[0];
    const displayStream = activePeer?.stream || (!isVideoOff ? localStream : null);
    const displayName = activePeer ? `@${activePeer.userName}` : currentUserName;
    const displayAvatar = activePeer ? activePeer.profilePicture : currentUserAvatar;
    const isDisplayVideoOff = activePeer ? activePeer.videoOff : isVideoOff;

    return (
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        {/* Background Remote Audio Players (Ensures voice audio continues playing) */}
        {peerList.map((p) =>
          p.stream ? (
            <RemoteAudioPlayer
              key={`meet-audio-pip-${p.socketId || p.userId}`}
              stream={p.stream}
            />
          ) : null
        )}

        {/* Floating Mini Call Window */}
        <div className="pointer-events-auto fixed bottom-6 right-6 w-80 h-52 bg-[#1e1f20] border border-zinc-700/90 shadow-2xl rounded-3xl overflow-hidden flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
          <div className="relative flex-1 w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden group">
            {!isDisplayVideoOff && displayStream ? (
              <VideoStream
                stream={displayStream}
                mirror={!activePeer}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ParticipantAvatar avatar={displayAvatar} name={displayName} size="md" />
                <span className="text-xs font-bold text-white">{displayName}</span>
              </div>
            )}

            {/* Top Bar inside Mini Window */}
            <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-20">
              <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white flex items-center gap-1.5 border border-white/10 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[130px]">{roomTitle}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="pip-expand-btn"
                  onClick={() => {
                    triggerHaptic("light");
                    setIsMinimized(false);
                  }}
                  className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition cursor-pointer border border-white/10 shadow-xs"
                  title="Expand back to meeting"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Quick Action Controls */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-20 shadow-md">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onToggleMute();
                }}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  isMuted ? "bg-rose-600 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onToggleVideo();
                }}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  isVideoOff ? "bg-rose-600 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white"
                }`}
                title={isVideoOff ? "Turn video on" : "Turn video off"}
              >
                {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("heavy");
                  onEndCall();
                }}
                className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
                title="Leave call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-[100dvh] min-h-[100dvh] bg-[#202124] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background Remote Audio Players (Ensures crystal-clear continuous voice output) */}
      {peerList.map((p) =>
        p.stream ? (
          <RemoteAudioPlayer
            key={`meet-audio-${p.socketId || p.userId}`}
            stream={p.stream}
          />
        ) : null
      )}

      {/* Animated Reaction Float Layer */}
      <CallReactionStream reactions={reactionsList} />

      {/* ================= TOP MEETING HEADER ================= */}
      <div className="h-14 px-4 md:px-6 flex items-center justify-between z-20 shrink-0 border-b border-zinc-800/80 bg-[#1e1f20]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center font-black text-white text-xs shadow-md">
            V
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{roomTitle}</span>
              <span className="text-xs font-mono font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                {meetingId}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium text-zinc-300">
          <span className="hidden sm:inline font-mono">{currentTime}</span>

          <div className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1 rounded-full border border-zinc-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{totalParticipants} {totalParticipants === 1 ? "person" : "people"}</span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-700/80 hidden sm:block" />

          {/* Top Header Beautiful Action Controls */}
          <div className="flex items-center gap-1.5">
            {/* Audio & Video Settings Button */}
            <button
              type="button"
              data-testid="header-settings-btn"
              onClick={() => {
                triggerHaptic("light");
                setShowSettingsModal(true);
              }}
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition cursor-pointer shadow-xs"
              title="Audio & Video Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Minimize Call to Floating Window Button */}
            <button
              type="button"
              data-testid="header-minimize-btn"
              onClick={() => {
                triggerHaptic("light");
                if (onMinimize) {
                  onMinimize();
                } else {
                  setIsMinimized(true);
                }
              }}
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition cursor-pointer shadow-xs"
              title="Minimize call"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Fullscreen / Exit Fullscreen Button */}
            <button
              type="button"
              data-testid="header-fullscreen-btn"
              onClick={() => {
                triggerHaptic("light");
                toggleFullscreen();
              }}
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition cursor-pointer shadow-xs"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT WORKSPACE ================= */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* Top Floating Active Breakout Session Banner */}
        {breakoutSession && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-indigo-950/90 border border-indigo-500/50 backdrop-blur-xl px-4 py-2 rounded-full text-xs font-bold text-white shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
              <span>
                {myBreakoutRoom ? myBreakoutRoom.name : "Breakout Sessions Active"}
              </span>
            </div>
            {breakoutRemainingSeconds !== null && (
              <span className="font-mono text-indigo-200 bg-indigo-900/80 px-2 py-0.5 rounded-md border border-indigo-700/50">
                {Math.floor(breakoutRemainingSeconds / 60)}:
                {String(breakoutRemainingSeconds % 60).padStart(2, "0")}
              </span>
            )}
            {myBreakoutRoom && (
              <button
                type="button"
                onClick={() => {
                  setMyBreakoutRoom(null);
                  const socket = getSocket();
                  socket?.emit("meeting:breakout-leave-room", { meetingId, roomId: myBreakoutRoom.id });
                  snackbar.info("Returned to main room");
                }}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-zinc-200 transition cursor-pointer"
              >
                Return to main
              </button>
            )}
          </div>
        )}

        {/* Floating Host Broadcast Announcement Toast */}
        {breakoutBroadcast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900/95 to-purple-900/95 border border-indigo-400/60 backdrop-blur-2xl shadow-2xl text-white space-y-1">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
                  <span>Host Broadcast ({breakoutBroadcast.senderName || "Host"})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setBreakoutBroadcast(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs md:text-sm font-medium text-zinc-100">{breakoutBroadcast.message}</p>
            </div>
          </div>
        )}

        {/* Central Stage Column: Video Area + Dedicated Captions Dock */}
        <div className="relative flex-1 h-full flex flex-col min-w-0 overflow-hidden">
          {/* VIDEO TILES AREA — smoothly shrinks upward when CC is on */}
          <div className="relative flex-1 w-full min-h-0 p-2.5 sm:p-4 flex items-center justify-center overflow-hidden transition-all duration-300 ease-out">
          {/* 1. SPOTLIGHT VIEW (No Filmstrip) */}
          {layoutMode === "spotlight" && !screenStream && !peerList.some((p) => p.screenSharing && p.screenStream) ? (
            <div className="w-full h-full max-w-6xl max-h-[82vh] mx-auto p-1 flex items-center justify-center">
              <div className="relative w-full h-full bg-[#121212] rounded-3xl overflow-hidden border border-zinc-700 flex items-center justify-center shadow-2xl group">
                {pinnedTile === "me" || (!pinnedTile && activeSpeaker === (currentUserId || "me")) ? (
                  !isVideoOff && localStream ? (
                    <VideoStream
                      stream={localStream}
                      mirror={true}
                      style={{ filter: filterStyleMap[videoFilter || "none"] || "none" }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <ParticipantAvatar avatar={currentUserAvatar} name={currentUserName} size="xl" />
                      <span className="text-base font-bold text-white">{currentUserName}</span>
                    </div>
                  )
                ) : (
                  (() => {
                    const spotlightPeer =
                      peerList.find((p) => p.socketId === pinnedTile || p.userId === pinnedTile) ||
                      peerList.find((p) => p.userId === activeSpeaker) ||
                      peerList[0];
                    if (!spotlightPeer) {
                      return !isVideoOff && localStream ? (
                        <VideoStream stream={localStream} mirror={true} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <ParticipantAvatar avatar={currentUserAvatar} name={currentUserName} size="xl" />
                          <span className="text-base font-bold text-white">{currentUserName}</span>
                        </div>
                      );
                    }
                    return !spotlightPeer.videoOff && spotlightPeer.stream ? (
                      <VideoStream stream={spotlightPeer.stream} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <ParticipantAvatar avatar={spotlightPeer.profilePicture} name={spotlightPeer.userName} size="xl" />
                        <span className="text-base font-bold text-white">@{spotlightPeer.userName}</span>
                      </div>
                    );
                  })()
                )}

                <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-700 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 z-20">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Spotlight Stage</span>
                </div>
              </div>
            </div>
          ) : screenStream || peerList.some((p) => p.screenSharing && p.screenStream) || pinnedTile || layoutMode === "sidebar" ? (
            /* 2. SIDEBAR / PRESENTATION VIEW (Main Stage + Filmstrip) */
            <div className="w-full h-full flex flex-col md:flex-row gap-3">
              {/* Central Large Spotlight / Presentation View */}
              <div className="relative flex-1 h-full bg-[#121212] rounded-3xl overflow-hidden border border-zinc-700 flex items-center justify-center shadow-2xl">
                {screenStream ? (
                  <VideoStream stream={screenStream} className="w-full h-full object-contain" />
                ) : peerList.some((p) => p.screenSharing && p.screenStream) ? (
                  peerList
                    .filter((p) => p.screenSharing && p.screenStream)
                    .map((p) => (
                      <VideoStream
                        key={`screen_${p.socketId}`}
                        stream={p.screenStream}
                        className="w-full h-full object-contain"
                      />
                    ))
                ) : pinnedTile === "me" ? (
                  !isVideoOff && localStream ? (
                    <VideoStream stream={localStream} mirror={true} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <ParticipantAvatar avatar={currentUserAvatar} name={currentUserName} size="xl" />
                      <span className="text-base font-bold text-white">{currentUserName} (Pinned)</span>
                    </div>
                  )
                ) : (
                  (() => {
                    const pinnedPeer =
                      peerList.find((p) => p.socketId === pinnedTile || p.userId === pinnedTile) ||
                      peerList.find((p) => p.userId === activeSpeaker) ||
                      peerList[0];
                    if (!pinnedPeer) {
                      return !isVideoOff && localStream ? (
                        <VideoStream stream={localStream} mirror={true} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <ParticipantAvatar avatar={currentUserAvatar} name={currentUserName} size="xl" />
                          <span className="text-base font-bold text-white">{currentUserName}</span>
                        </div>
                      );
                    }
                    return !pinnedPeer.videoOff && pinnedPeer.stream ? (
                      <VideoStream stream={pinnedPeer.stream} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <ParticipantAvatar avatar={pinnedPeer.profilePicture} name={pinnedPeer.userName} size="xl" />
                        <span className="text-base font-bold text-white">@{pinnedPeer.userName} {pinnedTile ? "(Pinned)" : ""}</span>
                      </div>
                    );
                  })()
                )}

                {/* Top Badge: Presenting or Pinned info */}
                <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-700 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 z-20">
                  {screenStream || peerList.some((p) => p.screenSharing) ? (
                    <>
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <span>{screenStream ? "You are presenting" : "Screen Presentation"}</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                      <span>{pinnedTile ? "Pinned Spotlight" : "Speaker Spotlight"}</span>
                    </>
                  )}
                </div>

                {pinnedTile && (
                  <button
                    type="button"
                    onClick={() => setPinnedTile(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer z-20"
                    title="Unpin"
                  >
                    <Pin className="w-4 h-4 fill-white" />
                  </button>
                )}
              </div>

              {/* Side Participant Filmstrip */}
              <div className="w-full md:w-64 h-32 md:h-full flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto shrink-0 hide-scrollbar">
                {/* Local Tile in Filmstrip */}
                {pinnedTile !== "me" && (
                  <div className="relative w-44 md:w-full h-full md:h-36 bg-[#2d2e30] rounded-2xl overflow-hidden border border-zinc-700 shrink-0 flex items-center justify-center group">
                    {!isVideoOff && localStream ? (
                      <VideoStream stream={localStream} mirror={true} className="w-full h-full object-cover" />
                    ) : (
                      <ParticipantAvatar avatar={currentUserAvatar} name={currentUserName} size="md" />
                    )}
                    <button
                      type="button"
                      onClick={() => setPinnedTile("me")}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Pin to stage"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded-md text-white font-medium truncate max-w-[120px]">
                      You {isMuted ? "(Muted)" : ""}
                    </span>
                  </div>
                )}

                {/* Remote Peers Filmstrip */}
                {peerList
                  .filter((p) => p.socketId !== pinnedTile && p.userId !== pinnedTile)
                  .map((peer) => (
                    <div
                      key={peer.socketId}
                      className="relative w-44 md:w-full h-full md:h-36 bg-[#2d2e30] rounded-2xl overflow-hidden border border-zinc-700 shrink-0 flex items-center justify-center group"
                    >
                      {!peer.videoOff && peer.stream ? (
                        <VideoStream stream={peer.stream} className="w-full h-full object-cover" />
                      ) : (
                        <ParticipantAvatar avatar={peer.profilePicture} name={peer.userName} size="md" />
                      )}
                      <button
                        type="button"
                        onClick={() => setPinnedTile(peer.socketId)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Pin to stage"
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded-md text-white font-medium truncate max-w-[120px]">
                        @{peer.userName}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* 3. STANDARD ADAPTIVE TILED GRID VIEW */
            <div className={`w-full h-full grid gap-3.5 mx-auto items-center justify-center p-1 ${getGridColsClass()}`}>
              {/* Local User Tile */}
              <div
                className={`relative w-full h-full min-h-[160px] md:min-h-[220px] bg-[#2d2e30] rounded-3xl overflow-hidden border transition-all duration-200 flex items-center justify-center shadow-xl group ${
                  activeSpeaker === (currentUserId || "me") && !isMuted
                    ? "border-emerald-500 ring-2 ring-emerald-500/30"
                    : "border-zinc-700/80"
                }`}
              >
                {!isVideoOff && localStream ? (
                  <VideoStream
                    stream={localStream}
                    mirror={true}
                    style={{ filter: filterStyleMap[videoFilter || "none"] || "none" }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <ParticipantAvatar avatar={currentUserAvatar} name={currentUserName} size="lg" />
                    <span className="text-sm font-bold text-white">{currentUserName}</span>
                  </div>
                )}

                {/* Hand Raise Badge */}
                {isHandRaised && (
                  <div className="absolute top-3 left-3 bg-amber-400 text-zinc-950 p-2 rounded-full shadow-lg animate-bounce">
                    <GoogleMeetHandIcon className="w-4 h-4" isRaised={true} />
                  </div>
                )}

                {/* Top Right Action & Equalizer */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {activeSpeaker === (currentUserId || "me") && !isMuted && <AudioEqualizerBars />}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setPinnedTile(pinnedTile === "me" ? null : "me");
                    }}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer border border-white/10 shadow-md"
                    title="Pin your tile"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-semibold text-white">
                  <span>You</span>
                  {(isHost || (hostUserId && currentUserId?.toString() === hostUserId.toString())) && (
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-500/25 text-blue-300 text-[10px] font-bold border border-blue-500/30 flex items-center gap-0.5">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Host</span>
                    </span>
                  )}
                  {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </div>

              {/* Remote Participants Tiles */}
              {peerList.map((peer) => {
                const isPeerHost = (hostUserId && peer.userId?.toString() === hostUserId.toString()) || peer.isHost;
                return (
                  <div
                    key={peer.socketId}
                    className={`relative w-full h-full min-h-[160px] md:min-h-[220px] bg-[#2d2e30] rounded-3xl overflow-hidden border transition-all duration-200 flex items-center justify-center shadow-xl group ${
                      activeSpeaker === peer.userId && !peer.muted
                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                        : "border-zinc-700/80"
                    }`}
                  >
                    {!peer.videoOff && peer.stream ? (
                      <VideoStream stream={peer.stream} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <ParticipantAvatar avatar={peer.profilePicture} name={peer.userName} size="lg" />
                        <span className="text-sm font-bold text-white">@{peer.userName}</span>
                      </div>
                    )}

                    {/* Remote Hand Raise Badge */}
                    {peer.handRaised && (
                      <div className="absolute top-3 left-3 bg-amber-400 text-zinc-950 p-2 rounded-full shadow-lg animate-bounce">
                        <GoogleMeetHandIcon className="w-4 h-4" isRaised={true} />
                      </div>
                    )}

                    {/* Top Right Actions & Equalizer */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {activeSpeaker === peer.userId && !peer.muted && <AudioEqualizerBars />}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setPinnedTile(pinnedTile === peer.socketId ? null : peer.socketId);
                        }}
                        className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer border border-white/10 shadow-md"
                        title="Pin to main stage"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Overlay Label */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-semibold text-white">
                      <span>@{peer.userName}</span>
                      {isPeerHost && (
                        <span className="px-1.5 py-0.2 rounded-md bg-blue-500/25 text-blue-300 text-[10px] font-bold border border-blue-500/30 flex items-center gap-0.5">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>Host</span>
                        </span>
                      )}
                      {peer.muted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          </div>

          {/* DEDICATED CLOSED CAPTIONS DOCK (Google Meet Layout — between video stage and bottom buttons) */}
          {isCaptionsOn && (
            <div
              data-testid="meet-captions-dock"
              className="w-full px-4 py-2 shrink-0 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ease-out z-30 min-h-[58px] max-h-[110px]"
            >
              {liveCaptions.length > 0 ? (
                liveCaptions.slice(-2).map((cap) => {
                  const isMe =
                    cap.speakerId === currentUserId ||
                    cap.userName === currentUserName ||
                    cap.speakerId === "me";
                  return (
                    <div
                      key={cap.id}
                      className="w-fit max-w-4xl px-4 py-2 rounded-2xl bg-[#000000]/90 backdrop-blur-2xl border border-white/15 text-white shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-150 pointer-events-auto"
                    >
                      <img
                        src={cap.avatar || dp}
                        alt=""
                        onError={(e) => {
                          e.target.src = dp;
                        }}
                        className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/25 shadow-sm"
                      />
                      <div className="flex items-baseline gap-2 min-w-0 flex-1">
                        <span
                          className={`text-xs font-bold shrink-0 ${
                            isMe ? "text-emerald-400" : "text-sky-400"
                          }`}
                        >
                          {isMe ? "You" : cap.userName}:
                        </span>
                        <span
                          className={`text-xs md:text-sm font-medium tracking-normal break-words ${
                            cap.isFinal ? "text-white" : "text-zinc-200 opacity-90 animate-pulse"
                          }`}
                        >
                          {cap.text}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Google Meet Initial Status Badge when CC is active but waiting for speech */
                <div className="w-fit px-3.5 py-1.5 rounded-full bg-[#000000]/85 backdrop-blur-xl border border-white/15 text-white text-xs font-semibold shadow-xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 pointer-events-auto">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isSpeakingAudio
                        ? "bg-emerald-400 scale-125 animate-ping"
                        : "bg-blue-500 animate-pulse"
                    } shrink-0`}
                  />
                  <span className="text-zinc-200">
                    {isMuted
                      ? "Captions are on • Microphone is muted"
                      : speechNotice
                      ? speechNotice
                      : isSpeakingAudio
                      ? "Listening to your voice..."
                      : "Captions turned on • Speaking will appear here"}
                  </span>

                  {/* Language Selector Dropdown */}
                  <div className="h-3 w-px bg-white/20" />
                  <select
                    value={captionLanguage}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setCaptionLanguage(newLang);
                      try {
                        localStorage.setItem("vybe_meet_caption_lang", newLang);
                      } catch {}
                    }}
                    className="bg-transparent text-xs font-medium text-blue-300 hover:text-blue-200 focus:outline-none cursor-pointer pr-1"
                    title="Change caption language"
                  >
                    <option value="en-IN" className="bg-zinc-900 text-white">English (India)</option>
                    <option value="hi-IN" className="bg-zinc-900 text-white">Hindi (हिंदी)</option>
                    <option value="en-US" className="bg-zinc-900 text-white">English (US)</option>
                    <option value="en-GB" className="bg-zinc-900 text-white">English (UK)</option>
                    <option value="es-ES" className="bg-zinc-900 text-white">Spanish (Español)</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= RIGHT SIDEBARS ================= */}
        {/* 1. Gemini in Meet AI Assistant Drawer */}
        {activeSidebar === "gemini" && (
          <div className="w-full sm:w-80 md:w-96 h-full z-40 shrink-0 animate-in slide-in-from-right duration-200">
            <MeetGeminiDrawer
              isOpen={true}
              onClose={() => setActiveSidebar(null)}
              meetingId={meetingId}
              meetingTitle={roomTitle}
              transcript={
                transcriptLog.length > 0
                  ? transcriptLog.map((t) => `${t.userName}: ${t.text}`).join("\n")
                  : liveCaptions.map((c) => `${c.userName}: ${c.text}`).join("\n")
              }
              chatMessages={messages}
              onSendToChat={(text) => handleSendChat(null, text)}
            />
          </div>
        )}

        {/* 2. In-Meeting Chat Drawer */}
        {activeSidebar === "chat" && (
          <div className="w-full sm:w-80 md:w-96 h-full bg-[#1e1f20] border-l border-zinc-700/80 flex flex-col justify-between z-40 shrink-0 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-700 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>In-Call Messages</span>
              </h3>
              <button
                onClick={() => setActiveSidebar(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages Stream */}
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 hide-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 space-y-2">
                  <MessageSquare className="w-10 h-10 stroke-[1.5] text-zinc-600" />
                  <p className="text-xs">Messages can only be seen by people in the call and are deleted when the call ends.</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = m.from === currentUserId || m.from === "me";
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-zinc-300">
                          {isMe ? "You" : `@${m.senderName}`}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {m.time ? new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-xs max-w-[85%] break-words ${
                          isMe
                            ? "bg-blue-600 text-white rounded-tr-xs"
                            : "bg-[#2d2e30] text-zinc-100 rounded-tl-xs border border-zinc-700"
                        }`}
                      >
                        {m.file && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-white/15 bg-black/40">
                            {m.file.type?.startsWith("image/") ? (
                              <img
                                src={m.file.url}
                                alt={m.file.name || "Attachment"}
                                className="w-full max-h-48 object-cover cursor-pointer"
                                onClick={() => window.open(m.file.url, "_blank")}
                              />
                            ) : (
                              <a
                                href={m.file.url}
                                download={m.file.name || "download"}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2.5 hover:bg-white/10 transition"
                              >
                                <Paperclip className="w-4 h-4 text-blue-400 shrink-0" />
                                <span className="text-[11px] font-bold truncate flex-1">{m.file.name || "Document"}</span>
                                <Download className="w-3.5 h-3.5 text-zinc-400" />
                              </a>
                            )}
                          </div>
                        )}
                        {m.text && renderMessageTextWithLinks(m.text, isMe)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Bar with Attachments */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-zinc-700 flex items-center gap-2 bg-[#28292a]">
              <input
                type="file"
                id="meet-chat-file-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const fileObj = {
                      url: reader.result,
                      name: file.name,
                      type: file.type,
                      size: file.size,
                    };
                    const msgObj = {
                      meetingId,
                      id: Date.now().toString(),
                      senderName: currentUserName,
                      senderAvatar: currentUserAvatar,
                      text: "",
                      file: fileObj,
                      time: new Date().toISOString(),
                    };
                    const socket = getSocket();
                    socket?.emit("meeting:chat-message", msgObj);
                    setMessages((prev) => [...prev, { ...msgObj, from: currentUserId || "me" }]);
                    snackbar.success("File shared in meeting chat 📎");
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("meet-chat-file-input")?.click()}
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a message to everyone"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* 3. People Drawer */}
        {activeSidebar === "people" && (
          <div className="w-full sm:w-80 md:w-96 h-full z-40 shrink-0 animate-in slide-in-from-right duration-200">
            <CallPeopleSidebar
              isOpen={true}
              onClose={() => setActiveSidebar(null)}
              myUserId={currentUserId}
              myUserName={currentUserName}
              myAvatar={currentUserAvatar}
              peers={peers}
              isHost={isHost}
              hostUserId={hostUserId}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isHandRaised={isHandRaised}
              room={meetingId}
            />
          </div>
        )}

        {/* 4. Meeting Info Drawer */}
        {activeSidebar === "info" && (
          <div className="w-full sm:w-80 md:w-96 h-full z-40 shrink-0 animate-in slide-in-from-right duration-200">
            <CallInfoSidebar
              isOpen={true}
              onClose={() => setActiveSidebar(null)}
            />
          </div>
        )}

        {/* 5. Activities Drawer (Polls, Whiteboard, Breakouts) */}
        {activeSidebar === "activities" && (
          <div className="w-full sm:w-80 md:w-96 h-full z-40 shrink-0 animate-in slide-in-from-right duration-200">
            <CallActivitiesDrawer
              isOpen={true}
              onClose={() => setActiveSidebar(null)}
              room={meetingId}
              isHost={isHost}
              videoFilter={videoFilter}
              onChangeVideoFilter={onChangeVideoFilter}
            />
          </div>
        )}
      </div>

      {/* ================= BOTTOM MEETING TOOLBAR ================= */}
      <MeetControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isCaptionsOn={isCaptionsOn}
        onToggleCaptions={() => setIsCaptionsOn((p) => !p)}
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        onFlipCamera={onFlipCamera}
        isFrontCamera={isFrontCamera}
        onToggleScreenShare={onToggleScreenShare}
        onToggleHand={onToggleHand}
        onEndCall={onEndCall}
        onSendReaction={handleSendReaction}
        activeSidebar={activeSidebar}
        onToggleSidebar={(name) => {
          if (name === "chat") setUnreadChatCount(0);
          setActiveSidebar(name);
        }}
        unreadChatCount={unreadChatCount}
        participantCount={totalParticipants}
        roomTitle={roomTitle}
        onOpenSettings={() => setShowSettingsModal(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
          } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
          }
        }}
        isHost={isHost}
        layoutMode={layoutMode}
        onChangeLayoutMode={handleSetLayoutMode}
      />

      {/* Audio / Video Settings Modal */}
      {showSettingsModal && (
        <MeetingSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          localStream={localStream}
          audioInputDevices={audioInputDevices}
          videoDevices={videoDevices}
          audioOutputDevices={audioOutputDevices}
          selectedAudioInput={selectedAudioInput}
          setSelectedAudioInput={setSelectedAudioInput}
          selectedVideo={selectedVideo}
          setSelectedVideo={setSelectedVideo}
          selectedAudioOutput={selectedAudioOutput}
          setSelectedAudioOutput={setSelectedAudioOutput}
          videoFilter={videoFilter}
          onChangeVideoFilter={onChangeVideoFilter}
        />
      )}
    </div>
  );
};

export default MeetRoomView;

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2, Minimize2, MicOff, Monitor, Users, MessageSquare,
  Shield, Sparkles, X, StopCircle, Volume2, Pin, Settings, Hand,
  Eye, EyeOff, ZoomIn, ZoomOut, Copy, Check, CornerUpLeft, Search,
  PinOff, Send, Smile, Paperclip, Download, FileText, FileSpreadsheet,
  FileVideo, Image as ImageIcon, File, Radio, Play, Circle
} from "lucide-react";
import CallControls, { GoogleMeetHandIcon } from "./CallControls";
import MeetingSettingsModal from "./MeetingSettingsModal";
import EmojiPickerPopover from "./EmojiPickerPopover";
import CallReactionStream from "./CallReactionStream";
import CallActivitiesDrawer from "./CallActivitiesDrawer";
import CallPeopleSidebar from "./CallPeopleSidebar";
import CallInfoSidebar from "./CallInfoSidebar";
import { getSocket } from "../lib/socket";
import { snackbar } from "../lib/snackbar";
import dp from "../assets/dp3.png";
import { filterStyleMap } from "../constants/callFilters";

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
          console.warn("[CallScreen WebRTC] Remote audio play deferred by policy:", err?.message);
        });
      }
    };

    playAudio();

    // Auto-unlock audio on user touch or click (Mobile Safari / Chrome Autoplay Unlock)
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
 * High-Performance Memoized Video Stream Component
 * Prevents continuous re-rendering, memory leaks, frame drops, and infinite mirror locks.
 * Defaults to muted={true} so dedicated RemoteAudioPlayer handles audio with zero echo.
 */
const VideoStream = React.memo(({ stream, muted = true, className = "", style = {}, mirror = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = Boolean(muted);
    if (el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
      if (stream) {
        el.play().catch(() => {});
      }
    }
  }, [stream, muted]);

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


/**
 * Helper to auto-link URLs inside chat messages
 */
const renderRichMessageText = (text) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline font-medium break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType = "") => {
  if (fileType.includes("image")) return <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (fileType.includes("video")) return <FileVideo className="w-4 h-4 text-purple-400 shrink-0" />;
  if (fileType.includes("pdf") || fileType.includes("text")) return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
  if (fileType.includes("sheet") || fileType.includes("csv") || fileType.includes("excel")) return <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />;
  return <File className="w-4 h-4 text-blue-400 shrink-0" />;
};

/**
 * CallParticipantAvatar Component
 * Renders real high-res profile picture or polished vibrant gradient initial bubble
 */
const CallParticipantAvatar = ({ avatar, name, size = "lg", className = "" }) => {
  const [prevAvatar, setPrevAvatar] = useState(avatar);
  const [imgError, setImgError] = useState(false);

  if (avatar !== prevAvatar) {
    setPrevAvatar(avatar);
    setImgError(false);
  }

  const sizeClasses = {
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-20 h-20 text-2xl",
    xl: "w-28 h-28 text-3xl",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.lg;
  const cleanName = (name || "").replace(/^@/, "").trim();
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : "U";
  const displayAvatar = avatar || dp;

  if (displayAvatar && !imgError) {
    return (
      <img
        src={displayAvatar}
        alt={cleanName || "User"}
        onError={() => setImgError(true)}
        className={`${currentSizeClass} rounded-full object-cover border-2 border-white/20 shadow-2xl ${className}`}
      />
    );
  }

  return (
    <div
      className={`${currentSizeClass} rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white shadow-2xl border-2 border-white/20 ${className}`}
    >
      <span>{initial}</span>
    </div>
  );
};

/**
 * CallScreen - Industry-Grade Meeting & Call Interface for VYBE (Google Meet & WhatsApp Standard)
 */
export const CallScreen = ({
  localStream,
  screenStream,
  peers,
  isMuted,
  isVideoOff,
  isScreenSharing,
  isHandRaised,
  handRaisedAt,
  activeSpeaker,
  connectionQuality = "good",
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onEndCall,
  audioInputDevices = [],
  videoDevices = [],
  audioOutputDevices = [],
  selectedAudioInput,
  setSelectedAudioInput,
  selectedVideo,
  setSelectedVideo,
  selectedAudioOutput,
  setSelectedAudioOutput,
  roomTitle = "Call Session",
  room,
  currentUserId,
  callerName,
  callerAvatar,
  isHost,
  videoFilter,
  changeVideoFilter,
}) => {
  const { userData } = useSelector((state) => state.user);

  // Current User Identity (Declared at top to prevent Temporal Dead Zone)
  const myUserId = (currentUserId || userData?._id || userData?.user?._id)?.toString();
  const rawUserName = userData?.user?.userName || userData?.userName || "";
  const rawName = userData?.user?.name || userData?.name || "";
  const myDisplayName = rawUserName ? `@${rawUserName}` : (rawName ? rawName : "You");
  const myDisplayAvatar = 
    userData?.user?.profileImage?.url || 
    userData?.profileImage?.url || 
    (typeof userData?.user?.profileImage === "string" ? userData.user.profileImage : "") ||
    (typeof userData?.profileImage === "string" ? userData.profileImage : "") ||
    userData?.user?.profilePicture?.url ||
    (typeof userData?.user?.profilePicture === "string" ? userData.user.profilePicture : "") ||
    userData?.profilePicture || 
    dp;

  const [layout, setLayout] = useState("grid"); // 'grid' or 'spotlight'
  const [spotlightTargetId, setSpotlightTargetId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Google Meet Sidebars State ('chat', 'activities', 'people', 'info', or null)
  const [activeSidebar, setActiveSidebar] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id, sender, text }
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const [imageLightboxUrl, setImageLightboxUrl] = useState(null);
  const [callTypingUsers, setCallTypingUsers] = useState([]);
  const callTypingTimeoutRef = useRef(null);

  // In-Meeting Call Recording Engine State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [remoteIsRecording, setRemoteIsRecording] = useState(false);
  const [recordingStartedByName, setRecordingStartedByName] = useState("");
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingAudioCtxRef = useRef(null);

  // Stage & Fullscreen Controls
  const [showPipInFullscreen, setShowPipInFullscreen] = useState(true);
  const [screenFitMode, setScreenFitMode] = useState("contain"); // "contain" | "cover"
  const [reactionEvents, setReactionEvents] = useState([]);
  const [hudVisible, setHudVisible] = useState(true);

  const mainContainerRef = useRef(null);
  const chatScrollRef = useRef(null);
  const hudTimerRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  // Host Controls Policies State
  const [hostSettings, setHostSettings] = useState({
    allowScreenShare: true,
    allowChat: true,
    allowMic: true,
    allowCamera: true,
    allowReactions: true,
  });

  const handleUpdateHostSettings = useCallback((newSettings) => {
    setHostSettings(newSettings);
    const socket = getSocket();
    if (socket && room) {
      socket.emit("call:action", {
        room,
        action: "host-settings",
        settings: newSettings,
      });
    }
  }, [room]);

  const handleMuteAll = useCallback(() => {
    const socket = getSocket();
    if (socket && room) {
      socket.emit("call:moderate", {
        room,
        action: "mute-all",
      });
      snackbar.success("Muted all participants 🔇");
    }
  }, [room]);

  const handleLowerAllHands = useCallback(() => {
    if (isHandRaised) {
      onToggleHand();
    }
    const socket = getSocket();
    if (socket && room) {
      socket.emit("call:action", {
        room,
        action: "lower-all-hands",
      });
      snackbar.success("Lowered all raised hands ✋");
    }
  }, [isHandRaised, onToggleHand, room]);

  const handleLowerUserHand = useCallback((targetUserId) => {
    if (targetUserId?.toString() === currentUserId?.toString()) {
      onToggleHand();
      return;
    }
    const socket = getSocket();
    if (socket && room) {
      socket.emit("call:action", {
        room,
        action: "lower-hand",
        targetUserId,
      });
      snackbar.info("Lowered participant's hand");
    }
  }, [currentUserId, onToggleHand, room]);

  // Live GMeet Reaction Dispatcher (Emerges exactly from clicked emoji pill position)
  const handleSendReaction = useCallback((emoji, originX = null) => {
    if (!isHost && hostSettings.allowReactions === false) {
      snackbar.warning("Reactions are disabled by the meeting host 🚫");
      return;
    }
    const xPos = typeof originX === "number" ? originX : (44 + Math.random() * 12);
    const newReaction = {
      id: `${Date.now()}-${Math.random().toString(36).substring(4)}`,
      emoji,
      userName: myDisplayName,
      leftPercent: xPos,
    };
    setReactionEvents((prev) => [...prev.slice(-20), newReaction]);

    const sock = getSocket();
    if (sock && room) {
      sock.emit("call:action", {
        room,
        action: "reaction",
        emoji,
        userName: myDisplayName,
        avatar: myDisplayAvatar,
        originX: xPos,
      });
    }
  }, [room, myDisplayName, myDisplayAvatar, isHost, hostSettings.allowReactions]);

  // Monotonic Call Duration Timer (Fixed & immune to peer/socket reconnection resets)
  const callStartTimeRef = useRef(null);
  useEffect(() => {
    callStartTimeRef.current = Date.now();
    const timer = setInterval(() => {
      const start = callStartTimeRef.current || Date.now();
      const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setCallDuration(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Presenter Discovery & Accurate Remote Peer List (Excludes Self & Deduplicates)
  const uniquePeerMap = new Map();
  Object.entries(peers).forEach(([sid, data]) => {
    if (!data) return;
    const uid = (data.userId || sid)?.toString();
    if (myUserId && uid === myUserId) return;
    if (!uniquePeerMap.has(uid)) {
      uniquePeerMap.set(uid, [sid, data]);
    }
  });
  const peerList = Array.from(uniquePeerMap.values());

  // Hand Raise Queue List & Total Count (Real-Time GMeet Synchronization & FIFO Chronological Sorting)
  const raisedHandsList = [];
  if (isHandRaised) {
    raisedHandsList.push({
      userId: currentUserId,
      userName: myDisplayName || "You",
      isSelf: true,
      raisedAt: handRaisedAt || 0,
    });
  }
  peerList.forEach(([sid, data]) => {
    if (data?.handRaised) {
      raisedHandsList.push({
        userId: data.userId || sid,
        userName: data.userName || data.name || "Participant",
        isSelf: false,
        raisedAt: data.handRaisedAt || 0,
      });
    }
  });
  // Sort by raisedAt ascending: First person to raise hand is #1, next is #2, etc.
  raisedHandsList.sort((a, b) => (a.raisedAt || 0) - (b.raisedAt || 0));
  const raisedHandsCount = raisedHandsList.length;

  const selfHandQueueIndex = raisedHandsList.findIndex((h) => h.isSelf);
  const getPeerHandQueueIndex = (uid, sid) => {
    const idx = raisedHandsList.findIndex(
      (h) =>
        h.userId &&
        (h.userId?.toString() === uid?.toString() || h.userId?.toString() === sid?.toString())
    );
    return idx !== -1 ? idx + 1 : null;
  };

  const remotePresenterEntry = peerList.find(([, data]) => data.screenSharing);
  const isSelfPresenter = isScreenSharing && Boolean(screenStream);
  const remotePresenterData = remotePresenterEntry ? remotePresenterEntry[1] : null;
  const anyoneScreenSharing = isSelfPresenter || Boolean(remotePresenterData);

  const activeSharedStream = isSelfPresenter
    ? screenStream
    : remotePresenterData?.screenStream || remotePresenterData?.stream;

  const totalStreamsCount = peerList.length > 0 ? (1 + peerList.length) : (callerName ? 2 : 1);
  const effectiveSpotlightId = spotlightTargetId || activeSpeaker || (peerList.length > 0 ? peerList[0][1]?.userId : currentUserId);

  // Fullscreen Auto-hide HUD on Mouse Inactivity (Zero-Jitter Throttle)
  const handleMouseMove = useCallback(() => {
    setHudVisible((prev) => {
      if (!prev) return true;
      return prev;
    });
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      if (document.fullscreenElement) {
        setHudVisible(false);
      }
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, []);

  // Native Fullscreen Toggle on Single Root Container
  const toggleFullscreen = () => {
    if (!mainContainerRef.current) return;
    if (!document.fullscreenElement) {
      mainContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      setHudVisible(true);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Keyboard shortcut: 'F' for Fullscreen, 'Esc' handled natively
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Stable refs for socket handlers to prevent unmount/re-mount drop of chat messages
  const peersRef = useRef(peers);
  const callerNameRef = useRef(callerName);
  const activeSidebarRef = useRef(activeSidebar);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  useEffect(() => {
    callerNameRef.current = callerName;
  }, [callerName]);

  useEffect(() => {
    activeSidebarRef.current = activeSidebar;
    if (activeSidebar === "chat") {
      const timer = setTimeout(() => setUnreadCount(0), 0);
      return () => clearTimeout(timer);
    }
  }, [activeSidebar]);

  // Socket In-Call Chat, Reaction & Recording Listeners (Mounted once per room/user)
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room) return;

    // Ensure socket room join for chat message propagation
    socket.emit("call:join-room", { room });

    const handleChatMessage = ({ id, from, senderName, senderAvatar, text, file, replyTo, time }) => {
      const isMe = from && myUserId && from.toString() === myUserId;
      const peerListCurrent = Object.entries(peersRef.current || {});
      const peer = peerListCurrent.find(([, d]) => d.userId?.toString() === from?.toString())?.[1];
      const resolvedName = isMe ? "You" : senderName || (peer?.userName ? `@${peer.userName}` : callerNameRef.current ? `@${callerNameRef.current}` : "Participant");
      const resolvedAvatar = senderAvatar || peer?.profilePicture || null;

      setChatMessages((prev) => {
        // Prevent duplicate messages if already present
        if (prev.some((m) => m.id === id)) return prev;
        return [
          ...prev,
          {
            id: id || Date.now().toString() + Math.random().toString(36).substring(4),
            from,
            sender: resolvedName,
            senderAvatar: resolvedAvatar,
            text,
            file: file || null,
            replyTo: replyTo || null,
            pinned: false,
            reactions: {},
            time: new Date(time || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ];
      });

      if (activeSidebarRef.current !== "chat") {
        setUnreadCount((c) => c + 1);
      }
    };

    const handleMessagePinned = ({ messageId, pinned }) => {
      setChatMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          pinned: msg.id === messageId ? pinned : pinned ? false : msg.pinned,
        }))
      );
    };

    const handleChatReaction = ({ messageId, emoji, userId }) => {
      setChatMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = { ...(msg.reactions || {}) };
          const userList = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
          const userIndex = userList.indexOf(userId);
          if (userIndex > -1) {
            userList.splice(userIndex, 1);
            if (userList.length === 0) {
              delete reactions[emoji];
            } else {
              reactions[emoji] = userList;
            }
          } else {
            userList.push(userId);
            reactions[emoji] = userList;
          }
          return { ...msg, reactions };
        })
      );
    };

    const handleRecordingStatus = ({ isRecording: recordingState, startedByName: name }) => {
      setRemoteIsRecording(Boolean(recordingState));
      setRecordingStartedByName(name || "Participant");
    };

    const handleCallUserTyping = (data) => {
      const { userId, userName, userAvatar, isTyping } = data;
      if (!userId || userId === myUserId) return;

      setCallTypingUsers((prev) => {
        if (isTyping) {
          const exists = prev.some((u) => u.userId === userId);
          if (!exists) {
            return [...prev, { userId, userName: userName || "Participant", userAvatar, timestamp: Date.now() }];
          }
          return prev.map((u) => (u.userId === userId ? { ...u, timestamp: Date.now() } : u));
        } else {
          return prev.filter((u) => u.userId !== userId);
        }
      });
    };

    const handleActionBroadcast = (data) => {
      if (data.action === "reaction" && data.emoji) {
        const remoteReaction = {
          id: `${Date.now()}-${Math.random().toString(36).substring(4)}`,
          emoji: data.emoji,
          userName: data.userName || "Participant",
          leftPercent: typeof data.originX === "number" ? data.originX : (44 + Math.random() * 12),
        };
        setReactionEvents((prev) => [...prev.slice(-20), remoteReaction]);
      } else if (data.action === "host-settings" && data.settings) {
        setHostSettings(data.settings);
        if (!isHost) {
          if (data.settings.allowMic === false && !isMuted) {
            onToggleMute(true);
            snackbar.warning("The meeting host has turned off microphones 🔇");
          }
          if (data.settings.allowCamera === false && !isVideoOff) {
            onToggleVideo(true);
            snackbar.warning("The meeting host has turned off cameras 📷");
          }
          if (data.settings.allowScreenShare === false && isScreenSharing) {
            onToggleScreenShare();
            snackbar.warning("The meeting host has disabled screen sharing 🛑");
          }
          if (data.settings.allowChat === false) {
            snackbar.info("In-call chat has been disabled by the host 💬");
          }
          if (data.settings.allowReactions === false) {
            snackbar.info("Reactions have been disabled by the host 🚫");
          }
        }
      } else if (data.action === "hand") {
        if (data.value) {
          snackbar.info(`${data.userName || "A participant"} raised a hand ✋`);
        }
      }
    };

    const handleModerated = ({ targetUserId, action }) => {
      if (action === "mute-all") {
        if (!isHost) {
          if (!isMuted) {
            onToggleMute?.(true);
          }
          snackbar.warning("You have been muted by the meeting host 🔇");
        }
      } else if (action === "mute-user" && targetUserId?.toString() === myUserId?.toString()) {
        if (!isMuted) {
          onToggleMute?.(true);
        }
        snackbar.warning("You have been muted by the meeting host 🔇");
      } else if (action === "kick-user" && targetUserId?.toString() === myUserId?.toString()) {
        snackbar.error("You were removed from the meeting by the host.");
        onEndCall?.();
      }
    };

    socket.on("call:chat-message-received", handleChatMessage);
    socket.on("call:message-pinned", handleMessagePinned);
    socket.on("call:chat-reaction-received", handleChatReaction);
    socket.on("call:recording-status-changed", handleRecordingStatus);
    socket.on("call:user-typing", handleCallUserTyping);
    socket.on("call:action-broadcast", handleActionBroadcast);
    socket.on("call:moderated", handleModerated);

    const callTypingCleanupInterval = setInterval(() => {
      const now = Date.now();
      setCallTypingUsers((prev) => prev.filter((u) => now - u.timestamp < 4500));
    }, 2000);

    return () => {
      socket.off("call:chat-message-received", handleChatMessage);
      socket.off("call:message-pinned", handleMessagePinned);
      socket.off("call:chat-reaction-received", handleChatReaction);
      socket.off("call:recording-status-changed", handleRecordingStatus);
      socket.off("call:user-typing", handleCallUserTyping);
      socket.off("call:action-broadcast", handleActionBroadcast);
      socket.off("call:moderated", handleModerated);
      clearInterval(callTypingCleanupInterval);
    };
  }, [room, myUserId, isHost, isMuted, isScreenSharing, isVideoOff, onEndCall, onToggleMute, onToggleScreenShare, onToggleVideo]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeSidebar]);

  // Live In-Call Typing Emitter
  const handleEmitCallTyping = (isTyping) => {
    const socket = getSocket();
    if (!socket || !room) return;

    if (callTypingTimeoutRef.current) {
      clearTimeout(callTypingTimeoutRef.current);
    }

    socket.emit("call:typing", {
      room,
      from: myUserId,
      senderName: myDisplayName,
      senderAvatar: myDisplayAvatar,
      isTyping,
    });

    if (isTyping) {
      callTypingTimeoutRef.current = setTimeout(() => {
        socket.emit("call:typing", {
          room,
          from: myUserId,
          senderName: myDisplayName,
          senderAvatar: myDisplayAvatar,
          isTyping: false,
        });
      }, 3500);
    }
  };

  // Send In-Call Chat Message (Supports text + file attachments)
  const handleSendChatMessage = (textToSend, fileToSend = null) => {
    if (!isHost && hostSettings.allowChat === false) {
      snackbar.warning("In-call chat is disabled by the meeting host 💬");
      return;
    }
    handleEmitCallTyping(false);
    if (!textToSend?.trim() && !fileToSend) return;
    const text = textToSend?.trim() || "";
    const id = Date.now().toString() + Math.random().toString(36).substring(4);

    const newMsg = {
      id,
      from: myUserId,
      sender: "You",
      senderAvatar: myDisplayAvatar,
      text,
      file: fileToSend || null,
      replyTo: replyingTo ? { sender: replyingTo.sender, text: replyingTo.text } : null,
      pinned: false,
      reactions: {},
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const socket = getSocket();
    socket?.emit("call:chat-message", {
      room,
      id,
      from: myUserId,
      text,
      file: fileToSend || null,
      replyTo: newMsg.replyTo,
      senderName: myDisplayName,
      senderAvatar: myDisplayAvatar,
    });

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setReplyingTo(null);
  };

  // Send Reaction to In-Call Chat Message
  const handleSendReactionToMessage = (messageId, emoji) => {
    const socket = getSocket();
    socket?.emit("call:chat-reaction", {
      room,
      messageId,
      emoji,
      from: myUserId,
      senderName: myDisplayName,
    });

    // Optimistic local update
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = { ...(msg.reactions || {}) };
        const userList = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
        const userIndex = userList.indexOf(myUserId);
        if (userIndex > -1) {
          userList.splice(userIndex, 1);
          if (userList.length === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = userList;
          }
        } else {
          userList.push(myUserId);
          reactions[emoji] = userList;
        }
        return { ...msg, reactions };
      })
    );
  };

  const handleTogglePinMessage = (msgId, currentPinState) => {
    const socket = getSocket();
    const newPinState = !currentPinState;
    socket?.emit("call:pin-message", {
      room,
      messageId: msgId,
      pinned: newPinState,
    });
    setChatMessages((prev) =>
      prev.map((msg) => ({
        ...msg,
        pinned: msg.id === msgId ? newPinState : newPinState ? false : msg.pinned,
      }))
    );
  };

  // Smooth Scroll & Highlight Pulse on Pinned Message Click
  const handleJumpToMessage = (msgId) => {
    if (!msgId) return;
    const el = document.getElementById(`call-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2500);
    }
  };

  const handleCopyMessage = async (msgId, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopiedMsgId(msgId);
        setTimeout(() => setCopiedMsgId(null), 2000);
      } catch {
        /* ignore fallback clipboard error */
      }
    }
  };

  // =========================================================================
  // IN-MEETING CALL RECORDING ENGINE (MediaRecorder + AudioContext Audio Mixing)
  // Supports Video + Voice + Screen Share Recording with instant download
  // =========================================================================
  const handleStartRecording = () => {
    try {
      recordedChunksRef.current = [];
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      recordingAudioCtxRef.current = audioCtx;
      const audioDestination = audioCtx.createMediaStreamDestination();

      // 1. Mix Local Microphone Track into Audio Destination
      if (localStream) {
        const localAudioTracks = localStream.getAudioTracks();
        if (localAudioTracks && localAudioTracks.length > 0) {
          try {
            const localSource = audioCtx.createMediaStreamSource(new MediaStream([localAudioTracks[0]]));
            localSource.connect(audioDestination);
          } catch (e) {
            console.warn("[Recording] Local audio connect error:", e);
          }
        }
      }

      // 2. Mix All Remote Peer Audio Tracks into Audio Destination
      peerList.forEach(([, peerData]) => {
        if (peerData?.stream) {
          const peerAudioTracks = peerData.stream.getAudioTracks();
          if (peerAudioTracks && peerAudioTracks.length > 0) {
            try {
              const peerSource = audioCtx.createMediaStreamSource(new MediaStream([peerAudioTracks[0]]));
              peerSource.connect(audioDestination);
            } catch (e) {
              console.warn("[Recording] Remote audio connect error:", e);
            }
          }
        }
      });

      // 3. Determine Video Track (Shared Screen > Local Video > First Peer Video)
      let videoTrack = null;
      if (activeSharedStream) {
        videoTrack = activeSharedStream.getVideoTracks()[0] || null;
      } else if (localStream && !isVideoOff) {
        videoTrack = localStream.getVideoTracks()[0] || null;
      } else {
        const firstPeerWithVideo = peerList.find(([, p]) => p.stream && !p.videoOff);
        if (firstPeerWithVideo) {
          videoTrack = firstPeerWithVideo[1].stream.getVideoTracks()[0] || null;
        }
      }

      // 4. Combine Mixed Audio & Video Tracks into Recording MediaStream
      const combinedTracks = [...audioDestination.stream.getAudioTracks()];
      if (videoTrack) {
        combinedTracks.push(videoTrack);
      }
      const recordingStream = new MediaStream(combinedTracks);

      // 5. Select Best Supported MimeType
      let mimeType = "";
      if (videoTrack) {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          mimeType = "video/webm";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mimeType = "video/mp4";
        }
      } else {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        }
      }

      const recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current;
        if (chunks.length === 0) return;
        const blobType = mimeType || (videoTrack ? "video/webm" : "audio/webm");
        const blob = new Blob(chunks, { type: blobType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "_");
        a.download = `Vybe_Meeting_Recording_${timestamp}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start(1000); // 1s timeslices
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Notify other participants via socket
      const socket = getSocket();
      socket?.emit("call:recording-status", { room, isRecording: true, userName: myDisplayName });
    } catch (e) {
      console.error("[Recording] Failed to start meeting recording:", e);
      snackbar.error("Could not start recording. Please check browser media permissions.");
    }
  };

  const handleStopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (recordingAudioCtxRef.current && recordingAudioCtxRef.current.state !== "closed") {
        try { recordingAudioCtxRef.current.close(); } catch { /* ignore */ }
      }
      setIsRecording(false);
      setRecordingDuration(0);

      const socket = getSocket();
      socket?.emit("call:recording-status", { room, isRecording: false, userName: myDisplayName });
    } catch (e) {
      console.warn("[Recording] Stop recording error:", e);
    }
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingAudioCtxRef.current && recordingAudioCtxRef.current.state !== "closed") {
        try { recordingAudioCtxRef.current.close(); } catch { /* ignore */ }
      }
    };
  }, []);

  const pinnedMessage = chatMessages.find((m) => m.pinned);
  const filteredChatMessages = chatSearchQuery.trim()
    ? chatMessages.filter((m) => m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()) || m.sender?.toLowerCase().includes(chatSearchQuery.toLowerCase()) || m.file?.name?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : chatMessages;

  // Minimized Picture-in-Picture Floating Pill
  if (isMinimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-6 right-6 z-[1000] w-72 bg-[#0e131f]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white truncate max-w-[120px]">{roomTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white cursor-pointer transition"
              title="Expand View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onEndCall}
              className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer transition"
              title="Hang Up"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative h-28 bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center">
          {anyoneScreenSharing ? (
            <div className="flex flex-col items-center gap-1 text-purple-400">
              <Monitor className="w-6 h-6 animate-pulse" />
              <span className="text-[10px] font-bold">Screen Sharing Active</span>
            </div>
          ) : isVideoOff ? (
            <span className="text-xs text-zinc-400 font-semibold">Camera Off</span>
          ) : (
            <VideoStream
              stream={localStream}
              muted={true}
              className="w-full h-full object-cover"
            />
          )}
          <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/70 px-2 py-0.5 rounded text-white font-mono">
            {formatDuration(callDuration)}
          </span>
        </div>
      </motion.div>
    );
  }

  // =========================================================================
  // SINGLE UNIFIED TREE (Prevents DOM unmount/compositor crash during fullscreen)
  // =========================================================================
  return (
    <div
      ref={mainContainerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-[900] bg-[#0a0e17] text-white flex flex-col justify-between overflow-hidden select-none font-sans ${
        isFullscreen
          ? `p-0 bg-black w-screen h-screen ${!hudVisible ? "cursor-none" : "cursor-default"}`
          : "p-3 md:p-4 cursor-default"
      }`}
    >
      {/* Background Remote Audio Players (Guaranteed Uninterrupted Audio across All Modes) */}
      {peerList.map(([socketId, peerData]) =>
        peerData?.stream ? (
          <RemoteAudioPlayer
            key={`remote-audio-${socketId}`}
            stream={peerData.stream}
          />
        ) : null
      )}


      {/* Floating Live Reaction Emojis Stream (Single Source of Truth) */}
      <CallReactionStream reactions={reactionEvents} />

      {/* Image Lightbox Modal */}
      {imageLightboxUrl && (
        <div
          onClick={() => setImageLightboxUrl(null)}
          className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            <img
              src={imageLightboxUrl}
              alt="Enlarged media"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setImageLightboxUrl(null)}
              className="absolute -top-3 -right-3 p-2 bg-zinc-900 border border-white/20 text-white rounded-full hover:bg-zinc-800 transition shadow-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Google Meet Style Settings Modal */}
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
        onChangeVideoFilter={changeVideoFilter}
        screenFitMode={screenFitMode}
        setScreenFitMode={setScreenFitMode}
      />

      {/* ========================================================
          TOP HEADER BAR (Google Meet Style in Fullscreen)
          ======================================================== */}
      {isFullscreen ? (
        /* Fullscreen Minimal Top Floating Pill */
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 flex items-center gap-2.5 bg-[#0e131f]/90 backdrop-blur-2xl border border-white/20 px-4 py-2 rounded-full shadow-2xl ${
            hudVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2 pr-2.5 border-r border-white/15">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">
              {anyoneScreenSharing
                ? isSelfPresenter
                  ? "You're Presenting"
                  : `@${remotePresenterData?.userName || "Participant"}`
                : roomTitle}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {formatDuration(callDuration)}
            </span>
          </div>

          {/* Recording Badge */}
          {(isRecording || remoteIsRecording) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/30 border border-rose-500/50 text-rose-400 text-[10px] font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>REC {isRecording ? formatDuration(recordingDuration) : "ACTIVE"}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {/* Fit vs Fill Zoom Toggle (Only when Screen Sharing) */}
            {anyoneScreenSharing && (
              <button
                type="button"
                onClick={() => setScreenFitMode((prev) => (prev === "contain" ? "cover" : "contain"))}
                className="px-2.5 py-1 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                title={screenFitMode === "contain" ? "Switch to Fill" : "Switch to Fit (Default)"}
              >
                {screenFitMode === "contain" ? <ZoomIn className="w-3.5 h-3.5 text-purple-400" /> : <ZoomOut className="w-3.5 h-3.5 text-purple-400" />}
                <span>{screenFitMode === "contain" ? "Fit" : "Fill"}</span>
              </button>
            )}

            {/* Toggle PIP Camera (Only when Screen Sharing) */}
            {anyoneScreenSharing && (
              <button
                type="button"
                onClick={() => setShowPipInFullscreen(!showPipInFullscreen)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  showPipInFullscreen ? "text-purple-300 bg-purple-500/20 border border-purple-500/30" : "text-zinc-400 hover:text-white"
                }`}
                title={showPipInFullscreen ? "Hide Camera Box" : "Show Camera Box"}
              >
                {showPipInFullscreen ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Camera</span>
              </button>
            )}

            {/* Exit Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-full transition cursor-pointer"
              title="Exit Fullscreen (Esc or F)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Normal Mode Top Header Bar */
        <div className="flex items-center justify-between p-3 bg-white/[0.05] border border-white/10 rounded-2xl backdrop-blur-2xl mb-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-600/30">
              {anyoneScreenSharing ? <Monitor className="w-4.5 h-4.5" /> : <Users className="w-4.5 h-4.5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide truncate max-w-[180px] md:max-w-md">{roomTitle}</h3>
                {anyoneScreenSharing && (
                  <span className="hidden sm:inline-flex items-center gap-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    {isSelfPresenter ? "You are presenting" : `@${remotePresenterData?.userName || "Participant"} presenting`}
                  </span>
                )}
                {/* Active Call Recording Pulse Pill */}
                {(isRecording || remoteIsRecording) && (
                  <span className="inline-flex items-center gap-1.5 bg-rose-600/25 border border-rose-500/40 text-rose-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-rose-600/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>REC {isRecording ? formatDuration(recordingDuration) : `${recordingStartedByName}`}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium flex items-center gap-2 text-zinc-400">
                <span className={`w-2 h-2 rounded-full ${connectionQuality === 'poor' ? 'bg-rose-500' : connectionQuality === 'reconnecting' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                <span>
                  {connectionQuality === 'reconnecting' ? 'Reconnecting Network...' : `Encrypted HD • ${totalStreamsCount} in call • ${formatDuration(callDuration)}`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSelfPresenter && (
              <button
                onClick={onToggleScreenShare}
                className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Stop Presenting</span>
              </button>
            )}

            {!anyoneScreenSharing && (
              <div className="flex items-center bg-white/[0.06] border border-white/10 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setLayout("grid")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    layout === "grid" ? "bg-white/20 text-white shadow" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setLayout("spotlight")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    layout === "spotlight" ? "bg-white/20 text-white shadow" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Spotlight
                </button>
              </div>
            )}

            {/* Settings Modal Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white rounded-xl transition cursor-pointer"
              title="Call Settings (Audio, Video & Feedback)"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white rounded-xl transition cursor-pointer"
              title="Fullscreen (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Minimize to PIP Button */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white rounded-xl transition cursor-pointer"
              title="Minimize to Picture-in-Picture"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          BODY CONTENT AREA (Left Column: Stage + Controls | Right Column: Full-Height Chat)
          ======================================================== */}
      {isFullscreen ? (
        /* Fullscreen Stage & Floating Controls Layout */
        <div className="absolute inset-0 w-full h-full flex flex-col justify-between overflow-hidden">
          {/* Hero Presentation or Camera Grid */}
          <div className="absolute inset-0 w-full h-full">
            {anyoneScreenSharing ? (
              <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none">
                <VideoStream
                  stream={activeSharedStream}
                  muted={true}
                  className={`w-full h-full pointer-events-none transition-all duration-200 ${
                    screenFitMode === "cover" ? "object-cover" : "object-contain"
                  }`}
                />
                {showPipInFullscreen && (
                  <div className={`absolute top-20 right-4 z-30 transition-all duration-300 w-44 md:w-52 h-28 md:h-32 bg-zinc-900/90 backdrop-blur-xl border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl ${
                    hudVisible ? "opacity-100 scale-100" : "opacity-30 hover:opacity-100"
                  }`}>
                    <button
                      onClick={() => setShowPipInFullscreen(false)}
                      className="absolute top-1.5 right-1.5 z-40 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full transition cursor-pointer"
                      title="Close Camera View"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {isSelfPresenter ? (
                      (() => {
                        const firstPeer = peerList[0]?.[1];
                        if (!firstPeer) {
                          return (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                              <span className="text-xs font-bold text-zinc-400">Solo Session</span>
                            </div>
                          );
                        }
                        const firstPeerAvatar = firstPeer.profilePicture || callerAvatar;
                        return firstPeer.videoOff ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                            <CallParticipantAvatar avatar={firstPeerAvatar} name={firstPeer.userName} size="sm" className="mb-1" />
                            <span className="text-[10px] text-zinc-400">@{firstPeer.userName}</span>
                          </div>
                        ) : (
                          <VideoStream
                            stream={firstPeer.stream}
                            className="w-full h-full object-cover"
                          />
                        );
                      })()
                    ) : isVideoOff ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                        <CallParticipantAvatar avatar={myDisplayAvatar} name={myDisplayName} size="sm" className="mb-1" />
                        <span className="text-[10px] text-zinc-400">Camera Off</span>
                      </div>
                    ) : (
                      <VideoStream
                        stream={localStream}
                        muted={true}
                        className="w-full h-full object-cover"
                        mirror={true}
                      />
                    )}
                    <div className="absolute bottom-1.5 left-2 bg-black/70 px-2 py-0.5 rounded-full text-[9px] font-bold text-white">
                      {isSelfPresenter ? (peerList[0]?.[1]?.userName ? `@${peerList[0][1].userName}` : "Attendee") : "You"}
                    </div>
                  </div>
                )}
              </div>
            ) : layout === "spotlight" ? (
              <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex items-center justify-center">
                {effectiveSpotlightId === currentUserId ? (
                  isVideoOff ? (
                    <div className="text-center space-y-3">
                      <CallParticipantAvatar avatar={myDisplayAvatar} name={myDisplayName} size="xl" className="mx-auto" />
                      <p className="text-sm text-zinc-400 font-medium">Your Camera is Off</p>
                    </div>
                  ) : (
                    <VideoStream
                      stream={localStream}
                      muted={true}
                      className="w-full h-full object-cover"
                      mirror={true}
                      style={{ filter: filterStyleMap[videoFilter || "none"] }}
                    />
                  )
                ) : (
                  (() => {
                    const spotlightPeer = peerList.find(([, d]) => d.userId === effectiveSpotlightId) || peerList[0];
                    if (!spotlightPeer) return null;
                    const [, data] = spotlightPeer;
                    const peerAvatar = data.profilePicture || callerAvatar;
                    return data.videoOff ? (
                      <div className="text-center space-y-3">
                        <CallParticipantAvatar avatar={peerAvatar} name={data.userName} size="xl" className="mx-auto" />
                        <p className="text-sm text-zinc-400 font-medium">@{data.userName || "Participant"} (Camera Off)</p>
                      </div>
                    ) : (
                      <VideoStream
                        stream={data.stream}
                        className="w-full h-full object-cover"
                        style={{ filter: filterStyleMap[data.videoFilter || "none"] }}
                      />
                    );
                  })()
                )}
              </div>
            ) : (
              <div className={`h-full w-full grid gap-3.5 ${
                totalStreamsCount === 1 ? "grid-cols-1" : totalStreamsCount === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3"
              }`}>
                <div className={`relative bg-zinc-950 border-2 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center ${
                  activeSpeaker === currentUserId ? "border-emerald-400 shadow-xl shadow-emerald-500/20" : "border-white/10"
                }`}>
                  {isVideoOff ? (
                    <div className="text-center space-y-2">
                      <CallParticipantAvatar avatar={myDisplayAvatar} name={myDisplayName} size="lg" className="mx-auto" />
                      <p className="text-xs text-zinc-400 font-medium">{myDisplayName}</p>
                    </div>
                  ) : (
                    <VideoStream stream={localStream} muted={true} className="w-full h-full object-cover" mirror={true} style={{ filter: filterStyleMap[videoFilter || "none"] }} />
                  )}
                </div>

                {peerList.length === 0 && callerName && (
                  <div className="relative bg-zinc-950 border-2 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border-white/10">
                    <div className="text-center space-y-2">
                      <CallParticipantAvatar
                        avatar={callerAvatar || dp}
                        name={callerName}
                        size="lg"
                        className="mx-auto animate-pulse"
                      />
                      <p className="text-xs text-zinc-300 font-bold">
                        {callerName.startsWith("@") ? callerName : `@${callerName}`}
                      </p>
                      <p className="text-[10px] text-blue-400 font-medium animate-pulse">
                        Connecting...
                      </p>
                    </div>
                  </div>
                )}

                {peerList.map(([socketId, peerData]) => {
                  const pAvatar = peerData.profilePicture || callerAvatar || dp;
                  const pName = (peerData.userName && peerData.userName !== "Participant")
                    ? (peerData.userName.startsWith("@") ? peerData.userName : `@${peerData.userName}`)
                    : (callerName ? (callerName.startsWith("@") ? callerName : `@${callerName}`) : "Participant");
                  return (
                    <div key={socketId} className={`relative bg-zinc-950 border-2 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center ${
                      activeSpeaker === peerData.userId ? "border-emerald-400 shadow-xl shadow-emerald-500/20" : "border-white/10"
                    }`}>
                      {peerData.videoOff ? (
                        <div className="text-center space-y-2">
                          <CallParticipantAvatar avatar={pAvatar} name={pName} size="lg" className="mx-auto" />
                          <p className="text-xs text-zinc-400 font-medium">{pName}</p>
                        </div>
                      ) : (
                        <VideoStream stream={peerData.stream} className="w-full h-full object-cover" style={{ filter: filterStyleMap[peerData.videoFilter || "none"] }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fullscreen Chat Floating Overlay */}
          {activeSidebar === "chat" && (
            <div className="w-72 sm:w-80 absolute right-4 top-16 bottom-24 bg-[#0d121d]/95 border border-white/15 rounded-3xl flex flex-col justify-between p-3.5 shadow-2xl backdrop-blur-2xl z-50 animate-in slide-in-from-right duration-200">
              <ChatDrawerContent
                chatMessages={chatMessages}
                filteredChatMessages={filteredChatMessages}
                chatSearchQuery={chatSearchQuery}
                setChatSearchQuery={setChatSearchQuery}
                pinnedMessage={pinnedMessage}
                handleTogglePinMessage={handleTogglePinMessage}
                handleJumpToMessage={handleJumpToMessage}
                highlightedMsgId={highlightedMsgId}
                chatScrollRef={chatScrollRef}
                myUserId={myUserId}
                copiedMsgId={copiedMsgId}
                handleCopyMessage={handleCopyMessage}
                setReplyingTo={setReplyingTo}
                replyingTo={replyingTo}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendChatMessage={handleSendChatMessage}
                handleSendReactionToMessage={handleSendReactionToMessage}
                onOpenImageLightbox={(url) => setImageLightboxUrl(url)}
                onClose={() => setActiveSidebar(null)}
                callTypingUsers={callTypingUsers}
                handleEmitCallTyping={handleEmitCallTyping}
                isChatDisabled={!isHost && hostSettings.allowChat === false}
              />
            </div>
          )}

          {/* Fullscreen Floating Controls Dock */}
          <div className={`absolute bottom-6 left-0 right-0 px-4 flex justify-center pointer-events-none z-40 transition-all duration-300 ${
            hudVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}>
            <div className="pointer-events-auto">
              <CallControls
                isFloating={true}
                isFullscreen={true}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                isScreenSharing={isScreenSharing}
                isHandRaised={isHandRaised}
                raisedHandsCount={raisedHandsCount}
                onToggleMute={onToggleMute}
                onToggleVideo={onToggleVideo}
                onToggleScreenShare={onToggleScreenShare}
                onToggleHand={onToggleHand}
                onEndCall={onEndCall}
                onSendReaction={handleSendReaction}
                activeSidebar={activeSidebar}
                onToggleSidebar={(sb) => setActiveSidebar(activeSidebar === sb ? null : sb)}
                unreadChatCount={unreadCount}
                participantCount={totalStreamsCount}
                roomTitle={roomTitle}
                roomCode={room}
                onOpenSettings={() => setShowSettingsModal(true)}
                onToggleFullscreen={toggleFullscreen}
                audioInputDevices={audioInputDevices}
                videoDevices={videoDevices}
                selectedAudioInput={selectedAudioInput}
                setSelectedAudioInput={setSelectedAudioInput}
                selectedVideo={selectedVideo}
                setSelectedVideo={setSelectedVideo}
                isHost={isHost}
                hostSettings={hostSettings}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Normal Mode: Video Stage + Right Sidebar Drawer + Bottom Control Bar */
        <div className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden w-full h-full bg-[#18181b]">
          
          {/* TOP STAGE & SIDEBARS ROW */}
          <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden w-full">
            
            {/* VIDEO STAGE AREA */}
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative p-3 flex flex-col justify-center">
              {anyoneScreenSharing ? (
                /* SCREEN SHARING VIEW */
                <div className="flex flex-col h-full w-full gap-3 overflow-hidden min-h-0">
                  {/* Hero Presentation */}
                  <div
                    onDoubleClick={toggleFullscreen}
                    className="relative flex-1 w-full h-full bg-black overflow-hidden flex items-center justify-center select-none border border-blue-500/30 rounded-2xl shadow-2xl"
                  >
                    <VideoStream
                      stream={activeSharedStream}
                      muted={true}
                      className={`w-full h-full pointer-events-none transition-all duration-200 ${
                        screenFitMode === "cover" ? "object-cover" : "object-contain"
                      }`}
                    />
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-2 shadow-lg z-20">
                      <Monitor className="w-3.5 h-3.5 text-blue-400" />
                      <span>{isSelfPresenter ? "Your Screen (Live 1080p)" : `@${remotePresenterData?.userName || "Participant"}'s Screen`}</span>
                    </div>
                  </div>

                  {/* Filmstrip */}
                  <div className="h-28 md:h-32 flex gap-3 overflow-x-auto pb-1 items-center shrink-0">
                    <div className={`relative w-40 md:w-48 h-full bg-zinc-900 border-2 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center transition-all ${
                      activeSpeaker === currentUserId ? "border-blue-400 shadow-blue-500/20" : "border-white/10"
                    }`}>
                      {/* Top-left Hand Raised Badge on Self Filmstrip */}
                      {isHandRaised && (
                        <div className="absolute top-2 left-2 bg-[#1a73e8] text-white py-0.5 px-1.5 rounded-full shadow-md flex items-center gap-1 z-20 border border-white/20" title={`Raised hand (#${selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1})`}>
                          <GoogleMeetHandIcon className="w-3 h-3 text-white shrink-0" isRaised={true} />
                          <span className="text-[10px] font-black text-white leading-none">
                            {selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1}
                          </span>
                        </div>
                      )}

                      {isVideoOff ? (
                        <div className="text-center space-y-1">
                          <CallParticipantAvatar avatar={myDisplayAvatar} name={myDisplayName} size="sm" className="mx-auto" />
                          <p className="text-[10px] text-zinc-400 mt-0.5">Camera Off</p>
                        </div>
                      ) : (
                        <VideoStream
                          stream={localStream}
                          muted={true}
                          className="w-full h-full object-cover"
                          mirror={true}
                          style={{ filter: filterStyleMap[videoFilter || "none"] }}
                        />
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                        <span>You</span>
                        {isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                        {isHandRaised && <span className="text-amber-400 text-xs font-bold animate-bounce">✋ {selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1}</span>}
                      </div>
                    </div>

                    {peerList.map(([socketId, peerData]) => {
                      const isSpeaker = activeSpeaker === peerData.userId;
                      const pAvatar = peerData.profilePicture || callerAvatar;
                      const peerQ = getPeerHandQueueIndex(peerData.userId, socketId) || 1;
                      return (
                        <div
                          key={`thumb-${socketId}`}
                          className={`relative w-40 md:w-48 h-full bg-zinc-900 border-2 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center transition-all ${
                            isSpeaker ? "border-blue-400 shadow-blue-500/20" : "border-white/10"
                          }`}
                        >
                          {/* Top-left Hand Raised Badge on Peer Filmstrip */}
                          {peerData.handRaised && (
                            <div className="absolute top-2 left-2 bg-[#1a73e8] text-white py-0.5 px-1.5 rounded-full shadow-md flex items-center gap-1 z-20 border border-white/20" title={`Raised hand (#${peerQ})`}>
                              <GoogleMeetHandIcon className="w-3 h-3 text-white shrink-0" isRaised={true} />
                              <span className="text-[10px] font-black text-white leading-none">{peerQ}</span>
                            </div>
                          )}

                          {peerData.videoOff ? (
                            <div className="text-center space-y-1">
                              <CallParticipantAvatar avatar={pAvatar} name={peerData.userName} size="sm" className="mx-auto" />
                              <p className="text-[10px] text-zinc-400 mt-0.5">Camera Off</p>
                            </div>
                          ) : (
                            <VideoStream
                              stream={peerData.stream}
                              className="w-full h-full object-cover"
                              style={{ filter: filterStyleMap[peerData.videoFilter || "none"] }}
                            />
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                            <span>@{peerData.userName || "Participant"}</span>
                            {peerData.muted && <MicOff className="w-3 h-3 text-rose-400" />}
                            {peerData.handRaised && <span className="text-amber-400 text-xs font-bold animate-bounce">✋ {peerQ}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : layout === "spotlight" ? (
                /* SPOTLIGHT VIEW */
                <div className="flex flex-col md:flex-row h-full w-full gap-3 overflow-hidden">
                  <div className="relative flex-1 bg-zinc-950 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
                    {/* Top-left Hand Raised Badge on Spotlight Main View */}
                    {(effectiveSpotlightId === currentUserId ? isHandRaised : peerList.find(([, d]) => d.userId === effectiveSpotlightId)?.[1]?.handRaised) && (
                      <div className="absolute top-4 left-4 bg-[#1a73e8] text-white py-1.5 px-3 rounded-full shadow-xl flex items-center gap-1.5 animate-in zoom-in-75 duration-150 z-20 border border-white/20" title="Hand Raised">
                        <GoogleMeetHandIcon className="w-4.5 h-4.5 text-white shrink-0" isRaised={true} />
                        <span className="text-sm font-black text-white leading-none">
                          {effectiveSpotlightId === currentUserId
                            ? (selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1)
                            : (getPeerHandQueueIndex(effectiveSpotlightId, effectiveSpotlightId) || 1)}
                        </span>
                      </div>
                    )}

                    {effectiveSpotlightId === currentUserId ? (
                      isVideoOff ? (
                        <div className="text-center space-y-3">
                          <CallParticipantAvatar avatar={myDisplayAvatar} name={myDisplayName} size="xl" className="mx-auto" />
                          <p className="text-sm text-zinc-400 font-medium">Your Camera is Off</p>
                        </div>
                      ) : (
                        <VideoStream
                          stream={localStream}
                          muted={true}
                          className="w-full h-full object-cover"
                          mirror={true}
                          style={{ filter: filterStyleMap[videoFilter || "none"] }}
                        />
                      )
                    ) : (
                      (() => {
                        const spotlightPeer = peerList.find(([, d]) => d.userId === effectiveSpotlightId) || peerList[0];
                        if (!spotlightPeer) return null;
                        const [, data] = spotlightPeer;
                        const peerAvatar = data.profilePicture || callerAvatar || dp;
                        const pName = (data.userName && data.userName !== "Participant")
                          ? (data.userName.startsWith("@") ? data.userName : `@${data.userName}`)
                          : "Participant";
                        const hasActiveVideo = Boolean(
                          !data.videoOff &&
                          data.stream &&
                          data.stream.getVideoTracks &&
                          data.stream.getVideoTracks().length > 0 &&
                          data.stream.getVideoTracks()[0].enabled
                        );

                        return !hasActiveVideo ? (
                          <div className="text-center space-y-3">
                            <CallParticipantAvatar avatar={peerAvatar} name={pName} size="xl" className="mx-auto" />
                            <p className="text-sm text-zinc-300 font-bold">{pName} (Camera Off)</p>
                          </div>
                        ) : (
                          <VideoStream
                            stream={data.stream}
                            className="w-full h-full object-cover"
                            style={{ filter: filterStyleMap[data.videoFilter || "none"] }}
                          />
                        );
                      })()
                    )}
                    <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2 border border-white/15 shadow-xl">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span>
                        {effectiveSpotlightId === currentUserId
                          ? "You (Spotlight)"
                          : `@${peerList.find(([, d]) => d.userId === effectiveSpotlightId)?.[1]?.userName || "Participant"} (Spotlight)`}
                      </span>
                    </div>
                  </div>

                  {/* Sidebar Thumbnails */}
                  <div className="w-full md:w-64 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0 pb-1">
                    {effectiveSpotlightId !== currentUserId && (
                      <div
                        onClick={() => setSpotlightTargetId(currentUserId)}
                        className="relative w-36 md:w-full h-24 md:h-36 bg-zinc-900 border border-white/10 hover:border-blue-400 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center cursor-pointer group transition-all"
                      >
                        {/* Top-left Hand Raised Badge on Self Thumbnail */}
                        {isHandRaised && (
                          <div className="absolute top-2 left-2 bg-[#1a73e8] text-white py-0.5 px-1.5 rounded-full shadow-md flex items-center gap-1 z-20 border border-white/20" title={`Raised hand (#${selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1})`}>
                            <GoogleMeetHandIcon className="w-3 h-3 text-white shrink-0" isRaised={true} />
                            <span className="text-[10px] font-black text-white leading-none">
                              {selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1}
                            </span>
                          </div>
                        )}

                        {isVideoOff ? (
                          <div className="flex flex-col items-center gap-1">
                            <CallParticipantAvatar avatar={myDisplayAvatar} name={myDisplayName} size="sm" />
                            <span className="text-[10px] font-bold text-zinc-400">You (Off)</span>
                          </div>
                        ) : (
                          <VideoStream
                            stream={localStream}
                            muted={true}
                            className="w-full h-full object-cover"
                            mirror={true}
                            style={{ filter: filterStyleMap[videoFilter || "none"] }}
                          />
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded-full text-[10px] font-bold text-white">You</div>
                      </div>
                    )}
                    {peerList.map(([socketId, peerData]) => {
                      if (peerData.userId === effectiveSpotlightId) return null;
                      const pAvatar = peerData.profilePicture || callerAvatar || dp;
                      const pName = (peerData.userName && peerData.userName !== "Participant")
                        ? (peerData.userName.startsWith("@") ? peerData.userName : `@${peerData.userName}`)
                        : "Participant";
                      const peerQ = getPeerHandQueueIndex(peerData.userId, socketId) || 1;
                      const hasActiveVideo = Boolean(
                        !peerData.videoOff &&
                        peerData.stream &&
                        peerData.stream.getVideoTracks &&
                        peerData.stream.getVideoTracks().length > 0 &&
                        peerData.stream.getVideoTracks()[0].enabled
                      );
                      return (
                        <div
                          key={`spotlight-thumb-${socketId}`}
                          onClick={() => setSpotlightTargetId(peerData.userId)}
                          className="relative w-36 md:w-full h-24 md:h-36 bg-zinc-900 border border-white/10 hover:border-blue-400 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center cursor-pointer group transition-all"
                        >
                          {/* Top-left Hand Raised Badge on Peer Thumbnail */}
                          {peerData.handRaised && (
                            <div className="absolute top-2 left-2 bg-[#1a73e8] text-white py-0.5 px-1.5 rounded-full shadow-md flex items-center gap-1 z-20 border border-white/20" title={`Raised hand (#${peerQ})`}>
                              <GoogleMeetHandIcon className="w-3 h-3 text-white shrink-0" isRaised={true} />
                              <span className="text-[10px] font-black text-white leading-none">{peerQ}</span>
                            </div>
                          )}

                          {!hasActiveVideo ? (
                            <div className="flex flex-col items-center gap-1">
                              <CallParticipantAvatar avatar={pAvatar} name={pName} size="sm" />
                              <span className="text-[10px] font-bold text-zinc-400">{pName}</span>
                            </div>
                          ) : (
                            <VideoStream
                              stream={peerData.stream}
                              className="w-full h-full object-cover"
                              style={{ filter: filterStyleMap[peerData.videoFilter || "none"] }}
                            />
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1">
                            <span>{pName}</span>
                            {peerData.muted && <MicOff className="w-3 h-3 text-rose-400" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* GRID VIEW */
                <div className={`h-full w-full grid gap-3.5 transition-all duration-300 ${
                  totalStreamsCount === 1 ? "grid-cols-1" : totalStreamsCount === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3"
                }`}>
                  <div className={`relative bg-[#28292a] border-2 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center transition-all ${
                    activeSpeaker === currentUserId ? "border-blue-400 shadow-xl shadow-blue-500/20" : "border-zinc-700/60"
                  }`}>
                    {/* Google Meet Top-Left Hand Raised Indicator with Queue Number on Self Box */}
                    {isHandRaised && (
                      <div
                        className="absolute top-3.5 left-3.5 bg-[#1a73e8] text-white py-1 px-2.5 rounded-full shadow-xl flex items-center gap-1.5 animate-in zoom-in-75 duration-150 z-20 border border-white/20"
                        title={`Raised hand (#${selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1})`}
                      >
                        <GoogleMeetHandIcon className="w-4 h-4 text-white shrink-0" isRaised={true} />
                        <span className="text-xs font-black text-white leading-none">
                          {selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1}
                        </span>
                      </div>
                    )}

                    {isVideoOff ? (
                      <div className="text-center space-y-2">
                        <CallParticipantAvatar avatar={myDisplayAvatar} name={myDisplayName} size="lg" className="mx-auto" />
                        <p className="text-xs text-zinc-400 font-medium">{myDisplayName}</p>
                      </div>
                    ) : (
                      <VideoStream stream={localStream} muted={true} className="w-full h-full object-cover" mirror={true} style={{ filter: filterStyleMap[videoFilter || "none"] }} />
                    )}
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/15">
                      <span>{myDisplayName} {isMuted && "(Muted)"}</span>
                      {isHandRaised && <span className="text-amber-400 text-xs font-bold flex items-center gap-1 animate-bounce">✋ {selfHandQueueIndex !== -1 ? selfHandQueueIndex + 1 : 1}</span>}
                      {videoFilter !== "none" && <span className="text-xs text-pink-400">✨ {videoFilter}</span>}
                    </div>
                  </div>

                  {peerList.length === 0 && callerName && (
                    <div className="relative bg-[#28292a] border-2 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border-zinc-700/60 transition-all">
                      <div className="text-center space-y-2">
                        <CallParticipantAvatar
                          avatar={callerAvatar || dp}
                          name={callerName}
                          size="lg"
                          className="mx-auto animate-pulse"
                        />
                        <p className="text-xs text-zinc-300 font-bold">
                          {callerName.startsWith("@") ? callerName : `@${callerName}`}
                        </p>
                        <p className="text-[10px] text-blue-400 font-medium animate-pulse">
                          Connecting to call...
                        </p>
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/15">
                        <span>{callerName.startsWith("@") ? callerName : `@${callerName}`}</span>
                      </div>
                    </div>
                  )}

                  {peerList.map(([socketId, peerData]) => {
                    const isSpeaker = activeSpeaker === peerData.userId;
                    const pAvatar = peerData.profilePicture || callerAvatar || dp;
                    const pName = (peerData.userName && peerData.userName !== "Participant")
                      ? (peerData.userName.startsWith("@") ? peerData.userName : `@${peerData.userName}`)
                      : (callerName ? (callerName.startsWith("@") ? callerName : `@${callerName}`) : "Participant");
                    const peerQ = getPeerHandQueueIndex(peerData.userId, socketId) || 1;
                    const hasActiveVideo = Boolean(
                      !peerData.videoOff &&
                      peerData.stream &&
                      peerData.stream.getVideoTracks &&
                      peerData.stream.getVideoTracks().length > 0 &&
                      peerData.stream.getVideoTracks()[0].enabled
                    );

                    return (
                      <div
                        key={socketId}
                        className={`relative bg-[#28292a] border-2 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center transition-all ${
                          isSpeaker ? "border-blue-400 shadow-xl shadow-blue-500/20" : "border-zinc-700/60"
                        }`}
                      >
                        {/* Google Meet Top-Left Hand Raised Indicator with Queue Number on Peer Box */}
                        {peerData.handRaised && (
                          <div
                            className="absolute top-3.5 left-3.5 bg-[#1a73e8] text-white py-1 px-2.5 rounded-full shadow-xl flex items-center gap-1.5 animate-in zoom-in-75 duration-150 z-20 border border-white/20"
                            title={`Raised hand (#${peerQ})`}
                          >
                            <GoogleMeetHandIcon className="w-4.5 h-4.5 text-white shrink-0" isRaised={true} />
                            <span className="text-xs font-black text-white leading-none">
                              {peerQ}
                            </span>
                          </div>
                        )}

                        {!hasActiveVideo ? (
                          <div className="text-center space-y-2">
                            <CallParticipantAvatar avatar={pAvatar} name={pName} size="lg" className="mx-auto" />
                            <p className="text-xs text-zinc-300 font-bold">{pName}</p>
                          </div>
                        ) : (
                          <VideoStream stream={peerData.stream} className="w-full h-full object-cover" style={{ filter: filterStyleMap[peerData.videoFilter || "none"] }} />
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/15">
                          <span>{pName}</span>
                          {peerData.muted && <MicOff className="w-3 h-3 text-rose-400" />}
                          {peerData.handRaised && <span className="text-amber-400 text-xs font-bold flex items-center gap-1 animate-bounce">✋ {peerQ}</span>}
                          {peerData.videoFilter && peerData.videoFilter !== "none" && <span className="text-xs text-pink-400">✨ {peerData.videoFilter}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: GOOGLE MEET SIDEBARS (Chat, 9-Dot Activities, People, Info) */}
            {activeSidebar && (
              <div className="w-80 sm:w-88 md:w-96 h-full bg-[#1e1f20] border-l border-zinc-700/80 flex flex-col justify-between shadow-2xl z-40 shrink-0 animate-in slide-in-from-right duration-200">
                {activeSidebar === "chat" && (
                  <div className="flex flex-col h-full justify-between p-3.5">
                    <ChatDrawerContent
                      chatMessages={chatMessages}
                      filteredChatMessages={filteredChatMessages}
                      chatSearchQuery={chatSearchQuery}
                      setChatSearchQuery={setChatSearchQuery}
                      pinnedMessage={pinnedMessage}
                      handleTogglePinMessage={handleTogglePinMessage}
                      handleJumpToMessage={handleJumpToMessage}
                      highlightedMsgId={highlightedMsgId}
                      chatScrollRef={chatScrollRef}
                      myUserId={myUserId}
                      copiedMsgId={copiedMsgId}
                      handleCopyMessage={handleCopyMessage}
                      setReplyingTo={setReplyingTo}
                      replyingTo={replyingTo}
                      chatInput={chatInput}
                      setChatInput={setChatInput}
                      handleSendChatMessage={handleSendChatMessage}
                      handleSendReactionToMessage={handleSendReactionToMessage}
                      onOpenImageLightbox={(url) => setImageLightboxUrl(url)}
                      onClose={() => setActiveSidebar(null)}
                      callTypingUsers={callTypingUsers}
                      handleEmitCallTyping={handleEmitCallTyping}
                      isChatDisabled={!isHost && hostSettings.allowChat === false}
                    />
                  </div>
                )}

                {activeSidebar === "activities" && (
                  <CallActivitiesDrawer
                    isOpen={true}
                    onClose={() => setActiveSidebar(null)}
                    isHost={isHost}
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                    onToggleRecording={isRecording ? handleStopRecording : handleStartRecording}
                    videoFilter={videoFilter}
                    onChangeVideoFilter={changeVideoFilter}
                    onMuteAll={handleMuteAll}
                    hostSettings={hostSettings}
                    onUpdateHostSettings={handleUpdateHostSettings}
                    myUserName={myDisplayName}
                    socket={getSocket()}
                    room={room}
                  />
                )}

                {activeSidebar === "people" && (
                  <CallPeopleSidebar
                    isOpen={true}
                    onClose={() => setActiveSidebar(null)}
                    myUserId={myUserId}
                    myUserName={myDisplayName}
                    myAvatar={myDisplayAvatar}
                    callerName={callerName}
                    callerAvatar={callerAvatar}
                    peers={peers}
                    isHost={isHost}
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                    isHandRaised={isHandRaised}
                    raisedHandsList={raisedHandsList}
                    onLowerHand={onToggleHand}
                    onLowerAllHands={handleLowerAllHands}
                    onLowerUserHand={handleLowerUserHand}
                    onMuteAll={handleMuteAll}
                    roomCode={room}
                  />
                )}

                {activeSidebar === "info" && (
                  <CallInfoSidebar
                    isOpen={true}
                    onClose={() => setActiveSidebar(null)}
                    roomTitle={roomTitle}
                    room={room}
                  />
                )}
              </div>
            )}
          </div>

          {/* BOTTOM CONTROLS BAR (Always Anchored at Bottom, Google Meet Standard) */}
          <div className="w-full shrink-0 z-50">
            <CallControls
              isFloating={false}
              isFullscreen={false}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              isHandRaised={isHandRaised}
              raisedHandsCount={raisedHandsCount}
              onToggleMute={onToggleMute}
              onToggleVideo={onToggleVideo}
              onToggleScreenShare={onToggleScreenShare}
              onToggleHand={onToggleHand}
              onEndCall={onEndCall}
              onSendReaction={handleSendReaction}
              activeSidebar={activeSidebar}
              onToggleSidebar={(sb) => setActiveSidebar(activeSidebar === sb ? null : sb)}
              unreadChatCount={unreadCount}
              participantCount={totalStreamsCount}
              roomTitle={roomTitle}
              roomCode={room}
              onOpenSettings={() => setShowSettingsModal(true)}
              onToggleFullscreen={toggleFullscreen}
              audioInputDevices={audioInputDevices}
              videoDevices={videoDevices}
              selectedAudioInput={selectedAudioInput}
              setSelectedAudioInput={setSelectedAudioInput}
              selectedVideo={selectedVideo}
              setSelectedVideo={setSelectedVideo}
              isHost={isHost}
              hostSettings={hostSettings}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Reusable Chat Drawer Content Component (Clean & Feature-Rich)
 */
const ChatDrawerContent = ({
  chatMessages,
  filteredChatMessages,
  chatSearchQuery,
  setChatSearchQuery,
  pinnedMessage,
  handleTogglePinMessage,
  handleJumpToMessage,
  highlightedMsgId,
  chatScrollRef,
  myUserId,
  chatInput,
  setChatInput,
  handleSendChatMessage,
  handleSendReactionToMessage,
  onOpenImageLightbox,
  onClose,
  handleEmitCallTyping,
  isChatDisabled = false,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 25MB max size limit for in-call dataUrl transfers
    if (file.size > 25 * 1024 * 1024) {
      snackbar.error("File is too large. Maximum file size is 25MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setPendingFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: loadEvt.target.result,
        ext: file.name.split(".").pop()?.toLowerCase() || "",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    if (handleEmitCallTyping) handleEmitCallTyping(false);
    if (!chatInput.trim() && !pendingFile) return;
    handleSendChatMessage(chatInput, pendingFile);
    setPendingFile(null);
    setShowEmojiPicker(false);
  };

  return (
    <div className="relative flex flex-col h-full justify-between overflow-hidden">
      {/* Top Header Bar: Title, Search Toggle & Close */}
      <div className="p-1 pb-2 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        {showSearch ? (
          <div className="flex items-center gap-1.5 w-full bg-white/[0.06] border border-white/15 rounded-xl px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search in call chat..."
              className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-500"
            />
            {chatSearchQuery && (
              <button
                onClick={() => setChatSearchQuery("")}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                setShowSearch(false);
                setChatSearchQuery("");
              }}
              className="text-[10px] font-bold text-purple-400 hover:text-purple-300 ml-1"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm tracking-wide">In-Call Chat</h3>
              <span className="bg-purple-600/30 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                {chatMessages.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(true)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Search Messages"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Close Chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Pinned Message Sticky Banner */}
      {pinnedMessage && (
        <div
          onClick={() => handleJumpToMessage(pinnedMessage.id)}
          className="my-1.5 p-2 bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border border-purple-500/40 rounded-2xl flex items-center justify-between gap-2 shadow-lg shadow-purple-900/30 cursor-pointer hover:border-purple-400 transition shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 bg-purple-600/30 rounded-lg text-purple-400 shrink-0">
              <Pin className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                Pinned Message
              </p>
              <p className="text-xs text-white font-medium truncate">
                {pinnedMessage.text || (pinnedMessage.file?.name ? `📎 ${pinnedMessage.file.name}` : "Media")}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePinMessage(pinnedMessage.id, true);
            }}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition shrink-0"
            title="Unpin Message"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 hide-scrollbar"
      >
        {filteredChatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500">
            <Smile className="w-8 h-8 mb-2 opacity-40 text-purple-400" />
            <p className="text-xs font-semibold text-zinc-400">No messages yet</p>
            <p className="text-[11px] mt-1 text-zinc-500">
              {chatSearchQuery
                ? "No matching messages found for your search."
                : "Say hello or drop a file to everyone in the meeting!"}
            </p>
          </div>
        ) : (
          filteredChatMessages.map((m) => {
            const isMe = m.from === myUserId;
            const isHighlighted = highlightedMsgId === m.id;

            return (
              <div
                key={m.id}
                id={`call-msg-${m.id}`}
                className={`flex flex-col group relative ${
                  isMe ? "items-end" : "items-start"
                } ${isHighlighted ? "animate-pulse ring-2 ring-purple-500 rounded-2xl p-1" : ""}`}
              >
                {/* Sender Name */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {m.senderAvatar ? (
                      <img src={m.senderAvatar} className="w-4 h-4 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-purple-600/50 flex items-center justify-center text-[9px] font-bold text-white">
                        {m.sender?.[0]?.toUpperCase() || "P"}
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-zinc-400">
                      {m.sender}
                    </span>
                    {m.pinned && (
                      <Pin className="w-2.5 h-2.5 text-purple-400 fill-purple-400" />
                    )}
                  </div>
                )}

                {/* Message Bubble Body */}
                <div
                  className={`relative max-w-[88%] p-2.5 rounded-2xl text-xs backdrop-blur-md shadow-md transition ${
                    isMe
                      ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-xs"
                      : "bg-white/[0.08] text-white border border-white/10 rounded-bl-xs"
                  }`}
                >
                  {/* Quoted Reply */}
                  {m.replyTo && (
                    <div className="mb-1.5 p-1 px-2 rounded-lg bg-black/25 border-l-2 border-purple-400 text-[10px] text-zinc-300">
                      <span className="font-bold text-purple-300 block">{m.replyTo.sender}</span>
                      <span className="truncate block opacity-80">{m.replyTo.text}</span>
                    </div>
                  )}

                  {/* Text Content */}
                  {m.text && (
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs break-words shadow-sm leading-relaxed ${
                        isMe
                          ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-br-xs font-medium"
                          : "bg-[#28292a] text-zinc-100 rounded-bl-xs border border-zinc-700/60 font-normal"
                      }`}
                    >
                      {renderRichMessageText(m.text)}
                    </div>
                  )}

                  {/* File / Media Preview */}
                  {m.file && (
                    <div className="mt-1.5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-md">
                      {m.file.type?.startsWith("image/") ? (
                        <img
                          src={m.file.dataUrl}
                          alt={m.file.name}
                          onClick={() => onOpenImageLightbox?.(m.file.dataUrl)}
                          className="max-h-48 w-full object-cover cursor-pointer hover:opacity-95 transition"
                        />
                      ) : m.file.type?.startsWith("video/") ? (
                        <video src={m.file.dataUrl} controls className="max-h-48 w-full object-cover" />
                      ) : (
                        <div className="p-3 flex items-center justify-between gap-3 bg-zinc-900/90">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {getFileIcon(m.file)}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate max-w-[160px]">{m.file.name}</p>
                              <p className="text-[10px] text-zinc-400">{formatFileSize(m.file.size)}</p>
                            </div>
                          </div>
                          <a
                            href={m.file.dataUrl}
                            download={m.file.name}
                            className="p-2 hover:bg-white/10 rounded-xl text-blue-400 hover:text-blue-300 transition shrink-0 cursor-pointer"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reaction Pill Counters */}
                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(m.reactions).map(([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={() => handleSendReactionToMessage(m.id, emoji)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] transition ${
                            users.includes(myUserId) ? "bg-purple-600/30 border border-purple-500/50" : "bg-white/[0.06]"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-zinc-300">{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending Attachment Preview Chip */}
      {pendingFile && (
        <div className="mx-2 mb-2 p-2 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="truncate">{pendingFile.name}</span>
          </div>
          <button
            onClick={() => setPendingFile(null)}
            className="p-1 hover:bg-white/10 text-zinc-400 hover:text-white rounded-md cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50">
           <div className="grid grid-cols-6 gap-2 bg-[#161d2d] p-3 rounded-2xl border border-white/10 shadow-2xl">
             {["😀", "😂", "🥰", "😎", "🤔", "👍", "🔥", "✨", "🙌", "🎉", "❤️", "👋"].map(emoji => (
               <button key={emoji} onClick={() => { setChatInput(prev => prev + emoji); setShowEmojiPicker(false); }} className="hover:scale-125 transition text-lg">{emoji}</button>
             ))}
           </div>
        </div>
      )}

      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*,.pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.zip"
        className="hidden"
      />

      {/* Input Form with File Attachment, Inside Emoji Button & Send Button */}
      <form onSubmit={onFormSubmit} className="flex gap-1.5 items-center shrink-0 p-2">
        {/* Attachment Button */}
        <button
          type="button"
          disabled={isChatDisabled}
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 bg-white/[0.06] hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-zinc-300 hover:text-white rounded-2xl transition cursor-pointer shrink-0"
          title={isChatDisabled ? "Chat disabled by host" : "Attach media or document"}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Integrated Input Pill: Inside Emoji Button + Text Input */}
        <div className="flex-1 flex items-center bg-white/[0.06] border border-white/15 focus-within:border-purple-500 rounded-2xl px-2 py-1 gap-1.5 transition">
          {/* Emoji Button INSIDE Input */}
          <button
            type="button"
            disabled={isChatDisabled}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-1.5 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
              showEmojiPicker
                ? "text-purple-400 bg-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
            title={isChatDisabled ? "Chat disabled" : "Insert Emoji"}
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            disabled={isChatDisabled}
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              if (handleEmitCallTyping) {
                handleEmitCallTyping(e.target.value.trim().length > 0);
              }
            }}
            placeholder={isChatDisabled ? "Chat is disabled by the host 🔒" : "Type a message..."}
            className="flex-1 min-w-0 bg-transparent text-white text-xs py-1.5 outline-none placeholder:text-zinc-500 selection:bg-purple-500 selection:text-white disabled:cursor-not-allowed disabled:placeholder:text-zinc-600"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isChatDisabled || (!chatInput.trim() && !pendingFile)}
          className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-md shadow-purple-600/30 flex items-center justify-center shrink-0"
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default CallScreen;

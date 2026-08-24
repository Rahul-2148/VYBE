import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  Minimize2,
  MicOff,
  Monitor,
  Users,
  MessageSquare,
  Shield,
  Sparkles,
  X,
  StopCircle,
  Volume2,
  Pin,
  Settings,
  Hand,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Send,
  Smile,
  Paperclip,
  Download,
  FileText,
  FileSpreadsheet,
  FileVideo,
  Image as ImageIcon,
  File,
  Radio,
  Play,
  Circle,
  Shapes,
} from "lucide-react";
import MeetControls, { GoogleMeetHandIcon } from "./MeetControls";
import MeetingSettingsModal from "../MeetingSettingsModal";
import EmojiPickerPopover from "../EmojiPickerPopover";
import CallReactionStream from "../CallReactionStream";
import CallActivitiesDrawer from "../CallActivitiesDrawer";
import CallPeopleSidebar from "../CallPeopleSidebar";
import CallInfoSidebar from "../CallInfoSidebar";
import { getSocket } from "../../lib/socket";
import { snackbar } from "../../lib/snackbar";
import dp from "../../assets/dp3.png";
import { filterStyleMap } from "../../constants/callFilters";
import { triggerHaptic } from "../../lib/interactiveEffects";

/**
 * High-Performance Memoized Video Stream
 */
const VideoStream = React.memo(({ stream, muted = false, className = "", style = {}, mirror = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
      if (stream) {
        el.play().catch(() => {});
      }
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
  onToggleScreenShare,
  onToggleHand,
  onChangeVideoFilter,
  onEndCall,
}) => {
  const { userData } = useSelector((s) => s.user || {});
  const currentUserId = userData?.user?._id || userData?._id;
  const currentUserName = userData?.user?.userName || userData?.userName || "You";
  const currentUserAvatar =
    userData?.user?.profileImage?.url ||
    (typeof userData?.user?.profileImage === "string" ? userData.user.profileImage : "") ||
    dp;

  const [activeSidebar, setActiveSidebar] = useState(null); // 'chat' | 'people' | 'info' | 'activities' | null
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pinnedTile, setPinnedTile] = useState(null); // socketId | 'me' | 'screen' | null
  const [messages, setMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [reactionsList, setReactionsList] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const chatScrollRef = useRef(null);

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

  // Listen to Meeting Chat and Reactions via Socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !meetingId) return;

    const handleChatReceived = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (activeSidebar !== "chat") {
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    const handleReactionReceived = ({ emoji, senderName }) => {
      const id = `${Date.now()}_${Math.random()}`;
      setReactionsList((prev) => [...prev, { id, emoji, senderName }]);
      setTimeout(() => {
        setReactionsList((prev) => prev.filter((r) => r.id !== id));
      }, 3500);
    };

    socket.on("meeting:chat-message-received", handleChatReceived);
    socket.on("meeting:reaction-received", handleReactionReceived);

    return () => {
      socket.off("meeting:chat-message-received", handleChatReceived);
      socket.off("meeting:reaction-received", handleReactionReceived);
    };
  }, [meetingId, activeSidebar]);

  // Send In-Meeting Chat
  const handleSendChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const socket = getSocket();
    const msgObj = {
      meetingId,
      id: Date.now().toString(),
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: chatInput.trim(),
      time: new Date().toISOString(),
    };

    socket?.emit("meeting:chat-message", msgObj);
    setMessages((prev) => [...prev, { ...msgObj, from: currentUserId || "me" }]);
    setChatInput("");
    triggerHaptic("light");
  };

  // Send Floating Reaction
  const handleSendReaction = (emoji) => {
    const socket = getSocket();
    socket?.emit("meeting:reaction", {
      meetingId,
      emoji,
    });
    const id = `${Date.now()}_${Math.random()}`;
    setReactionsList((prev) => [...prev, { id, emoji, senderName: "You" }]);
    setTimeout(() => {
      setReactionsList((prev) => prev.filter((r) => r.id !== id));
    }, 3500);
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeSidebar]);

  // Peer entries
  const peerList = useMemo(() => Object.values(peers), [peers]);
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

  return (
    <div className="relative w-screen h-screen bg-[#202124] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
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

        <div className="flex items-center gap-3 text-xs font-medium text-zinc-300">
          <span className="hidden sm:inline font-mono">{currentTime}</span>
          <div className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1 rounded-full border border-zinc-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{totalParticipants} {totalParticipants === 1 ? "person" : "people"}</span>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT WORKSPACE ================= */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* VIDEO TILES AREA */}
        <div className="relative flex-1 w-full h-full p-2.5 sm:p-4 flex items-center justify-center overflow-hidden">
          {/* SCREEN SHARE PRESENTATION VIEW (If active) */}
          {screenStream || peerList.some((p) => p.screenSharing && p.screenStream) ? (
            <div className="w-full h-full flex flex-col md:flex-row gap-3">
              {/* Central Large Screen View */}
              <div className="relative flex-1 h-full bg-[#121212] rounded-3xl overflow-hidden border border-zinc-700 flex items-center justify-center shadow-2xl">
                {screenStream ? (
                  <VideoStream stream={screenStream} className="w-full h-full object-contain" />
                ) : (
                  peerList
                    .filter((p) => p.screenSharing && p.screenStream)
                    .map((p) => (
                      <VideoStream
                        key={`screen_${p.socketId}`}
                        stream={p.screenStream}
                        className="w-full h-full object-contain"
                      />
                    ))
                )}
                <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-700 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <span>{screenStream ? "You are presenting" : "Screen Presentation"}</span>
                </div>
              </div>

              {/* Side Participant Filmstrip */}
              <div className="w-full md:w-64 h-32 md:h-full flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto shrink-0 hide-scrollbar">
                {/* Local Tile */}
                <div className="relative w-44 md:w-full h-full md:h-36 bg-[#2d2e30] rounded-2xl overflow-hidden border border-zinc-700 shrink-0 flex items-center justify-center">
                  {!isVideoOff && localStream ? (
                    <VideoStream stream={localStream} mirror={true} className="w-full h-full object-cover" />
                  ) : (
                    <ParticipantAvatar avatar={currentUserAvatar} name={currentUserName} size="md" />
                  )}
                  <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded-md text-white font-medium truncate max-w-[120px]">
                    You {isMuted ? "(Muted)" : ""}
                  </span>
                </div>

                {/* Remote Peers Filmstrip */}
                {peerList.map((peer) => (
                  <div
                    key={peer.socketId}
                    className="relative w-44 md:w-full h-full md:h-36 bg-[#2d2e30] rounded-2xl overflow-hidden border border-zinc-700 shrink-0 flex items-center justify-center"
                  >
                    {!peer.videoOff && peer.stream ? (
                      <VideoStream stream={peer.stream} className="w-full h-full object-cover" />
                    ) : (
                      <ParticipantAvatar avatar={peer.profilePicture} name={peer.userName} size="md" />
                    )}
                    <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded-md text-white font-medium truncate max-w-[120px]">
                      @{peer.userName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STANDARD PARTICIPANT GRID VIEW */
            <div className={`w-full h-full grid gap-3.5 mx-auto items-center justify-center p-1 ${getGridColsClass()}`}>
              {/* Local User Tile */}
              <div
                className={`relative w-full h-full min-h-[160px] md:min-h-[220px] bg-[#2d2e30] rounded-3xl overflow-hidden border transition-all duration-200 flex items-center justify-center shadow-xl group ${
                  activeSpeaker === (currentUserId || "me")
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

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-semibold text-white">
                  <span>You</span>
                  {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </div>

              {/* Remote Participants Tiles */}
              {peerList.map((peer) => (
                <div
                  key={peer.socketId}
                  className={`relative w-full h-full min-h-[160px] md:min-h-[220px] bg-[#2d2e30] rounded-3xl overflow-hidden border transition-all duration-200 flex items-center justify-center shadow-xl group ${
                    activeSpeaker === peer.userId
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

                  {/* Bottom Overlay Label */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-semibold text-white">
                    <span>@{peer.userName}</span>
                    {peer.muted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= RIGHT SIDEBARS ================= */}
        {/* 1. In-Meeting Chat Drawer */}
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
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-zinc-700 flex items-center gap-2 bg-[#28292a]">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a message to everyone"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500"
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

        {/* 2. People Drawer */}
        {activeSidebar === "people" && (
          <div className="w-full sm:w-80 md:w-96 h-full z-40 shrink-0 animate-in slide-in-from-right duration-200">
            <CallPeopleSidebar
              isOpen={true}
              onClose={() => setActiveSidebar(null)}
              peers={peers}
              currentUserId={currentUserId}
              isHost={isHost}
              room={meetingId}
            />
          </div>
        )}

        {/* 3. Meeting Info Drawer */}
        {activeSidebar === "info" && (
          <div className="w-full sm:w-80 md:w-96 h-full z-40 shrink-0 animate-in slide-in-from-right duration-200">
            <CallInfoSidebar
              isOpen={true}
              onClose={() => setActiveSidebar(null)}
            />
          </div>
        )}

        {/* 4. Activities Drawer (Polls, Whiteboard, Breakouts) */}
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
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
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

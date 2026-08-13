import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, MicOff, Users, MessageSquare, Shield, Sparkles, X } from "lucide-react";
import CallControls from "./CallControls";
import { getSocket } from "../lib/socket";
import toast from "../lib/toast";

export const CallScreen = ({
  localStream,
  peers,
  isMuted,
  isVideoOff,
  isScreenSharing,
  isHandRaised,
  activeSpeaker,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onEndCall,
  audioInputDevices,
  videoDevices,
  audioOutputDevices,
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
  isHost,
  onMuteAll,
  videoFilter,
  changeVideoFilter,
}) => {
  const [layout, setLayout] = useState("grid"); // 'grid' or 'spotlight'
  const [isMinimized, setIsMinimized] = useState(false);
  const [floatingPos, setFloatingPos] = useState({ x: 20, y: 80 });
  const [reactionEvents, setReactionEvents] = useState([]);
  const [showCallChat, setShowCallChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef(null);

  const [callDuration, setCallDuration] = useState(0);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    const hasActivePeers = Object.keys(peers).length > 0;
    if (!hasActivePeers) {
      setCallDuration(0);
      return;
    }

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [peers]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const filterStyleMap = {
    none: "",
    grayscale: "grayscale(1)",
    sepia: "sepia(1)",
    invert: "invert(1)",
    contrast: "contrast(1.5) saturate(1.2)",
    warm: "sepia(0.3) saturate(1.4) contrast(1.1)",
    cool: "hue-rotate(30deg) saturate(1.2) contrast(1.1)",
    blur: "blur(4px)",
  };

  // Watch Party / Co-watching state
  const [isWatchPartyActive, setIsWatchPartyActive] = useState(false);
  const [watchPartyUrl, setWatchPartyUrl] = useState("");
  const [isWatchPartyHost, setIsWatchPartyHost] = useState(false);
  const [showWatchPartyInput, setShowWatchPartyInput] = useState(false);
  const [watchPartyInputUrl, setWatchPartyInputUrl] = useState("");
  const watchPartyVideoRef = useRef(null);
  const isSyncingRef = useRef(false); // Prevents infinite loops of sync events

  // Listen for incoming chat messages via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleChatMessage = ({ from, text, time }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: from === currentUserId ? "You" : `@${from.slice(-4)}`,
          text,
          time: new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    };

    socket.on("call:chat-message-received", handleChatMessage);
    return () => socket.off("call:chat-message-received", handleChatMessage);
  }, [currentUserId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Listen for Watch Party socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleStarted = ({ videoUrl, startedBy }) => {
      if (startedBy !== currentUserId) {
        setIsWatchPartyActive(true);
        setWatchPartyUrl(videoUrl);
        setIsWatchPartyHost(false);
        toast.success("Watch Party started by other participant!");
      }
    };

    const handleStopped = ({ stoppedBy }) => {
      if (stoppedBy !== currentUserId) {
        setIsWatchPartyActive(false);
        setWatchPartyUrl("");
        setIsWatchPartyHost(false);
        toast.error("Watch Party stopped by other participant");
      }
    };

    const handleSynced = ({ action, currentTime, playing, senderId }) => {
      if (senderId === currentUserId) return;
      const video = watchPartyVideoRef.current;
      if (!video) return;

      isSyncingRef.current = true;

      if (Math.abs(video.currentTime - currentTime) > 0.8) {
        video.currentTime = currentTime;
      }

      if (action === "play" && video.paused) {
        video.play().catch(() => null);
      } else if (action === "pause" && !video.paused) {
        video.pause();
      }

      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    };

    socket.on("call:watch-party-started", handleStarted);
    socket.on("call:watch-party-stopped", handleStopped);
    socket.on("call:watch-party-synced", handleSynced);

    return () => {
      socket.off("call:watch-party-started", handleStarted);
      socket.off("call:watch-party-stopped", handleStopped);
      socket.off("call:watch-party-synced", handleSynced);
    };
  }, [currentUserId]);

  const localVideoRef = useRef(null);
  const videoRefs = useRef({});

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff, isMinimized]);

  // Bind remote peer streams
  useEffect(() => {
    Object.keys(peers).forEach((socketId) => {
      const videoEl = videoRefs.current[socketId];
      const peerData = peers[socketId];
      if (videoEl && peerData?.stream) {
        videoEl.srcObject = peerData.stream;
      }
    });
  }, [peers, isMinimized]);

  const handleSendReaction = (emoji) => {
    const newReaction = {
      id: Math.random().toString(),
      emoji,
      left: Math.random() * 80 + 10,
    };
    setReactionEvents((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setReactionEvents((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 3000);
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();

    // Emit to server for relay to other participants
    const socket = getSocket();
    socket?.emit("call:chat-message", { room, text });

    // Add to local state immediately (optimistic)
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: "You",
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput("");
  };

  const handleStartWatchParty = (url) => {
    if (!url.trim()) return;
    const socket = getSocket();
    setIsWatchPartyActive(true);
    setWatchPartyUrl(url);
    setIsWatchPartyHost(true);
    setShowWatchPartyInput(false);

    socket?.emit("call:watch-party-start", { room, videoUrl: url });
    toast.success("Watch Party started!");
  };

  const handleStopWatchParty = () => {
    const socket = getSocket();
    setIsWatchPartyActive(false);
    setWatchPartyUrl("");
    setIsWatchPartyHost(false);

    socket?.emit("call:watch-party-stop", { room });
    toast.error("Watch Party stopped");
  };

  const handleVideoSyncEvent = (action) => {
    if (!isWatchPartyHost || isSyncingRef.current) return;
    const video = watchPartyVideoRef.current;
    if (!video) return;

    const socket = getSocket();
    socket?.emit("call:watch-party-sync", {
      room,
      action,
      currentTime: video.currentTime,
      playing: !video.paused,
    });
  };

  // Render Float widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[999] w-72 h-44 bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col justify-between">
        <div className="relative w-full h-full bg-black">
          {isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white font-bold text-sm">
              Camera Off
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute top-2 right-2 flex gap-1.5 z-50">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition"
              title="Expand Call"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onEndCall}
              className="p-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-white transition"
              title="End Call"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-semibold text-white">
            {roomTitle}
          </div>
        </div>
      </div>
    );
  }

  // Count active streams
  const peerList = Object.entries(peers);
  const totalStreamsCount = 1 + peerList.length;

  return (
    <div className="fixed inset-0 z-[800] bg-bg/95 backdrop-blur-2xl p-4 md:p-6 flex flex-col justify-between overflow-hidden">
      
      {/* Reaction Floating Layer */}
      <div className="absolute inset-0 pointer-events-none z-[850] overflow-hidden">
        <AnimatePresence>
          {reactionEvents.map((r) => (
            <motion.div
              key={r.id}
              initial={{ y: "100vh", opacity: 1, scale: 0.8 }}
              animate={{ y: "-10vh", opacity: 0, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              style={{ left: `${r.left}%` }}
              className="absolute text-4xl"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-text font-bold shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">{roomTitle}</h3>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Secure Connection • {totalStreamsCount} Active • {formatDuration(callDuration)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout switches */}
          <button
            onClick={() => setLayout(layout === "grid" ? "spotlight" : "grid")}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-text rounded-xl transition cursor-pointer"
          >
            {layout === "grid" ? "Spotlight View" : "Grid View"}
          </button>

          <button
            onClick={() => setShowCallChat(!showCallChat)}
            className={`p-2 rounded-xl transition border ${
              showCallChat ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-white"
            }`}
            title="Chat during call"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition cursor-pointer"
            title="Minimize to PIP"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Call View Area */}
      <div className="flex-1 flex gap-4 w-full h-[70vh] items-center justify-center relative overflow-hidden mb-4">
        
        {/* Watch Party Video Player Side */}
        {isWatchPartyActive && (
          <div className="flex-[2.5] h-full bg-black rounded-3xl overflow-hidden relative border border-white/10 flex flex-col justify-between shadow-2xl">
            <video
              ref={watchPartyVideoRef}
              src={watchPartyUrl}
              controls={true}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onPlay={() => handleVideoSyncEvent("play")}
              onPause={() => handleVideoSyncEvent("pause")}
              onSeeked={() => handleVideoSyncEvent("seek")}
            />
            {/* Watch Party Host Badge */}
            <div className="absolute top-4 left-4 bg-pink-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-lg">
              <Sparkles className="w-3.5 h-3.5" /> Watch Party {isWatchPartyHost ? "(Host)" : "(Syncing)"}
            </div>
            {isWatchPartyHost && (
              <button
                onClick={handleStopWatchParty}
                className="absolute top-4 right-4 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                End Session
              </button>
            )}
          </div>
        )}

        {/* Grid or Spotlight Layout */}
        <div className={`h-full grid gap-4 transition-all duration-300 ${
          isWatchPartyActive
            ? "flex-1 max-w-[280px] grid-cols-1 overflow-y-auto"
            : layout === "grid"
            ? totalStreamsCount === 1
              ? "flex-1 grid-cols-1"
              : totalStreamsCount === 2
              ? "flex-1 grid-cols-1 md:grid-cols-2"
              : "flex-1 grid-cols-2 md:grid-cols-3"
            : "flex-1 grid-cols-4 grid-rows-4"
        }`}>
          
          {/* Local Stream Render */}
          <div className={`relative bg-zinc-900 border-2 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center transition-all ${
            layout === "spotlight"
              ? activeSpeaker === currentUserId
                ? "col-span-4 row-span-3 border-emerald-500"
                : "col-span-1 row-span-1 border-white/10"
              : activeSpeaker === currentUserId
              ? "border-emerald-500"
              : "border-white/10"
          }`}>
            {isVideoOff ? (
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto flex items-center justify-center border border-zinc-700">
                  <span className="text-lg font-bold text-white">Y</span>
                </div>
                <p className="text-xs text-text-muted">Camera Off</p>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ filter: filterStyleMap[videoFilter || "none"] }}
              />
            )}
             <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5">
               <span>You {isMuted && "(Muted)"}</span>
               {isHandRaised && <span className="text-amber-400 text-xs animate-bounce">✋</span>}
               {videoFilter !== "none" && <span className="text-xs text-pink-400">✨ {videoFilter}</span>}
             </div>
           </div>
 
           {/* Remote Streams Render */}
           {peerList.map(([socketId, peerData]) => {
             const isSpeaker = activeSpeaker === peerData.userId;
             return (
               <div
                 key={socketId}
                 className={`relative bg-zinc-900 border-2 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center transition-all ${
                   layout === "spotlight"
                     ? isSpeaker
                       ? "col-span-4 row-span-3 border-emerald-500"
                       : "col-span-1 row-span-1 border-white/10"
                     : isSpeaker
                     ? "border-emerald-500"
                     : "border-white/10"
                 }`}
               >
                 {peerData.videoOff ? (
                   <div className="text-center space-y-2">
                     <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto flex items-center justify-center border border-zinc-700">
                       <span className="text-lg font-bold text-white">
                         {peerData.userName?.[0]?.toUpperCase() || "P"}
                       </span>
                     </div>
                     <p className="text-xs text-text-muted">Camera Off</p>
                   </div>
                 ) : (
                   <video
                     ref={(el) => {
                       if (el) videoRefs.current[socketId] = el;
                     }}
                     autoPlay
                     playsInline
                     className="w-full h-full object-cover"
                     style={{ filter: filterStyleMap[peerData.videoFilter || "none"] }}
                   />
                 )}
                 <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5">
                   <span>@{peerData.userName || "Participant"}</span>
                   {peerData.muted && <MicOff className="w-3 h-3 text-rose-500" />}
                   {peerData.handRaised && <span className="text-amber-400 text-xs animate-bounce">✋</span>}
                   {peerData.videoFilter && peerData.videoFilter !== "none" && <span className="text-xs text-pink-400">✨ {peerData.videoFilter}</span>}
                 </div>
               </div>
             );
           })}
        </div>

        {/* Side Call Chat panel */}
        {showCallChat && (
          <div className="w-80 h-full bg-surface border border-border rounded-2xl flex flex-col justify-between p-4 shadow-2xl animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
              <h4 className="text-sm font-bold text-text flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> Call Chat
              </h4>
              <button
                onClick={() => setShowCallChat(false)}
                className="text-xs font-bold text-text-muted hover:text-text cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Chat message logs */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1 mb-2">
              {chatMessages.length === 0 ? (
                <div className="text-center text-xs text-text-muted py-8">
                  No messages during call yet.
                </div>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className="text-xs flex flex-col bg-bg/50 p-2 rounded-lg">
                    <div className="flex justify-between font-bold text-[10px] text-text-secondary mb-0.5">
                      <span>{m.sender}</span>
                      <span className="text-text-muted">{m.time}</span>
                    </div>
                    <span className="text-text">{m.text}</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Send message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-bg border border-border text-xs px-3 py-2 rounded-xl outline-none text-text"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Call Control Overlay */}
      <CallControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        activeSpeaker={activeSpeaker}
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={onToggleScreenShare}
        onToggleHand={onToggleHand}
        onEndCall={onEndCall}
        audioInputDevices={audioInputDevices}
        videoDevices={videoDevices}
        audioOutputDevices={audioOutputDevices}
        selectedAudioInput={selectedAudioInput}
        setSelectedAudioInput={setSelectedAudioInput}
        selectedVideo={selectedVideo}
        setSelectedVideo={setSelectedVideo}
        selectedAudioOutput={selectedAudioOutput}
        setSelectedAudioOutput={setSelectedAudioOutput}
        onSendReaction={handleSendReaction}
        isHost={isHost}
        onMuteAll={onMuteAll}
        isWatchPartyActive={isWatchPartyActive}
        onToggleWatchParty={() => {
          if (isWatchPartyActive) {
            handleStopWatchParty();
          } else {
            setShowWatchPartyInput(true);
          }
        }}
        videoFilter={videoFilter}
        onChangeVideoFilter={changeVideoFilter}
      />

      {/* Watch Party URL Input Modal */}
      <AnimatePresence>
        {showWatchPartyInput && (
          <div className="fixed inset-0 z-[950] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md p-6 rounded-3xl shadow-2xl relative"
            >
              <button
                onClick={() => setShowWatchPartyInput(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-text mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" /> Start Co-watching
              </h3>
              <p className="text-xs text-text-secondary mb-4">
                Paste a direct video URL (MP4/WebM) to watch synchronously with everyone on the call.
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="https://example.com/video.mp4"
                  value={watchPartyInputUrl}
                  onChange={(e) => setWatchPartyInputUrl(e.target.value)}
                  className="w-full bg-bg border border-border text-xs px-3 py-2.5 rounded-xl outline-none text-text focus:border-pink-500/50"
                />
                
                {/* Suggestions */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Try Suggestion</span>
                  <button
                    onClick={() => setWatchPartyInputUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4")}
                    className="w-full text-left text-xs text-text-secondary hover:text-pink-500 bg-bg p-2 rounded-lg border border-border transition truncate block"
                  >
                    🐰 Big Buck Bunny (Demo MP4)
                  </button>
                  <button
                    onClick={() => setWatchPartyInputUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4")}
                    className="w-full text-left text-xs text-text-secondary hover:text-pink-500 bg-bg p-2 rounded-lg border border-border transition truncate block"
                  >
                    🐘 Elephants Dream (Demo MP4)
                  </button>
                </div>

                <button
                  onClick={() => handleStartWatchParty(watchPartyInputUrl)}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-95 text-xs font-semibold text-white rounded-xl shadow-lg transition cursor-pointer"
                >
                  Start Co-watching
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CallScreen;

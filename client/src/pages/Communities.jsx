import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Hash, Volume2, Video, Plus, Search, Send, Image, Mic, MicOff,
  VideoOff, Monitor, Settings, LogOut, Compass, Sparkles, Copy, X, Lock, Check,
  Hand
} from "lucide-react";
import { useSelector } from "react-redux";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import { useWebRTC } from "../hooks/useWebRTC";
import { snackbar } from "../lib/snackbar";
import { playMessageSound } from "../lib/sounds";

export const Communities = () => {
  const { userData } = useSelector((s) => s.user);
  const currentUserId = userData?.user?._id || userData?._id;

  // States
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  
  // Modals
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showJoinCommunity, setShowJoinCommunity] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Form states
  const [newCommName, setNewCommName] = useState("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [newCommPrivate, setNewCommPrivate] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [newChanName, setNewChanName] = useState("");
  const [newChanType, setNewChanType] = useState("text"); // text, voice, video
  const [newChanDesc, setNewChanDesc] = useState("");

  // Chat message states
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const chatEndRef = useRef(null);

  // WebRTC States
  const [activeVoiceRoom, setActiveVoiceRoom] = useState(null); // channelId

  // Fetch user's communities
  const fetchCommunities = async () => {
    try {
      const res = await api.get("/community/list");
      if (res.data?.success) {
        setCommunities(res.data.communities);
        if (res.data.communities.length > 0 && !selectedCommunity) {
          handleSelectCommunity(res.data.communities[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to load communities:", err);
    }
  };

  // Select community and load details + channels
  const handleSelectCommunity = async (comm) => {
    setSelectedCommunity(comm);
    setSelectedChannel(null);
    try {
      const res = await api.get(`/community/details/${comm._id}`);
      if (res.data?.success) {
        setChannels(res.data.channels);
        if (res.data.channels.length > 0) {
          setSelectedChannel(res.data.channels[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to load community details:", err);
      snackbar.error("Failed to load community details");
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchCommunities();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  // Load channel messages and handle socket room joining
  useEffect(() => {
    if (!selectedChannel) return;

    // Join room for text channel messaging
    const socket = getSocket();
    if (selectedChannel.type === "text") {
      // Defer clearing messages to avoid sync setState-in-effect warnings
      setTimeout(() => setMessages([]), 0);
      // Fetch history
      const fetchHistory = async () => {
        try {
          const res = await api.get(`/community/channel/${selectedChannel._id}/messages`);
          if (res.data?.success) {
            setMessages(res.data.messages);
          }
        } catch (err) {
          console.warn("Could not load message history:", err);
        }
      };
      fetchHistory();

      socket?.emit("community:join-channel", { channelId: selectedChannel._id });

      const handleIncomingMessage = ({ channelId, message }) => {
        if (channelId === selectedChannel._id) {
          setMessages((prev) => [...prev, message]);
          playMessageSound();
        }
      };

      socket?.on("community:message-received", handleIncomingMessage);

      return () => {
        socket?.emit("community:leave-channel", { channelId: selectedChannel._id });
        socket?.off("community:message-received", handleIncomingMessage);
      };
    }
  }, [selectedChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannel]);

  // Send channel message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() && !selectedFile) return;

    try {
      const formData = new FormData();
      formData.append("text", chatInput);
      formData.append("type", selectedFile ? selectedFile.type.split("/")[0] : "text");
      if (selectedFile) {
        formData.append("media", selectedFile);
      }

      const res = await api.post(`/community/channel/${selectedChannel._id}/send`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        const savedMessage = res.data.message;
        setMessages((prev) => [...prev, savedMessage]);
        
        // Broadcast via Socket.IO
        const socket = getSocket();
        socket?.emit("community:send-message", {
          channelId: selectedChannel._id,
          message: savedMessage,
        });

        setChatInput("");
        setSelectedFile(null);
        playMessageSound();
      }
    } catch (err) {
      snackbar.error("Failed to send message");
    }
  };

  // Create community handler
  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!newCommName.trim()) return;

    try {
      const res = await api.post("/community/create", {
        name: newCommName,
        description: newCommDesc,
        isPrivate: newCommPrivate,
      });

      if (res.data?.success) {
        snackbar.success("Community created!");
        setShowCreateCommunity(false);
        setNewCommName("");
        setNewCommDesc("");
        setNewCommPrivate(false);
        fetchCommunities();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to create community");
    }
  };

  // Join community handler
  const handleJoinCommunity = async (e) => {
    e.preventDefault();
    if (!joinInviteCode.trim()) return;

    try {
      const res = await api.post("/community/join", { inviteCode: joinInviteCode });
      if (res.data?.success) {
        snackbar.success("Successfully joined community!");
        setShowJoinCommunity(false);
        setJoinInviteCode("");
        fetchCommunities();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to join community");
    }
  };

  // Create channel handler
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChanName.trim()) return;

    try {
      const res = await api.post(`/community/${selectedCommunity._id}/channel/create`, {
        name: newChanName.replace(/\s+/g, "-").toLowerCase(),
        type: newChanType,
        description: newChanDesc,
      });

      if (res.data?.success) {
        snackbar.success("Channel created!");
        setShowCreateChannel(false);
        setNewChanName("");
        setNewChanDesc("");
        handleSelectCommunity(selectedCommunity);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to create channel");
    }
  };

  // Copy invite code helper
  const handleCopyInvite = (code) => {
    navigator.clipboard.writeText(code);
    snackbar.success("Invite code copied to clipboard!");
  };

  // Render main content area based on channel type
  const renderMainView = () => {
    if (!selectedCommunity) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-bg via-surface/30 to-bg">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-pink-500/20 mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Welcome to Communities!</h2>
          <p className="text-sm text-text-secondary max-w-md mb-6">
            Join public servers or create your own to hang out with friends, use voice channels, and share video rooms.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowJoinCommunity(true)}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-text rounded-xl transition cursor-pointer"
            >
              Join with Code
            </button>
            <button
              onClick={() => setShowCreateCommunity(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90 text-xs font-semibold text-white rounded-xl shadow-lg transition cursor-pointer"
            >
              Create a Server
            </button>
          </div>
        </div>
      );
    }

    if (!selectedChannel) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <Hash className="w-12 h-12 text-text-muted mb-3" />
          <h3 className="text-lg font-bold text-text mb-1">No Channel Selected</h3>
          <p className="text-xs text-text-muted">Select a channel from the list on the left to start communicating.</p>
        </div>
      );
    }

    // Text Channel View
    if (selectedChannel.type === "text") {
      return (
        <div className="flex-1 flex flex-col h-full bg-bg">
          {/* Channel Header */}
          <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-surface/20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-text-secondary" />
              <span className="text-sm font-bold text-text">{selectedChannel.name}</span>
              {selectedChannel.description && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-xs text-text-secondary line-clamp-1">{selectedChannel.description}</span>
                </>
              )}
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, index) => {
              const isMe = msg.sender?._id === currentUserId;
              return (
                <div key={msg._id || index} className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-surface flex items-center justify-center shrink-0 border border-border">
                    {msg.sender?.profileImage?.url ? (
                      <img src={msg.sender.profileImage.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-text font-bold text-xs">
                        {msg.sender?.userName?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-text">@{msg.sender?.userName || "user"}</span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl text-xs ${
                      isMe 
                        ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-tr-none shadow-md shadow-pink-500/10"
                        : "bg-surface text-text rounded-tl-none border border-border"
                    }`}>
                      {msg.content?.text && <p className="leading-relaxed break-words">{msg.content.text}</p>}
                      {msg.content?.media?.map((m, i) => (
                        <div key={i} className="mt-2 rounded-lg overflow-hidden border border-white/10 max-w-sm">
                          {m.type === "image" ? (
                            <img src={m.url} alt="" className="max-h-60 w-auto object-cover" />
                          ) : m.type === "video" ? (
                            <video src={m.url} controls className="max-h-60 w-auto" />
                          ) : (
                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-black/20 flex items-center gap-2 text-[11px] hover:underline">
                              <span>📁 {m.name || "Attachment"}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-bg flex items-center gap-3">
            <label className="p-2.5 bg-surface hover:bg-surface-inset border border-border text-text-secondary rounded-xl cursor-pointer transition flex items-center justify-center shrink-0">
              <Image className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </label>

            <div className="flex-1 relative flex items-center bg-surface rounded-xl border border-border focus-within:border-pink-500/50 transition">
              <input
                type="text"
                placeholder={`Message #${selectedChannel.name}`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="w-full bg-transparent text-xs px-4 py-3 outline-none text-text"
              />
              {selectedFile && (
                <div className="absolute right-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1.5 animate-pulse">
                  <span className="truncate max-w-[80px]">{selectedFile.name}</span>
                  <button type="button" onClick={() => setSelectedFile(null)} className="hover:text-rose-500 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="p-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90 text-white rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      );
    }

    // Voice or Video Channel View
    if (selectedChannel.type === "voice" || selectedChannel.type === "video") {
      const isVoiceActive = activeVoiceRoom === selectedChannel._id;
      return (
        <div className="flex-1 flex flex-col h-full bg-bg">
          {/* Header */}
          <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-surface/20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              {selectedChannel.type === "voice" ? (
                <Volume2 className="w-5 h-5 text-blue-400" />
              ) : (
                <Video className="w-5 h-5 text-purple-400" />
              )}
              <span className="text-sm font-bold text-text">{selectedChannel.name}</span>
              <span className="text-border">|</span>
              <span className="text-xs text-text-muted">
                {selectedChannel.type === "voice" ? "Voice Connection Room" : "Video Room"}
              </span>
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-surface/5">
            {!isVoiceActive ? (
              <div className="text-center p-8 bg-surface/45 border border-border backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  {selectedChannel.type === "voice" ? (
                    <Volume2 className="w-8 h-8 text-blue-400 animate-bounce" />
                  ) : (
                    <Video className="w-8 h-8 text-purple-400 animate-bounce" />
                  )}
                </div>
                <h4 className="text-md font-bold text-text mb-2">Ready to connect?</h4>
                <p className="text-xs text-text-secondary mb-6">
                  Join this channel to start chatting with other server members in real-time.
                </p>
                <button
                  onClick={() => setActiveVoiceRoom(selectedChannel._id)}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-95 text-xs font-semibold text-white rounded-xl shadow-lg transition cursor-pointer"
                >
                  Join Channel
                </button>
              </div>
            ) : !currentUserId ? (
              <div className="text-center p-8 bg-surface/45 border border-border backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full">
                <p className="text-xs text-text-muted">Unable to connect. Please sign in again.</p>
              </div>
            ) : (
              <ActiveWebRTCChannelRoom
                channelId={selectedChannel._id}
                type={selectedChannel.type}
                currentUserId={currentUserId}
                onLeave={() => setActiveVoiceRoom(null)}
              />
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-bg">
      {/* Sidebar 1: Community Servers list (guilds) */}
      <div className="w-[72px] bg-surface-inset border-r border-border flex flex-col items-center py-4 gap-3 shrink-0 select-none overflow-y-auto hide-scrollbar">
        {/* Public explorer icon */}
        <button
          onClick={() => setSelectedCommunity(null)}
          className={`w-12 h-12 rounded-3xl flex items-center justify-center border transition transform active:scale-95 cursor-pointer hover:rounded-2xl ${
            !selectedCommunity 
              ? "bg-gradient-to-tr from-pink-500 to-rose-600 border-none text-white shadow-lg"
              : "bg-surface border-border hover:bg-pink-500 hover:text-white"
          }`}
          title="Communities Dashboard"
        >
          <Compass className="w-5 h-5" />
        </button>

        <div className="w-8 h-[2px] bg-border rounded" />

        {/* Server Avatars */}
        {communities.map((comm) => {
          const isSel = selectedCommunity?._id === comm._id;
          return (
            <button
              key={comm._id}
              onClick={() => handleSelectCommunity(comm)}
              className={`w-12 h-12 rounded-3xl overflow-hidden flex items-center justify-center font-bold text-sm border transition-all duration-200 transform active:scale-95 cursor-pointer hover:rounded-2xl relative group ${
                isSel
                  ? "bg-gradient-to-tr from-pink-500 to-rose-600 border-none text-white shadow-lg rounded-2xl"
                  : "bg-surface border-border hover:border-pink-500 text-text-secondary hover:text-text"
              }`}
            >
              {comm.image?.url ? (
                <img src={comm.image.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{comm.name?.[0]?.toUpperCase()}</span>
              )}

              {/* Selection indicator pill */}
              <div className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
                isSel ? "h-6" : "h-0 group-hover:h-3"
              }`} />
            </button>
          );
        })}

        {/* Add Server Button */}
        <button
          onClick={() => setShowCreateCommunity(true)}
          className="w-12 h-12 rounded-3xl bg-surface border border-dashed border-border hover:border-pink-500 text-text-secondary hover:text-pink-500 transition-all duration-200 flex items-center justify-center cursor-pointer hover:rounded-2xl transform active:scale-95"
          title="Create a Server"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Join Server Button */}
        <button
          onClick={() => setShowJoinCommunity(true)}
          className="w-12 h-12 rounded-3xl bg-surface border border-dashed border-border hover:border-blue-500 text-text-secondary hover:text-blue-500 transition-all duration-200 flex items-center justify-center cursor-pointer hover:rounded-2xl transform active:scale-95"
          title="Join a Server with Code"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar 2: Selected Server details & Channel List */}
      {selectedCommunity && (
        <div className="w-60 bg-surface/50 border-r border-border flex flex-col justify-between shrink-0 select-none">
          <div>
            {/* Community Header */}
            <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-surface/20">
              <span className="text-sm font-bold text-text truncate max-w-[140px]">{selectedCommunity.name}</span>
              <button
                onClick={() => handleCopyInvite(selectedCommunity.inviteCode)}
                className="p-1.5 hover:bg-surface border border-border hover:text-pink-500 rounded-lg transition text-xs font-semibold text-text flex items-center gap-1 cursor-pointer"
                title="Copy Server Invite Code"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Channels List */}
            <div className="p-3 space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider px-2">
                <span>Channels</span>
                {(selectedCommunity.owner?._id || selectedCommunity.owner) === currentUserId && (
                  <button onClick={() => setShowCreateChannel(true)} className="hover:text-text cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {channels.map((chan) => {
                  const isSel = selectedChannel?._id === chan._id;
                  return (
                    <button
                      key={chan._id}
                      onClick={() => setSelectedChannel(chan)}
                      className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isSel
                          ? "bg-surface text-text font-bold"
                          : "text-text-secondary hover:bg-surface/50 hover:text-text"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {chan.type === "text" ? (
                          <Hash className="w-4 h-4 text-text-secondary shrink-0" />
                        ) : chan.type === "voice" ? (
                          <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <Video className="w-4 h-4 text-purple-400 shrink-0" />
                        )}
                        <span className="truncate">{chan.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User profile footer */}
          <div className="p-3 border-t border-border bg-surface/35 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface shrink-0 border border-border">
                {userData?.user?.profileImage?.url ? (
                  <img src={userData.user.profileImage.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-text font-bold text-[10px]">{userData?.user?.userName?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-text truncate">@{userData?.user?.userName || "username"}</span>
                <span className="text-[10px] text-text-muted">Online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main View Panel */}
      {renderMainView()}

      {/* MODALS */}

      {/* Create Community Modal */}
      <AnimatePresence>
        {showCreateCommunity && (
          <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md p-6 rounded-3xl shadow-2xl relative"
            >
              <button onClick={() => setShowCreateCommunity(false)} className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-text mb-4">Create Your Server</h3>
              <form onSubmit={handleCreateCommunity} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Server Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Awesome Club"
                    value={newCommName}
                    onChange={(e) => setNewCommName(e.target.value)}
                    className="bg-bg border border-border text-xs px-3 py-2 rounded-xl text-text outline-none focus:border-pink-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Description</label>
                  <textarea
                    placeholder="What is your server about?"
                    value={newCommDesc}
                    onChange={(e) => setNewCommDesc(e.target.value)}
                    className="bg-bg border border-border text-xs px-3 py-2 rounded-xl text-text outline-none focus:border-pink-500/50 h-20 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="commPrivate"
                    checked={newCommPrivate}
                    onChange={(e) => setNewCommPrivate(e.target.checked)}
                    className="accent-pink-500"
                  />
                  <label htmlFor="commPrivate" className="text-xs text-text font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Lock className="w-3.5 h-3.5 text-text-muted" /> Private Server (Requires invite code)
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-95 text-xs font-semibold text-white rounded-xl shadow-lg transition cursor-pointer"
                >
                  Create Server
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Community Modal */}
      <AnimatePresence>
        {showJoinCommunity && (
          <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-sm p-6 rounded-3xl shadow-2xl relative"
            >
              <button onClick={() => setShowJoinCommunity(false)} className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-text mb-4">Join Server</h3>
              <form onSubmit={handleJoinCommunity} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Invite Code</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter invite code (e.g. a1b2c3d4)"
                    value={joinInviteCode}
                    onChange={(e) => setJoinInviteCode(e.target.value)}
                    className="bg-bg border border-border text-xs px-3 py-2 rounded-xl text-text outline-none focus:border-blue-500/50"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-95 text-xs font-semibold text-white rounded-xl shadow-lg transition cursor-pointer"
                >
                  Join Server
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {showCreateChannel && (
          <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md p-6 rounded-3xl shadow-2xl relative"
            >
              <button onClick={() => setShowCreateChannel(false)} className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-text mb-4">Create Channel</h3>
              <form onSubmit={handleCreateChannel} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Channel Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. general-chat"
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    className="bg-bg border border-border text-xs px-3 py-2 rounded-xl text-text outline-none focus:border-pink-500/50"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Channel Type</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {["text", "voice", "video"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewChanType(type)}
                        className={`py-2 px-3 border rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                          newChanType === type
                            ? "bg-pink-500/10 border-pink-500 text-pink-400"
                            : "bg-bg border-border text-text-secondary hover:text-text hover:bg-surface/50"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Description</label>
                  <textarea
                    placeholder="What is this channel for?"
                    value={newChanDesc}
                    onChange={(e) => setNewChanDesc(e.target.value)}
                    className="bg-bg border border-border text-xs px-3 py-2 rounded-xl text-text outline-none focus:border-pink-500/50 h-16 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-95 text-xs font-semibold text-white rounded-xl shadow-lg transition cursor-pointer"
                >
                  Create Channel
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Internal active WebRTC channel room panel
const ActiveWebRTCChannelRoom = ({ channelId, type, currentUserId, onLeave }) => {
  const room = `channel_${channelId}`;
  const rtc = useWebRTC(room, currentUserId, type);
  const localVideoRef = useRef(null);
  const videoRefs = useRef({});

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && rtc.localStream) {
      localVideoRef.current.srcObject = rtc.localStream;
    }
  }, [rtc.localStream, rtc.isVideoOff]);

  // Bind remote peer streams
  useEffect(() => {
    Object.keys(rtc.peers).forEach((socketId) => {
      const el = videoRefs.current[socketId];
      if (el && rtc.peers[socketId]?.stream) {
        el.srcObject = rtc.peers[socketId].stream;
      }
    });
  }, [rtc.peers]);

  const peersList = Object.entries(rtc.peers);
  const streamCount = 1 + peersList.length;

  const handleDisconnect = () => {
    rtc.leaveRoom();
    onLeave();
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Video Grid */}
      <div className={`flex-1 grid gap-4 mb-4 ${
        streamCount === 1 
          ? "grid-cols-1"
          : streamCount === 2
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-2 md:grid-cols-3"
      }`}>
        {/* Local Stream */}
        <div className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
          {rtc.isVideoOff ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold text-sm">You</span>
              </div>
              <p className="text-[10px] text-text-muted">Camera Off</p>
            </div>
          ) : (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-semibold text-white flex items-center gap-1">
            You {rtc.isMuted && "(Muted)"} {rtc.isHandRaised && <span className="text-amber-400">✋</span>}
          </div>
        </div>

        {/* Remote Streams */}
        {peersList.map(([socketId, peerData]) => (
          <div key={socketId} className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {peerData.videoOff ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">
                    {peerData.userName?.[0]?.toUpperCase() || "P"}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted">Camera Off</p>
              </div>
            ) : (
              <video
                ref={(el) => { if (el) videoRefs.current[socketId] = el; }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-semibold text-white flex items-center gap-1">
              @{peerData.userName || "Participant"} {peerData.muted && "(Muted)"} {peerData.handRaised && <span className="text-amber-400">✋</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Control Panel */}
      <div className="flex items-center justify-center gap-4 bg-surface border border-border p-4 rounded-2xl max-w-lg mx-auto w-full shadow-xl">
        <button
          onClick={rtc.toggleMute}
          className={`p-3 rounded-xl transition ${
            rtc.isMuted ? "bg-rose-500/20 text-rose-500 border border-rose-500/35" : "bg-bg text-text hover:bg-surface-inset border border-border"
          }`}
          title={rtc.isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {rtc.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={rtc.toggleVideo}
          className={`p-3 rounded-xl transition ${
            rtc.isVideoOff ? "bg-rose-500/20 text-rose-500 border border-rose-500/35" : "bg-bg text-text hover:bg-surface-inset border border-border"
          }`}
          title={rtc.isVideoOff ? "Turn Video On" : "Turn Video Off"}
        >
          {rtc.isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>

        <button
          onClick={rtc.toggleScreenShare}
          className={`p-3 rounded-xl transition ${
            rtc.isScreenSharing ? "bg-purple-500/20 text-purple-400 border border-purple-500/35" : "bg-bg text-text hover:bg-surface-inset border border-border"
          }`}
          title="Share Screen"
        >
          <Monitor className="w-4 h-4" />
        </button>

        <button
          onClick={rtc.toggleHand}
          className={`p-3 rounded-xl transition ${
            rtc.isHandRaised ? "bg-amber-500/20 text-amber-400 border border-amber-500/35" : "bg-bg text-text hover:bg-surface-inset border border-border"
          }`}
          title="Raise Hand"
        >
          <Hand className="w-4 h-4" />
        </button>

        <button
          onClick={handleDisconnect}
          className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold shadow-lg shadow-rose-600/10 border border-rose-500"
        >
          <LogOut className="w-4 h-4" /> Disconnect
        </button>
      </div>
    </div>
  );
};

export default Communities;

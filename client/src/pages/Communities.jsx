// client/src/pages/Communities.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Hash,
  Volume2,
  Video,
  Plus,
  Search,
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  Settings,
  LogOut,
  Compass,
  Sparkles,
  Copy,
  X,
  Lock,
  Check,
  Hand,
  Smile,
  ChevronDown,
  ChevronRight,
  Pin,
  CornerUpLeft,
  Trash2,
  Edit2,
  Crown,
  Shield,
  MessageSquare,
  Globe,
  MoreVertical,
  Paperclip,
  Menu,
  Download,
} from "lucide-react";
import { useSelector } from "react-redux";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import { useWebRTC } from "../hooks/useWebRTC";
import { snackbar } from "../lib/snackbar";
import {
  playMessageSound,
  playMessageSentSound,
  playJoinSound,
  playLeaveSound,
  playHandRaiseSound,
} from "../lib/sounds";
import VoiceNotePlayer from "../components/VoiceNotePlayer";
import VoiceRecorder from "../components/VoiceRecorder";
import VybeExpressionPicker from "../components/VybeExpressionPicker";
import CommunityExploreModal from "../components/CommunityExploreModal";
import CommunitySettingsModal from "../components/CommunitySettingsModal";
import CommunityMemberProfileModal from "../components/CommunityMemberProfileModal";
import ChannelSettingsModal from "../components/ChannelSettingsModal";
import CommunityPinnedMessagesModal from "../components/CommunityPinnedMessagesModal";
import CommunityMediaLightbox from "../components/CommunityMediaLightbox";

export const Communities = () => {
  const { userData } = useSelector((s) => s.user);
  const currentUserId = userData?.user?._id || userData?._id;

  // Navigation & Active states
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);

  // UI Panels & Drawers
  const [isExploreActive, setIsExploreActive] = useState(false);
  const [showMembersSidebar, setShowMembersSidebar] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals & Popovers
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showJoinCommunity, setShowJoinCommunity] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCommunitySettings, setShowCommunitySettings] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState(null);
  const [activeProfileMember, setActiveProfileMember] = useState(null);
  const [activeLightboxMedia, setActiveLightboxMedia] = useState(null);

  // Collapsible categories
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Search in channel
  const [showSearchInChannel, setShowSearchInChannel] = useState(false);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");

  // Creation Modals
  const [newCommName, setNewCommName] = useState("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [newCommCategory, setNewCommCategory] = useState("General");
  const [newCommPrivate, setNewCommPrivate] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState("");

  const [newChanName, setNewChanName] = useState("");
  const [newChanType, setNewChanType] = useState("text"); // 'text' | 'voice' | 'video'
  const [newChanCategory, setNewChanCategory] = useState("TEXT CHANNELS");
  const [newChanTopic, setNewChanTopic] = useState("");

  // Chat Input State
  const [chatInput, setChatInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showExpressionPicker, setShowExpressionPicker] = useState({ open: false, tab: "emojis" });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  // Live Voice Presence across community voice channels
  const [voicePresence, setVoicePresence] = useState({}); // { channelId: [ { user } ] }

  // WebRTC States
  const [activeVoiceRoom, setActiveVoiceRoom] = useState(null); // channelId

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Select community and load details + channels
  const handleSelectCommunity = useCallback(async (comm) => {
    setIsExploreActive(false);
    setSelectedCommunity(comm);
    setSelectedChannel(null);
    setShowServerMenu(false);
    setMobileSidebarOpen(false);

    try {
      const res = await api.get(`/community/details/${comm._id}`);
      if (res.data?.success) {
        setSelectedCommunity(res.data.community);
        setChannels(res.data.channels || []);
        if (res.data.channels && res.data.channels.length > 0) {
          setSelectedChannel(res.data.channels[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to load community details:", err);
      snackbar.error("Failed to load community details");
    }
  }, []);

  // 2. Fetch user's communities
  const fetchCommunities = useCallback(async (autoSelectId = null) => {
    try {
      const res = await api.get("/community/list");
      if (res.data?.success) {
        setCommunities(res.data.communities || []);
        if (autoSelectId) {
          const found = res.data.communities.find((c) => c._id === autoSelectId);
          if (found) handleSelectCommunity(found);
        } else if (res.data.communities.length > 0 && !selectedCommunity && !isExploreActive) {
          handleSelectCommunity(res.data.communities[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to load communities:", err);
    }
  }, [selectedCommunity, isExploreActive, handleSelectCommunity]);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/community/my")
      .then((res) => {
        if (isMounted && res.data?.success) {
          setCommunities(res.data.communities || []);
          if (res.data.communities.length > 0 && !selectedCommunity && !isExploreActive) {
            handleSelectCommunity(res.data.communities[0]);
          }
        }
      })
      .catch((err) => {
        if (isMounted) console.warn("Failed to load communities:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCommunity, isExploreActive, handleSelectCommunity]);

  // 3. Load channel messages & socket handlers
  useEffect(() => {
    if (!selectedChannel) return;

    const socket = getSocket();
    let isMounted = true;
    let resetTimer = null;

    if (selectedChannel.type === "text") {
      resetTimer = setTimeout(() => {
        setMessages([]);
        setEditingMessage(null);
        setReplyTo(null);
        setTypingUsers({});
        setShowSearchInChannel(false);
        setChannelSearchQuery("");
      }, 0);

      // Fetch history & pinned in parallel
      Promise.all([
        api.get(`/community/channel/${selectedChannel._id}/messages`).catch(() => null),
        api.get(`/community/channel/${selectedChannel._id}/pinned`).catch(() => null),
      ]).then(([msgRes, pinRes]) => {
        if (!isMounted) return;
        if (msgRes?.data?.success) {
          setMessages(msgRes.data.messages || []);
        }
        if (pinRes?.data?.success) {
          setPinnedMessages(pinRes.data.messages || []);
        }
      });

      socket?.emit("community:join-channel", { channelId: selectedChannel._id });

      const handleIncomingMessage = ({ channelId, message }) => {
        if (channelId === selectedChannel._id) {
          setMessages((prev) => [...prev, message]);
          playMessageSound();
        }
      };

      const handleReactionUpdated = ({ channelId, message }) => {
        if (channelId === selectedChannel._id) {
          setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
        }
      };

      const handleMessageEdited = ({ channelId, message }) => {
        if (channelId === selectedChannel._id) {
          setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
          setPinnedMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
        }
      };

      const handleMessageDeleted = ({ channelId, messageId }) => {
        if (channelId === selectedChannel._id) {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
          setPinnedMessages((prev) => prev.filter((m) => m._id !== messageId));
        }
      };

      const handleMessagePinned = ({ channelId, message, isPinned }) => {
        if (channelId === selectedChannel._id) {
          setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
          if (isPinned) {
            setPinnedMessages((prev) => [message, ...prev.filter((p) => p._id !== message._id)]);
          } else {
            setPinnedMessages((prev) => prev.filter((p) => p._id !== message._id));
          }
        }
      };

      const handleUserTyping = ({ channelId, userId, userName }) => {
        if (channelId === selectedChannel._id && userId !== currentUserId) {
          setTypingUsers((prev) => ({ ...prev, [userId]: userName }));
        }
      };

      const handleUserStopTyping = ({ channelId, userId }) => {
        if (channelId === selectedChannel._id) {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }
      };

      const handleVoicePresence = ({ communityId, channelId, user, userId, action }) => {
        if (communityId === selectedCommunity?._id) {
          setVoicePresence((prev) => {
            const currentList = prev[channelId] || [];
            if (action === "join") {
              if (currentList.some((u) => u._id === user?._id)) return prev;
              return { ...prev, [channelId]: [...currentList, user] };
            } else {
              return { ...prev, [channelId]: currentList.filter((u) => u._id !== userId) };
            }
          });
        }
      };

      socket?.on("community:message-received", handleIncomingMessage);
      socket?.on("community:reaction-updated", handleReactionUpdated);
      socket?.on("community:message-edited", handleMessageEdited);
      socket?.on("community:message-deleted", handleMessageDeleted);
      socket?.on("community:message-pinned", handleMessagePinned);
      socket?.on("community:user-typing", handleUserTyping);
      socket?.on("community:user-stop-typing", handleUserStopTyping);
      socket?.on("community:voice-presence-updated", handleVoicePresence);

      return () => {
        if (resetTimer) clearTimeout(resetTimer);
        socket?.emit("community:leave-channel", { channelId: selectedChannel._id });
        socket?.off("community:message-received", handleIncomingMessage);
        socket?.off("community:reaction-updated", handleReactionUpdated);
        socket?.off("community:message-edited", handleMessageEdited);
        socket?.off("community:message-deleted", handleMessageDeleted);
        socket?.off("community:message-pinned", handleMessagePinned);
        socket?.off("community:user-typing", handleUserTyping);
        socket?.off("community:user-stop-typing", handleUserStopTyping);
        socket?.off("community:voice-presence-updated", handleVoicePresence);
      };
    }
  }, [selectedChannel, selectedCommunity, currentUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannel]);

  // Toggle Category collapse
  const toggleCategoryCollapse = (catName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Handle typing indicator dispatch
  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    const socket = getSocket();

    if (e.target.value.trim() && selectedChannel && !editingMessage) {
      socket?.emit("community:typing", {
        channelId: selectedChannel._id,
        userName: userData?.user?.userName || "Member",
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit("community:stop-typing", { channelId: selectedChannel._id });
      }, 2000);
    } else if (selectedChannel) {
      socket?.emit("community:stop-typing", { channelId: selectedChannel._id });
    }
  };

  // Start editing message
  const handleStartEditMessage = (msg) => {
    setEditingMessage(msg);
    setChatInput(msg.content?.text || "");
    chatInputRef.current?.focus();
  };

  // Send or Edit message
  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    if (!chatInput.trim() && selectedFiles.length === 0) return;

    const socket = getSocket();
    socket?.emit("community:stop-typing", { channelId: selectedChannel._id });

    // If Editing
    if (editingMessage) {
      try {
        const res = await api.put(`/community/channel/${selectedChannel._id}/message/${editingMessage._id}`, {
          text: chatInput.trim(),
        });
        if (res.data?.success) {
          const updated = res.data.message;
          setMessages((prev) => prev.map((m) => (m._id === editingMessage._id ? updated : m)));
          socket?.emit("community:message-edited", {
            channelId: selectedChannel._id,
            message: updated,
          });
          setEditingMessage(null);
          setChatInput("");
          snackbar.success("Message edited");
        }
      } catch {
        snackbar.error("Failed to edit message");
      }
      return;
    }

    // New Message
    try {
      const formData = new FormData();
      formData.append("text", chatInput.trim());
      if (replyTo) formData.append("replyTo", replyTo._id);

      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => formData.append("media", file));
      }

      const res = await api.post(`/community/channel/${selectedChannel._id}/send`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        const savedMessage = res.data.message;
        setMessages((prev) => [...prev, savedMessage]);

        socket?.emit("community:send-message", {
          channelId: selectedChannel._id,
          message: savedMessage,
        });

        setChatInput("");
        setSelectedFiles([]);
        setReplyTo(null);
        playMessageSentSound();
      }
    } catch {
      snackbar.error("Failed to send message");
    }
  };

  // Send Voice Note directly to channel
  const handleSendVoiceNote = async ({ blob, duration }) => {
    setIsRecordingVoice(false);
    if (!selectedChannel) return;

    try {
      const formData = new FormData();
      const audioFile = new File([blob], `voice_note_${Date.now()}.webm`, { type: "audio/webm" });
      formData.append("media", audioFile);
      formData.append("type", "voice");
      formData.append("voiceDuration", duration);
      if (replyTo) formData.append("replyTo", replyTo._id);

      const res = await api.post(`/community/channel/${selectedChannel._id}/send`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        const savedMessage = res.data.message;
        setMessages((prev) => [...prev, savedMessage]);

        const socket = getSocket();
        socket?.emit("community:send-message", {
          channelId: selectedChannel._id,
          message: savedMessage,
        });

        setReplyTo(null);
        playMessageSentSound();
      }
    } catch {
      snackbar.error("Failed to send voice note");
    }
  };

  // Send Sticker / 3D animated emoji
  const handleSendSticker = async (sticker) => {
    setShowExpressionPicker({ open: false, tab: "emojis" });
    if (!selectedChannel) return;

    try {
      const payload = {
        type: "sticker",
        stickerUrl: sticker.url,
        stickerName: sticker.name || "Sticker",
        replyTo: replyTo?._id || null,
      };

      const res = await api.post(`/community/channel/${selectedChannel._id}/send`, payload);
      if (res.data?.success) {
        const savedMessage = res.data.message;
        setMessages((prev) => [...prev, savedMessage]);

        const socket = getSocket();
        socket?.emit("community:send-message", {
          channelId: selectedChannel._id,
          message: savedMessage,
        });

        setReplyTo(null);
        playMessageSentSound();
      }
    } catch {
      snackbar.error("Failed to send sticker");
    }
  };

  // Toggle Reaction on message
  const handleReaction = async (messageId, emoji) => {
    try {
      const res = await api.post(`/community/channel/${selectedChannel._id}/message/${messageId}/reaction`, { emoji });
      if (res.data?.success) {
        const updatedMsg = res.data.message;
        setMessages((prev) => prev.map((m) => (m._id === messageId ? updatedMsg : m)));

        const socket = getSocket();
        socket?.emit("community:message-reaction", {
          channelId: selectedChannel._id,
          message: updatedMsg,
        });
      }
    } catch (err) {
      console.warn("Reaction error:", err);
    }
  };

  // Toggle Pin message
  const handleTogglePin = async (messageId) => {
    try {
      const res = await api.post(`/community/channel/${selectedChannel._id}/message/${messageId}/pin`);
      if (res.data?.success) {
        const updatedMsg = res.data.message;
        const isPinned = res.data.isPinned;
        setMessages((prev) => prev.map((m) => (m._id === messageId ? updatedMsg : m)));

        if (isPinned) {
          setPinnedMessages((prev) => [updatedMsg, ...prev.filter((p) => p._id !== messageId)]);
          snackbar.success("Message pinned!");
        } else {
          setPinnedMessages((prev) => prev.filter((p) => p._id !== messageId));
          snackbar.info("Message unpinned");
        }

        const socket = getSocket();
        socket?.emit("community:message-pinned", {
          channelId: selectedChannel._id,
          message: updatedMsg,
          isPinned,
        });
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to pin message");
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    try {
      const res = await api.delete(`/community/channel/${selectedChannel._id}/message/${messageId}`);
      if (res.data?.success) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
        setPinnedMessages((prev) => prev.filter((m) => m._id !== messageId));

        const socket = getSocket();
        socket?.emit("community:message-deleted", {
          channelId: selectedChannel._id,
          messageId,
        });
        snackbar.success("Message deleted");
      }
    } catch {
      snackbar.error("Failed to delete message");
    }
  };

  // Create Community handler
  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!newCommName.trim()) return;

    try {
      const res = await api.post("/community/create", {
        name: newCommName.trim(),
        description: newCommDesc,
        category: newCommCategory,
        isPrivate: newCommPrivate,
      });

      if (res.data?.success) {
        snackbar.success("Community created!");
        setShowCreateCommunity(false);
        setNewCommName("");
        setNewCommDesc("");
        fetchCommunities(res.data.community._id);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to create community");
    }
  };

  // Join Community with code
  const handleJoinWithCode = async (e) => {
    e.preventDefault();
    if (!joinInviteCode.trim()) return;

    try {
      const res = await api.post("/community/join", { inviteCode: joinInviteCode.trim() });
      if (res.data?.success) {
        snackbar.success(`Successfully joined ${res.data.community.name}!`);
        setShowJoinCommunity(false);
        setJoinInviteCode("");
        fetchCommunities(res.data.community._id);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to join community");
    }
  };

  // Create Channel
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChanName.trim()) return;

    try {
      const res = await api.post(`/community/${selectedCommunity._id}/channel/create`, {
        name: newChanName.trim(),
        type: newChanType,
        category: newChanCategory,
        topic: newChanTopic,
      });

      if (res.data?.success) {
        snackbar.success("Channel created!");
        setShowCreateChannel(false);
        setNewChanName("");
        setNewChanTopic("");
        handleSelectCommunity(selectedCommunity);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to create channel");
    }
  };

  // Filter messages based on in-channel search
  const filteredMessages = channelSearchQuery.trim()
    ? messages.filter((m) =>
        m.content?.text?.toLowerCase().includes(channelSearchQuery.toLowerCase()) ||
        m.sender?.userName?.toLowerCase().includes(channelSearchQuery.toLowerCase())
      )
    : messages;

  // Categorize channels
  const channelCategories = Array.from(
    new Set(channels.map((c) => c.category || (c.type === "text" ? "TEXT CHANNELS" : "VOICE ROOMS")))
  );

  // Role grouping for right members sidebar
  const membersList = selectedCommunity?.members || [];
  const owners = membersList.filter(
    (m) => (selectedCommunity?.owner?._id || selectedCommunity?.owner)?.toString() === (m.user?._id || m.user)?.toString()
  );
  const admins = membersList.filter(
    (m) => m.roles?.includes("admin") && !owners.some((o) => (o.user?._id || o.user) === (m.user?._id || m.user))
  );
  const onlineMembers = membersList.filter(
    (m) =>
      m.user?.isOnline &&
      !owners.some((o) => (o.user?._id || o.user) === (m.user?._id || m.user)) &&
      !admins.some((a) => (a.user?._id || a.user) === (m.user?._id || m.user))
  );
  const offlineMembers = membersList.filter(
    (m) =>
      !m.user?.isOnline &&
      !owners.some((o) => (o.user?._id || o.user) === (m.user?._id || m.user)) &&
      !admins.some((a) => (a.user?._id || a.user) === (m.user?._id || m.user))
  );

  const isOwner = (selectedCommunity?.owner?._id || selectedCommunity?.owner) === currentUserId;
  const currentMember = selectedCommunity?.members?.find(
    (m) => (m.user?._id || m.user)?.toString() === currentUserId?.toString()
  );
  const isAdmin = isOwner || currentMember?.roles?.includes("admin");

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-bg font-sans select-none relative">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* ══════════════════════════════════════════════════════
          SIDEBAR 1: GUILD RAIL (EXPLORER & COMMUNITY ICONS)
         ══════════════════════════════════════════════════════ */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 w-[72px] bg-surface-inset border-r border-border flex flex-col items-center py-3 gap-2.5 shrink-0 overflow-y-auto hide-scrollbar transition-transform duration-300 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Explore Button */}
        <button
          onClick={() => {
            setIsExploreActive(true);
            setMobileSidebarOpen(false);
          }}
          className={`w-12 h-12 rounded-3xl flex items-center justify-center border transition-all duration-200 transform active:scale-95 cursor-pointer hover:rounded-2xl relative group ${
            isExploreActive
              ? "bg-gradient-to-tr from-purple-600 to-indigo-600 border-none text-white shadow-lg rounded-2xl"
              : "bg-surface border-border hover:bg-surface-inset text-text-secondary hover:text-text"
          }`}
          title="Explore Public Communities"
        >
          <Compass className="w-5 h-5" />
          <div
            className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
              isExploreActive ? "h-8" : "h-0 group-hover:h-3"
            }`}
          />
        </button>

        <div className="w-8 h-[2px] bg-border/80 rounded" />

        {/* User's Joined Communities */}
        {communities.map((comm) => {
          const isSel = selectedCommunity?._id === comm._id && !isExploreActive;
          return (
            <button
              key={comm._id}
              onClick={() => handleSelectCommunity(comm)}
              className={`w-12 h-12 rounded-3xl overflow-hidden flex items-center justify-center font-black text-sm border transition-all duration-200 transform active:scale-95 cursor-pointer hover:rounded-2xl relative group ${
                isSel
                  ? "bg-gradient-to-tr from-purple-600 to-rose-600 border-none text-white shadow-lg rounded-2xl ring-2 ring-primary/40"
                  : "bg-surface border-border hover:border-primary/50 text-text-secondary hover:text-text"
              }`}
              title={comm.name}
            >
              {comm.icon?.url || comm.image?.url ? (
                <img src={comm.icon?.url || comm.image?.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{comm.name?.[0]?.toUpperCase()}</span>
              )}

              {/* Selection pill */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
                  isSel ? "h-8" : "h-0 group-hover:h-3"
                }`}
              />
            </button>
          );
        })}

        {/* Add Server Button */}
        <button
          onClick={() => {
            setShowCreateCommunity(true);
            setMobileSidebarOpen(false);
          }}
          className="w-12 h-12 rounded-3xl bg-surface border border-dashed border-border hover:border-primary text-text-secondary hover:text-primary transition-all duration-200 flex items-center justify-center cursor-pointer hover:rounded-2xl transform active:scale-95"
          title="Create a Server"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Join Server with Code */}
        <button
          onClick={() => {
            setShowJoinCommunity(true);
            setMobileSidebarOpen(false);
          }}
          className="w-12 h-12 rounded-3xl bg-surface border border-dashed border-border hover:border-indigo-400 text-text-secondary hover:text-indigo-400 transition-all duration-200 flex items-center justify-center cursor-pointer hover:rounded-2xl transform active:scale-95"
          title="Join Server with Invite Code"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          SIDEBAR 2: SERVER CHANNELS & VOICE PRESENCE DRAWER
         ══════════════════════════════════════════════════════ */}
      {selectedCommunity && !isExploreActive && (
        <div
          className={`fixed md:static inset-y-0 left-[72px] md:left-0 z-40 w-60 bg-surface-inset/98 border-r border-border flex flex-col justify-between shrink-0 select-none transition-transform duration-300 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex flex-col min-h-0 flex-1">
            {/* Server Header Dropdown */}
            <div className="relative border-b border-border/80 bg-surface/50">
              <button
                onClick={() => setShowServerMenu((prev) => !prev)}
                className="w-full h-14 px-4 flex items-center justify-between hover:bg-surface-hover transition cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedCommunity.isPrivate ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span className="text-sm font-black text-text truncate">{selectedCommunity.name}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-text-secondary transition transform ${showServerMenu ? "rotate-180" : ""}`}
                />
              </button>

              {/* Server Menu Dropdown Popover */}
              <AnimatePresence>
                {showServerMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-15 left-2 right-2 z-50 bg-surface border border-border rounded-2xl shadow-2xl p-1.5 space-y-1 backdrop-blur-2xl"
                  >
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowServerMenu(false);
                          setShowCommunitySettings(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-text hover:bg-surface-inset transition cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-primary" />
                        <span>Server Settings</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowServerMenu(false);
                          setShowCreateChannel(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-text hover:bg-surface-inset transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-indigo-400" />
                        <span>Create Channel</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowServerMenu(false);
                        navigator.clipboard.writeText(selectedCommunity.inviteCode);
                        snackbar.success("Invite code copied to clipboard!");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-text hover:bg-surface-inset transition cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-emerald-400" />
                      <span>Copy Invite Link</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Categorized Channels List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-4 hide-scrollbar">
              {channelCategories.map((category) => {
                const isCollapsed = collapsedCategories[category];
                const categoryChannels = channels.filter(
                  (c) => (c.category || (c.type === "text" ? "TEXT CHANNELS" : "VOICE ROOMS")) === category
                );

                return (
                  <div key={category} className="space-y-0.5">
                    {/* Category Header with Collapse Toggle */}
                    <div className="flex items-center justify-between text-[10px] font-black text-text-muted uppercase tracking-wider px-2 py-1 group">
                      <button
                        onClick={() => toggleCategoryCollapse(category)}
                        className="flex items-center gap-1 hover:text-text cursor-pointer"
                      >
                        <ChevronDown
                          className={`w-3 h-3 transition transform ${isCollapsed ? "-rotate-90" : ""}`}
                        />
                        <span>{category}</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setNewChanCategory(category);
                            setShowCreateChannel(true);
                          }}
                          className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-text cursor-pointer rounded transition"
                          title="Add Channel"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Channels under this category */}
                    {!isCollapsed &&
                      categoryChannels.map((chan) => {
                        const isSel = selectedChannel?._id === chan._id;
                        const activeVoiceUsers = voicePresence[chan._id] || [];

                        return (
                          <div key={chan._id} className="space-y-1">
                            <div
                              onClick={() => {
                                setSelectedChannel(chan);
                                setMobileSidebarOpen(false);
                              }}
                              className={`group/chan w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                isSel
                                  ? "bg-surface text-text shadow-sm"
                                  : "text-text-secondary hover:bg-surface/50 hover:text-text"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                {chan.type === "text" ? (
                                  <Hash className="w-4 h-4 text-text-muted shrink-0" />
                                ) : chan.type === "voice" ? (
                                  <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                                ) : (
                                  <Video className="w-4 h-4 text-purple-400 shrink-0" />
                                )}
                                <span className="truncate">{chan.name}</span>
                              </div>

                              {/* Channel Edit Gear (Admin/Owner) */}
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChannelToEdit(chan);
                                  }}
                                  className="p-1 opacity-0 group-hover/chan:opacity-100 hover:text-primary transition cursor-pointer"
                                  title="Channel Settings"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Live Voice Presence connected avatars */}
                            {activeVoiceUsers.length > 0 && (
                              <div className="pl-6 space-y-1">
                                {activeVoiceUsers.map((u) => (
                                  <div key={u._id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-surface/40">
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-surface relative">
                                      <img
                                        src={u.profileImage?.url || ""}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                      <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    </div>
                                    <span className="text-[11px] font-semibold text-text truncate">@{u.userName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom User Bar */}
          <div className="p-3 border-t border-border/80 bg-surface/50 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface shrink-0 border border-border relative">
                {userData?.user?.profileImage?.url ? (
                  <img src={userData.user.profileImage.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-text font-bold text-[10px] flex items-center justify-center h-full">
                    {userData?.user?.userName?.[0]?.toUpperCase()}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-bg" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-text truncate">@{userData?.user?.userName || "user"}</span>
                <span className="text-[10px] text-text-muted">Online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MAIN VIEW: CHAT FEED / WEBRTC / EXPLORE DIRECTORY
         ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg min-w-0">
        {isExploreActive ? (
          <CommunityExploreModal
            isOpen={true}
            onClose={() => setIsExploreActive(false)}
            onJoinedCommunity={(newComm) => {
              fetchCommunities(newComm._id);
            }}
          />
        ) : !selectedCommunity ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-bg via-surface/20 to-bg">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center shadow-2xl shadow-primary/20 mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text mb-2">Welcome to Vybe Communities</h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-md mb-6">
              Hang out with friends, join public hubs, create voice & video stages, and experience seamless real-time channels.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExploreActive(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-xs font-bold text-white rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Communities</span>
              </button>
              <button
                onClick={() => setShowCreateCommunity(true)}
                className="px-5 py-2.5 bg-surface hover:bg-surface-inset border border-border text-xs font-bold text-text rounded-xl transition cursor-pointer"
              >
                Create a Server
              </button>
            </div>
          </div>
        ) : !selectedChannel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Hash className="w-12 h-12 text-text-muted mb-3" />
            <h3 className="text-base font-bold text-text mb-1">No Channel Selected</h3>
            <p className="text-xs text-text-muted">Select a channel from the left sidebar to start chatting.</p>
          </div>
        ) : selectedChannel.type === "text" ? (
          /* ─── TEXT CHANNEL CHAT VIEW ─── */
          <div className="flex-1 flex h-full overflow-hidden min-w-0">
            <div className="flex-1 flex flex-col h-full bg-bg min-w-0">
              {/* Channel Header */}
              <div className="h-14 border-b border-border/80 px-4 sm:px-6 flex items-center justify-between bg-surface/30 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2.5 truncate">
                  {/* Mobile drawer toggle */}
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="p-1.5 text-text-secondary hover:text-text md:hidden cursor-pointer"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  <Hash className="w-5 h-5 text-text-muted shrink-0" />
                  <span className="text-sm font-black text-text truncate">{selectedChannel.name}</span>
                  {selectedChannel.topic && (
                    <>
                      <span className="text-border hidden sm:inline">|</span>
                      <span className="text-xs text-text-secondary truncate max-w-xs hidden sm:inline">
                        {selectedChannel.topic}
                      </span>
                    </>
                  )}
                </div>

                {/* Top Action Icons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* In-Channel Search Toggle */}
                  <button
                    onClick={() => setShowSearchInChannel((prev) => !prev)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      showSearchInChannel
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-surface border-border text-text-secondary hover:text-text"
                    }`}
                    title="Search Messages"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  {/* Pinned Messages Button */}
                  <button
                    onClick={() => setShowPinnedModal(true)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      pinnedMessages.length > 0
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-surface border-border text-text-secondary hover:text-text"
                    }`}
                    title="Pinned Messages"
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  {/* Toggle Member List */}
                  <button
                    onClick={() => setShowMembersSidebar((prev) => !prev)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      showMembersSidebar
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-surface border-border text-text-secondary hover:text-text"
                    }`}
                    title="Toggle Member List"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* In-Channel Search Bar */}
              <AnimatePresence>
                {showSearchInChannel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-border bg-surface-inset/70 px-6 py-2.5 flex items-center gap-3 shrink-0 overflow-hidden"
                  >
                    <Search className="w-4 h-4 text-text-muted shrink-0" />
                    <input
                      type="text"
                      placeholder={`Search in #${selectedChannel.name}...`}
                      value={channelSearchQuery}
                      onChange={(e) => setChannelSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-muted"
                      autoFocus
                    />
                    {channelSearchQuery && (
                      <span className="text-[10px] font-bold text-text-muted">
                        {filteredMessages.length} match(es)
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setShowSearchInChannel(false);
                        setChannelSearchQuery("");
                      }}
                      className="p-1 text-text-muted hover:text-text cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 hide-scrollbar">
                {filteredMessages.map((msg, index) => {
                  const isMe = (msg.sender?._id || msg.sender)?.toString() === currentUserId?.toString();
                  const isOwnerSender =
                    (selectedCommunity?.owner?._id || selectedCommunity?.owner)?.toString() ===
                    (msg.sender?._id || msg.sender)?.toString();

                  return (
                    <div
                      key={msg._id || index}
                      className="group relative flex items-start gap-3 hover:bg-surface/30 p-2 -mx-2 rounded-2xl transition duration-150"
                    >
                      {/* Avatar */}
                      <div
                        onClick={() => setActiveProfileMember(msg.sender)}
                        className="w-10 h-10 rounded-2xl overflow-hidden bg-surface flex items-center justify-center shrink-0 border border-border cursor-pointer hover:ring-2 hover:ring-primary/40 transition"
                      >
                        {msg.sender?.profileImage?.url ? (
                          <img src={msg.sender.profileImage.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-text font-black text-sm">{msg.sender?.userName?.[0]?.toUpperCase()}</span>
                        )}
                      </div>

                      {/* Content Body */}
                      <div className="flex-1 min-w-0">
                        {/* Header details */}
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            onClick={() => setActiveProfileMember(msg.sender)}
                            className="text-xs font-black text-text hover:underline cursor-pointer flex items-center gap-1"
                          >
                            @{msg.sender?.userName || "user"}
                            {isOwnerSender && <Crown className="w-3.5 h-3.5 text-amber-400" title="Server Owner" />}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.edited && (
                            <span className="text-[10px] text-text-muted italic">(edited)</span>
                          )}
                          {msg.isPinned && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          )}
                        </div>

                        {/* Reply-to Quote Preview */}
                        {msg.replyTo && (
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted mb-1 pl-2 border-l-2 border-primary/50">
                            <CornerUpLeft className="w-3 h-3 text-primary" />
                            <span className="font-bold">@{msg.replyTo.sender?.userName}:</span>
                            <span className="truncate max-w-xs">{msg.replyTo.content?.text || "Attachment"}</span>
                          </div>
                        )}

                        {/* Message payload */}
                        {msg.type === "voice" || msg.content?.voiceDuration > 0 ? (
                          <div className="max-w-md">
                            <VoiceNotePlayer
                              audioUrl={msg.content?.media?.[0]?.url}
                              duration={msg.content?.voiceDuration || 0}
                              isSender={isMe}
                            />
                          </div>
                        ) : msg.type === "sticker" || msg.content?.media?.[0]?.type === "sticker" ? (
                          <div className="max-w-[100px] max-h-[100px] my-1">
                            <img src={msg.content?.media?.[0]?.url} alt="" className="w-24 h-24 object-contain" />
                          </div>
                        ) : (
                          <>
                            {msg.content?.text && (
                              <p className="text-xs text-text leading-relaxed break-words">{msg.content.text}</p>
                            )}

                            {/* Attachments with Lightbox Trigger */}
                            {msg.content?.media?.map((m, i) => (
                              <div
                                key={i}
                                onClick={() => setActiveLightboxMedia(m)}
                                className="mt-2 rounded-2xl overflow-hidden border border-border max-w-sm cursor-pointer hover:opacity-95 transition group/media relative"
                              >
                                {m.type === "image" ? (
                                  <img src={m.url} alt="" className="max-h-64 w-auto object-cover" />
                                ) : m.type === "video" ? (
                                  <video src={m.url} controls className="max-h-64 w-auto" />
                                ) : (
                                  <a
                                    href={m.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-3 bg-surface flex items-center gap-2 text-xs text-text hover:underline"
                                  >
                                    <Paperclip className="w-4 h-4 text-primary" />
                                    <span>{m.name || "Attachment"}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </>
                        )}

                        {/* Reactions row */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {msg.reactions.map((r, rIdx) => (
                              <button
                                key={rIdx}
                                onClick={() => handleReaction(msg._id, r.emoji)}
                                className="px-2 py-0.5 rounded-lg bg-surface border border-border text-xs hover:scale-110 transition cursor-pointer flex items-center gap-1"
                              >
                                <span>{r.emoji}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hover Action Bar */}
                      <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition duration-150 bg-surface border border-border rounded-xl shadow-lg flex items-center p-1 gap-1 backdrop-blur-md z-10">
                        {/* Quick Reaction */}
                        <button
                          onClick={() => handleReaction(msg._id, "❤️")}
                          className="p-1 hover:bg-surface-inset rounded-lg text-xs cursor-pointer"
                          title="Love"
                        >
                          ❤️
                        </button>
                        <button
                          onClick={() => handleReaction(msg._id, "🔥")}
                          className="p-1 hover:bg-surface-inset rounded-lg text-xs cursor-pointer"
                          title="Fire"
                        >
                          🔥
                        </button>
                        <button
                          onClick={() => handleReaction(msg._id, "😂")}
                          className="p-1 hover:bg-surface-inset rounded-lg text-xs cursor-pointer"
                          title="Laugh"
                        >
                          😂
                        </button>

                        <div className="w-[1px] h-4 bg-border" />

                        {/* Reply */}
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="p-1.5 hover:bg-surface-inset rounded-lg text-text-secondary hover:text-text cursor-pointer"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Message (Sender only) */}
                        {isMe && msg.type !== "voice" && msg.type !== "sticker" && (
                          <button
                            onClick={() => handleStartEditMessage(msg)}
                            className="p-1.5 hover:bg-surface-inset rounded-lg text-text-secondary hover:text-primary cursor-pointer"
                            title="Edit Message"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Pin */}
                        {isAdmin && (
                          <button
                            onClick={() => handleTogglePin(msg._id)}
                            className="p-1.5 hover:bg-surface-inset rounded-lg text-text-secondary hover:text-amber-400 cursor-pointer"
                            title="Pin Message"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        {(isMe || isAdmin) && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-text-secondary hover:text-rose-500 cursor-pointer"
                            title="Delete Message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Typing indicator */}
              {Object.keys(typingUsers).length > 0 && (
                <div className="px-6 py-1 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 bg-surface/20">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span>{Object.values(typingUsers).join(", ")} is typing...</span>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-border/80 bg-surface/30 relative">
                {/* Reply Banner */}
                {replyTo && (
                  <div className="flex items-center justify-between bg-surface-inset px-3 py-1.5 rounded-xl mb-2 text-xs border border-border">
                    <div className="flex items-center gap-2 truncate">
                      <CornerUpLeft className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-bold">Replying to @{replyTo.sender?.userName}:</span>
                      <span className="truncate text-text-muted">{replyTo.content?.text || "Attachment"}</span>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="p-1 hover:text-rose-500 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Edit Banner */}
                {editingMessage && (
                  <div className="flex items-center justify-between bg-primary/10 px-3 py-1.5 rounded-xl mb-2 text-xs border border-primary/20 text-primary">
                    <div className="flex items-center gap-2 truncate">
                      <Edit2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold">Editing message (Press Enter to save, Esc to cancel)</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMessage(null);
                        setChatInput("");
                      }}
                      className="p-1 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Vybe Expression Picker */}
                {showExpressionPicker.open && (
                  <VybeExpressionPicker
                    initialTab={showExpressionPicker.tab}
                    onSelectEmoji={(emoji) => {
                      setChatInput((prev) => prev + emoji);
                    }}
                    onSendSticker={handleSendSticker}
                    onClose={() => setShowExpressionPicker({ open: false, tab: "emojis" })}
                  />
                )}

                {isRecordingVoice ? (
                  <VoiceRecorder onSendVoiceNote={handleSendVoiceNote} onCancel={() => setIsRecordingVoice(false)} />
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* Attachment button */}
                    {!editingMessage && (
                      <>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 bg-surface hover:bg-surface-inset border border-border text-text-secondary hover:text-text rounded-2xl transition cursor-pointer shrink-0"
                          title="Attach File"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                        />
                      </>
                    )}

                    {/* Capsule Input Bar */}
                    <div className="flex-1 flex items-center bg-surface border border-border rounded-2xl px-3 py-1.5 focus-within:border-primary transition">
                      {/* Emoji Trigger */}
                      <button
                        type="button"
                        data-expression-trigger="true"
                        onClick={() => setShowExpressionPicker((prev) => ({ open: !prev.open, tab: "emojis" }))}
                        className="p-1.5 text-text-secondary hover:text-text transition cursor-pointer shrink-0"
                        title="Emojis & 3D Stickers"
                      >
                        <Smile className="w-4 h-4" />
                      </button>

                      <input
                        ref={chatInputRef}
                        type="text"
                        placeholder={
                          editingMessage
                            ? "Edit your message..."
                            : selectedChannel.slowmode > 0
                            ? `Message #${selectedChannel.name} (Slowmode ${selectedChannel.slowmode}s)`
                            : `Message #${selectedChannel.name}`
                        }
                        value={chatInput}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === "Escape" && editingMessage) {
                            setEditingMessage(null);
                            setChatInput("");
                          }
                        }}
                        className="flex-1 bg-transparent text-xs sm:text-sm px-2.5 py-1.5 text-text outline-none placeholder:text-text-muted"
                      />

                      {/* File badge preview */}
                      {selectedFiles.length > 0 && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 mr-2">
                          {selectedFiles.length} file(s)
                        </span>
                      )}

                      {/* Voice Note Button */}
                      {!chatInput.trim() && selectedFiles.length === 0 && !editingMessage && (
                        <button
                          type="button"
                          onClick={() => setIsRecordingVoice(true)}
                          className="p-1.5 text-text-secondary hover:text-text transition cursor-pointer shrink-0"
                          title="Record Voice Note"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!chatInput.trim() && selectedFiles.length === 0}
                      className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-40 text-white rounded-2xl shadow transition cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                SIDEBAR 3: RIGHT COMMUNITY MEMBERS SIDEBAR
               ══════════════════════════════════════════════════ */}
            {showMembersSidebar && (
              <div className="w-60 bg-surface-inset/90 border-l border-border p-4 flex flex-col shrink-0 select-none overflow-y-auto hide-scrollbar z-10 hidden lg:flex">
                <div className="space-y-4">
                  {/* Owners */}
                  {owners.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block mb-1 px-2">
                        Owner — {owners.length}
                      </span>
                      {owners.map((m) => (
                        <div
                          key={m.user?._id}
                          onClick={() => setActiveProfileMember(m.user)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface/80 transition cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-surface relative shrink-0">
                            <img src={m.user?.profileImage?.url || ""} alt="" className="w-full h-full object-cover" />
                            {m.user?.isOnline && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-bg" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-text truncate">@{m.user?.userName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Admins */}
                  {admins.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider block mb-1 px-2">
                        Admins — {admins.length}
                      </span>
                      {admins.map((m) => (
                        <div
                          key={m.user?._id}
                          onClick={() => setActiveProfileMember(m.user)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface/80 transition cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-surface relative shrink-0">
                            <img src={m.user?.profileImage?.url || ""} alt="" className="w-full h-full object-cover" />
                            {m.user?.isOnline && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-bg" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-text truncate">@{m.user?.userName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Online */}
                  {onlineMembers.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-1 px-2">
                        Online — {onlineMembers.length}
                      </span>
                      {onlineMembers.map((m) => (
                        <div
                          key={m.user?._id}
                          onClick={() => setActiveProfileMember(m.user)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface/80 transition cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-surface relative shrink-0">
                            <img src={m.user?.profileImage?.url || ""} alt="" className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-bg" />
                          </div>
                          <span className="text-xs font-bold text-text truncate">@{m.user?.userName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Offline */}
                  {offlineMembers.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1 px-2">
                        Offline — {offlineMembers.length}
                      </span>
                      {offlineMembers.map((m) => (
                        <div
                          key={m.user?._id}
                          onClick={() => setActiveProfileMember(m.user)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface/80 opacity-70 hover:opacity-100 transition cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-surface relative shrink-0">
                            <img src={m.user?.profileImage?.url || ""} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-bold text-text truncate">@{m.user?.userName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─── VOICE / VIDEO WEBRTC ROOM VIEW ─── */
          <div className="flex-1 flex flex-col h-full bg-bg">
            <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-surface/30 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="p-1.5 text-text-secondary hover:text-text md:hidden cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                </button>
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

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-surface/5">
              {activeVoiceRoom !== selectedChannel._id ? (
                <div className="text-center p-8 bg-surface border border-border backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    {selectedChannel.type === "voice" ? (
                      <Volume2 className="w-8 h-8 text-blue-400 animate-bounce" />
                    ) : (
                      <Video className="w-8 h-8 text-purple-400 animate-bounce" />
                    )}
                  </div>
                  <h4 className="text-base font-bold text-text mb-2">Ready to join channel?</h4>
                  <p className="text-xs text-text-secondary mb-6">
                    Connect with server members in high-fidelity audio and video.
                  </p>
                  <button
                    onClick={() => {
                      setActiveVoiceRoom(selectedChannel._id);
                      playJoinSound();
                      const socket = getSocket();
                      socket?.emit("community:voice-presence-join", {
                        communityId: selectedCommunity._id,
                        channelId: selectedChannel._id,
                        user: userData?.user,
                      });
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-95 text-xs font-bold text-white rounded-xl shadow-lg transition cursor-pointer"
                  >
                    Join Channel
                  </button>
                </div>
              ) : (
                <ActiveWebRTCChannelRoom
                  channelId={selectedChannel._id}
                  type={selectedChannel.type}
                  currentUserId={currentUserId}
                  onLeave={() => {
                    playLeaveSound();
                    setActiveVoiceRoom(null);
                    const socket = getSocket();
                    socket?.emit("community:voice-presence-leave", {
                      communityId: selectedCommunity._id,
                      channelId: selectedChannel._id,
                      userId: currentUserId,
                    });
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MODALS & DRAWERS
         ══════════════════════════════════════════════════════ */}

      {/* Create Community Modal */}
      <AnimatePresence>
        {showCreateCommunity && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md p-6 rounded-3xl shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateCommunity(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-text mb-4">Create Your Server</h3>
              <form onSubmit={handleCreateCommunity} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Server Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pixel Forge Gaming"
                    value={newCommName}
                    onChange={(e) => setNewCommName(e.target.value)}
                    className="bg-surface-inset border border-border text-xs px-3.5 py-2 rounded-xl text-text outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Category</label>
                  <select
                    value={newCommCategory}
                    onChange={(e) => setNewCommCategory(e.target.value)}
                    className="bg-surface-inset border border-border text-xs px-3.5 py-2 rounded-xl text-text outline-none focus:border-primary"
                  >
                    {["General", "Gaming", "Technology", "Music", "Education", "Entertainment", "Creator"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Description</label>
                  <textarea
                    placeholder="What is your server about?"
                    value={newCommDesc}
                    onChange={(e) => setNewCommDesc(e.target.value)}
                    className="bg-surface-inset border border-border text-xs px-3.5 py-2 rounded-xl text-text outline-none focus:border-primary h-20 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="commPrivate"
                    checked={newCommPrivate}
                    onChange={(e) => setNewCommPrivate(e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />
                  <label
                    htmlFor="commPrivate"
                    className="text-xs text-text font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-text-muted" /> Private Server (Requires invite code)
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-bold text-white rounded-xl shadow-lg transition cursor-pointer"
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
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-sm p-6 rounded-3xl shadow-2xl relative"
            >
              <button
                onClick={() => setShowJoinCommunity(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-text mb-4">Join Server</h3>
              <form onSubmit={handleJoinWithCode} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Invite Code</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter invite code (e.g. a1b2c3d4)"
                    value={joinInviteCode}
                    onChange={(e) => setJoinInviteCode(e.target.value)}
                    className="bg-surface-inset border border-border text-xs px-3.5 py-2 rounded-xl text-text outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-bold text-white rounded-xl shadow-lg transition cursor-pointer"
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
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md p-6 rounded-3xl shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateChannel(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
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
                    className="bg-surface-inset border border-border text-xs px-3.5 py-2 rounded-xl text-text outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Category</label>
                  <input
                    type="text"
                    value={newChanCategory}
                    onChange={(e) => setNewChanCategory(e.target.value)}
                    placeholder="e.g. TEXT CHANNELS or ANNOUNCEMENTS"
                    className="bg-surface-inset border border-border text-xs px-3.5 py-2 rounded-xl text-text outline-none focus:border-primary"
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
                        className={`py-2 px-3 border rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                          newChanType === type
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-surface-inset border-border text-text-secondary hover:text-text"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Topic / Description</label>
                  <input
                    type="text"
                    placeholder="What is this channel for?"
                    value={newChanTopic}
                    onChange={(e) => setNewChanTopic(e.target.value)}
                    className="bg-surface-inset border border-border text-xs px-3.5 py-2 rounded-xl text-text outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-bold text-white rounded-xl shadow-lg transition cursor-pointer"
                >
                  Create Channel
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Channel Modal */}
      {channelToEdit && (
        <ChannelSettingsModal
          isOpen={Boolean(channelToEdit)}
          channel={channelToEdit}
          communityId={selectedCommunity._id}
          onClose={() => setChannelToEdit(null)}
          onChannelUpdated={(updated) => {
            setChannels((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
            if (selectedChannel?._id === updated._id) setSelectedChannel(updated);
          }}
          onChannelDeleted={(deletedId) => {
            setChannels((prev) => prev.filter((c) => c._id !== deletedId));
            if (selectedChannel?._id === deletedId) {
              const remaining = channels.filter((c) => c._id !== deletedId);
              setSelectedChannel(remaining[0] || null);
            }
          }}
        />
      )}

      {/* Pinned Messages Modal */}
      {showPinnedModal && (
        <CommunityPinnedMessagesModal
          isOpen={showPinnedModal}
          channelName={selectedChannel?.name}
          pinnedMessages={pinnedMessages}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setShowPinnedModal(false)}
          onUnpin={(msgId) => handleTogglePin(msgId)}
        />
      )}

      {/* Media Lightbox */}
      {activeLightboxMedia && (
        <CommunityMediaLightbox
          media={activeLightboxMedia}
          onClose={() => setActiveLightboxMedia(null)}
        />
      )}

      {/* Community Settings Modal */}
      {showCommunitySettings && (
        <CommunitySettingsModal
          isOpen={showCommunitySettings}
          community={selectedCommunity}
          channels={channels}
          currentUserId={currentUserId}
          onClose={() => setShowCommunitySettings(false)}
          onCommunityUpdated={(updated) => {
            setSelectedCommunity(updated);
            fetchCommunities();
          }}
          onCommunityDeleted={() => {
            setSelectedCommunity(null);
            fetchCommunities();
          }}
          onCommunityLeft={() => {
            setSelectedCommunity(null);
            fetchCommunities();
          }}
        />
      )}

      {/* Member Profile Modal */}
      {activeProfileMember && (
        <CommunityMemberProfileModal
          isOpen={Boolean(activeProfileMember)}
          member={activeProfileMember}
          community={selectedCommunity}
          currentUserId={currentUserId}
          onClose={() => setActiveProfileMember(null)}
          onKickMember={() => {
            handleSelectCommunity(selectedCommunity);
          }}
        />
      )}
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
      <div
        className={`flex-1 grid gap-4 mb-4 ${
          streamCount === 1
            ? "grid-cols-1"
            : streamCount === 2
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-2 md:grid-cols-3"
        }`}
      >
        {/* Local Stream */}
        <div className="relative bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
          {rtc.isVideoOff ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-2 font-bold text-white text-lg">
                You
              </div>
              <p className="text-xs text-text-muted">Camera Off</p>
            </div>
          ) : (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5">
            You {rtc.isMuted && "(Muted)"} {rtc.isHandRaised && <span className="text-amber-400">✋</span>}
          </div>
        </div>

        {/* Remote Streams */}
        {peersList.map(([socketId, peerData]) => (
          <div key={socketId} className="relative bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
            {peerData.videoOff ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-2 font-bold text-white text-lg">
                  {peerData.userName?.[0]?.toUpperCase() || "P"}
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
              />
            )}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5">
              @{peerData.userName || "Participant"} {peerData.muted && "(Muted)"} {peerData.handRaised && <span className="text-amber-400">✋</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Control Panel */}
      <div className="flex items-center justify-center gap-3 bg-surface border border-border p-3.5 rounded-3xl max-w-lg mx-auto w-full shadow-2xl backdrop-blur-md">
        <button
          onClick={rtc.toggleMute}
          className={`p-3 rounded-2xl transition cursor-pointer ${
            rtc.isMuted ? "bg-rose-500/20 text-rose-500 border border-rose-500/35" : "bg-surface-inset text-text hover:bg-surface border border-border"
          }`}
          title={rtc.isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {rtc.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={rtc.toggleVideo}
          className={`p-3 rounded-2xl transition cursor-pointer ${
            rtc.isVideoOff ? "bg-rose-500/20 text-rose-500 border border-rose-500/35" : "bg-surface-inset text-text hover:bg-surface border border-border"
          }`}
          title={rtc.isVideoOff ? "Turn Video On" : "Turn Video Off"}
        >
          {rtc.isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>

        <button
          onClick={rtc.toggleScreenShare}
          className={`p-3 rounded-2xl transition cursor-pointer ${
            rtc.isScreenSharing ? "bg-purple-500/20 text-purple-400 border border-purple-500/35" : "bg-surface-inset text-text hover:bg-surface border border-border"
          }`}
          title="Share Screen"
        >
          <Monitor className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            rtc.toggleHand();
            playHandRaiseSound();
          }}
          className={`p-3 rounded-2xl transition cursor-pointer ${
            rtc.isHandRaised ? "bg-amber-500/20 text-amber-400 border border-amber-500/35" : "bg-surface-inset text-text hover:bg-surface border border-border"
          }`}
          title="Raise Hand"
        >
          <Hand className="w-4 h-4" />
        </button>

        <button
          onClick={handleDisconnect}
          className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold shadow-lg shadow-rose-600/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Disconnect</span>
        </button>
      </div>
    </div>
  );
};

export default Communities;

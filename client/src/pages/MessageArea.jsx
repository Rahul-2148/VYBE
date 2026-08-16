import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Loader2, LucideImage, Search, SendHorizonal, X, Phone, Video, Mic, MapPin,
  Edit3, Smile, Users, ArrowLeft, Info, CheckCheck, Check, Clock, CornerUpRight,
  Pin, Image, FileText, Link2, ChevronDown, Reply, Heart, Sparkles, BadgeCheck, Minimize2, User, Palette
} from "lucide-react";
import moment from "moment";
import { snackbar } from "../lib/snackbar";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import ReceiverMessage from "../components/ReceiverMessage";
import SenderMessage from "../components/SenderMessage";
import VoiceRecorder from "../components/VoiceRecorder";
// VideoCallModal removed — call flow is handled by global CallManager
import LocationPickerModal from "../components/LocationPickerModal";
import SmartRepliesPill from "../components/SmartRepliesPill";
import ChatInfoDrawer from "../components/ChatInfoDrawer";
import ChatThemePickerModal from "../components/ChatThemePickerModal";
import VerifiedBadge from "../components/VerifiedBadge";
import useMessageSocketEvents from "../hooks/useMessageSocketEvents";
import useTypingIndicator from "../hooks/useTypingIndicator";
import {
  addMessage, addOptimisticMessage, replaceOptimisticMessage, markOptimisticFailed,
  setMessages, prependHistoricalMessages, updateConversationLastMessage, setConversations,
  clearSelectedChatUser, setChatInfoOpen, setForwardModal, minimizeToFloatingDock,
  updateConversationThemeInRedux
} from "../redux/features/messageSlice";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import { useTheme } from "../lib/themeContext";
import { getChatThemeById } from "../lib/chatThemes";

const getDateLabel = (date) => {
  const d = moment(date);
  if (d.isSame(moment(), "day")) return "Today";
  if (d.isSame(moment().subtract(1, "day"), "day")) return "Yesterday";
  return d.format("MMMM D, YYYY");
};

const groupMessages = (messages = []) => {
  if (!Array.isArray(messages)) return [];
  const groups = [];
  messages.forEach((msg, i) => {
    if (!msg) return;
    const prev = messages[i - 1];
    const isSameSender = prev &&
      (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender) &&
      moment(msg.createdAt).diff(moment(prev.createdAt), "minutes") < 2 &&
      prev.type !== "system" && msg.type !== "system";

    groups.push({ ...msg, isGrouped: isSameSender, isLastInGroup: true });
    if (isSameSender && groups.length >= 2) {
      groups[groups.length - 2].isLastInGroup = false;
    }
  });
  return groups;
};

/* ============ DELIVERY STATUS ICON ============ */
const DeliveryStatus = ({ status }) => {
  if (status === "sending") return <Clock className="w-3 h-3 text-text-muted" />;
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-text-muted" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-text-muted" />;
  if (status === "seen") return <CheckCheck className="w-3.5 h-3.5 text-primary font-bold" />;
  if (status === "failed") return <span className="text-[10px] text-red-500 font-bold">Failed</span>;
  return <Check className="w-3.5 h-3.5 text-text-muted" />;
};

/* ============ SYSTEM MESSAGE ============ */
const SystemMessage = ({ message }) => (
  <div className="flex justify-center my-2 select-none">
    <div className="bg-surface/90 border border-border/70 backdrop-blur-md px-4 py-1.5 rounded-full max-w-sm text-center shadow-xs">
      <p className="text-[11px] text-text-muted font-medium">
        {message.sender?.userName || "Someone"} {message.content?.text}
      </p>
    </div>
  </div>
);

/* ============ DATE SEPARATOR ============ */
const DateSeparator = ({ label }) => (
  <div className="flex items-center justify-center my-3 select-none">
    <div className="bg-surface/90 border border-border/80 backdrop-blur-md px-3.5 py-1 rounded-full shadow-xs">
      <span className="text-[11px] font-semibold text-text-secondary">{label}</span>
    </div>
  </div>
);

/* ============ SCROLL TO BOTTOM BUTTON ============ */
const ScrollToBottomButton = ({ onClick, unreadBelow }) => (
  <button
    onClick={onClick}
    className="absolute bottom-20 right-6 z-20 w-10 h-10 bg-surface border border-border hover:bg-surface-hover rounded-full flex items-center justify-center shadow-xl transition cursor-pointer hover:scale-105 active:scale-95"
  >
    <ChevronDown className="w-5 h-5 text-text" />
    {unreadBelow > 0 && (
      <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-xs">
        {unreadBelow}
      </span>
    )}
  </button>
);

export const MessageArea = () => {
  const { selectedChatUser, messages, vanishMode, chatInfoOpen, conversations } = useSelector((s) => s.message);
  const { userData } = useSelector((s) => s.user);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const currentUserId = userData?.user?._id || userData?._id;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tempIdCounter = useRef(0);

  const currentConv = conversations.find(
    (c) => (c._id || c.conversationId)?.toString() === selectedChatUser?.conversationId?.toString()
  );
  const isPendingRequest = currentConv?.requestStatus === "pending";

  const handleAcceptRequest = async () => {
    try {
      const res = await api.patch(`/conversation/accept-request/${selectedChatUser.conversationId}`);
      if (res.data.success) {
        snackbar.success("Message request accepted! ✨");
        const convRes = await api.get("/message/conversations");
        if (convRes.data?.conversations) {
          dispatch(setConversations(convRes.data.conversations));
        }
      }
    } catch {
      snackbar.error("Failed to accept request.");
    }
  };

  const handleDeclineRequest = async () => {
    try {
      const res = await api.delete(`/conversation/decline-request/${selectedChatUser.conversationId}`);
      if (res.data.success) {
        snackbar.success("Message request deleted.");
        dispatch(clearSelectedChatUser());
        navigate("/messages");
      }
    } catch {
      snackbar.error("Failed to delete request.");
    }
  };

  const handleBlockUser = async () => {
    try {
      const res = await api.patch(`/conversation/block/${selectedChatUser.conversationId}`);
      if (res.data.success) {
        snackbar.success("User blocked.");
        dispatch(clearSelectedChatUser());
        navigate("/messages");
      }
    } catch {
      snackbar.error("Failed to block user.");
    }
  };

  const [input, setInput] = useState("");
  const [frontendFiles, setFrontendFiles] = useState([]);
  const [backendFiles, setBackendFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showPicker, setShowPicker] = useState({ open: false, tab: "emojis" });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const handleSendSticker = async (stickerUrl) => {
    setShowPicker({ open: false, tab: "emojis" });
    const tempId = `temp_${tempIdCounter.current++}`;
    const optimisticMessage = {
      _id: tempId,
      conversation: selectedChatUser.conversationId,
      sender: { _id: currentUserId, userName: userData?.user?.userName, profileImage: userData?.user?.profileImage },
      type: "image",
      content: { media: [{ url: stickerUrl, type: "image" }] },
      status: "sending",
      createdAt: new Date().toISOString(),
    };
    dispatch(addOptimisticMessage(optimisticMessage));
    scrollToBottom();
    try {
      const res = await api.post("/message/send", {
        conversationId: selectedChatUser.conversationId,
        messageType: "image",
        sharedData: { mediaUrl: stickerUrl },
        clientMessageId: tempId,
      });
      dispatch(replaceOptimisticMessage({ tempId, message: res.data.message }));
    } catch {
      dispatch(markOptimisticFailed({ tempId }));
    }
  };
  const [editingMessage, setEditingMessage] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [callState, setCallState] = useState({
    isOpen: false,
    callType: "video",
    isIncoming: false,
    callerName: "",
    callerAvatar: null,
  });

  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);
  const fileInput = useRef(null);
  const messageRefs = useRef({});
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  const isGroup = Boolean(selectedChatUser?.user?.isGroup || selectedChatUser?.isGroup);
  const otherUser = isGroup ? null : selectedChatUser?.user;

  const fetchMessages = async (pageNo = 1, prepend = false) => {
    if (!selectedChatUser?.conversationId) return;
    try {
      if (pageNo === 1) setLoadingMessages(true);
      if (pageNo > 1) setLoadingMore(true);

      let url = `/message/${selectedChatUser.conversationId}?limit=30`;
      if (prepend && messages.length > 0) {
        const oldestMsg = messages[0];
        url += `&before=${encodeURIComponent(oldestMsg.createdAt)}`;
      } else {
        url += `&page=${pageNo}`;
      }

      const res = await api.get(url);
      const fetched = res.data.messages || [];

      if (prepend) {
        dispatch(prependHistoricalMessages(fetched));
      } else {
        dispatch(setMessages(fetched));
      }

      setHasMore(res.data.hasMore !== false && fetched.length === 30);
      setLoadingMore(false);
      setLoadingMessages(false);
    } catch {
      snackbar.error("Failed to load messages");
      setLoadingMore(false);
      setLoadingMessages(false);
    }
  };

  const markConversationSeen = async () => {
    try {
      if (!selectedChatUser?.conversationId) return;
      await api.post(`/message/seen/${selectedChatUser.conversationId}`);
    } catch (e) {
      console.warn("MessageArea: markConversationSeen failed", e);
    }
  };

  useEffect(() => {
    if (!selectedChatUser?.conversationId) return;
    (async () => {
      await fetchMessages(1);
      scrollToBottom("auto");
      await markConversationSeen();
    })();
  }, [selectedChatUser?.conversationId]);

  // WebRTC call listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncomingCall = ({ from, callerName, callerAvatar, callType }) => {
      setCallState({
        isOpen: true,
        callType: callType || "video",
        isIncoming: true,
        callerName: callerName || "User",
        callerAvatar,
      });
    };

    socket.on("incoming-call", handleIncomingCall);
    return () => socket.off("incoming-call", handleIncomingCall);
  }, []);

  const scrollToMessage = (id) => {
    const el = messageRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash-highlight");
    setTimeout(() => el.classList.remove("flash-highlight"), 1500);
  };

  const isPaginationRef = useRef(false);

  useEffect(() => {
    if (isPaginationRef.current) {
      isPaginationRef.current = false;
      return;
    }
    if (messages.length && !search) scrollToBottom();
  }, [messages.length]);

  const handleScroll = async () => {
    const container = containerRef.current;
    if (!container) return;

    // Show/hide scroll-to-bottom button
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBtn(distanceFromBottom > 300);

    // Clear date display timeout
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {}, 900);

    // Infinite scroll - load older messages
    if (container.scrollTop < 80 && hasMore && !loadingMore) {
      const currentLength = messages.length;
      const nextPage = Math.floor(currentLength / 30) + 1;
      const prevHeight = container.scrollHeight;

      isPaginationRef.current = true;
      await fetchMessages(nextPage, true);
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevHeight;
      });
    }
  };

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/message/search/${selectedChatUser.conversationId}?q=${q}`);
      setSearchResults(res.data.messages || []);
      if (res.data.messages?.length > 0) {
        scrollToMessage(res.data.messages[0]._id);
      }
    } catch {
      snackbar.error("Search failed");
    }
  };

  const visibleMessages = useMemo(() => {
    const list = Array.isArray(messages) ? messages : [];
    const filtered = list.filter((m) => m && !m.deletedFor?.includes(currentUserId));

    // Deduplicate by _id and clientMessageId
    const seen = new Set();
    const deduplicated = [];
    for (const m of filtered) {
      const id = m._id?.toString();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (m.clientMessageId) seen.add(m.clientMessageId);
      deduplicated.push(m);
    }

    const result = search ? (searchResults || []) : deduplicated;
    return groupMessages(result);
  }, [messages, searchResults, search, currentUserId]);


  // Insert date separators
  const messagesWithDates = useMemo(() => {
    const result = [];
    let lastDate = "";
    visibleMessages.forEach((m) => {
      const date = getDateLabel(m.createdAt);
      if (date !== lastDate) {
        result.push({ _id: `date_${date}_${m._id}`, type: "__date_separator", dateLabel: date });
        lastDate = date;
      }
      result.push(m);
    });
    return result;
  }, [visibleMessages]);

  /* ============ SEND MESSAGE (with optimistic update) ============ */
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() && backendFiles.length === 0 && !editingMessage) return;

    // EDIT MODE
    if (editingMessage) {
      try {
        const res = await api.patch(`/message/edit/${editingMessage._id}`, { text: input });
        if (res.data.success) {
          const socket = getSocket();
          socket?.emit("edit-message", {
            conversationId: selectedChatUser.conversationId,
            messageId: editingMessage._id,
            newText: input,
          });
          snackbar.success("Message edited");
          setEditingMessage(null);
          setInput("");
        }
      } catch {
        snackbar.error("Failed to edit message");
      }
      return;
    }

    // OPTIMISTIC SEND
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage = {
      _id: tempId,
      conversation: selectedChatUser.conversationId,
      sender: { _id: currentUserId, userName: userData?.user?.userName, profileImage: userData?.user?.profileImage },
      type: backendFiles.length > 0 ? "image" : "text",
      content: {
        text: input.trim(),
        media: frontendFiles.map((url) => ({ url, type: "image" })),
      },
      replyTo: replyTo || null,
      status: "sending",
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    dispatch(addOptimisticMessage(optimisticMessage));
    scrollToBottom();

    const savedInput = input;
    const savedFiles = backendFiles;
    const savedReplyTo = replyTo;

    setInput("");
    setFrontendFiles([]);
    setBackendFiles([]);
    setReplyTo(null);
    inputRef.current?.focus();

    try {
      const fd = new FormData();
      fd.append("text", savedInput);
      fd.append("conversationId", selectedChatUser.conversationId);
      fd.append("vanish", vanishMode);
      fd.append("clientMessageId", tempId);
      if (savedFiles.length > 0) {
        savedFiles.forEach((file) => fd.append("media", file));
      }
      if (savedReplyTo) fd.append("replyTo", savedReplyTo._id);

      const res = await api.post("/message/send", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      dispatch(replaceOptimisticMessage({ tempId, message: res.data.message }));
      dispatch(
        updateConversationLastMessage({
          conversationId: selectedChatUser.conversationId,
          message: res.data.message,
          currentUserId,
        })
      );

    } catch (err) {
      dispatch(markOptimisticFailed({ tempId }));
      snackbar.error(err.response?.data?.message || "Send failed");
    }
  };

  const handleSendVoiceNote = async (audioFile, duration) => {
    setIsRecordingVoice(false);
    setIsLoading(true);

    try {
      const fd = new FormData();
      fd.append("audio", audioFile);
      fd.append("conversationId", selectedChatUser.conversationId);
      fd.append("duration", duration);

      const res = await api.post("/message/voice-note", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        dispatch(addMessage(res.data.message));
        dispatch(
          updateConversationLastMessage({
            conversationId: selectedChatUser.conversationId,
            message: res.data.message,
            currentUserId,
          })
        );
      }
    } catch {
      snackbar.error("Failed to send voice note");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendLocation = async (locationData) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      const res = await api.post("/message/send", {
        conversationId: selectedChatUser.conversationId,
        type: "location",
        locationData,
        clientMessageId: tempId,
      });

      if (res.data.success) {
        dispatch(addMessage(res.data.message));
        dispatch(
          updateConversationLastMessage({
            conversationId: selectedChatUser.conversationId,
            message: res.data.message,
            currentUserId,
          })
        );
        snackbar.success("Location shared!");
      }
    } catch {
      snackbar.error("Failed to share location");
    }
  };

  const startCall = (type) => {
    if (!otherUser) {
      snackbar.error("Calling groups/communities can be done directly from voice/video channels.");
      return;
    }
    window.dispatchEvent(
      new CustomEvent("vybe:initiate-call", {
        detail: { type, user: otherUser, conversationId: selectedChatUser?.conversationId },
      })
    );
  };

  const handleForwardMessage = (message) => {
    dispatch(setForwardModal({ open: true, message }));
  };

  const { typingUsers, setTyping, stopTyping, isAnyoneTyping } = useTypingIndicator(selectedChatUser?.conversationId);
  useMessageSocketEvents(selectedChatUser?.conversationId);

  if (!selectedChatUser?.conversationId) {
    return (
      <div className="w-full h-screen bg-bg flex flex-col items-center justify-center text-center p-6 select-none">
        <div className="w-24 h-24 rounded-full border-2 border-border flex items-center justify-center mb-5 bg-surface shadow-lg">
          <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <SendHorizonal className="w-8 h-8 -rotate-12 translate-x-0.5" />
          </div>
        </div>
        <h2 className="text-xl font-extrabold text-text tracking-tight mb-1.5">Your Messages</h2>
        <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
          Send private photos, videos, voice notes and messages to a friend or group.
        </p>
      </div>
    );
  }

  const activeThemeObj = getChatThemeById(currentConv?.theme || "default");
  const bgStyles = currentConv?.vanishMode
    ? {
        backgroundImage: isDark
          ? "linear-gradient(to bottom, #000000, #14050d)"
          : "linear-gradient(to bottom, #fff5f7, #ffffff)",
      }
    : activeThemeObj.getBackground?.(isDark) || {};

  return (
    <div className="w-full h-full bg-bg flex flex-col relative overflow-hidden transition-colors duration-300 min-w-0" style={bgStyles}>
      {/* ===== CHAT HEADER ===== */}
      <div className="flex items-center gap-2.5 px-3 md:px-6 h-[60px] border-b border-border bg-bg/95 backdrop-blur-xl shrink-0 z-10 select-none pt-[env(safe-area-inset-top)] w-full">
        <button
          onClick={() => {
            dispatch(clearSelectedChatUser());
            navigate("/messages");
          }}
          className="p-2 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition cursor-pointer md:hidden shrink-0"
          title="Back to messages"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar & User Details */}
        {!showSearch && (
          <>
            <div className="flex items-center gap-3 flex-1 min-w-0 py-1">
              {isGroup ? (
                <div
                  onClick={() => dispatch(setChatInfoOpen(true))}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] shrink-0 cursor-pointer hover:opacity-90 transition"
                  title="Group Details"
                >
                  <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                    <Users className="w-4.5 h-4.5 text-purple-300" />
                  </div>
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (otherUser?.userName) navigate(`/profile/${otherUser.userName}`);
                  }}
                  className="relative shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  title={`View @${otherUser?.userName}'s profile`}
                >
                  <div className={`w-10 h-10 rounded-full p-[2px] ${
                    otherUser?.isOnline
                      ? "bg-gradient-to-br from-green-400 to-emerald-500"
                      : "bg-surface-hover"
                  }`}>
                    <img src={otherUser?.profileImage?.url || dp} className="w-full h-full rounded-full object-cover border border-bg" alt="" />
                  </div>
                  {otherUser?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-bg rounded-full shadow-xs">
                      <div className="w-full h-full rounded-full bg-green-400 animate-pulse" />
                    </div>
                  )}
                </div>
              )}

              <div
                className="min-w-0 flex-1 cursor-pointer group"
                onClick={() => {
                  if (!isGroup && otherUser?.userName) {
                    navigate(`/profile/${otherUser.userName}`);
                  } else {
                    dispatch(setChatInfoOpen(true));
                  }
                }}
                title={!isGroup ? `View @${otherUser?.userName}'s profile` : "Group details"}
              >
                <p className="text-[14px] font-bold text-text truncate leading-tight flex items-center gap-1 group-hover:underline">
                  {isGroup ? selectedChatUser.user?.groupName || "Group Chat" : otherUser?.userName}
                  {!isGroup && otherUser?.isVerified && (
                    <VerifiedBadge size="sm" />
                  )}
                </p>
                <p className="text-[11px] truncate leading-tight mt-0.5">
                  {isAnyoneTyping ? (
                    <span className="text-green-500 font-medium flex items-center gap-1.5">
                      <span>typing</span>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </span>
                  ) : isGroup ? (
                    <span className="text-text-muted">{selectedChatUser.user?.participants?.length || 0} members</span>
                  ) : otherUser?.isOnline ? (
                    <span className="text-green-500 font-medium">Active now</span>
                  ) : otherUser?.lastSeen ? (
                    <span className="text-text-muted">Active {moment(otherUser.lastSeen).fromNow()}</span>
                  ) : (
                    <span className="text-text-muted">Offline</span>
                  )}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {!isGroup && (
                <>
                  <button onClick={() => startCall("audio")} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer" title="Voice Call">
                    <Phone className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={() => startCall("video")} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer" title="Video Call">
                    <Video className="w-4.5 h-4.5" />
                  </button>
                </>
              )}
              {/* Theme & Wallpaper Picker */}
              <button
                type="button"
                onClick={() => setShowThemePicker(true)}
                className="p-2 text-text-secondary hover:text-purple-400 rounded-full hover:bg-surface-hover transition cursor-pointer"
                title="Chat Theme & Wallpapers"
              >
                <Palette className="w-4.5 h-4.5 text-purple-400" />
              </button>

              {/* Minimize to Floating Dock / Mini Window */}
              <button
                onClick={() => {
                  dispatch(
                    minimizeToFloatingDock({
                      _id: selectedChatUser.conversationId,
                      name: isGroup ? selectedChatUser.user?.groupName : undefined,
                      participant: otherUser,
                    })
                  );
                  navigate(-1);
                }}
                className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer hidden md:flex"
                title="Minimize to Mini Window"
              >
                <Minimize2 className="w-4.5 h-4.5" />
              </button>
              <button onClick={() => dispatch(setChatInfoOpen(!chatInfoOpen))} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer" title="Conversation Details">
                <Info className="w-4.5 h-4.5" />
              </button>
            </div>
          </>
        )}

        {showSearch && (
          <div className="flex-1 flex items-center gap-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search in conversation..."
              className="flex-1 bg-surface px-4 py-1.5 rounded-xl text-sm text-text outline-none border border-border focus:border-primary transition"
            />
            <button onClick={() => { setSearch(""); setShowSearch(false); setSearchResults([]); }} className="p-2 text-text-secondary hover:text-text">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* ===== DISAPPEARING MESSAGES BANNER ===== */}
      {currentConv?.disappearingMessages?.enabled && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2.5 shrink-0 select-none">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-[11px] text-text-secondary">
            Disappearing messages are on · Messages disappear after{" "}
            <span className="text-amber-500 font-semibold">
              {currentConv.disappearingMessages.duration <= 86400
                ? "24 hours"
                : currentConv.disappearingMessages.duration <= 604800
                ? "7 days"
                : "90 days"}
            </span>
          </p>
        </div>
      )}

      {/* ===== VANISH MODE ACTIVE BANNER ===== */}
      {currentConv?.vanishMode && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 flex items-center gap-2.5 shrink-0 animate-pulse select-none">
          <Clock className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-[11px] text-rose-500 font-medium">
            Vanish mode is active · Seen messages disappear when you exit the chat.
          </p>
        </div>
      )}

      {/* ===== EDITING / REPLY BANNER ===== */}
      {editingMessage && (
        <div className="bg-surface border-b border-border px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-xs">
          <div className="w-1 h-8 bg-primary rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-primary">Editing message</p>
            <p className="text-xs text-text-secondary truncate">{editingMessage.content?.text}</p>
          </div>
          <button onClick={() => { setEditingMessage(null); setInput(""); }} className="p-1.5 hover:bg-surface-hover rounded-full transition cursor-pointer text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {replyTo && (
        <div className="bg-surface border-b border-border px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-xs">
          <div className="w-1 h-8 bg-primary rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-primary">
              Replying to {replyTo.sender?.userName || "message"}
            </p>
            <p className="text-xs text-text-secondary truncate">{replyTo.content?.text?.slice(0, 60) || "Media"}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1.5 hover:bg-surface-hover rounded-full transition cursor-pointer text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===== MESSAGES LIST ===== */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 flex flex-col relative hide-scrollbar w-full"
      >
        <div className="w-full max-w-3xl lg:max-w-4xl mx-auto flex flex-col min-h-full">
          {/* Loading more spinner */}
          {loadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}

          {/* Initial loading skeleton */}
          {loadingMessages ? (
            <div className="flex-1 flex flex-col justify-end gap-3 py-4">
              {Array.from({ length: 6 }).map((_, i) => {
                const w = 30 + ((i * 37) % 40);
                const h = 28 + ((i * 17) % 20);
                return (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                    <div className={`animate-pulse rounded-3xl ${i % 2 === 0 ? "bg-primary/10" : "bg-surface-hover"}`} style={{ width: `${w}%`, height: `${h}px` }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {/* Top Profile Intro Card (Compact & Sleek) */}
              {!isGroup && otherUser && (
                <div className="flex flex-col items-center justify-center text-center pt-4 pb-6 px-4 select-none animate-in fade-in duration-200">
                  <div 
                    onClick={() => navigate(`/profile/${otherUser.userName}`)}
                    className="relative group cursor-pointer"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md group-hover:scale-105 transition-transform duration-200">
                      <img
                        src={otherUser.profileImage?.url || dp}
                        alt=""
                        className="w-full h-full rounded-full object-cover bg-bg"
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-0.5">
                    <h3 
                      onClick={() => navigate(`/profile/${otherUser.userName}`)}
                      className="text-sm sm:text-base font-bold text-text hover:underline cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>{otherUser.name || otherUser.userName}</span>
                      {otherUser.isVerified && (
                        <VerifiedBadge size="xs" />
                      )}
                    </h3>
                    <p className="text-[11px] text-text-secondary font-medium">@{otherUser.userName} · VYBE</p>
                    {otherUser.bio && (
                      <p className="text-[11px] text-text-muted max-w-xs line-clamp-2 mt-0.5 mx-auto leading-relaxed">
                        {otherUser.bio}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${otherUser.userName}`)}
                    className="mt-2.5 inline-flex items-center gap-1 px-3.5 py-1 rounded-xl bg-surface-hover hover:bg-surface border border-border text-[11px] font-semibold text-text transition cursor-pointer active:scale-95 shadow-2xs hover:border-primary/40"
                  >
                    <User className="w-3 h-3 text-primary" />
                    <span>View Profile</span>
                  </button>
                </div>
              )}

              {/* Group Intro Card */}
              {isGroup && (
                <div className="flex flex-col items-center justify-center text-center pt-4 pb-6 px-4 select-none animate-in fade-in duration-200">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] shadow-md mb-2">
                    <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                      <Users className="w-8 h-8 text-purple-300" />
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-text">
                    {selectedChatUser.user?.groupName || "Group Chat"}
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {selectedChatUser.user?.participants?.length || 0} members
                  </p>
                </div>
              )}

              {/* Chronological Messages Stream */}
              <div className="flex-1 flex flex-col justify-end space-y-0.5 min-h-[40px]">
                {messagesWithDates.map((m) => {
                  if (m.type === "__date_separator") {
                    return <DateSeparator key={m._id} label={m.dateLabel} />;
                  }

                  if (m.type === "system") {
                    return <SystemMessage key={m._id} message={m} />;
                  }

                  const isMine = (m.sender?._id || m.sender) === currentUserId;

                  return (
                    <div
                      key={m._id}
                      id={`msg-${m._id}`}
                      ref={(el) => (messageRefs.current[m._id] = el)}
                      className={`${m.isGrouped ? "mt-0.5" : "mt-2.5"}`}
                    >
                      {isMine ? (
                        <SenderMessage
                          message={m}
                          isGrouped={m.isGrouped}
                          isLastInGroup={m.isLastInGroup}
                          setReplyTo={setReplyTo}
                          onEditMessage={(msg) => { setEditingMessage(msg); setInput(msg.content?.text || ""); }}
                          onForwardMessage={handleForwardMessage}
                        />
                      ) : (
                        <ReceiverMessage
                          message={m}
                          isGrouped={m.isGrouped}
                          isLastInGroup={m.isLastInGroup}
                          setReplyTo={setReplyTo}
                          onForwardMessage={handleForwardMessage}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && <ScrollToBottomButton onClick={() => scrollToBottom()} unreadBelow={0} />}

      {/* ===== SMART REPLIES ===== */}
      {messages.length > 0 && messages[messages.length - 1]?.sender?._id !== currentUserId && messages[messages.length - 1]?.type !== "system" && (
        <SmartRepliesPill
          lastMessageText={messages[messages.length - 1]?.content?.text || ""}
          onSelectReply={(text) => setInput(text)}
        />
      )}

      {/* ===== FILE PREVIEW ===== */}
      {frontendFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-surface flex gap-2 overflow-x-auto hide-scrollbar shrink-0">
          {frontendFiles.map((url, i) => (
            <div key={i} className="relative group shrink-0">
              <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border shadow-xs" />
              <button
                onClick={() => {
                  setFrontendFiles((p) => p.filter((_, idx) => idx !== i));
                  setBackendFiles((p) => p.filter((_, idx) => idx !== i));
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-surface-hover rounded-full flex items-center justify-center shadow transition cursor-pointer"
              >
                <X className="w-3 h-3 text-text-secondary" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ===== MESSAGE COMPOSER / REQUEST BANNER ===== */}
      {isPendingRequest ? (
        <div className="p-4 border-t border-border bg-surface flex flex-col items-center gap-3 shrink-0 text-center">
          <p className="text-xs text-text font-medium">
            Accept message request from <span className="font-bold text-text">@{otherUser?.userName || "User"}</span>?
          </p>
          <p className="text-[11px] text-text-muted max-w-md leading-relaxed">
            If you accept, they will be able to message you and call you. They won't know you've seen their message until you accept.
          </p>
          <div className="flex items-center gap-2.5 w-full max-w-sm pt-1">
            <button
              onClick={handleAcceptRequest}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
            >
              Accept
            </button>
            <button
              onClick={handleDeclineRequest}
              className="flex-1 py-2.5 bg-surface-hover hover:bg-surface-active text-red-500 text-xs font-bold rounded-xl transition cursor-pointer border border-border"
            >
              Delete
            </button>
            <button
              onClick={handleBlockUser}
              className="px-4 py-2.5 bg-surface hover:bg-surface-hover text-text-secondary hover:text-text text-xs font-bold rounded-xl transition cursor-pointer border border-border"
            >
              Block
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3.5 md:px-6 py-2.5 border-t border-border/80 bg-bg/95 backdrop-blur-xl shrink-0 pb-[calc(0.6rem+env(safe-area-inset-bottom))] w-full">
          <div className="w-full max-w-4xl mx-auto">
            {isRecordingVoice ? (
              <VoiceRecorder onSendVoiceNote={handleSendVoiceNote} onCancel={() => setIsRecordingVoice(false)} />
            ) : (
              <form onSubmit={handleSendMessage} className="relative flex items-center w-full">
                <input
                  hidden
                  ref={fileInput}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setBackendFiles((prev) => [...prev, ...files]);
                    setFrontendFiles((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
                    e.target.value = "";
                  }}
                />

                {/* Vybe Expressions Popover (Emojis & Stickers) */}
                {showPicker.open && (
                  <VybeExpressionPicker
                    initialTab={showPicker.tab}
                    onSelectEmoji={(emoji) => {
                      setInput((prev) => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    onSendSticker={handleSendSticker}
                    onClose={() => setShowPicker({ open: false, tab: "emojis" })}
                  />
                )}

                {/* Input Pill Capsule */}
                <div className="flex-1 bg-surface border border-border/90 rounded-full px-3 py-1.5 flex items-center gap-2 focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/10 transition shadow-xs">
                  {/* Left: Emoji Button */}
                  <button
                    type="button"
                    onClick={() => setShowPicker((prev) => ({ open: !prev.open, tab: "emojis" }))}
                    className="p-1 text-text-secondary hover:text-text transition cursor-pointer shrink-0"
                    title="Emojis"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Center: Text input */}
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (e.target.value.trim()) setTyping();
                      else stopTyping();
                    }}
                    onBlur={stopTyping}
                    placeholder={editingMessage ? "Edit message..." : "Message..."}
                    className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted min-w-0"
                  />

                  {/* Right Side Icons inside Input Pill */}
                  {!(input.trim() || backendFiles.length > 0) ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsRecordingVoice(true)}
                        className="p-1.5 text-text-secondary hover:text-text transition cursor-pointer rounded-full hover:bg-surface-hover"
                        title="Voice note"
                      >
                        <Mic className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="p-1.5 text-text-secondary hover:text-text transition cursor-pointer rounded-full hover:bg-surface-hover"
                        title="Attach photo or video"
                      >
                        <LucideImage className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPicker({ open: true, tab: "stickers" })}
                        className="p-1.5 text-text-secondary hover:text-rose-400 transition cursor-pointer rounded-full hover:bg-surface-hover"
                        title="Stickers & GIFs"
                      >
                        <Sparkles className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="text-sm font-bold text-primary hover:text-primary-hover px-3 py-1 transition cursor-pointer shrink-0 disabled:opacity-50 hover:scale-105 active:scale-95"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== CHAT INFO DRAWER ===== */}
      {chatInfoOpen && (
        <ChatInfoDrawer
          conversationId={selectedChatUser?.conversationId}
          isGroup={isGroup}
          otherUser={otherUser}
          onClose={() => dispatch(setChatInfoOpen(false))}
        />
      )}

      {/* ===== LOCATION PICKER ===== */}
      {showLocationModal && (
        <LocationPickerModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onSendLocation={handleSendLocation}
        />
      )}

      {/* ===== CHAT THEME & WALLPAPER PICKER ===== */}
      {showThemePicker && (
        <ChatThemePickerModal
          isOpen={showThemePicker}
          onClose={() => setShowThemePicker(false)}
          conversationId={selectedChatUser?.conversationId}
          currentTheme={currentConv?.theme || "default"}
          onThemeChanged={(newTheme) => {
            dispatch(
              updateConversationThemeInRedux({
                conversationId: selectedChatUser?.conversationId,
                theme: newTheme,
              })
            );
          }}
        />
      )}
    </div>
  );
};

export default MessageArea;


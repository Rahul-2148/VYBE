import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Loader2, LucideImage, Search, SendHorizonal, X, Phone, Video, Mic, MapPin,
  Edit3, Smile, Users, ArrowLeft, Info, CheckCheck, Check, Clock, CornerUpRight,
  Pin, Image, FileText, Link2, ChevronDown, Reply, Heart, Sparkles, BadgeCheck
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
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
import InstagramExpressionPicker from "../components/InstagramExpressionPicker";
import useMessageSocketEvents from "../hooks/useMessageSocketEvents";
import useTypingIndicator from "../hooks/useTypingIndicator";
import {
  addMessage, addOptimisticMessage, replaceOptimisticMessage, markOptimisticFailed,
  setMessages, prependHistoricalMessages, updateConversationLastMessage,
  clearSelectedChatUser, setChatInfoOpen, setForwardModal,
} from "../redux/features/messageSlice";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import { useTheme } from "../lib/theme.jsx";

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
  if (status === "seen") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === "failed") return <span className="text-[10px] text-red-400 font-semibold">Failed</span>;
  return <Check className="w-3.5 h-3.5 text-text-muted" />;
};

/* ============ SYSTEM MESSAGE ============ */
const SystemMessage = ({ message }) => (
  <div className="flex justify-center py-2">
    <div className="bg-surface/80 backdrop-blur px-4 py-1.5 rounded-full">
      <p className="text-[11px] text-text-muted font-medium text-center">
        {message.sender?.userName || "Someone"} {message.content?.text}
      </p>
    </div>
  </div>
);

/* ============ DATE SEPARATOR ============ */
const DateSeparator = ({ label }) => (
  <div className="flex items-center justify-center py-3">
    <div className="bg-surface/60 backdrop-blur px-4 py-1 rounded-full">
      <span className="text-[11px] font-semibold text-text-muted">{label}</span>
    </div>
  </div>
);

/* ============ SCROLL TO BOTTOM BUTTON ============ */
const ScrollToBottomButton = ({ onClick, unreadBelow }) => (
  <button
    onClick={onClick}
    className="absolute bottom-24 right-6 z-20 w-10 h-10 bg-surface-hover hover:bg-surface-active border border-border-strong rounded-full flex items-center justify-center shadow-xl transition cursor-pointer"
  >
    <ChevronDown className="w-5 h-5 text-text" />
    {unreadBelow > 0 && (
      <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-text text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
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

  const currentConv = conversations.find(
    (c) => (c._id || c.conversationId)?.toString() === selectedChatUser?.conversationId?.toString()
  );
  const isPendingRequest = currentConv?.requestStatus === "pending";

  const handleAcceptRequest = async () => {
    try {
      const res = await api.patch(`/conversation/accept-request/${selectedChatUser.conversationId}`);
      if (res.data.success) {
        toast.success("Message request accepted! ✨");
        const convRes = await api.get("/message/conversations");
        if (convRes.data?.conversations) {
          dispatch(setConversations(convRes.data.conversations));
        }
      }
    } catch {
      toast.error("Failed to accept request.");
    }
  };

  const handleDeclineRequest = async () => {
    try {
      const res = await api.delete(`/conversation/decline-request/${selectedChatUser.conversationId}`);
      if (res.data.success) {
        toast.success("Message request deleted.");
        dispatch(clearSelectedChatUser());
        navigate("/messages");
      }
    } catch {
      toast.error("Failed to delete request.");
    }
  };

  const handleBlockUser = async () => {
    try {
      const res = await api.patch(`/conversation/block/${selectedChatUser.conversationId}`);
      if (res.data.success) {
        toast.success("User blocked.");
        dispatch(clearSelectedChatUser());
        navigate("/messages");
      }
    } catch {
      toast.error("Failed to block user.");
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

  const handleSendSticker = async (stickerUrl) => {
    setShowPicker({ open: false, tab: "emojis" });
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      toast.error("Failed to load messages");
      setLoadingMore(false);
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!selectedChatUser?.conversationId) return;
    (async () => {
      await fetchMessages(1);
      scrollToBottom("auto");
      markConversationSeen();
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

  const scrollToBottom = useCallback((behavior = "smooth") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    });
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

  const markConversationSeen = async () => {
    try {
      await api.post(`/message/seen/${selectedChatUser.conversationId}`);
    } catch {}
  };

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
      toast.error("Search failed");
    }
  };

  const visibleMessages = useMemo(() => {
    const list = Array.isArray(messages) ? messages : [];
    const filtered = list.filter((m) => m && !m.deletedFor?.includes(currentUserId));
    const result = search ? (searchResults || []) : filtered;
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
          toast.success("Message edited");
          setEditingMessage(null);
          setInput("");
        }
      } catch {
        toast.error("Failed to edit message");
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
      toast.error(err.response?.data?.message || "Send failed");
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
      toast.error("Failed to send voice note");
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
        toast.success("Location shared!");
      }
    } catch {
      toast.error("Failed to share location");
    }
  };

  const startCall = (type) => {
    if (!otherUser) {
      toast.error("Calling groups/communities can be done directly from voice/video channels.");
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
        <div className="w-24 h-24 rounded-full border-2 border-border flex items-center justify-center mb-4 bg-surface-inset shadow-2xl">
          <SendHorizonal className="w-10 h-10 text-text-secondary rotate-[-20deg] ml-1" />
        </div>
        <h2 className="text-xl font-bold text-text mb-1">Your Messages</h2>
        <p className="text-sm text-text-muted max-w-sm mb-6">
          Send private photos, videos, voice notes and messages to a friend or group.
        </p>
      </div>
    );
  }

  const bgThemeGlowMap = {
    default: "none",
    sunset: isDark
      ? "linear-gradient(to bottom, #1d0f1a, #0a0309)"
      : "linear-gradient(to bottom, #fff5f5, #ffebd6)",
    ocean: isDark
      ? "linear-gradient(to bottom, #051221, #01060d)"
      : "linear-gradient(to bottom, #f0f7ff, #e0efff)",
    forest: isDark
      ? "linear-gradient(to bottom, #04140c, #010704)"
      : "linear-gradient(to bottom, #f0fdf4, #dcfce7)",
    lavender: isDark
      ? "linear-gradient(to bottom, #100b1a, #050308)"
      : "linear-gradient(to bottom, #faf5ff, #f3e8ff)",
    midnight: "none",
  };

  const bgStyle = currentConv?.vanishMode
    ? "linear-gradient(to bottom, #000000, #080106)"
    : (bgThemeGlowMap[currentConv?.theme || "default"] || bgThemeGlowMap.default);

  return (
    <div className="w-full min-h-dvh bg-bg flex flex-col relative" style={{ backgroundImage: bgStyle }}>
      {/* ===== CHAT HEADER ===== */}
      <div className="flex items-center gap-3 px-4 h-[60px] border-b border-border/80 bg-bg/95 backdrop-blur-xl shrink-0 z-10">
        <button
          onClick={() => {
            dispatch(clearSelectedChatUser());
            navigate("/messages");
          }}
          className="p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition cursor-pointer md:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        {!showSearch && (
          <>
            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => dispatch(setChatInfoOpen(true))}
            >
              {isGroup ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] shrink-0">
                  <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                    <Users className="w-4.5 h-4.5 text-purple-300" />
                  </div>
                </div>
              ) : (
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full p-[2px] ${
                    otherUser?.isOnline
                      ? "bg-gradient-to-br from-green-400 to-emerald-500"
                      : "bg-surface-hover"
                  }`}>
                    <img src={otherUser?.profileImage?.url || dp} className="w-full h-full rounded-full object-cover border-2 border-bg" alt="" />
                  </div>
                  {otherUser?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-[2.5px] border-bg rounded-full">
                      <div className="w-full h-full rounded-full bg-green-400 animate-pulse" />
                    </div>
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-text truncate leading-tight flex items-center gap-1">
                  {isGroup ? selectedChatUser.user?.groupName || "Group Chat" : otherUser?.userName}
                  {!isGroup && otherUser?.isVerified && (
                    <BadgeCheck className="h-4 w-4 fill-[#0095f6] text-white shrink-0" />
                  )}
                </p>
                <p className="text-[11px] truncate leading-tight mt-0.5">
                  {isAnyoneTyping ? (
                    <span className="text-green-400 font-medium flex items-center gap-1">
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                      typing
                    </span>
                  ) : isGroup ? (
                    <span className="text-text-muted">{selectedChatUser.user?.participants?.length || 0} members</span>
                  ) : otherUser?.isOnline ? (
                    <span className="text-green-400 font-medium">Active now</span>
                  ) : otherUser?.lastSeen ? (
                    <span className="text-text-muted">Active {moment(otherUser.lastSeen).fromNow()}</span>
                  ) : (
                    <span className="text-text-muted">Offline</span>
                  )}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              {!isGroup && (
                <>
                  <button onClick={() => startCall("audio")} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button onClick={() => startCall("video")} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer">
                    <Video className="w-5 h-5" />
                  </button>
                </>
              )}
              <button onClick={() => dispatch(setChatInfoOpen(!chatInfoOpen))} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer">
                <Info className="w-5 h-5" />
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
              className="flex-1 bg-surface px-4 py-2 rounded-lg text-sm text-text outline-none border border-border focus:border-border-strong transition"
            />
            <button onClick={() => { setSearch(""); setShowSearch(false); setSearchResults([]); }} className="p-2">
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        )}
      </div>

      {/* ===== DISAPPEARING MESSAGES BANNER ===== */}
      {currentConv?.disappearingMessages?.enabled && (
        <div className="bg-surface/80 border-b border-border/50 px-4 py-2 flex items-center gap-2.5 shrink-0">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-[11px] text-text-secondary">
            Disappearing messages are on · Messages disappear after{" "}
            <span className="text-amber-400 font-semibold">
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
        <div className="bg-rose-950/40 border-b border-rose-900/30 px-4 py-2.5 flex items-center gap-2.5 shrink-0 animate-pulse">
          <Clock className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-[11px] text-rose-200">
            Vanish mode is active · Seen messages will disappear when you exit the chat.
          </p>
        </div>
      )}

      {/* ===== EDITING / REPLY BANNER ===== */}
      {editingMessage && (
        <div className="bg-surface/90 border-b border-border px-4 py-2.5 flex items-center gap-3 shrink-0">
          <div className="w-1 h-8 bg-blue-500 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-blue-400">Editing message</p>
            <p className="text-xs text-text-secondary truncate">{editingMessage.content?.text}</p>
          </div>
          <button onClick={() => { setEditingMessage(null); setInput(""); }} className="p-1.5 hover:bg-surface-hover rounded-full transition">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      )}

      {replyTo && (
        <div className="bg-surface/90 border-b border-border px-4 py-2.5 flex items-center gap-3 shrink-0">
          <div className="w-1 h-8 bg-blue-500 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-blue-400">
              Replying to {replyTo.sender?.userName || "message"}
            </p>
            <p className="text-xs text-text-secondary truncate">{replyTo.content?.text?.slice(0, 60) || "Media"}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1.5 hover:bg-surface-hover rounded-full transition">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      )}

      {/* ===== MESSAGES LIST ===== */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 flex flex-col relative hide-scrollbar"
      >
        {/* Loading more spinner */}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
          </div>
        )}

        {/* Initial loading skeleton */}
        {loadingMessages ? (
          <div className="flex-1 flex flex-col justify-end gap-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className={`animate-pulse rounded-2xl ${i % 2 === 0 ? "bg-blue-500/10" : "bg-surface-hover/60"}`}
                  style={{ width: `${Math.random() * 40 + 30}%`, height: `${Math.random() * 20 + 28}px` }} />
              </div>
            ))}
          </div>
        ) : (
          <>
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
                  className={`${m.isGrouped ? "mt-0.5" : "mt-3"}`}
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
          </>
        )}

        <div ref={bottomRef} className="h-1" />
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
        <div className="px-4 py-2 border-t border-border bg-surface-inset flex gap-2 overflow-x-auto hide-scrollbar shrink-0">
          {frontendFiles.map((url, i) => (
            <div key={i} className="relative group shrink-0">
              <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
              <button
                onClick={() => {
                  setFrontendFiles((p) => p.filter((_, idx) => idx !== i));
                  setBackendFiles((p) => p.filter((_, idx) => idx !== i));
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-surface-hover rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3 text-text-secondary" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ===== MESSAGE COMPOSER / REQUEST BANNER ===== */}
      {isPendingRequest ? (
        <div className="p-4 border-t border-border bg-surface-inset flex flex-col items-center gap-3 shrink-0 text-center">
          <p className="text-xs text-text font-medium">
            Accept message request from <span className="font-bold text-text">@{otherUser?.userName || "User"}</span>?
          </p>
          <p className="text-[11px] text-text-muted max-w-md leading-relaxed">
            If you accept, they will be able to message you and call you. They won't know you've seen their message until you accept.
          </p>
          <div className="flex items-center gap-2.5 w-full max-w-sm pt-1">
            <button
              onClick={handleAcceptRequest}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-text text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
            >
              Accept
            </button>
            <button
              onClick={handleDeclineRequest}
              className="flex-1 py-2.5 bg-surface-hover hover:bg-surface-hover text-red-400 hover:text-red-300 text-xs font-bold rounded-xl transition cursor-pointer border border-border"
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
        <div className="px-4 py-3 border-t border-border/80 bg-bg shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {isRecordingVoice ? (
            <VoiceRecorder onSendVoiceNote={handleSendVoiceNote} onCancel={() => setIsRecordingVoice(false)} />
          ) : (
            <form onSubmit={handleSendMessage} className="relative flex items-center">
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

              {/* Instagram Expressions Popover (Emojis & Stickers) */}
              {showPicker.open && (
                <InstagramExpressionPicker
                  initialTab={showPicker.tab}
                  onSelectEmoji={(emoji) => {
                    setInput((prev) => prev + emoji);
                    inputRef.current?.focus();
                  }}
                  onSendSticker={handleSendSticker}
                  onClose={() => setShowPicker({ open: false, tab: "emojis" })}
                />
              )}

              {/* Instagram 2026 Input Pill Capsule */}
              <div className="flex-1 bg-surface border border-border rounded-full px-3.5 py-2 flex items-center gap-2.5 focus-within:border-border-strong transition">
                {/* Left: Emoji Button */}
                <button
                  type="button"
                  onClick={() => setShowPicker((prev) => ({ open: !prev.open, tab: "emojis" }))}
                  className="p-1 text-text-secondary hover:text-text transition cursor-pointer shrink-0"
                  title="Emojis"
                >
                  <Smile className="w-5 h-5 text-text-secondary hover:text-text" />
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
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-1 text-text-secondary hover:text-text transition cursor-pointer"
                      title="Voice note"
                    >
                      <Mic className="w-5 h-5 text-text-secondary hover:text-text" />
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="p-1 text-text-secondary hover:text-text transition cursor-pointer"
                      title="Attach photo or video"
                    >
                      <LucideImage className="w-5 h-5 text-text-secondary hover:text-text" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPicker({ open: true, tab: "stickers" })}
                      className="p-1 text-text-secondary hover:text-rose-400 transition cursor-pointer"
                      title="Stickers & GIFs"
                    >
                      <Sparkles className="w-5 h-5 text-text-secondary hover:text-rose-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="text-sm font-bold text-blue-500 hover:text-blue-400 px-2 py-0.5 transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                  </button>
                )}
              </div>
            </form>
          )}
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
    </div>
  );
};

export default MessageArea;

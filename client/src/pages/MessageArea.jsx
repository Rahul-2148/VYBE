import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Loader2, LucideImage, Search, SendHorizonal, X, Phone, Video, Mic, MapPin,
  Edit3, Smile, Users, ArrowLeft, Info, CheckCheck, Check, Clock, CornerUpRight,
  Pin, Image, FileText, Link2, ChevronDown, ChevronUp, Reply, Heart, Sparkles, BadgeCheck, Minimize2, User, Palette,
  Edit2, CornerUpLeft, ListFilter
} from "lucide-react";
import moment from "moment";
import { snackbar } from "../lib/snackbar";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import ReceiverMessage from "../components/ReceiverMessage";
import SenderMessage from "../components/SenderMessage";
import VoiceRecorder from "../components/VoiceRecorder";
import VybeCallLogBubble from "../components/calls/VybeCallLogBubble";
// VideoCallModal removed — call flow is handled by global CallManager
import LocationPickerModal from "../components/LocationPickerModal";
import SmartRepliesPill from "../components/SmartRepliesPill";
import ChatInfoDrawer from "../components/ChatInfoDrawer";
import ChatThemePickerModal from "../components/ChatThemePickerModal";
import VybeExpressionPicker from "../components/VybeExpressionPicker";
import ForwardMessageModal from "../components/ForwardMessageModal";
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
import { getChatThemeById, getResolvedThemeId } from "../lib/chatThemes";
import { playMessageSentSound } from "../lib/sounds";

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
const SystemMessage = ({ message, currentUserId }) => {
  if (message.systemEvent?.startsWith("call_") || message.type === "call") {
    return (
      <div className="flex justify-center my-3 select-none">
        <VybeCallLogBubble message={message} currentUserId={currentUserId} />
      </div>
    );
  }
  return (
    <div className="flex justify-center my-2 select-none">
      <div className="bg-surface/90 border border-border/70 backdrop-blur-md px-4 py-1.5 rounded-full max-w-sm text-center shadow-xs">
        <p className="text-[11px] text-text-muted font-medium">
          {message.content?.text || (message.sender?.userName ? `${message.sender.userName} ${message.content?.text || ""}` : "System notice")}
        </p>
      </div>
    </div>
  );
};

/* ============ DATE SEPARATOR (WhatsApp / Instagram Direct Standard) ============ */
const DateSeparator = ({ label }) => (
  <div className="flex items-center justify-center my-2.5 select-none relative z-10">
    <div className="bg-surface/90 dark:bg-[#182229]/95 text-text-secondary dark:text-zinc-300 border border-border/60 dark:border-zinc-700/60 backdrop-blur-md px-2.5 py-0.5 rounded-md shadow-2xs transition-all">
      <span className="text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </span>
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
  const { selectedChatUser, messages, vanishMode, chatInfoOpen, conversations, onlineUsers = [], lastSeenMap = {} } = useSelector((s) => s.message);
  const { userData } = useSelector((s) => s.user);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const currentUserId = userData?.user?._id || userData?._id;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [, setThemeVersion] = useState(0);

  // Live Typing Indicators Hook
  const { typingUsers, isAnyoneTyping, setTyping, stopTyping } = useTypingIndicator(
    selectedChatUser?.conversationId,
    userData?.user || userData
  );

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail?.isGlobal || !e.detail?.conversationId || e.detail.conversationId === selectedChatUser?.conversationId) {
        setThemeVersion((v) => v + 1);
      }
    };
    window.addEventListener("chat-theme-changed", handleThemeChange);
    return () => window.removeEventListener("chat-theme-changed", handleThemeChange);
  }, [selectedChatUser?.conversationId]);

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
  const [hasMore, setHasMore] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all"); // "all" | "media" | "links" | "docs" | "voice"
  const [searchResults, setSearchResults] = useState([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [showSearchResultsList, setShowSearchResultsList] = useState(false);
  const searchDebounceRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showPicker, setShowPicker] = useState({ open: false, tab: "emojis" });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const jumpToMessage = useCallback((msg) => {
    if (!msg) return;
    const existsLocally = messagesRef.current.some((m) => m._id === msg._id);
    if (!existsLocally) {
      dispatch(prependHistoricalMessages([msg]));
    }

    setTimeout(() => {
      const el = document.getElementById(`msg-${msg._id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedMessageId(msg._id);
        setTimeout(() => setHighlightedMessageId((cur) => cur === msg._id ? null : cur), 2500);
      }
    }, 100);
  }, [dispatch]);

  const executeSearch = async (queryText, filterType) => {
    const q = (queryText || "").trim();
    if (!q && filterType === "all") {
      setSearchResults([]);
      setActiveMatchIndex(0);
      setHighlightedMessageId(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // 1. Instant local search across loaded messages
    const localMatches = messagesRef.current.filter((m) => {
      if (m.type === "__date_separator" || m.deletedForEveryone) return false;

      if (filterType === "media") {
        const isMedia = ["image", "video", "gif"].includes(m.type) || m.content?.media?.some(x => ["image", "video"].includes(x.type));
        if (!isMedia) return false;
      } else if (filterType === "links") {
        const hasLink = m.content?.linkPreview?.url || /https?:\/\//i.test(m.content?.text || "");
        if (!hasLink) return false;
      } else if (filterType === "docs") {
        const isDoc = m.type === "file" || m.content?.media?.some(x => x.type === "document");
        if (!isDoc) return false;
      } else if (filterType === "voice") {
        const isVoice = ["voice", "audio"].includes(m.type);
        if (!isVoice) return false;
      }

      if (!q) return true;

      const escaped = q.toLowerCase();
      return (
        m.content?.text?.toLowerCase().includes(escaped) ||
        m.content?.media?.some(x => x.name?.toLowerCase().includes(escaped)) ||
        m.content?.contactData?.name?.toLowerCase().includes(escaped) ||
        m.content?.locationData?.name?.toLowerCase().includes(escaped) ||
        m.content?.linkPreview?.title?.toLowerCase().includes(escaped)
      );
    });

    setSearchResults(localMatches);
    if (localMatches.length > 0) {
      setActiveMatchIndex(0);
      jumpToMessage(localMatches[0]);
    }

    // 2. Query backend to search through entire database history
    try {
      const convId = selectedChatUser?.conversationId;
      if (convId) {
        const res = await api.get(`/message/search/${convId}`, {
          params: { q, type: filterType, limit: 100 },
        });
        if (res.data?.success && Array.isArray(res.data.messages)) {
          const serverMsgs = res.data.messages;
          const combinedMap = new Map();
          localMatches.forEach(m => combinedMap.set(m._id, m));
          serverMsgs.forEach(m => combinedMap.set(m._id, m));
          const allMatches = Array.from(combinedMap.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          setSearchResults(allMatches);
          if (allMatches.length > 0 && localMatches.length === 0) {
            setActiveMatchIndex(0);
            jumpToMessage(allMatches[0]);
          }
        }
      }
    } catch (err) {
      console.warn("Backend search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      executeSearch(text, searchType);
    }, 250);
  };

  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    executeSearch(searchQuery, type);
  };

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % searchResults.length;
    setActiveMatchIndex(nextIdx);
    jumpToMessage(searchResults[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveMatchIndex(prevIdx);
    jumpToMessage(searchResults[prevIdx]);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setActiveMatchIndex(0);
    setHighlightedMessageId(null);
    setShowSearchResultsList(false);
    setIsSearching(false);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowSearch(true);
      } else if (e.key === "Escape" && showSearch) {
        handleCloseSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  const [editingMessage, setEditingMessage] = useState(null);

  const handleSetReplyTo = (msg) => {
    setEditingMessage(null);
    setReplyTo(msg);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSetEditMessage = (msg) => {
    setReplyTo(null);
    setEditingMessage(msg);
    setInput(msg.content?.text || "");
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [_callState, setCallState] = useState({
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
  const rawOtherUser = isGroup ? null : (selectedChatUser?.user || selectedChatUser?.participant || selectedChatUser);
  const otherUser = useMemo(() => {
    if (isGroup) return null;
    if (rawOtherUser && rawOtherUser._id && rawOtherUser._id !== selectedChatUser?.conversationId && rawOtherUser._id !== currentUserId) {
      return rawOtherUser;
    }
    const match = selectedChatUser?.participants?.find(
      (p) => (p?._id || p)?.toString() !== currentUserId?.toString()
    );
    if (match) return match;
    return rawOtherUser;
  }, [isGroup, rawOtherUser, selectedChatUser, currentUserId]);

  const otherUserIdStr = (otherUser?._id || otherUser?.id || otherUser)?.toString();
  const isOtherUserOnline = !isGroup && otherUserIdStr && (Boolean(otherUser?.isOnline) || onlineUsers.includes(otherUserIdStr));
  const otherUserLastSeen = otherUserIdStr ? (lastSeenMap[otherUserIdStr] || otherUser?.lastSeen) : otherUser?.lastSeen;

  const fetchMessages = useCallback(async (pageNo = 1, prepend = false) => {
    if (!selectedChatUser?.conversationId) return;
    try {
      if (pageNo === 1) setLoadingMessages(true);
      if (pageNo > 1) setLoadingMore(true);

      let url = `/message/${selectedChatUser.conversationId}?limit=30`;
      if (prepend && messagesRef.current.length > 0) {
        const oldestMsg = messagesRef.current[0];
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
  }, [selectedChatUser?.conversationId, dispatch]);

  const markConversationSeen = useCallback(async () => {
    try {
      if (!selectedChatUser?.conversationId) return;
      await api.post(`/message/seen/${selectedChatUser.conversationId}`);
    } catch (e) {
      console.warn("MessageArea: markConversationSeen failed", e);
    }
  }, [selectedChatUser?.conversationId]);

  useEffect(() => {
    if (!selectedChatUser?.conversationId) return;
    (async () => {
      await fetchMessages(1);
      scrollToBottom("auto");
      await markConversationSeen();
    })();
  }, [selectedChatUser?.conversationId, fetchMessages, markConversationSeen, scrollToBottom]);

  // WebRTC call listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncomingCall = ({ callerName, callerAvatar, callType }) => {
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

  const _scrollToMessage = (id) => {
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
    if (messages.length && !showSearch) scrollToBottom();
  }, [messages.length, showSearch, scrollToBottom]);

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

    return groupMessages(deduplicated);
  }, [messages, currentUserId]);


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
    stopTyping();
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
    playMessageSentSound();
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

  const handleSendSticker = async (stickerPayload) => {
    const stickerUrl = typeof stickerPayload === "string" ? stickerPayload : stickerPayload?.url || stickerPayload?.dataUrl;
    if (!stickerUrl) return;

    setShowPicker({ open: false, tab: "stickers" });
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const optimisticMessage = {
      _id: tempId,
      conversation: selectedChatUser.conversationId,
      sender: { _id: currentUserId, userName: userData?.user?.userName, profileImage: userData?.user?.profileImage },
      type: "sticker",
      content: {
        text: "",
        media: [{ url: stickerUrl, type: "sticker" }],
      },
      replyTo: replyTo || null,
      status: "sending",
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    dispatch(addOptimisticMessage(optimisticMessage));
    playMessageSentSound();
    scrollToBottom();

    try {
      const res = await api.post("/message/send", {
        conversationId: selectedChatUser.conversationId,
        type: "sticker",
        messageType: "sticker",
        stickerUrl,
        mediaUrl: stickerUrl,
        vanish: vanishMode,
        clientMessageId: tempId,
        replyTo: replyTo?._id || undefined,
      });

      if (res.data.success) {
        dispatch(replaceOptimisticMessage({ tempId, message: res.data.message }));
        dispatch(
          updateConversationLastMessage({
            conversationId: selectedChatUser.conversationId,
            message: res.data.message,
            currentUserId,
          })
        );
      }
    } catch (err) {
      dispatch(markOptimisticFailed({ tempId }));
      snackbar.error(err.response?.data?.message || "Failed to send sticker");
    }
  };

  const startCall = async (type) => {
    if (isGroup) {
      snackbar.error("Calling groups/communities can be done directly from voice/video channels.");
      return;
    }
    let target = otherUser;
    const convId = selectedChatUser?.conversationId || selectedChatUser?._id;

    // Guarantee resolution of actual user ID if optimistic or missing
    if (!target || !target._id || target._id === convId || target._id === currentUserId) {
      try {
        if (convId) {
          const res = await api.get(`/conversation/details/${convId}`);
          if (res.data?.conversation?.participant) {
            target = res.data.conversation.participant;
          } else if (res.data?.conversation?.participants) {
            target = res.data.conversation.participants.find(
              (p) => (p?._id || p)?.toString() !== currentUserId?.toString()
            );
          }
        }
      } catch (err) {
        console.warn("Could not fetch participant for call:", err);
      }
    }

    if (!target) {
      snackbar.error("User not found for calling");
      return;
    }

    const resolvedTargetId = (target?._id || target?.id || target)?.toString();
    console.log("📞 [MessageArea] Initiating call to target user:", resolvedTargetId, target);
    window.dispatchEvent(
      new CustomEvent("vybe:initiate-call", {
        detail: {
          type,
          user: target,
          targetUserId: resolvedTargetId,
          conversationId: convId,
        },
      })
    );
  };

  const handleForwardMessage = (message) => {
    dispatch(setForwardModal({ open: true, message }));
  };

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

  const activeThemeId = getResolvedThemeId(currentUserId, selectedChatUser?.conversationId, currentConv?.theme);
  const activeThemeObj = getChatThemeById(activeThemeId);
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
      <div className="flex items-center gap-2 px-3 md:px-5 h-[60px] border-b border-border bg-bg/95 backdrop-blur-xl shrink-0 z-20 select-none pt-[env(safe-area-inset-top)] w-full">
        {/* NORMAL MODE HEADER */}
        {!showSearch ? (
          <>
            <button
              onClick={() => {
                dispatch(clearSelectedChatUser());
                navigate("/messages", { replace: true });
              }}
              className="p-2 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition cursor-pointer md:hidden shrink-0"
              title="Back to messages"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

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
                    isOtherUserOnline
                      ? "bg-gradient-to-br from-green-400 to-emerald-500"
                      : "bg-surface-hover"
                  }`}>
                    <img src={otherUser?.profileImage?.url || dp} className="w-full h-full rounded-full object-cover border border-bg" alt="" />
                  </div>
                  {isOtherUserOnline && (
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
                  ) : isOtherUserOnline ? (
                    <span className="text-green-500 font-medium">Active now</span>
                  ) : otherUserLastSeen ? (
                    <span className="text-text-muted">Active {moment(otherUserLastSeen).fromNow()}</span>
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
              {/* In-Chat Search Button */}
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                title="Search in conversation (Ctrl+F)"
              >
                <Search className="w-4.5 h-4.5" />
              </button>

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
        ) : (
          /* SEARCH MODE ACTIVE HEADER (WhatsApp Web / Instagram Direct Standard) */
          <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150 min-w-0">
            <button
              type="button"
              onClick={handleCloseSearch}
              className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-zinc-300/80 dark:border-zinc-700 transition cursor-pointer shrink-0 shadow-2xs"
              title="Close search (Esc)"
            >
              <ArrowLeft className="w-4.5 h-4.5 stroke-[2.5]" />
            </button>

            {/* Crisp High-Contrast Search Pill */}
            <div className="flex-1 flex items-center gap-2.5 bg-white dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 rounded-full px-3.5 py-1.5 focus-within:border-black dark:focus-within:border-white focus-within:ring-2 focus-within:ring-black/10 dark:focus-within:ring-white/10 transition-all min-w-0 shadow-xs">
              <Search className="w-4 h-4 text-black dark:text-white stroke-[2.5] shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.shiftKey) handlePrevMatch();
                    else handleNextMatch();
                  } else if (e.key === "Escape") {
                    handleCloseSearch();
                  }
                }}
                placeholder="Search messages, links, files..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-black dark:text-white font-medium outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-w-0"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-rose-500 animate-spin shrink-0" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    executeSearch("", searchType);
                  }}
                  className="w-4.5 h-4.5 rounded-full bg-zinc-800 hover:bg-black dark:bg-zinc-200 dark:hover:bg-white text-white dark:text-black flex items-center justify-center transition p-0.5"
                  title="Clear text"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              ) : null}
            </div>

            {/* Match Counter & Prev/Next Arrows */}
            {(searchQuery || searchType !== "all") && (
              <div className="flex items-center gap-1 shrink-0">
                {searchResults.length > 0 ? (
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 rounded-full px-3 py-1 shadow-xs">
                    <span className="text-[11.5px] font-black text-black dark:text-white whitespace-nowrap">
                      {activeMatchIndex + 1} of {searchResults.length}
                    </span>
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        type="button"
                        onClick={handlePrevMatch}
                        className="p-1 rounded-full text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                        title="Previous match (Shift+Enter)"
                      >
                        <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMatch}
                        className="p-1 rounded-full text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                        title="Next match (Enter)"
                      >
                        <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                ) : !isSearching && searchQuery ? (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 rounded-full border border-rose-200 dark:border-rose-800/50">
                    0 matches
                  </span>
                ) : null}
              </div>
            )}

            {/* Toggle Results List Button */}
            {searchResults.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSearchResultsList(!showSearchResultsList)}
                className={`p-2 rounded-full transition cursor-pointer shrink-0 shadow-2xs ${
                  showSearchResultsList
                    ? "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow-xs shadow-pink-500/25 border border-transparent"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-zinc-300/80 dark:border-zinc-700"
                }`}
                title={showSearchResultsList ? "Hide results list" : "Show all results in list"}
              >
                <ListFilter className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
            )}

            {/* Exit Search Button */}
            <button
              type="button"
              onClick={handleCloseSearch}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-zinc-300/80 dark:border-zinc-700 rounded-full transition cursor-pointer shrink-0 shadow-2xs"
              title="Close search (Esc)"
            >
              <X className="w-4.5 h-4.5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>

      {/* ===== IN-CHAT SUB-HEADER FILTER BAR (Instagram Direct Standard) ===== */}
      {showSearch && (
        <div className="bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 px-3 md:px-6 py-1.5 flex items-center gap-2 overflow-x-auto hide-scrollbar z-10 shrink-0 select-none animate-in fade-in slide-in-from-top-1 duration-150">
          {[
            { id: "all", label: "All" },
            { id: "media", label: "🖼️ Photos & Videos" },
            { id: "links", label: "🔗 Links" },
            { id: "docs", label: "📄 Documents" },
            { id: "voice", label: "🎙️ Voice Notes" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => handleSearchTypeChange(pill.id)}
              className={`text-[11.5px] font-bold px-3.5 py-1 rounded-full transition cursor-pointer shrink-0 flex items-center gap-1 active:scale-95 shadow-2xs ${
                searchType === pill.id
                  ? "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow-xs shadow-pink-500/25 border border-transparent"
                  : "bg-white dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <span>{pill.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ===== INSTAGRAM / WHATSAPP STYLE SEARCH RESULTS DRAWER ===== */}
      {showSearch && showSearchResultsList && searchResults.length > 0 && (
        <div className="bg-white dark:bg-[#18181b] border-b-2 border-zinc-300 dark:border-zinc-800 px-3 md:px-6 py-2.5 max-h-56 overflow-y-auto custom-scrollbar z-20 shrink-0 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-black text-black dark:text-white">
            <span>{searchResults.length} {searchResults.length === 1 ? "match" : "matches"} found</span>
            <button
              onClick={() => setShowSearchResultsList(false)}
              className="text-zinc-500 hover:text-black dark:hover:text-white text-[10.5px] font-bold cursor-pointer"
            >
              Hide list
            </button>
          </div>
          <div className="space-y-1.5">
            {searchResults.map((m, idx) => (
              <div
                key={m._id}
                onClick={() => {
                  setActiveMatchIndex(idx);
                  jumpToMessage(m);
                }}
                className={`flex items-start gap-2.5 p-2 rounded-xl border-2 transition cursor-pointer ${
                  activeMatchIndex === idx
                    ? "bg-rose-50 dark:bg-rose-500/15 border-rose-500 shadow-xs"
                    : "bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <img
                  src={m.sender?.profileImage?.url || dp}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-zinc-300 dark:border-zinc-700"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-black dark:text-white">
                    <span className="truncate">{m.sender?.name || m.sender?.userName || "User"}</span>
                    <span className="text-[10px] text-zinc-500 font-semibold ml-2 shrink-0">
                      {moment(m.createdAt).format("MMM D, h:mm A")}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-zinc-800 dark:text-zinc-200 font-medium line-clamp-2 mt-0.5">
                    {m.content?.text || (m.type === "image" ? "📷 Photo" : m.type === "video" ? "🎥 Video" : m.type === "voice" ? "🎙️ Voice note" : "📎 Attachment")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <div className="flex flex-col items-center justify-center text-center pt-3 pb-3 px-4 mb-2 select-none animate-in fade-in duration-200">
                  <div 
                    onClick={() => navigate(`/profile/${otherUser.userName}`)}
                    className="relative group cursor-pointer"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md group-hover:scale-105 transition-transform duration-200">
                      <img
                        src={otherUser.profileImage?.url || dp}
                        alt=""
                        className="w-full h-full rounded-full object-cover bg-bg"
                      />
                    </div>
                  </div>

                  <div className="mt-1.5 space-y-0.5">
                    <h3 
                      onClick={() => navigate(`/profile/${otherUser.userName}`)}
                      className="text-xs sm:text-sm font-bold text-text hover:underline cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>{otherUser.name || otherUser.userName}</span>
                      {otherUser.isVerified && (
                        <VerifiedBadge size="xs" />
                      )}
                    </h3>
                    <p className="text-[10px] text-text-secondary font-medium">@{otherUser.userName} · VYBE</p>
                    {otherUser.bio && (
                      <p className="text-[10px] text-text-muted max-w-xs line-clamp-1 mt-0.5 mx-auto leading-relaxed">
                        {otherUser.bio}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${otherUser.userName}`)}
                    className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface-hover hover:bg-surface border border-border text-[10px] font-semibold text-text transition cursor-pointer active:scale-95 shadow-2xs hover:border-primary/40"
                  >
                    <User className="w-3 h-3 text-primary" />
                    <span>View Profile</span>
                  </button>
                </div>
              )}

              {/* Group Intro Card */}
              {isGroup && (
                <div className="flex flex-col items-center justify-center text-center pt-3 pb-3 px-4 mb-2 select-none animate-in fade-in duration-200">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] shadow-md mb-1.5">
                    <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-300" />
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-text">
                    {selectedChatUser.user?.groupName || "Group Chat"}
                  </h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    {selectedChatUser.user?.participants?.length || 0} members
                  </p>
                </div>
              )}

              {/* Chronological Messages Stream (with mt-auto to naturally push to bottom without overlapping hero) */}
              <div className="mt-auto flex flex-col space-y-1 w-full min-h-[40px]">
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
                          setReplyTo={handleSetReplyTo}
                          onEditMessage={handleSetEditMessage}
                          onForwardMessage={handleForwardMessage}
                          isHighlighted={highlightedMessageId === m._id}
                          searchQuery={searchQuery}
                        />
                      ) : (
                        <ReceiverMessage
                          message={m}
                          isGrouped={m.isGrouped}
                          isLastInGroup={m.isLastInGroup}
                          setReplyTo={handleSetReplyTo}
                          onForwardMessage={handleForwardMessage}
                          isHighlighted={highlightedMessageId === m._id}
                          searchQuery={searchQuery}
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
            {/* ===== EDITING PREVIEW BANNER (Right above input pill) ===== */}
            {editingMessage && (
              <div className="mb-2 bg-surface dark:bg-zinc-850 border border-primary/40 dark:border-primary/50 rounded-2xl px-3.5 py-2 flex items-center justify-between gap-3 shadow-md backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 rounded-xl bg-primary/15 text-primary shrink-0">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-primary">Editing message</span>
                      <span className="text-[10px] text-text-muted font-normal">(Press Esc to cancel)</span>
                    </div>
                    <p className="text-xs text-text-secondary truncate font-medium mt-0.5">
                      {editingMessage.content?.text || "Message"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessage(null);
                    setInput("");
                  }}
                  className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-700/80 rounded-full transition cursor-pointer text-text-muted hover:text-text shrink-0"
                  title="Cancel edit (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ===== LIVE TYPING INDICATOR PILL (WhatsApp / Instagram / iMessage style) ===== */}
            {isAnyoneTyping && (
              <div className="mb-2 w-fit max-w-[85%] bg-surface dark:bg-zinc-850 border border-border/80 rounded-2xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
                {/* 3 Bouncing Dots in Bubble */}
                <div className="flex items-center gap-1 bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                </div>
                <span className="text-xs text-text font-medium truncate">
                  <span className="font-semibold text-primary">
                    {typingUsers.length === 1
                      ? `@${typingUsers[0].userName}`
                      : typingUsers.length === 2
                      ? `@${typingUsers[0].userName} & @${typingUsers[1].userName}`
                      : `@${typingUsers[0].userName} + ${typingUsers.length - 1} others`}
                  </span>{" "}
                  <span className="text-text-secondary">is typing...</span>
                </span>
              </div>
            )}

            {/* ===== REPLY PREVIEW BANNER (Right above input pill) ===== */}
            {replyTo && (
              <div className="mb-2 bg-surface dark:bg-zinc-850 border border-border/90 rounded-2xl px-3.5 py-2 flex items-center justify-between gap-3 shadow-md backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 rounded-xl bg-primary/15 text-primary shrink-0">
                    <CornerUpLeft className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-primary">
                        Replying to @{replyTo.sender?.userName || "user"}
                      </span>
                      <span className="text-[10px] text-text-muted font-normal">(Press Esc to cancel)</span>
                    </div>
                    <p className="text-xs text-text-secondary truncate font-medium mt-0.5">
                      {replyTo.content?.text || (replyTo.type === "image" ? "📷 Photo" : replyTo.type === "video" ? "🎥 Video" : "Media")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-700/80 rounded-full transition cursor-pointer text-text-muted hover:text-text shrink-0"
                  title="Cancel reply (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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
                    data-expression-trigger="true"
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
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        if (editingMessage) {
                          setEditingMessage(null);
                          setInput("");
                        }
                        if (replyTo) {
                          setReplyTo(null);
                        }
                      }
                    }}
                    onBlur={stopTyping}
                    placeholder={editingMessage ? "Edit message (Enter to save, Esc to cancel)..." : replyTo ? "Type a reply (Esc to cancel)..." : "Message..."}
                    className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted min-w-0 selection:bg-primary selection:text-white"
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
                        data-expression-trigger="true"
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
          chatName={isGroup ? (selectedChatUser?.user?.groupName || "Group") : otherUser?.userName}
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

      {/* ===== FORWARD MESSAGE MODAL ===== */}
      <ForwardMessageModal />
    </div>
  );
};

export default MessageArea;


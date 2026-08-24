import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MessageCircle,
  X,
  Maximize2,
  SquarePen,
  Search,
  ChevronDown,
  ArrowLeft,
  Send,
  Loader2,
  Phone,
  Video,
  CheckCheck,
  Check,
  Smile,
  Mic,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import dp from "../assets/dp3.png";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import {
  setConversations,
  setFloatingDockOpen,
  setFloatingActiveConvo,
} from "../redux/features/messageSlice";
import { playMessageSentSound } from "../lib/sounds";
import VoiceNotePlayer from "./VoiceNotePlayer";
import VoiceRecorder from "./VoiceRecorder";
import VybeExpressionPicker from "./VybeExpressionPicker";

const FloatingMessagesDock = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { conversations, isFloatingDockOpen, floatingActiveConvo, onlineUsers = [] } = useSelector((state) => state.message);

  const isMessagesPage =
    location.pathname.startsWith("/messages") ||
    location.pathname.startsWith("/direct") ||
    location.pathname.startsWith("/messageArea");

  const [isOpen, setIsOpen] = useState(false);
  const [activeConvo, setActiveConvo] = useState(null); // Active conversation inside floating drawer
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showPicker, setShowPicker] = useState({ open: false, tab: "emojis" });

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/message/conversations");
      if (res.data?.conversations) {
        const convs = res.data.conversations || [];
        dispatch(setConversations(convs));
        const totalUnread = convs.reduce((acc, c) => {
          if (c.unreadCount && typeof c.unreadCount === "object") {
            const userId = userData?.user?._id;
            return acc + (c.unreadCount[userId] || 0);
          }
          return acc + (c.unreadCount || 0);
        }, 0);
        setUnreadCount(totalUnread);
      }
    } catch (e) {
      console.warn("FloatingMessagesDock: fetchConversations failed", e);
    } finally {
      setLoading(false);
    }
  }, [dispatch, userData?.user?._id]);

  const fetchMessages = useCallback(async (convoId) => {
    if (!convoId) return;
    try {
      setLoadingMessages(true);
      const res = await api.get(`/message/${convoId}`);
      if (res.data?.messages) {
        setMessages(res.data.messages);
        await api.post(`/message/seen/${convoId}`).catch(() => null);
      }
    } catch (e) {
      console.warn("FloatingMessagesDock: fetchMessages failed", e);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Sync Redux floating dock state
  useEffect(() => {
    if (isFloatingDockOpen) {
      const timer = setTimeout(() => setIsOpen(true), 0);
      return () => clearTimeout(timer);
    }
  }, [isFloatingDockOpen]);

  useEffect(() => {
    if (floatingActiveConvo) {
      const timer = setTimeout(() => setActiveConvo(floatingActiveConvo), 0);
      return () => clearTimeout(timer);
    }
  }, [floatingActiveConvo]);

  useEffect(() => {
    if (!userData?.user?._id) return;
    let isMounted = true;

    api
      .get("/message/conversations")
      .then((res) => {
        if (isMounted && res.data?.conversations) {
          const convs = res.data.conversations || [];
          dispatch(setConversations(convs));
          const totalUnread = convs.reduce((acc, c) => {
            if (c.unreadCount && typeof c.unreadCount === "object") {
              const userId = userData?.user?._id;
              return acc + (c.unreadCount[userId] || 0);
            }
            return acc + (c.unreadCount || 0);
          }, 0);
          setUnreadCount(totalUnread);
        }
      })
      .catch((e) => {
        if (isMounted) console.warn("FloatingMessagesDock: fetchConversations failed", e);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userData?.user?._id, dispatch]);

  useEffect(() => {
    const convoId = activeConvo?._id;
    if (!convoId) return;
    let isMounted = true;

    api
      .get(`/message/${convoId}`)
      .then(async (res) => {
        if (isMounted && res.data?.messages) {
          setMessages(res.data.messages);
          await api.post(`/message/seen/${convoId}`).catch(() => null);
        }
      })
      .catch((e) => {
        if (isMounted) console.warn("FloatingMessagesDock: fetchMessages failed", e);
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConvo?._id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime Socket Listeners for Floating Dock
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data) => {
      api.get("/message/conversations").then((res) => {
        if (res.data?.conversations) {
          dispatch(setConversations(res.data.conversations));
        }
      });
      if (activeConvo && (data.conversationId === activeConvo._id || data.message?.conversation === activeConvo._id)) {
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === data.message._id)) return prev;
            return [...prev, data.message];
          });
        } else {
          fetchMessages(activeConvo._id);
        }
      }
    };

    const handleTyping = (data) => {
      if (activeConvo && data.conversationId === activeConvo._id && data.userId !== userData?.user?._id) {
        setIsTyping(Boolean(data.isTyping));
      }
    };

    socket.on("message-received", handleNewMessage);
    socket.on("user-typing", handleTyping);

    return () => {
      socket.off("message-received", handleNewMessage);
      socket.off("user-typing", handleTyping);
    };
  }, [activeConvo, dispatch, userData, fetchMessages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeConvo?._id || sending) return;

    const textToSend = messageText.trim();
    setMessageText("");
    playMessageSentSound();

    try {
      setSending(true);
      const res = await api.post("/message/send", {
        conversationId: activeConvo._id,
        text: textToSend,
      });

      if (res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        fetchConversations();
      }
    } catch (e) {
      console.warn("FloatingMessagesDock: handleSendMessage failed", e);
      setMessageText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleSendVoiceNote = async (audioFile, duration) => {
    if (!activeConvo?._id) return;
    setIsRecordingVoice(false);

    try {
      const fd = new FormData();
      fd.append("audio", audioFile);
      fd.append("conversationId", activeConvo._id);
      fd.append("duration", duration);

      const res = await api.post("/message/voice-note", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        playMessageSentSound();
        fetchConversations();
      }
    } catch (err) {
      console.warn("FloatingMessagesDock: handleSendVoiceNote failed", err);
    }
  };

  const handleSendSticker = async (sticker) => {
    if (!activeConvo?._id) return;
    setShowPicker({ open: false, tab: "emojis" });

    try {
      const res = await api.post("/message/send", {
        conversationId: activeConvo._id,
        text: "",
        media: [{ url: sticker.url, type: "sticker", name: sticker.name || "Sticker" }],
        type: "sticker",
      });

      if (res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        playMessageSentSound();
        fetchConversations();
      }
    } catch (err) {
      console.warn("FloatingMessagesDock: handleSendSticker failed", err);
    }
  };

  const startCall = (type) => {
    if (!activeOtherUser) return;
    window.dispatchEvent(
      new CustomEvent("vybe:initiate-call", {
        detail: { type, user: activeOtherUser, conversationId: activeConvo?._id },
      })
    );
  };

  if (!userData?.user?._id) return null;

  const filteredConversations = conversations.filter((c) => {
    const other = c.participant || (Array.isArray(c.participants) ? c.participants.find((p) => p._id !== userData.user._id) : null);
    const query = searchQuery.toLowerCase();
    return (
      other?.userName?.toLowerCase().includes(query) ||
      other?.name?.toLowerCase().includes(query) ||
      c.name?.toLowerCase().includes(query) ||
      (c.lastMessage?.content?.text || c.lastMessage?.text || "").toLowerCase().includes(query)
    );
  });

  const recentAvatars = conversations
    .map((c) => {
      const other = c.participant || (Array.isArray(c.participants) ? c.participants.find((p) => p._id !== userData.user._id) : null);
      return other?.profileImage?.url;
    })
    .filter(Boolean)
    .slice(0, 3);

  const activeOtherUser = activeConvo
    ? activeConvo.participant || (Array.isArray(activeConvo.participants) ? activeConvo.participants.find((p) => p._id !== userData.user._id) : null)
    : null;

  if (isMessagesPage) return null;

  return (
    <div className="fixed bottom-0 right-6 z-[200] font-sans select-none hidden md:block">
      {/* EXPANDED FLOATING MESSAGES DRAWER */}
      {isOpen ? (
        <div className="w-[370px] h-[530px] bg-surface-inset/98 backdrop-blur-2xl border-x border-t border-border rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* HEADER */}
          <div className="h-14 px-3.5 border-b border-border/80 flex items-center justify-between bg-surface shrink-0">
            {activeConvo ? (
              /* Active Chat Header */
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => {
                    setActiveConvo(null);
                    dispatch(setFloatingActiveConvo(null));
                  }}
                  className="p-1 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                  title="Back to Conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {(() => {
                  const activeOtherUserId = (activeOtherUser?._id || activeOtherUser)?.toString();
                  const isActiveOtherUserOnline = activeOtherUserId && (Boolean(activeOtherUser?.isOnline) || onlineUsers.includes(activeOtherUserId));
                  return (
                    <>
                      <div
                        onClick={() => {
                          if (activeOtherUser?.userName) {
                            setIsOpen(false);
                            dispatch(setFloatingDockOpen(false));
                            navigate(`/profile/${activeOtherUser.userName}`);
                          }
                        }}
                        className="relative shrink-0 cursor-pointer"
                        title={`View @${activeOtherUser?.userName}'s profile`}
                      >
                        <img
                          src={activeOtherUser?.profileImage?.url || dp}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-border"
                        />
                        {isActiveOtherUserOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-bg rounded-full" />
                        )}
                      </div>
                      <div
                        onClick={() => {
                          if (activeOtherUser?.userName) {
                            setIsOpen(false);
                            dispatch(setFloatingDockOpen(false));
                            navigate(`/profile/${activeOtherUser.userName}`);
                          }
                        }}
                        className="flex flex-col min-w-0 cursor-pointer hover:underline"
                        title={`View @${activeOtherUser?.userName}'s profile`}
                      >
                        <span className="text-xs font-bold text-text truncate max-w-[120px]">
                          {activeOtherUser?.userName || activeOtherUser?.name || activeConvo.name || "User"}
                        </span>
                        <span className="text-[10px] text-text-secondary font-medium">
                          {isTyping ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="flex gap-0.5">
                                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              </span>
                              typing...
                            </span>
                          ) : isActiveOtherUserOnline ? (
                            <span className="text-emerald-400 font-medium">Active now</span>
                          ) : (
                            "Offline"
                          )}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              /* Conversations List Header */
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-text">Messages</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-600 text-text text-[10px] font-black rounded-full shadow">
                    {unreadCount}
                  </span>
                )}
              </div>
            )}

            {/* Header Actions */}
            <div className="flex items-center gap-1">
              {activeConvo && activeOtherUser && (
                <>
                  <button
                    onClick={() => startCall("audio")}
                    className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                    title="Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCall("video")}
                    className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  dispatch(setFloatingDockOpen(false));
                  if (activeConvo?._id) {
                    navigate(`/messages/${activeConvo._id}`);
                  } else {
                    navigate("/messages");
                  }
                }}
                className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                title="Maximize to Full Window"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  dispatch(setFloatingDockOpen(false));
                }}
                className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                title="Minimize Drawer"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* DRAWER BODY: CHAT VIEW vs CONVERSATIONS LIST */}
          {activeConvo ? (
            /* IN-DRAWER ACTIVE CHAT VIEW */
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-bg/40">
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 hide-scrollbar">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-text-muted gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-xs text-text-muted gap-2 p-4">
                    <MessageCircle className="w-8 h-8 text-text-muted" />
                    <span>Say hello to {activeOtherUser?.userName || "your contact"}!</span>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.sender?._id === userData.user._id || msg.sender === userData.user._id;
                    const text = msg.content?.text || msg.text || "";
                    const isVoiceNote = msg.type === "voice" || msg.content?.media?.some((m) => m.type === "audio");
                    const audioMedia = isVoiceNote ? msg.content?.media?.find((m) => m.type === "audio") || msg.content?.media?.[0] : null;
                    const audioUrl = audioMedia?.url || msg.content?.audioUrl || msg.audioUrl;

                    const isSticker = msg.type === "sticker" || msg.content?.media?.some((m) => m.type === "sticker");
                    const isOnlySticker = isSticker && !text.trim();

                    return (
                      <div
                        key={msg._id || index}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] ${
                            isOnlySticker
                              ? "bg-transparent !p-0 !border-none !shadow-none"
                              : `px-3.5 py-2 rounded-2xl text-xs font-normal leading-relaxed ${
                                  isMe
                                    ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white rounded-br-xs shadow-md"
                                    : "bg-surface text-text border border-border/80 rounded-bl-xs"
                                }`
                          }`}
                        >
                          {/* Voice Note Player */}
                          {isVoiceNote && audioUrl && (
                            <VoiceNotePlayer
                              audioUrl={audioUrl}
                              duration={msg.content?.voiceDuration || 0}
                              isSender={isMe}
                              isGradientTheme={isMe}
                            />
                          )}

                          {/* Text */}
                          {text?.trim() && <p className="break-words text-inherit">{text}</p>}

                          {/* Media attachments */}
                          {msg.content?.media?.map((m, i) => {
                            if (m.type === "audio" || msg.type === "voice") return null;
                            if (m.type === "sticker" || msg.type === "sticker") {
                              const isAnimatedEmoji = m.url?.includes("Animated-Fluent-Emojis") || m.url?.includes(".webp") || m.category === "animated";
                              return (
                                <img
                                  key={i}
                                  src={m.url}
                                  alt="Animated Expression"
                                  className={`${isAnimatedEmoji ? "w-18 h-18 sm:w-20 sm:h-20 max-w-[80px] max-h-[80px]" : "w-20 h-20 max-w-[80px] max-h-[80px]"} object-contain drop-shadow-md select-none my-1`}
                                  style={{
                                    width: isAnimatedEmoji ? "76px" : "80px",
                                    height: isAnimatedEmoji ? "76px" : "80px",
                                  }}
                                />
                              );
                            }
                            if (m.type === "video") {
                              return (
                                <video key={i} controls className="rounded-xl mt-1.5 max-h-48 w-full object-cover">
                                  <source src={m.url} />
                                </video>
                              );
                            }
                            return (
                              <img key={i} src={m.url} alt="" className="rounded-xl mt-1.5 max-h-48 w-full object-cover" />
                            );
                          })}
                        </div>
                        <span className="text-[9px] text-text-muted mt-1 px-1 flex items-center gap-1">
                          <span>{moment(msg.createdAt).format("h:mm A")}</span>
                          {isMe && (
                            msg.status === "seen" ? (
                              <CheckCheck className="w-3 h-3 text-blue-400" />
                            ) : (
                              <Check className="w-3 h-3 text-text-muted" />
                            )
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-2 border-t border-border/80 bg-surface-inset relative">
                {/* Vybe Expressions Popover (Emojis & Stickers) */}
                {showPicker.open && (
                  <VybeExpressionPicker
                    initialTab={showPicker.tab}
                    onSelectEmoji={(emoji) => {
                      setMessageText((prev) => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    onSendSticker={handleSendSticker}
                    onClose={() => setShowPicker({ open: false, tab: "emojis" })}
                  />
                )}

                {isRecordingVoice ? (
                  <VoiceRecorder
                    onSendVoiceNote={handleSendVoiceNote}
                    onCancel={() => setIsRecordingVoice(false)}
                  />
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                    {/* Emoji / Sticker Button */}
                    <button
                      type="button"
                      data-expression-trigger="true"
                      onClick={() => setShowPicker((prev) => ({ open: !prev.open, tab: "emojis" }))}
                      className={`p-1.5 rounded-full transition cursor-pointer shrink-0 ${
                        showPicker.open ? "text-primary bg-primary/10" : "text-text-secondary hover:text-text hover:bg-surface"
                      }`}
                      title="Emojis & Stickers"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-full px-3.5 py-1.5 text-xs text-text placeholder-input-placeholder outline-none focus:border-rose-500/60 min-w-0"
                    />

                    {/* Mic button */}
                    {!messageText.trim() && (
                      <button
                        type="button"
                        onClick={() => setIsRecordingVoice(true)}
                        className="p-1.5 text-text-secondary hover:text-text hover:bg-surface rounded-full transition cursor-pointer shrink-0"
                        title="Record voice note"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    )}

                    {/* Send button */}
                    {messageText.trim() && (
                      <button
                        type="submit"
                        disabled={sending}
                        className="p-1.5 bg-gradient-to-tr from-purple-600 to-rose-600 hover:opacity-90 disabled:opacity-40 text-white rounded-full transition cursor-pointer shrink-0 shadow-sm"
                        title="Send message"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* CONVERSATIONS LIST VIEW */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="p-2 border-b border-border bg-bg/30 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface/80 border border-border/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-text placeholder-input-placeholder outline-none focus:border-rose-500/50"
                  />
                </div>
              </div>

              {/* Conversations Items */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-xs text-text-muted">
                    Loading messages...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-xs text-text-muted gap-2 p-4">
                    <MessageCircle className="w-8 h-8 text-text-muted" />
                    <span>No messages found</span>
                  </div>
                ) : (
                  filteredConversations.map((chat) => {
                    const other = chat.participant || (Array.isArray(chat.participants) ? chat.participants.find((p) => p._id !== userData.user._id) : null);
                    const lastMsgText = chat.lastMessage?.content?.text || chat.lastMessage?.text || "Sent an attachment";
                    const hasUnread = (chat.unreadCount || 0) > 0;

                    return (
                      <div
                        key={chat._id}
                        onClick={() => {
                          setActiveConvo(chat);
                          dispatch(setFloatingActiveConvo(chat));
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition ${
                          hasUnread
                            ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20"
                            : "hover:bg-surface/80 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={other?.profileImage?.url || dp}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                            {(() => {
                              const otherId = (other?._id || other)?.toString();
                              const isOtherOnline = otherId && (Boolean(other?.isOnline) || onlineUsers.includes(otherId));
                              return isOtherOnline ? (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-bg rounded-full" />
                              ) : null;
                            })()}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-text truncate">
                              {other?.userName || other?.name || chat.name || "User"}
                            </span>
                            <span className={`text-[11px] truncate max-w-[170px] ${hasUnread ? "text-rose-300 font-semibold" : "text-text-secondary"}`}>
                              {lastMsgText}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <span className="text-[10px] text-text-muted font-medium">
                            {chat.lastMessage?.createdAt ? moment(chat.lastMessage.createdAt).format("h:mm A") : ""}
                          </span>
                          {hasUnread && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Floating Compose Button */}
              <div className="p-3 border-t border-border bg-bg/40 flex justify-end shrink-0">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    dispatch(setFloatingDockOpen(false));
                    navigate("/messages");
                  }}
                  className="p-2.5 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-text shadow-xl hover:scale-105 active:scale-95 transition flex items-center gap-2 text-xs font-bold px-4 cursor-pointer"
                >
                  <SquarePen className="w-4 h-4" />
                  <span>New Message</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* FLOATING BOTTOM MESSAGES TAB BAR (CLOSED STATE) */
        <button
          onClick={() => {
            fetchConversations();
            setIsOpen(true);
            dispatch(setFloatingDockOpen(true));
          }}
          className="flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-hover border-x border-t border-border rounded-t-2xl shadow-2xl text-text backdrop-blur-xl transition-all duration-300 hover:py-3.5 group cursor-pointer"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-rose-600 text-text text-[9px] font-black rounded-full border-2 border-bg animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>

          <span className="text-xs font-bold tracking-tight">Messages</span>

          {/* Stacked Overlapping Avatars */}
          {recentAvatars.length > 0 && (
            <div className="flex items-center -space-x-2 ml-1">
              {recentAvatars.map((url, idx) => (
                <img
                  key={idx}
                  src={url || dp}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover border border-bg shadow"
                />
              ))}
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default FloatingMessagesDock;

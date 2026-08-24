import { AlertTriangle, Check, CheckCheck, CornerUpLeft, Edit2, EllipsisVertical, SmilePlus, Trash2, MapPin, ExternalLink, Heart, CornerUpRight, Pin, Clock, Phone, Copy, Plus } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../lib/axios";
import { removeMessage, updateMessage, updateMessageReactionInRedux } from "../redux/features/messageSlice";
import SharedContentCard from "./SharedContentCard";
import EmojiPickerPopover from "./EmojiPickerPopover";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import MediaLightboxModal from "./MediaLightboxModal";
import VoiceNotePlayer from "./VoiceNotePlayer";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

import { getChatThemeById, getResolvedThemeId } from "../lib/chatThemes";
import { getChatTypography, getActiveFontClasses } from "../lib/chatTypography";
import VybeCallLogBubble from "./calls/VybeCallLogBubble";
import MessageReactionsModal from "./MessageReactionsModal";
import MessageReactionBadge from "./MessageReactionBadge";

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

const renderHighlightedText = (text, query) => {
  if (!query || !query.trim() || !text) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-400 text-black font-semibold rounded-xs px-0.5 shadow-xs">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const SenderMessage = ({
  message,
  setReplyTo,
  onEditMessage,
  onForwardMessage,
  isHighlighted,
  searchQuery,
}) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((s) => s.user);
  const { conversations } = useSelector((s) => s.message);

  const convId = typeof message.conversation === "object" && message.conversation !== null
    ? message.conversation._id || message.conversation.id
    : message.conversation;
  const currentConv = conversations.find((c) => (c._id || c.conversationId)?.toString() === convId?.toString());
  const currentUserId = userData?.user?._id || userData?._id;
  const [activeTheme, setActiveTheme] = useState(() => getResolvedThemeId(currentUserId, convId, currentConv?.theme));

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (!e.detail) return;
      if (e.detail.isGlobal) {
        setActiveTheme(getResolvedThemeId(currentUserId, convId, currentConv?.theme));
      } else if (!e.detail.conversationId || e.detail.conversationId === convId) {
        setActiveTheme(e.detail.theme);
      }
    };
    window.addEventListener("chat-theme-changed", handleThemeChange);
    return () => window.removeEventListener("chat-theme-changed", handleThemeChange);
  }, [convId, currentUserId, currentConv?.theme]);

  const themeObj = getChatThemeById(activeTheme);
  const isGradientTheme = activeTheme !== "midnight" && activeTheme !== "classic_doodle";
  const bubbleThemeClass = themeObj.senderBubble || "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-md";

  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lightboxData, setLightboxData] = useState({ open: false, url: null, type: "image" });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content?.text || "");

  // Dynamic Chat Typography State
  const [typography, setTypography] = useState(() => getChatTypography());
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setTypography(e.detail);
      else setTypography(getChatTypography());
    };
    window.addEventListener("vybe-chat-typography-changed", handler);
    return () => window.removeEventListener("vybe-chat-typography-changed", handler);
  }, []);

  const activeFont = getActiveFontClasses(typography);

  const isContactRequest = message.type === "contact_request" || 
    (typeof message.content?.text === "string" && (
      message.content.text.includes("Contact Request") || 
      message.content.text.includes("requested to view your phone number") ||
      message.content.text.includes("requested your contact phone number")
    ));

  const isContactDecline = message.type === "contact_decline" || 
    (typeof message.content?.text === "string" && message.content.text.includes("Declined contact request"));

  const isContactCard = message.type === "contact" || 
    Boolean(message.content?.contactData?.phone);

  // Refs
  const optionsRef = useRef(null);
  const reactionsRef = useRef(null);
  const reactionButtonRef = useRef(null);
  const customEmojiPickerRef = useRef(null);
  const messageRef = useRef(null);

  const isSharedContent = Boolean(
    message.type?.startsWith("shared_") ||
    message.type === "share" ||
    message.content?.sharedData ||
    message.sharedData
  );

  const stickerUrl =
    (message.content?.media?.[0]?.type === "sticker" ? message.content.media[0].url : null) ||
    ((message.type === "sticker" || message.messageType === "sticker") ? (message.content?.mediaUrl || message.mediaUrl || message.content?.text) : null);

  const mediaList = isSharedContent
    ? []
    : Array.isArray(message.content?.media) && message.content.media.length > 0
    ? message.content.media
    : message.content?.media
    ? [message.content.media]
    : stickerUrl
    ? [{ url: stickerUrl, type: "sticker" }]
    : [];

  const isOnlySticker = (message.type === "sticker" || message.messageType === "sticker" || Boolean(stickerUrl) || (mediaList.length === 1 && mediaList[0]?.type === "sticker")) && !message.content?.text?.trim();

  // Click outside handler with safe Portal & reaction protection
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(event.target) &&
        !event.target.closest("[data-options-trigger]")
      ) {
        setShowOptions(false);
      }

      // If click originated inside reaction controls or the emoji portal, do not close
      const isInsideReactionArea =
        reactionsRef.current?.contains(event.target) ||
        reactionButtonRef.current?.contains(event.target) ||
        Boolean(event.target.closest("[data-emoji-picker='true']")) ||
        Boolean(event.target.closest("[data-reaction-bar='true']")) ||
        Boolean(event.target.closest("[data-reaction-btn='true']"));

      if (!isInsideReactionArea) {
        setShowReactions(false);
        setShowCustomEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleReact = async (emoji) => {
    setShowReactions(false);
    setShowCustomEmojiPicker(false);

    // Optimistic Update to prevent UI fluctuation/delay
    const currentReactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
    const myIdStr = currentUserId?.toString();
    const existingIdx = currentReactions.findIndex(
      (r) => (r.user?._id || r.user?.id || r.user || "").toString() === myIdStr
    );

    let updatedReactions;
    if (existingIdx !== -1) {
      if (currentReactions[existingIdx].emoji === emoji) {
        // Toggle off
        updatedReactions = currentReactions.filter((_, idx) => idx !== existingIdx);
      } else {
        // Switch emoji
        updatedReactions = currentReactions.map((r, idx) =>
          idx === existingIdx ? { ...r, emoji, reactedAt: new Date() } : r
        );
      }
    } else {
      // Add new reaction
      updatedReactions = [
        ...currentReactions,
        {
          user: {
            _id: currentUserId,
            userName: userData?.user?.userName || userData?.userName || "You",
            name: userData?.user?.name || userData?.name,
            profileImage: userData?.user?.profileImage || userData?.profileImage,
          },
          emoji,
          reactedAt: new Date(),
        },
      ];
    }

    dispatch(
      updateMessageReactionInRedux({
        messageId: message._id,
        reactions: updatedReactions,
      })
    );

    try {
      const res = await api.post(`/message/react/${message._id}`, { emoji });
      if (res.data?.message) {
        dispatch(updateMessage(res.data.message));
      }
    } catch (e) {
      console.warn("SenderMessage: handleReact failed", e);
      // Rollback on failure
      dispatch(
        updateMessageReactionInRedux({
          messageId: message._id,
          reactions: currentReactions,
        })
      );
    }
  };

  const handleDoubleClick = async () => {
    triggerHaptic("like");
    microAudio.playPop();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 900);
    handleReact("❤️");
  };

  const handleDelete = async (type) => {
    try {
      if (type === "everyone") {
        const res = await api.delete(`/message/delete-for-everyone/${message._id}`);
        dispatch(updateMessage(res.data.message));
      } else {
        await api.delete(`/message/${message._id}`);
        dispatch(removeMessage(message._id));
      }
      setShowOptions(false);
    } catch (e) {
      console.warn("SenderMessage: handleDelete failed", e);
    }
  };

  const handleEdit = async () => {
    try {
      const res = await api.patch(`/message/edit/${message._id}`, { text: editText });
      dispatch(updateMessage(res.data.message));
      setIsEditing(false);
    } catch (e) {
      console.warn("SenderMessage: handleEdit failed", e);
    }
  };

  if (message.deletedForEveryone) {
    return (
      <div className="ml-auto text-xs text-text-muted my-1.5 italic px-3 py-1.5 bg-surface-hover rounded-2xl border border-border">
        You deleted this message
      </div>
    );
  }

  const highlight =
    window.__search &&
    message.content?.text
      ?.toLowerCase()
      .includes(window.__search.toLowerCase());

  const renderReplyChain = (reply) => {
    if (!reply) return null;

    return (
      <div
        className={`cursor-pointer rounded-xl px-3 py-1.5 mb-1.5 border-l-4 transition ${
          isGradientTheme
            ? "border-white/80 bg-black/20 hover:bg-black/30 text-white"
            : "border-primary bg-surface-hover/80 hover:bg-surface-hover text-text"
        }`}
        onClick={() => {
          const el = document.getElementById(`msg-${reply._id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("flash-highlight");
            setTimeout(() => el.classList.remove("flash-highlight"), 1500);
          }
        }}
      >
        <span className={`text-[11px] font-bold block ${isGradientTheme ? "text-white/90" : "text-primary"}`}>
          {reply?.sender?.userName || "User"}
        </span>
        <span className={`text-xs truncate block ${isGradientTheme ? "text-white/80" : "text-text-secondary"}`}>
          {reply.content?.text || "Media"}
        </span>
      </div>
    );
  };

  const myReaction = message.reactions?.find(
    (r) => (r.user?._id || r.user?.id || r.user || "").toString() === currentUserId?.toString()
  );

  return (
    <div
      id={`msg-${message._id}`}
      className={`relative group/msg flex items-center justify-end ${
        message.reactions?.length > 0 ? "pb-3 pt-0.5" : "py-0.5"
      } ${isHighlighted ? "scale-[1.01]" : ""}`}
    >
      {/* Floating double-tap Heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <Heart className="w-12 h-12 text-rose-500 fill-rose-500 animate-ping drop-shadow-lg" />
        </div>
      )}

      {/* FLOATING ACTION TOOLBAR (Beside the bubble on the left) */}
      <div className="flex items-center gap-0.5 mr-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 relative select-none">
        {/* OPTIONS DROPDOWN */}
        {showOptions && (
          <div
            ref={optionsRef}
            className="absolute top-8 right-0 bg-surface/98 dark:bg-zinc-900/98 rounded-2xl shadow-2xl text-xs z-50 overflow-hidden min-w-[165px] border border-border/80 py-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-text"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setReplyTo(message);
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text-secondary hover:text-text transition-colors cursor-pointer font-medium"
            >
              <CornerUpLeft size={14} className="text-text-muted" /> Reply
            </button>
            {message.type === "text" && (
              <button
                onClick={() => {
                  if (onEditMessage) onEditMessage(message);
                  setShowOptions(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text-secondary hover:text-text transition-colors cursor-pointer font-medium"
              >
                <Edit2 size={14} className="text-text-muted" /> Edit
              </button>
            )}
            {onForwardMessage && (
              <button
                onClick={() => {
                  onForwardMessage(message);
                  setShowOptions(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text-secondary hover:text-text transition-colors cursor-pointer font-medium"
              >
                <CornerUpRight size={14} className="text-text-muted" /> Forward
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  const res = await api.post(`/message/pin/${message._id}`);
                  if (res.data.success) {
                    dispatch(updateMessage({ ...message, isPinned: res.data.isPinned }));
                  }
                } catch (e) {
                  console.warn("SenderMessage: pin/unpin failed", e);
                }
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text hover:text-primary transition-colors cursor-pointer font-semibold"
            >
              <Pin size={15} strokeWidth={2.2} className="text-text-secondary" /> {message.isPinned ? "Unpin" : "Pin"}
            </button>
            <div className="border-t border-border/60 my-1" />
            <button
              onClick={() => {
                handleDelete("me");
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text hover:text-text-secondary transition-colors cursor-pointer font-semibold"
            >
              <Trash2 size={15} strokeWidth={2.2} className="text-text-muted" /> Delete for me
            </button>
            <button
              onClick={() => {
                handleDelete("everyone");
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-500/15 w-full text-left text-red-500 transition-colors cursor-pointer font-semibold"
            >
              <AlertTriangle size={15} strokeWidth={2.2} /> Delete for everyone
            </button>
          </div>
        )}

        <div className="flex items-center gap-0.5 bg-surface/98 dark:bg-zinc-900/98 border border-border/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl rounded-full px-1.5 py-1 text-text">
          {/* 1. More Options Button */}
          <button
            data-options-trigger="true"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(!showOptions);
            }}
            className={`p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer ${
              showOptions ? "text-primary bg-primary/15 ring-1 ring-primary/40 scale-105" : ""
            }`}
            title="More options"
          >
            <EllipsisVertical size={16} strokeWidth={2.4} />
          </button>

          {/* 2. Forward Button */}
          {onForwardMessage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onForwardMessage(message);
              }}
              className="p-1.5 rounded-full text-slate-800 dark:text-zinc-100 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
              title="Forward"
            >
              <CornerUpRight size={16} strokeWidth={2.4} />
            </button>
          )}

          {/* 3. Reply Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReplyTo(message);
            }}
            className="p-1.5 rounded-full text-slate-800 dark:text-zinc-100 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
            title="Reply"
          >
            <CornerUpLeft size={16} strokeWidth={2.4} />
          </button>

          {/* 4. React Button */}
          <button
            ref={reactionButtonRef}
            data-reaction-btn="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowReactions((prev) => !prev);
              if (showReactions) setShowCustomEmojiPicker(false);
            }}
            className={`p-1.5 rounded-full text-slate-800 dark:text-zinc-100 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer ${
              showReactions ? "text-primary bg-primary/15 ring-1 ring-primary/40 scale-105" : ""
            }`}
            title="React"
          >
            <SmilePlus size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div
        ref={messageRef}
        onDoubleClick={handleDoubleClick}
        className={`relative max-w-[80%] sm:max-w-[65%] md:max-w-[55%] flex flex-col gap-0.5 cursor-pointer select-none transition-all duration-200 ${
          isOnlySticker
            ? "bg-transparent !p-0 !shadow-none !border-none text-text items-end"
            : `${activeFont.bubblePadding || "px-3.5 py-2"} rounded-3xl ${
                isHighlighted
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-bg shadow-xl animate-pulse"
                  : highlight
                  ? "bg-yellow-500/20 rounded-3xl ring-2 ring-yellow-400"
                  : message.status === "failed"
                  ? "bg-red-600/20 border border-red-500/50 text-text rounded-3xl"
                  : message.status === "sending"
                  ? `${bubbleThemeClass} opacity-75`
                  : bubbleThemeClass
              }`
        }`}
      >
        {/* Floating Quick Emoji Reactions Bar (WhatsApp / Instagram Authentic) */}
        {showReactions && (
          <div
            ref={reactionsRef}
            data-reaction-bar="true"
            className="absolute -top-11 right-0 z-[60] bg-surface/95 dark:bg-zinc-900/95 border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl rounded-full px-2 py-1 flex items-center gap-0.5 animate-in zoom-in-95 duration-150 select-none whitespace-nowrap text-text"
            onClick={(e) => e.stopPropagation()}
          >
            {EMOJIS.map((e, idx) => {
              const isSelected = myReaction?.emoji === e;
              return (
                <button
                  key={idx}
                  type="button"
                  data-reaction-btn="true"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    triggerHaptic("light");
                    handleReact(e);
                  }}
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-primary/20 ring-1 ring-primary/50 scale-105"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                  title={`React ${e}`}
                >
                  <span className="inline-block text-lg sm:text-xl leading-none transition-transform duration-200 ease-out hover:scale-135 hover:-translate-y-1 active:scale-90 select-none">
                    {e}
                  </span>
                </button>
              );
            })}

            {/* Plus button to open full emoji reaction picker */}
            <button
              type="button"
              data-reaction-btn="true"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                triggerHaptic("light");
                setShowCustomEmojiPicker((prev) => !prev);
              }}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/8 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/20 hover:scale-105 active:scale-90 text-text-secondary hover:text-text transition-all duration-150 cursor-pointer ml-0.5"
              title="More emojis"
            >
              <Plus className="w-4 h-4 pointer-events-none" />
            </button>
          </div>
        )}

        {/* Full Custom Emoji Picker for Reaction */}
        {showCustomEmojiPicker && (
          <EmojiPickerPopover
            triggerRef={reactionsRef}
            align="right"
            onClose={() => setShowCustomEmojiPicker(false)}
            onSelectEmoji={(emoji) => {
              handleReact(emoji);
              setShowCustomEmojiPicker(false);
              setShowReactions(false);
            }}
          />
        )}
        {/* Forwarded indicator */}
        {message.isForwarded && (
          <div className={`flex items-center gap-1 text-[10px] font-medium ${isGradientTheme ? "text-white/70" : "text-text-muted"}`}>
            <CornerUpRight className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}

        {/* REPLY PREVIEW */}
        {message.replyTo && renderReplyChain(message.replyTo)}

        {/* CALL LOG EVENT (Sender View) */}
        {(message.type === "call" || message.systemEvent?.startsWith("call_")) && (
          <VybeCallLogBubble message={message} currentUserId={currentUserId} />
        )}

        {/* CONTACT REQUEST CARD (Sender View) */}
        {isContactRequest && (
          <div className="rounded-2xl p-4 bg-white/10 border border-white/20 space-y-2 min-w-[240px] my-1 shadow-sm">
            <div className="flex items-center gap-2 text-amber-300">
              <div className="p-1.5 rounded-xl bg-amber-400/20">
                <Phone className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Contact Requested</span>
            </div>
            <p className="text-xs text-white/90 leading-relaxed">
              You sent a contact number request. The user can choose to share or decline with a reason.
            </p>
          </div>
        )}

        {/* CONTACT CARD (Sender View) */}
        {isContactCard && (
          <div className="rounded-2xl p-4 bg-white/15 border border-white/25 space-y-2.5 min-w-[220px] my-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-400/20 text-emerald-300">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Contact Card</div>
                <div className="text-xs font-bold text-white">{message.content?.contactData?.name || "My Contact"}</div>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-amber-200 tracking-wider">
              {message.content?.contactData?.phone || "No phone listed"}
            </div>
          </div>
        )}

        {/* CONTACT DECLINED (Sender View) */}
        {isContactDecline && (
          <div className="rounded-2xl p-4 bg-white/10 border border-rose-300/30 space-y-2 min-w-[220px] my-1">
            <div className="flex items-center gap-2 text-rose-300">
              <div className="p-1.5 rounded-xl bg-rose-400/20">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Contact Request Declined</span>
            </div>
            <p className="text-xs text-white/90 leading-relaxed">
              {message.content?.text || "You declined this contact request."}
            </p>
          </div>
        )}

        {/* SHARED CONTENT CARD */}
        {(message.type?.startsWith("shared_") || message.content?.sharedData) && (
          <SharedContentCard
            sharedData={message.content?.sharedData || message.sharedData}
            type={message.type || "shared_post"}
          />
        )}

        {/* VOICE NOTE PLAYER */}
        {(message.type === "voice" || mediaList.some((m) => m.type === "audio")) && (() => {
          const audioMedia = mediaList.find((m) => m.type === "audio") || mediaList[0];
          const audioUrl = audioMedia?.url || message.content?.audioUrl || message.audioUrl;
          return audioUrl ? (
            <VoiceNotePlayer
              audioUrl={audioUrl}
              duration={message.content?.voiceDuration || message.voiceDuration || 0}
              isSender={true}
              isGradientTheme={isGradientTheme}
            />
          ) : null;
        })()}

        {/* MEDIA PREVIEW */}
        {mediaList.map((m, i) => {
          if (m.type === "audio" || message.type === "voice") {
            return null; // Rendered by VoiceNotePlayer
          }
          if (m.type === "sticker" || message.type === "sticker") {
            const isAnimatedEmoji = m.url?.includes("Animated-Fluent-Emojis") || m.url?.includes(".webp") || m.category === "animated";
            return (
              <img
                key={i}
                src={m.url}
                alt="Animated Expression"
                className={`${isAnimatedEmoji ? "w-20 h-20 sm:w-24 sm:h-24 max-w-[90px] max-h-[90px]" : activeFont.stickerSizeClass || "w-20 h-20 sm:w-24 sm:h-24"} object-contain drop-shadow-md select-none hover:scale-105 transition-all my-1`}
                style={{
                  width: isAnimatedEmoji ? "84px" : activeFont.stickerDimension,
                  height: isAnimatedEmoji ? "84px" : activeFont.stickerDimension,
                  maxWidth: isAnimatedEmoji ? "90px" : undefined,
                  maxHeight: isAnimatedEmoji ? "90px" : undefined,
                }}
              />
            );
          }
          if (m.type === "image" || m.type === "gif") {
            return (
              <img
                key={i}
                src={m.url}
                onClick={(e) => { e.stopPropagation(); setLightboxData({ open: true, url: m.url, type: "image" }); }}
                className="rounded-2xl max-h-[280px] w-full object-cover cursor-pointer hover:opacity-95 transition my-1 shadow-sm"
                alt="Attachment"
              />
            );
          }
          if (m.type === "video") {
            return (
              <video
                key={i}
                controls
                onClick={(e) => { e.stopPropagation(); setLightboxData({ open: true, url: m.url, type: "video" }); }}
                className="rounded-2xl max-h-[300px] w-full cursor-pointer my-1 shadow-sm"
              >
                <source src={m.url} />
              </video>
            );
          }
          if (m.type === "document") {
            return (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className={`text-sm underline flex items-center gap-1.5 py-1 ${isGradientTheme ? "text-white" : "text-text font-medium"}`}
              >
                📄 {m.name || "Document"}
              </a>
            );
          }
          return null;
        })}

        {/* TEXT */}
        {!(isContactRequest || isContactDecline || isContactCard) && (message.type === "text" || message.content?.text) && (
          <>
            {isEditing ? (
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="bg-transparent outline-none border-b border-current pb-0.5 text-sm text-inherit placeholder-current/50"
                autoFocus
              />
            ) : (
              message.content?.text?.trim() && (
                <p
                  className="break-words text-inherit"
                  style={{
                    fontSize: activeFont.fontSize,
                    lineHeight: activeFont.lineHeight,
                    fontFamily: activeFont.fontFamily,
                    fontWeight: activeFont.fontWeight || "normal",
                    letterSpacing: activeFont.letterSpacing || "normal",
                  }}
                >
                  {searchQuery ? renderHighlightedText(message.content?.text, searchQuery) : message.content?.text}
                  {message.edited && (
                    <span className="text-[10px] ml-1.5 italic opacity-70">(edited)</span>
                  )}
                </p>
              )
            )}
          </>
        )}

        {/* TIME + DELIVERY STATUS */}
        <div className="flex justify-end items-center gap-1 mt-0.5 opacity-80 text-inherit">
          {message.edited && (
            <span className="text-[9px] opacity-70">edited</span>
          )}
          <span className={`${activeFont.timestampSize || "text-[10px]"} font-medium`}>
            {moment(message.createdAt).format("h:mm A")}
          </span>
          {message.status === "sending" ? (
            <Clock size={12} className="opacity-70" />
          ) : message.status === "failed" ? (
            <span className="text-[10px] text-red-300 font-bold">!</span>
          ) : message.status === "seen" ? (
            <CheckCheck size={14} className="text-cyan-300 font-bold" />
          ) : message.status === "delivered" ? (
            <CheckCheck size={14} className="opacity-70" />
          ) : (
            <Check size={14} className="opacity-70" />
          )}
          {message.isPinned && <Pin size={10} className="text-amber-300 transform rotate-45" />}
          {message.disappear?.enabled && <Clock size={10} className="text-amber-300" />}
        </div>

        {/* WhatsApp / Instagram Style Floating Overlapping Reaction Capsule */}
        <MessageReactionBadge
          reactions={message.reactions}
          currentUserId={currentUserId}
          isSender={true}
          onClick={() => setShowReactionsModal(true)}
        />
      </div>

      {/* WhatsApp / Instagram Style Reaction Details Modal */}
      {showReactionsModal && (
        <MessageReactionsModal
          isOpen={showReactionsModal}
          onClose={() => setShowReactionsModal(false)}
          reactions={message.reactions || []}
          currentUserId={currentUserId}
          onRemoveReaction={handleReact}
        />
      )}

      {/* Full-Screen Media Lightbox Modal */}
      {lightboxData.open && (
        <MediaLightboxModal
          isOpen={lightboxData.open}
          onClose={() => setLightboxData({ open: false, url: null, type: "image" })}
          mediaUrl={lightboxData.url}
          mediaType={lightboxData.type}
        />
      )}
    </div>
  );
};

export default SenderMessage;

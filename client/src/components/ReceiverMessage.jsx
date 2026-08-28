import { SmilePlus, MapPin, ExternalLink, Heart, CornerUpLeft, CornerUpRight, Pin, EllipsisVertical, Clock, Trash2, Phone, Copy, Send, CheckCircle2, Plus, X } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
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
import { renderFormattedMessageText } from "../lib/renderFormattedText";

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

const ReceiverMessage = ({
  message,
  setReplyTo,
  onForwardMessage,
  isHighlighted,
  searchQuery,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { conversations } = useSelector((state) => state.message);

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
  const isGradientTheme = Boolean(themeObj?.isGradient || themeObj?.bubbleGradient || themeObj?.bgGradient);
  const receiverBubbleClass = themeObj.receiverBubble || "bg-surface/90 text-text border border-border shadow-xs backdrop-blur-md";

  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lightboxData, setLightboxData] = useState({ open: false, url: null, type: "image" });
  const [contactShared, setContactShared] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declined, setDeclined] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

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

  const handleShareContactBack = async () => {
    if (contactShared) return;
    try {
      const myPhone = userData?.user?.contactPhone || prompt("Enter your phone number to share in chat:");
      if (!myPhone) return;

      await api.post("/message/send", {
        conversationId: message.conversation,
        type: "contact",
        text: `Shared verified contact number`,
        contactData: {
          name: userData?.user?.name || "User",
          phone: myPhone,
        },
      });

      setContactShared(true);
      snackbar.success("Phone number shared successfully in chat!");
    } catch {
      snackbar.error("Failed to share contact number");
    }
  };

  const handleDeclineContact = async () => {
    if (declined || isDeclining) return;
    try {
      setIsDeclining(true);
      const note = declineReason.trim();
      const messageText = note 
        ? `Declined contact request: "${note}"` 
        : `Declined contact request.`;

      await api.post("/message/send", {
        conversationId: message.conversation,
        type: "contact_decline",
        text: messageText,
        sharedData: {
          reason: note || "No reason provided",
        },
      });

      setDeclined(true);
      setShowDeclineForm(false);
      snackbar.info("Contact request declined with comment.");
    } catch {
      snackbar.error("Failed to decline request");
    } finally {
      setIsDeclining(false);
    }
  };

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
      console.warn("ReceiverMessage: handleReact failed", e);
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

  const handleDelete = async () => {
    try {
      await api.delete(`/message/${message._id}`);
      dispatch(removeMessage(message._id));
      setShowOptions(false);
    } catch (e) {
      console.warn("ReceiverMessage: handleDelete failed", e);
    }
  };

  const handlePin = async () => {
    try {
      const res = await api.post(`/message/pin/${message._id}`);
      if (res.data.success) {
        dispatch(updateMessage({ ...message, isPinned: res.data.isPinned }));
      }
    } catch (e) {
      console.warn("ReceiverMessage: pin/unpin failed", e);
    }
    setShowOptions(false);
  };

  if (message.deletedForEveryone) {
    return (
      <div className="mr-auto text-xs text-text-muted my-1.5 italic px-3 py-1.5 bg-surface-hover rounded-2xl border border-border">
        This message was deleted
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
        className="cursor-pointer rounded-xl px-3 py-1.5 mb-1.5 border-l-4 border-primary bg-surface-hover/80 hover:bg-surface-hover transition text-text"
        onClick={() => {
          const el = document.getElementById(`msg-${reply._id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("flash-highlight");
            setTimeout(() => el.classList.remove("flash-highlight"), 1500);
          }
        }}
      >
        <span className="text-[11px] font-bold text-primary block">
          {reply?.sender?.userName || "User"}
        </span>
        <span className="text-xs text-text-secondary truncate block">
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
      className={`relative group/msg flex items-center justify-start ${
        message.reactions?.length > 0 ? "pb-3 pt-0.5" : "py-0.5"
      } ${isHighlighted ? "scale-[1.01]" : ""}`}
    >
      <div
        ref={messageRef}
        onDoubleClick={handleDoubleClick}
        className={`relative max-w-[80%] sm:max-w-[65%] md:max-w-[55%] flex flex-col gap-0.5 cursor-pointer select-none transition-all duration-200 ${
          isOnlySticker
            ? "bg-transparent !p-0 !shadow-none !border-none text-text items-start"
            : `${activeFont.bubblePadding || "px-3.5 py-2"} rounded-3xl ${
                isHighlighted
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-bg shadow-xl animate-pulse"
                  : highlight
                  ? "bg-yellow-500/20 rounded-3xl ring-2 ring-yellow-400"
                  : receiverBubbleClass
              }`
        }`}
      >
        {/* Floating Quick Emoji Reactions Bar (WhatsApp / Instagram Authentic) */}
        {showReactions && (
          <div
            ref={reactionsRef}
            data-reaction-bar="true"
            className="absolute -top-11 left-0 z-[60] bg-surface/95 dark:bg-zinc-900/95 border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl rounded-full px-2 py-1 flex items-center gap-0.5 animate-in zoom-in-95 duration-150 select-none whitespace-nowrap text-text"
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
            align="left"
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
          <div className="flex items-center gap-1 text-[10px] text-text-muted font-medium">
            <CornerUpRight className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}

        {/* Double Tap Floating Heart Overlay */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
            <Heart className="w-12 h-12 text-rose-500 fill-rose-500 animate-ping drop-shadow-lg" />
          </div>
        )}

        {/* REPLY PREVIEW */}
        {message.replyTo && renderReplyChain(message.replyTo)}

        {/* CALL LOG EVENT (Receiver View) */}
        {(message.type === "call" || message.systemEvent?.startsWith("call_")) && (
          <VybeCallLogBubble message={message} currentUserId={currentUserId} />
        )}

        {/* CONTACT REQUEST CARD */}
        {isContactRequest && (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/15 via-rose-500/15 to-purple-500/15 border-2 border-amber-500/40 space-y-3 min-w-[270px] max-w-[340px] my-1 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <div className="p-1.5 rounded-xl bg-amber-500/20 shadow-inner">
                  <Phone className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Contact Request</span>
              </div>
              {declined ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Declined ✕
                </span>
              ) : contactShared ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Shared ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  Pending
                </span>
              )}
            </div>

            <p className="text-xs text-text leading-relaxed">
              <strong
                onClick={() => {
                  if (message.sender?.userName) navigate(`/profile/${message.sender.userName}`);
                }}
                className="text-rose-400 font-bold hover:underline cursor-pointer"
                title={`View @${message.sender?.userName || "User"}'s profile`}
              >
                @{message.sender?.userName || "User"}
              </strong> requested to view your phone number.
            </p>

            {declined ? (
              <div className="text-[11px] text-zinc-300 italic bg-black/30 p-2.5 rounded-xl border border-zinc-800">
                You declined this request {declineReason ? `("${declineReason}")` : ""}.
              </div>
            ) : contactShared ? (
              <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>You shared your contact number ✓</span>
              </div>
            ) : !showDeclineForm ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleShareContactBack}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:opacity-95 active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Share My Number</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineForm(true)}
                  className="py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-rose-500/40 bg-zinc-900/90 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 cursor-pointer shadow-sm active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Deny ✕</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1 p-2.5 bg-black/40 rounded-xl border border-zinc-700/80 animate-in fade-in duration-200">
                <div className="text-[11px] font-bold text-zinc-200 flex items-center justify-between">
                  <span>Deny with optional reason:</span>
                  <button 
                    type="button" 
                    onClick={() => setShowDeclineForm(false)} 
                    className="text-[10px] text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Please reach out via email or DM instead"
                  className="w-full text-xs p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-rose-500"
                />
                <div className="flex flex-wrap gap-1">
                  {["Prefer DM 💬", "Email only ✉️", "Friends only 🔒", "Busy now ⏳"].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setDeclineReason(chip)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                        declineReason === chip
                          ? "bg-rose-500/30 border-rose-500 text-rose-300 font-bold"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDeclineContact}
                    disabled={isDeclining}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isDeclining ? "Declining..." : "Confirm Deny ✕"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeclineForm(false)}
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTACT DECLINED CARD */}
        {isContactDecline && (
          <div className="rounded-2xl p-4 bg-zinc-900/80 border border-rose-500/20 space-y-2 min-w-[220px] my-1">
            <div className="flex items-center gap-2 text-rose-400">
              <div className="p-1.5 rounded-xl bg-rose-500/10">
                <X className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Request Declined</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {message.content?.text || "Contact request was declined."}
            </p>
          </div>
        )}

        {/* CONTACT CARD */}
        {isContactCard && (
          <div className="rounded-2xl p-4 bg-surface-hover/80 border border-border/90 space-y-2.5 min-w-[220px] my-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Contact Card</div>
                <div className="text-xs font-bold text-text">{message.content?.contactData?.name || "User"}</div>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-rose-400 tracking-wider">
              {message.content?.contactData?.phone || "No phone listed"}
            </div>
            {message.content?.contactData?.phone && (
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={`tel:${message.content?.contactData?.phone}`}
                  className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl text-center transition"
                >
                  Call
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content?.contactData?.phone);
                    snackbar.success("Phone number copied!");
                  }}
                  className="p-1.5 rounded-xl bg-surface border border-border text-text-muted hover:text-white transition cursor-pointer"
                  title="Copy Phone"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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
              isSender={false}
              isGradientTheme={isGradientTheme}
            />
          ) : null;
        })()}

        {/* MEDIA */}
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
                className={`${isAnimatedEmoji ? "w-20 h-20 sm:w-24 sm:h-24 max-w-[90px] max-h-[90px]" : activeFont.stickerSizeClass || "w-20 h-20 sm:w-24 sm:h-24"} object-contain drop-shadow-xl select-none hover:scale-105 active:scale-95 transition-all duration-200 my-1 cursor-pointer`}
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
                className="text-sm underline text-text flex items-center gap-1.5 py-1 font-medium"
              >
                📄 {m.name || "Document"}
              </a>
            );
          }
          return null;
        })}

        {/* TEXT */}
        {!(isContactRequest || isContactDecline || isContactCard) && (message.type === "text" || message.content?.text) && message.content?.text?.trim() && (
          <p
            className="text-inherit break-words"
            style={{
              fontSize: activeFont.fontSize,
              lineHeight: activeFont.lineHeight,
              fontFamily: activeFont.fontFamily,
              fontWeight: activeFont.fontWeight || "normal",
              letterSpacing: activeFont.letterSpacing || "normal",
            }}
          >
            {renderFormattedMessageText(message.content?.text, {
              isSender: false,
              searchQuery,
            })}
            {message.edited && (
              <span className="text-[10px] ml-1.5 opacity-70 italic">(edited)</span>
            )}
          </p>
        )}

        {/* TIME */}
        <div className="flex items-center gap-1 self-end mt-0.5 opacity-75 text-inherit">
          {message.edited && <span className="text-[9px]">edited</span>}
          <span className={`${activeFont.timestampSize || "text-[10px]"} font-medium`}>
            {moment(message.createdAt).format("h:mm A")}
          </span>
          {message.isPinned && <Pin size={10} className="text-amber-400 transform rotate-45" />}
          {message.disappear?.enabled && <Clock size={10} className="text-amber-400" />}
        </div>

        {/* WhatsApp / Instagram Style Floating Overlapping Reaction Capsule */}
        <MessageReactionBadge
          reactions={message.reactions}
          currentUserId={currentUserId}
          isSender={false}
          onClick={() => setShowReactionsModal(true)}
        />
      </div>

      {/* FLOATING ACTION TOOLBAR (Beside the bubble on the right) */}
      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 relative select-none">
        <div className="flex items-center gap-0.5 bg-surface/98 dark:bg-zinc-900/98 border border-border/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl rounded-full px-1.5 py-1 text-text">
          {/* 1. React Button */}
          <button
            ref={reactionButtonRef}
            data-reaction-btn="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowReactions((prev) => !prev);
              if (showReactions) setShowCustomEmojiPicker(false);
            }}
            className={`p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer ${
              showReactions ? "text-primary bg-primary/15 ring-1 ring-primary/40 scale-105" : ""
            }`}
            title="React"
          >
            <SmilePlus size={16} strokeWidth={2.4} />
          </button>

          {/* 2. Reply Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReplyTo(message);
            }}
            className="p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
            title="Reply"
          >
            <CornerUpLeft size={16} strokeWidth={2.4} />
          </button>

          {/* 3. Forward Button */}
          {onForwardMessage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onForwardMessage(message);
              }}
              className="p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
              title="Forward"
            >
              <CornerUpRight size={16} strokeWidth={2.4} />
            </button>
          )}

          {/* 4. More Options Button */}
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
        </div>

        {/* OPTIONS DROPDOWN */}
        {showOptions && (
          <div
            ref={optionsRef}
            className="absolute top-8 left-0 bg-surface/98 dark:bg-zinc-900/98 rounded-2xl shadow-2xl text-xs z-50 overflow-hidden min-w-[160px] border border-border/80 py-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-text"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setReplyTo(message);
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text-secondary hover:text-text transition-colors cursor-pointer font-medium"
            >
              <CornerUpLeft size={15} strokeWidth={2.2} className="text-text-muted" /> Reply
            </button>
            {onForwardMessage && (
              <button
                onClick={() => {
                  onForwardMessage(message);
                  setShowOptions(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text-secondary hover:text-text transition-colors cursor-pointer font-medium"
              >
                <CornerUpRight size={15} strokeWidth={2.2} className="text-text-muted" /> Forward
              </button>
            )}
            <button
              onClick={() => {
                handlePin();
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text hover:text-primary transition-colors cursor-pointer font-semibold"
            >
              <Pin size={15} strokeWidth={2.2} className="text-text-secondary" /> {message.isPinned ? "Unpin" : "Pin"}
            </button>
            <div className="border-t border-border/60 my-1" />
            <button
              onClick={() => {
                handleDelete();
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-500/15 w-full text-left text-red-500 transition-colors cursor-pointer font-semibold"
            >
              <Trash2 size={15} strokeWidth={2.2} /> Delete for me
            </button>
          </div>
        )}
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

export default ReceiverMessage;


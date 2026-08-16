import { AlertTriangle, Check, CheckCheck, CornerUpLeft, Edit2, EllipsisVertical, SmilePlus, Trash2, MapPin, ExternalLink, Heart, CornerUpRight, Pin, Clock, Phone, Copy } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../lib/axios";
import { removeMessage, updateMessage } from "../redux/features/messageSlice";
import SharedContentCard from "./SharedContentCard";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import MediaLightboxModal from "./MediaLightboxModal";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

import { getChatThemeById } from "../lib/chatThemes";

const EMOJIS = ["❤️", "😂", "🔥", "👍", "😢", "🙏", "👏", "🎉", "✨", "💯"];

const SenderMessage = ({ message, setReplyTo, isGrouped, isLastInGroup, onEditMessage, onForwardMessage }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((s) => s.user);
  const { conversations } = useSelector((s) => s.message);

  const convId = typeof message.conversation === "object" && message.conversation !== null
    ? message.conversation._id || message.conversation.id
    : message.conversation;
  const currentConv = conversations.find((c) => (c._id || c.conversationId)?.toString() === convId?.toString());
  const activeTheme = currentConv?.theme || "default";
  const themeObj = getChatThemeById(activeTheme);
  const isGradientTheme = activeTheme !== "midnight";
  const bubbleThemeClass = themeObj.senderBubble || "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-md";

  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lightboxData, setLightboxData] = useState({ open: false, url: null, type: "image" });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content?.text || "");

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

  const handleDoubleClick = async () => {
    triggerHaptic("like");
    microAudio.playPop();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
    try {
      const res = await api.post(`/message/react/${message._id}`, { emoji: "❤️" });
      dispatch(updateMessage(res.data.message));
    } catch (e) {
      console.warn("SenderMessage: double-click react failed", e);
    }
  };

  // Refs
  const optionsRef = useRef(null);
  const reactionsRef = useRef(null);
  const reactionButtonRef = useRef(null);
  const messageRef = useRef(null);

  const isSharedContent = Boolean(
    message.type?.startsWith("shared_") ||
    message.type === "share" ||
    message.content?.sharedData ||
    message.sharedData
  );

  const mediaList = isSharedContent
    ? []
    : Array.isArray(message.content?.media)
    ? message.content.media
    : message.content?.media
    ? [message.content.media]
    : message.type === "sticker" && (message.content?.mediaUrl || message.mediaUrl)
    ? [{ url: message.content?.mediaUrl || message.mediaUrl, type: "sticker" }]
    : [];

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(event.target) &&
        !event.target.closest("[data-options-trigger]")
      ) {
        setShowOptions(false);
      }

      if (
        reactionsRef.current &&
        !reactionsRef.current.contains(event.target) &&
        reactionButtonRef.current &&
        !reactionButtonRef.current.contains(event.target)
      ) {
        setShowReactions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReact = async (emoji) => {
    try {
      const res = await api.post(`/message/react/${message._id}`, { emoji });
      dispatch(updateMessage(res.data.message));
      setShowReactions(false);
    } catch (e) {
      console.warn("SenderMessage: handleReact failed", e);
    }
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

  return (
    <div className="relative group/msg flex items-center justify-end my-0.5">
      {/* Floating double-tap Heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <Heart className="w-12 h-12 text-rose-500 fill-rose-500 animate-ping drop-shadow-lg" />
        </div>
      )}

      {/* Floating Emoji Reactions Bar (Responsive & Glassmorphic) */}
      {showReactions && (
        <div
          ref={reactionsRef}
          className="absolute -top-11 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-50 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700/80 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl px-2 py-1 flex items-center gap-1 max-w-[92vw] overflow-x-auto hide-scrollbar animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {EMOJIS.map((e, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleReact(e);
              }}
              className="flex-shrink-0 text-xl hover:scale-130 active:scale-90 transition-transform duration-150 cursor-pointer p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              style={{ minWidth: "30px", textAlign: "center" }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div
        ref={messageRef}
        onDoubleClick={handleDoubleClick}
        className={`relative ml-auto max-w-[88%] sm:max-w-[70%] md:max-w-[60%] px-4 py-2.5 rounded-3xl flex flex-col gap-1 cursor-pointer select-none transition-all duration-200 ${
          highlight
            ? "bg-yellow-500/20 rounded-3xl ring-2 ring-yellow-400"
            : message.status === "failed"
            ? "bg-red-600/20 border border-red-500/50 text-text rounded-3xl"
            : message.status === "sending"
            ? `${bubbleThemeClass} opacity-75`
            : bubbleThemeClass
        }`}
      >
        {/* Forwarded indicator */}
        {message.isForwarded && (
          <div className={`flex items-center gap-1 text-[10px] font-medium ${isGradientTheme ? "text-white/70" : "text-text-muted"}`}>
            <CornerUpRight className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}

        {/* REPLY PREVIEW */}
        {message.replyTo && renderReplyChain(message.replyTo)}

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

        {/* MEDIA PREVIEW */}
        {mediaList.map((m, i) => {
          if (m.type === "sticker" || message.type === "sticker") {
            return (
              <img
                key={i}
                src={m.url}
                alt="Sticker"
                className="w-36 h-36 object-contain drop-shadow-md select-none hover:scale-105 transition-transform my-1"
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
                className={`bg-transparent outline-none border-b border-current pb-0.5 text-sm ${isGradientTheme ? "text-white" : "text-text"}`}
                autoFocus
              />
            ) : (
              message.content?.text?.trim() && (
                <p className={`text-sm break-words leading-relaxed ${isGradientTheme ? "text-white font-normal" : "text-text font-normal"}`}>
                  {message.content?.text}
                  {message.edited && (
                    <span className={`text-[10px] ml-1.5 italic ${isGradientTheme ? "opacity-75" : "text-text-muted"}`}>(edited)</span>
                  )}
                </p>
              )
            )}
          </>
        )}

        {/* REACTIONS DISPLAY */}
        {message.reactions?.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-0.5">
            {message.reactions.map((r, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  isGradientTheme
                    ? "bg-black/25 text-white border-white/20"
                    : "bg-surface-hover text-text border-border"
                }`}
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}

        {/* TIME + DELIVERY STATUS */}
        <div className="flex justify-end items-center gap-1 mt-0.5">
          {message.edited && (
            <span className={`text-[9px] ${isGradientTheme ? "text-white/60" : "text-text-muted"}`}>edited</span>
          )}
          <span className={`text-[10px] font-medium ${isGradientTheme ? "text-white/75" : "text-text-muted"}`}>
            {moment(message.createdAt).format("h:mm A")}
          </span>
          {message.status === "sending" ? (
            <Clock size={12} className={isGradientTheme ? "text-white/60" : "text-text-muted"} />
          ) : message.status === "failed" ? (
            <span className="text-[10px] text-red-300 font-bold">!</span>
          ) : message.status === "seen" ? (
            <CheckCheck size={14} className={isGradientTheme ? "text-cyan-200 font-bold" : "text-primary"} />
          ) : message.status === "delivered" ? (
            <CheckCheck size={14} className={isGradientTheme ? "text-white/70" : "text-text-muted"} />
          ) : (
            <Check size={14} className={isGradientTheme ? "text-white/70" : "text-text-muted"} />
          )}
          {message.isPinned && <Pin size={10} className="text-amber-300 transform rotate-45" />}
          {message.disappear?.enabled && <Clock size={10} className="text-amber-300" />}
        </div>

        {/* REACTION BUTTON (visible on hover / active / touch) */}
        <button
          ref={reactionButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowReactions(!showReactions);
          }}
          className={`absolute -left-8 bottom-1 cursor-pointer bg-surface/90 hover:bg-surface border border-border p-1.5 rounded-full shadow-md transition-all duration-200 ${
            showReactions
              ? "text-primary scale-110 ring-2 ring-primary/40 opacity-100"
              : "text-text-muted hover:text-text hover:scale-110 opacity-0 group-hover/msg:opacity-100 focus:opacity-100"
          }`}
          style={{ zIndex: 10 }}
          title="React"
        >
          <SmilePlus size={14} />
        </button>

        {/* OPTIONS MENU BUTTON */}
        <button
          data-options-trigger
          onClick={() => setShowOptions(!showOptions)}
          className={`absolute top-1 right-2 text-xs hover:scale-110 transition-all duration-200 opacity-0 group-hover/msg:opacity-100 ${
            isGradientTheme ? "text-white/80 hover:text-white" : "text-text-secondary hover:text-text"
          }`}
          title="More options"
        >
          <EllipsisVertical size={15} className="cursor-pointer" />
        </button>

        {/* OPTIONS DROPDOWN */}
        {showOptions && (
          <div
            ref={optionsRef}
            className="absolute top-6 right-2 bg-surface rounded-2xl shadow-2xl text-xs z-50 overflow-hidden min-w-[170px] border border-border py-1 animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={() => {
                setReplyTo(message);
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
            >
              <CornerUpLeft size={14} className="text-text-secondary" /> Reply
            </button>
            {message.type === "text" && (
              <button
                onClick={() => {
                  if (onEditMessage) onEditMessage(message);
                  setShowOptions(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
              >
                <Edit2 size={14} className="text-text-secondary" /> Edit
              </button>
            )}
            <button
              onClick={() => {
                if (onForwardMessage) onForwardMessage(message);
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
            >
              <CornerUpRight size={14} className="text-text-secondary" /> Forward
            </button>
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
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
            >
              <Pin size={14} className="text-text-secondary" /> {message.isPinned ? "Unpin" : "Pin"}
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => handleDelete("me")}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text-secondary hover:text-text transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Delete for me
            </button>
            <button
              onClick={() => handleDelete("everyone")}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-500/10 w-full text-left text-red-500 transition-colors cursor-pointer font-medium"
            >
              <AlertTriangle size={14} /> Delete for everyone
            </button>
          </div>
        )}
      </div>

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

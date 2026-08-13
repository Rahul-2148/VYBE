import { AlertTriangle, Check, CheckCheck, CornerUpLeft, Edit2, EllipsisVertical, SmilePlus, Trash2, MapPin, ExternalLink, Heart, CornerUpRight, Pin, Clock } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../lib/axios";
import { removeMessage, updateMessage } from "../redux/features/messageSlice";
import SharedContentCard from "./SharedContentCard";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import MediaLightboxModal from "./MediaLightboxModal";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😢", "🙏", "👏", "💯", "✨", "🎉"];

const SenderMessage = ({ message, setReplyTo, isGrouped, isLastInGroup, onEditMessage, onForwardMessage }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((s) => s.user);
  const { conversations } = useSelector((s) => s.message);

  const convId = typeof message.conversation === "object" && message.conversation !== null
    ? message.conversation._id || message.conversation.id
    : message.conversation;
  const currentConv = conversations.find((c) => (c._id || c.conversationId)?.toString() === convId?.toString());

  const themeClassMap = {
    default: "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-md shadow-pink-500/10",
    sunset: "bg-gradient-to-r from-rose-500 via-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/10",
    ocean: "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10",
    forest: "bg-gradient-to-r from-emerald-500 via-teal-600 to-green-600 text-white shadow-md shadow-emerald-500/10",
    lavender: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/10",
    midnight: "bg-surface-hover border border-border-strong text-text shadow-md",
  };

  const bubbleThemeClass = themeClassMap[currentConv?.theme || "default"] || themeClassMap.default;

  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lightboxData, setLightboxData] = useState({ open: false, url: null, type: "image" });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content?.text || "");

  const handleDoubleClick = async () => {
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
  const emojiPickerRef = useRef(null);

  const mediaList = Array.isArray(message.content?.media)
    ? message.content.media
    : message.content?.media
    ? [message.content.media]
    : message.content?.sharedData?.mediaUrl
    ? [{ url: message.content.sharedData.mediaUrl, type: message.type === "sticker" ? "sticker" : "image" }]
    : message.sharedData?.mediaUrl
    ? [{ url: message.sharedData.mediaUrl, type: message.type === "sticker" ? "sticker" : "image" }]
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
        !reactionButtonRef.current.contains(event.target) &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowReactions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Position emoji picker above message
  useEffect(() => {
    if (showReactions && messageRef.current && emojiPickerRef.current) {
      const messageRect = messageRef.current.getBoundingClientRect();
      const pickerRect = emojiPickerRef.current.getBoundingClientRect();

      let top = messageRect.top - pickerRect.height - 8;
      let left =
        messageRect.left + messageRect.width / 2 - pickerRect.width / 2;

      // Viewport adjustments
      const viewportWidth = window.innerWidth;

      if (left + pickerRect.width > viewportWidth - 10) {
        left = viewportWidth - pickerRect.width - 10;
      }

      if (left < 10) {
        left = 10;
      }

      if (top < 10) {
        top = messageRect.bottom + 8;
      }

      emojiPickerRef.current.style.top = `${top}px`;
      emojiPickerRef.current.style.left = `${left}px`;
    }
  }, [showReactions]);

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
      <div className="ml-auto text-xs text-text-primary my-2">
        You deleted this message
      </div>
    );
  }

  const highlight =
    window.__search &&
    message.content?.text
      ?.toLowerCase()
      .includes(window.__search.toLowerCase());

  const renderReplyChain = (reply, depth = 0) => {
    if (!reply) return null;

    return (
      <div
        className={`cursor-pointer rounded-xl px-3 py-1 mb-1 border-l-4 ${
          reply.sender?._id === message.sender?._id
            ? "border-pink-500"
            : "border-blue-500"
        } bg-white/10 hover:bg-white/20`}
        onClick={() => {
          const el = document.getElementById(`msg-${reply._id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("flash-highlight");
            setTimeout(() => el.classList.remove("flash-highlight"), 1500);
          }
        }}
      >
        <span className="text-xs font-semibold text-text-primary">
          {reply?.sender?.userName || "User"}:
        </span>{" "}
        <span className="text-sm text-text-primary truncate">
          {reply.content?.text || "Media"}
        </span>
      </div>
    );
  };

  return (
    <div className="relative group/msg flex items-center justify-end my-1">
      {/* Floating double-tap Heart animation */}
      {showHeart && (
        <div className="absolute -top-8 right-6 z-30 animate-bounce text-2xl">
          ❤️
        </div>
      )}

      {/* Emoji Picker popover */}
      {showReactions && (
        <div
          ref={emojiPickerRef}
          className="fixed z-50 bg-surface-inset/95 backdrop-blur-md rounded-full shadow-2xl border border-border/90 transition-all duration-200"
          style={{ animation: "fadeInScale 0.2s ease-out" }}
        >
          <div
            ref={reactionsRef}
            className="flex items-center gap-2 px-3 py-2 overflow-x-auto max-w-[90vw] hide-scrollbar"
          >
            {EMOJIS.map((e, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleReact(e);
                }}
                className="flex-shrink-0 text-2xl hover:scale-125 active:scale-95 transition-transform duration-150 cursor-pointer"
                style={{ minWidth: "36px", textAlign: "center" }}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2">
            <div className="w-3 h-3 bg-surface-inset/95 transform rotate-45 border-b border-r border-border/90"></div>
          </div>
        </div>
      )}

      <div
        ref={messageRef}
        onDoubleClick={handleDoubleClick}
        className={`relative ml-auto max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-3xl flex flex-col gap-1.5 cursor-pointer select-none transition-all duration-200 ${
          highlight
            ? "bg-yellow-500/20 rounded-3xl ring-2 ring-yellow-400"
            : message.status === "failed"
            ? "bg-red-900/40 border border-red-800/50 rounded-3xl"
            : message.status === "sending"
            ? `${bubbleThemeClass} opacity-70`
            : bubbleThemeClass
        }`}
      >
        {/* Forwarded indicator */}
        {message.isForwarded && (
          <div className="flex items-center gap-1 text-[10px] text-white/50 font-medium">
            <CornerUpRight className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}
        {/* Double Tap Floating Heart Overlay */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
            <Heart className="w-12 h-12 text-text fill-white animate-ping drop-shadow-lg" />
          </div>
        )}

        {/* REPLY PREVIEW */}
        {message.replyTo && renderReplyChain(message.replyTo)}

        {/* SHARED CONTENT CARD */}
        {(message.type?.startsWith("shared_") || message.content?.sharedData) && (
          <SharedContentCard
            sharedData={message.content?.sharedData || message.sharedData}
            type={message.type || "shared_post"}
          />
        )}
        {mediaList.map((m, i) => {
          if (m.type === "sticker" || message.type === "sticker") {
            return (
              <img
                key={i}
                src={m.url}
                alt="Sticker"
                className="w-36 h-36 object-contain drop-shadow-md select-none hover:scale-105 transition-transform"
              />
            );
          }
          if (m.type === "image" || m.type === "gif") {
            return (
              <img
                key={i}
                src={m.url}
                onClick={(e) => { e.stopPropagation(); setLightboxData({ open: true, url: m.url, type: "image" }); }}
                className="rounded-xl max-h-[250px] object-cover cursor-pointer hover:opacity-95 transition"
              />
            );
          }
          if (m.type === "video") {
            return (
              <video
                key={i}
                controls
                onClick={(e) => { e.stopPropagation(); setLightboxData({ open: true, url: m.url, type: "video" }); }}
                className="rounded-xl max-h-[300px] cursor-pointer"
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
                className="text-sm underline text-text"
              >
                📄 {m.name || "Document"}
              </a>
            );
          }
          return null;
        })}

        {/* TEXT */}
        {(message.type === "text" || message.content?.text) && (
          <>
            {isEditing ? (
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="bg-transparent outline-none text-text"
                autoFocus
              />
            ) : (
              message.content?.text?.trim() && (
                <p className="text-text break-words">
                  {message.content?.text}
                  {message.edited && (
                    <span className="text-xs ml-1 opacity-70">(edited)</span>
                  )}
                </p>
              )
            )}
          </>
        )}

        {/* REACTIONS DISPLAY */}
        {message.reactions?.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {message.reactions.map((r, i) => (
              <span
                key={i}
                className="text-sm bg-bg/30 px-2 py-0.5 rounded-full"
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}

        {/* TIME + DELIVERY STATUS */}
        <div className="flex justify-end items-center gap-1 mt-0.5">
          {message.edited && <span className="text-[9px] text-white/40">edited</span>}
          <span className="text-[10px] text-white/50">
            {moment(message.createdAt).format("h:mm A")}
          </span>
          {message.status === "sending" ? (
            <Clock size={12} className="text-white/40" />
          ) : message.status === "failed" ? (
            <span className="text-[9px] text-red-300 font-semibold">!</span>
          ) : message.status === "seen" ? (
            <CheckCheck size={14} className="text-text" />
          ) : message.status === "delivered" ? (
            <CheckCheck size={14} className="text-white/50" />
          ) : (
            <Check size={14} className="text-white/50" />
          )}
          {message.isPinned && <Pin size={10} className="text-amber-300" />}
          {message.disappear?.enabled && <Clock size={10} className="text-amber-400/70" />}
        </div>

        {/* REACTION BUTTON */}
        <button
          ref={reactionButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowReactions(!showReactions);
          }}
          className={`absolute -left-6 bottom-2 cursor-pointer bg-card-hover/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg transition-all duration-300 ${
            showReactions
              ? "text-text scale-110 ring-2 ring-purple-400"
              : "text-white/70 hover:text-text hover:scale-110"
          }`}
          style={{ zIndex: 10 }}
        >
          <SmilePlus size={16} />
        </button>

        {/* OPTIONS MENU */}
        <button
          data-options-trigger
          onClick={() => setShowOptions(!showOptions)}
          className="absolute top-1 right-2 text-xs hover:scale-110 transition-transform duration-200"
        >
          <EllipsisVertical
            size={16}
            className="text-white/70 cursor-pointer"
          />
        </button>

        {showOptions && (
          <div
            ref={optionsRef}
            className="absolute top-6 right-2 bg-surface rounded-2xl shadow-2xl text-sm z-50 overflow-hidden min-w-[180px] border border-border py-1"
          >
            <button
              onClick={() => {
                setReplyTo(message);
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
            >
              <CornerUpLeft size={16} /> Reply
            </button>
            {message.type === "text" && (
              <button
                onClick={() => {
                  if (onEditMessage) onEditMessage(message);
                  setShowOptions(false);
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
              >
                <Edit2 size={16} /> Edit
              </button>
            )}
            <button
              onClick={() => {
                if (onForwardMessage) onForwardMessage(message);
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
            >
              <CornerUpRight size={16} /> Forward
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
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
            >
              <Pin size={16} /> {message.isPinned ? "Unpin" : "Pin"}
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => handleDelete("me")}
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-hover w-full text-left text-text-secondary transition-colors cursor-pointer"
            >
              <Trash2 size={16} /> Delete for me
            </button>
            <button
              onClick={() => handleDelete("everyone")}
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-hover/60 w-full text-left text-red-400 transition-colors cursor-pointer"
            >
              <AlertTriangle size={16} /> Delete for everyone
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

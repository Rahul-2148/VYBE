import { SmilePlus, MapPin, ExternalLink, Heart, CornerUpLeft, CornerUpRight, Pin, EllipsisVertical, Clock } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import api from "../lib/axios";
import { updateMessage } from "../redux/features/messageSlice";
import SharedContentCard from "./SharedContentCard";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import MediaLightboxModal from "./MediaLightboxModal";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😢", "🙏", "👏", "💯", "✨", "🎉"];

const ReceiverMessage = ({ message, setReplyTo, isGrouped, isLastInGroup, onForwardMessage }) => {
  const dispatch = useDispatch();
  const [showReactions, setShowReactions] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lightboxData, setLightboxData] = useState({ open: false, url: null, type: "image" });

  const handleDoubleClick = async () => {
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
    try {
      const res = await api.post(`/message/react/${message._id}`, { emoji: "❤️" });
      dispatch(updateMessage(res.data.message));
    } catch (e) {
      console.warn("ReceiverMessage: double-click react failed", e);
    }
  };

  // Refs
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
      console.warn("ReceiverMessage: handleReact failed", e);
    }
  };

  if (message.deletedForEveryone) {
    return (
      <div className="mr-auto text-xs text-text-secondary my-2">
        This message was deleted
      </div>
    );
  }

  const highlight =
    window.__search &&
    message.content?.text
      ?.toLowerCase()
      .includes(window.__search.toLowerCase());

  /** ---------------- RECURSIVE REPLY ---------------- */
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
    <>
      {/* FLOATING EMOJI PICKER - WhatsApp Style */}
      {showReactions && (
        <div
          ref={emojiPickerRef}
          className="fixed z-50 bg-card/95 backdrop-blur-md rounded-full shadow-2xl border border-border-subtle/50 transition-all duration-200"
          style={{
            animation: "fadeInScale 0.2s ease-out",
          }}
        >
          <div
            ref={reactionsRef}
            className="flex items-center gap-2 px-3 py-2 overflow-x-auto max-w-[90vw] hide-scrollbar"
          >
            {EMOJIS.map((e, idx) => (
              <button
                key={idx}
                onClick={(event) => {
                  event.stopPropagation();
                  handleReact(e);
                }}
                className="flex-shrink-0 text-2xl hover:scale-125 active:scale-95 transition-transform duration-150"
                style={{
                  minWidth: "36px",
                  textAlign: "center",
                }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Pointer triangle */}
          <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2">
            <div className="w-3 h-3 bg-card/95 transform rotate-45 border-b border-r border-border-subtle/50"></div>
          </div>
        </div>
      )}

      <div
        ref={messageRef}
        onDoubleClick={handleDoubleClick}
        className={`relative mr-auto max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-3xl flex flex-col gap-1.5 cursor-pointer select-none transition-all duration-200 ${
          highlight
            ? "bg-yellow-500/20 rounded-3xl ring-2 ring-yellow-400"
            : "bg-surface border border-border/90 text-text shadow-sm hover:border-border-strong/80"
        }`}
      >
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

        {/* MEDIA */}
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
                className="text-sm underline text-text-primary"
              >
                📄 {m.name || "Document"}
              </a>
            );
          }
          return null;
        })}

        {/* TEXT */}
        {(message.type === "text" || message.content?.text) && message.content?.text?.trim() && (
          <p className="text-text break-words">
            {message.content?.text}
            {message.edited && (
              <span className="text-xs ml-1 opacity-60">(edited)</span>
            )}
          </p>
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

        {/* TIME */}
        <div className="flex items-center gap-1 self-end mt-0.5">
          {message.edited && <span className="text-[9px] text-text-muted">edited</span>}
          <span className="text-[10px] text-text-muted">
            {moment(message.createdAt).format("h:mm A")}
          </span>
          {message.isPinned && <Pin size={10} className="text-amber-400" />}
          {message.disappear?.enabled && <Clock size={10} className="text-amber-400/70" />}
        </div>

        {/* REACTION BUTTON */}
        <button
          ref={reactionButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowReactions(!showReactions);
          }}
          className={`absolute -right-6 bottom-2 cursor-pointer bg-card-hover/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg transition-all duration-300 ${
            showReactions
              ? "text-text scale-110 ring-2 ring-blue-400"
              : "text-white/70 hover:text-text hover:scale-110"
          }`}
          style={{ zIndex: 10 }}
        >
          <SmilePlus size={16} />
        </button>

        {/* REPLY & FORWARD BUTTON */}
        <div className="absolute top-1 right-2 flex items-center gap-1">
          <button
            onClick={() => setReplyTo(message)}
            className="p-1 text-text-muted hover:text-text rounded-full hover:bg-surface-active/50 transition cursor-pointer opacity-0 group-hover:opacity-100"
            title="Reply"
          >
            <CornerUpLeft size={14} />
          </button>
          {onForwardMessage && (
            <button
              onClick={() => onForwardMessage(message)}
              className="p-1 text-text-muted hover:text-text rounded-full hover:bg-surface-active/50 transition cursor-pointer opacity-0 group-hover:opacity-100"
              title="Forward"
            >
              <CornerUpRight size={14} />
            </button>
          )}
        </div>
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
    </>
  );
};

export default ReceiverMessage;

import axios from "axios";
import { SmilePlus } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { SERVER_URL } from "../App";
import { updateMessage } from "../redux/features/messageSlice";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😢", "🙏", "👏", "💯", "✨", "🎉"];

const ReceiverMessage = ({ message, setReplyTo }) => {
  const dispatch = useDispatch();
  const [showReactions, setShowReactions] = useState(false);

  // Refs
  const reactionsRef = useRef(null);
  const reactionButtonRef = useRef(null);
  const messageRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const mediaList = Array.isArray(message.content?.media)
    ? message.content.media
    : message.content?.media
    ? [message.content.media]
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
    const res = await axios.post(
      `${SERVER_URL}/api/v1/message/react/${message._id}`,
      { emoji },
      { withCredentials: true }
    );
    dispatch(updateMessage(res.data.message));
    setShowReactions(false);
  };

  if (message.deletedForEveryone) {
    return (
      <div className="mr-auto text-xs text-gray-400 my-2">
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
        <span className="text-xs font-semibold text-gray-200">
          {reply?.sender?.userName || "User"}:
        </span>{" "}
        <span className="text-sm text-gray-100 truncate">
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
          className="fixed z-50 bg-gray-900/95 backdrop-blur-md rounded-full shadow-2xl border border-gray-700/50 transition-all duration-200"
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
            <div className="w-3 h-3 bg-gray-900/95 transform rotate-45 border-b border-r border-gray-700/50"></div>
          </div>
        </div>
      )}

      <div
        ref={messageRef}
        className={`relative mr-auto max-w-[65%] p-3 rounded-2xl flex flex-col gap-2 ${
          highlight ? "bg-yellow-500/20" : "bg-[#1a1f1f]"
        }`}
      >
        {/* REPLY PREVIEW */}
        {message.replyTo && renderReplyChain(message.replyTo)}

        {/* MEDIA */}
        {mediaList.map((m, i) => {
          if (m.type === "image" || m.type === "gif") {
            return (
              <img
                key={i}
                src={m.url}
                className="rounded-xl max-h-[250px] object-cover"
              />
            );
          }
          if (m.type === "video") {
            return (
              <video key={i} controls className="rounded-xl max-h-[300px]">
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
                className="text-sm underline text-gray-300"
              >
                📄 {m.name || "Document"}
              </a>
            );
          }
          return null;
        })}

        {/* TEXT */}
        {message.type === "text" && (
          <p className="text-white break-words">
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
                className="text-sm bg-black/30 px-2 py-0.5 rounded-full"
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}

        {/* TIME */}
        <span className="text-[10px] text-gray-400 self-end">
          {moment(message.createdAt).format("hh:mm A")}
        </span>

        {/* REACTION BUTTON */}
        <button
          ref={reactionButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowReactions(!showReactions);
          }}
          className={`absolute -right-6 bottom-2 cursor-pointer bg-gray-800/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg transition-all duration-300 ${
            showReactions
              ? "text-white scale-110 ring-2 ring-blue-400"
              : "text-white/70 hover:text-white hover:scale-110"
          }`}
          style={{ zIndex: 10 }}
        >
          <SmilePlus size={16} />
        </button>

        {/* REPLY BUTTON */}
        <button
          onClick={() => setReplyTo(message)}
          className="absolute top-1 right-2 text-xs text-blue-500 hover:text-blue-400 transition-colors duration-200"
        >
          Reply
        </button>
      </div>
    </>
  );
};

export default ReceiverMessage;

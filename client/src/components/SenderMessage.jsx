import axios from "axios";
import { AlertTriangle, CheckCheck, CornerUpLeft, Edit2, EllipsisVertical, SmilePlus, Trash2 } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SERVER_URL } from "../App";
import { removeMessage, updateMessage } from "../redux/features/messageSlice";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😢", "🙏", "👏", "💯", "✨", "🎉"];

const SenderMessage = ({ message, setReplyTo }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((s) => s.user);

  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content?.text || "");

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
    const res = await axios.post(
      `${SERVER_URL}/api/v1/message/react/${message._id}`,
      { emoji },
      { withCredentials: true }
    );
    dispatch(updateMessage(res.data.message));
    setShowReactions(false);
  };

  const handleDelete = async (type) => {
    if (type === "everyone") {
      const res = await axios.delete(
        `${SERVER_URL}/api/v1/message/delete-for-everyone/${message._id}`,
        { withCredentials: true }
      );
      dispatch(updateMessage(res.data.message));
    } else {
      await axios.delete(`${SERVER_URL}/api/v1/message/${message._id}`, {
        withCredentials: true,
      });
      dispatch(removeMessage(message._id));
    }
    setShowOptions(false);
  };

  const handleEdit = async () => {
    const res = await axios.patch(
      `${SERVER_URL}/api/v1/message/edit/${message._id}`,
      { text: editText },
      { withCredentials: true }
    );
    dispatch(updateMessage(res.data.message));
    setIsEditing(false);
  };

  if (message.deletedForEveryone) {
    return (
      <div className="ml-auto text-xs text-gray-300 my-2">
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
        className={`relative ml-auto max-w-[65%] p-3 rounded-2xl flex flex-col gap-2 ${
          highlight
            ? "bg-yellow-500/20"
            : "bg-gradient-to-br from-purple-600 to-pink-600"
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
                className="text-sm underline text-white"
              >
                📄 {m.name || "Document"}
              </a>
            );
          }
          return null;
        })}

        {/* TEXT */}
        {message.type === "text" && (
          <>
            {isEditing ? (
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="bg-transparent outline-none text-white"
                autoFocus
              />
            ) : (
              <p className="text-white break-words">
                {message.content?.text}
                {message.edited && (
                  <span className="text-xs ml-1 opacity-70">(edited)</span>
                )}
              </p>
            )}
          </>
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
        <div className="flex justify-end gap-1">
          <span className="text-[10px] text-white/70">
            {moment(message.createdAt).format("hh:mm A")}
          </span>
          <CheckCheck size={14} className="text-white/70" />
        </div>

        {/* REACTION BUTTON */}
        <button
          ref={reactionButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowReactions(!showReactions);
          }}
          className={`absolute -left-6 bottom-2 cursor-pointer bg-gray-800/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg transition-all duration-300 ${
            showReactions
              ? "text-white scale-110 ring-2 ring-purple-400"
              : "text-white/70 hover:text-white hover:scale-110"
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
            className="absolute top-6 right-2 bg-white rounded-xl shadow-2xl text-sm z-50 overflow-hidden min-w-[180px] border border-gray-200"
          >
            {message.type === "text" && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowOptions(false);
                }}
                className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 w-full text-left transition-colors duration-200"
              >
                <Edit2 size={16} /> Edit
              </button>
            )}
            <button
              onClick={() => handleDelete("me")}
              className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 w-full text-left transition-colors duration-200"
            >
              <Trash2 size={16} /> Delete for me
            </button>
            <button
              onClick={() => handleDelete("everyone")}
              className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 w-full text-left transition-colors duration-200"
            >
              <AlertTriangle size={16} /> Delete for everyone
            </button>
            <button
              onClick={() => {
                setReplyTo(message);
                setShowOptions(false);
              }}
              className="flex items-center gap-2 px-4 py-3 text-blue-500 hover:bg-blue-50 w-full text-left transition-colors duration-200"
            >
              <CornerUpLeft size={16} /> Reply
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default SenderMessage;

// EmojiPicker.jsx
import { X } from "lucide-react";

const DEFAULT_EMOJIS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "👍",
  "🎉",
  "🥳",
  "🔥",
  "💯",
];

const EmojiPicker = ({
  emojis = DEFAULT_EMOJIS,
  onSelect,
  selectedEmoji = "",
  onClose,
}) => {
  return (
    <div className="absolute bottom-16 right-4 bg-bg/95 p-3 rounded-xl shadow-lg w-64 z-50 flex flex-wrap gap-2">
      {emojis.map((e) => (
        <button
          key={e}
          className={`text-2xl flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 ${
            selectedEmoji === e
              ? "bg-white/20 scale-110"
              : "hover:bg-white/10 hover:scale-105"
          }`}
          onClick={(ev) => {
            ev.stopPropagation();
            onSelect(e);
          }}
        >
          {e}
        </button>
      ))}

      {/* Remove reaction button */}
      <button
        className="text-xl text-white/70 px-2 ml-auto hover:text-text transition"
        onClick={(ev) => {
          ev.stopPropagation();
          onSelect("");
        }}
      >
        <X size={16} className="inline-block stroke-current mr-1" />
      </button>

      {/* Close button */}
      {onClose && (
        <button
          className="absolute top-1 right-2 text-white/50 hover:text-text transition text-sm"
          onClick={(ev) => {
            ev.stopPropagation();
            onClose();
          }}
        >
          <X size={16} className="stroke-current" />
        </button>
      )}
    </div>
  );
};

export default EmojiPicker;

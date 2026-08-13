import React, { useState, useRef, useEffect } from "react";
import { Search, X, Smile, Clock, Heart, Dog, FastForward, Activity, Lightbulb } from "lucide-react";

const EMOJI_CATEGORIES = [
  {
    id: "frequent",
    name: "Frequently Used",
    icon: Clock,
    emojis: ["❤️", "😂", "🔥", "✨", "👍", "😍", "🥺", "🙌", "💯", "💀", "🎉", "🚀", "💬", "🎁", "🌟", "👀", "😭", "🤯", "😎", "🥳"],
  },
  {
    id: "smileys",
    name: "Smileys & Emotion",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😇", "🥰", "😍", "🤩", "😘", "😗",
      "☺️", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🧐", "🤓", "😎", "🥸", "🥳",
      "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
      "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🫡", "🤫",
      "🫠", "🫥", "🤐", "🥴", "😵", "😲", "🤐", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "😇", "🤠", "🤡", "👻",
    ],
  },
  {
    id: "gestures",
    name: "Gestures & Hands",
    icon: Heart,
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕",
      "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳",
      "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄",
    ],
  },
  {
    id: "animals",
    name: "Animals & Nature",
    icon: Dog,
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉",
      "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝",
      "🐛", "🦋", "🐌", "🐞", "🐜", "🕷️", "🕸️", "🦂", "💐", "🌸", "💮", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷",
    ],
  },
  {
    id: "food",
    name: "Food & Drink",
    icon: FastForward,
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝",
      "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨",
      "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆",
      "🌮", "🌯", "🍿", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍩", "🍪", "🎂", "🍰", "🧁", "🍫", "🍬",
    ],
  },
  {
    id: "activities",
    name: "Activities & Sports",
    icon: Activity,
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍",
      "🏏", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂",
      "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴",
    ],
  },
  {
    id: "objects",
    name: "Objects & Symbols",
    icon: Lightbulb,
    emojis: [
      "💡", "🔦", "🕯️", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "⚒️",
      "🛠️", "⛏️", "🔩", "⚙️", "🧱", "⛓️", "🧲", "💣", "🔪", "🗡️", "⚔️", "🛡️", "🔮", "🧿", "📿", "💈", "⚗️",
      "🔭", "🔬", "🕳️", "🩹", "🩺", "💊", "💉", "🧬", "🦠", "🧫", "🧪", "🌡️", "🧹", "🧺", "🧻", "🔑", "🔒",
    ],
  },
];

export const EmojiPickerPopover = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState("frequent");
  const [searchQuery, setSearchQuery] = useState("");
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  const filteredEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((emoji) => emoji.includes(searchQuery.trim()))
    : currentCategory.emojis;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-14 left-0 z-50 w-72 sm:w-80 h-80 bg-surface-inset/95 backdrop-blur-2xl border border-border/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Search Input Bar */}
      <div className="p-2.5 border-b border-border/80 bg-bg/40 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-text outline-none focus:border-border-strong transition placeholder:text-text-muted"
          />
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface hover:bg-surface-hover transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/60 bg-surface/40">
          {EMOJI_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isActive ? "bg-surface-hover text-rose-500 font-bold" : "text-text-secondary hover:text-text"
                }`}
                title={cat.name}
              >
                <IconComponent className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
        <p className="text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">
          {searchQuery ? "Search Results" : currentCategory.name}
        </p>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => {
                onSelectEmoji(emoji);
              }}
              className="w-9 h-9 rounded-xl hover:bg-surface-hover hover:scale-125 transition-all duration-150 flex items-center justify-center text-xl cursor-pointer select-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPickerPopover;

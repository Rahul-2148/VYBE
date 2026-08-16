import React, { useState, useRef, useEffect } from "react";
import { Search, X, Smile, Clock, Heart, Dog, FastForward, Activity, Lightbulb, Sparkles, MapPin, Flag } from "lucide-react";

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
      "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤔", "🫣", "🤭", "🫡", "🤫", "🫠",
      "🫥", "🤐", "🥴", "😵", "😲", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🤠", "🤡", "👻", "💀", "👽", "👾",
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
    ],
  },
  {
    id: "activities",
    name: "Activities & Sports",
    icon: Activity,
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🎱", "🏓", "🏸", "🏒", "🏏", "⛳", "🏹", "🎣",
      "🥊", "🥋", "🛹", "🎿", "🏂", "🏋️", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚴",
    ],
  },
  {
    id: "travel",
    name: "Travel & Places",
    icon: MapPin,
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🎛️", "🏎️", "🏍️", "🛵", "🚲", "🛴", "🚂", "✈️", "🚀", "🛸", "🚁", "⛵", "🚢",
      "⚓", "🧭", "🌋", "🏔️", "🏕️", "🏖️", "🏜️", "🏝️", "🏙️", "🏰", "🗼", "⛪", "🕋", "🏬", "🏢", "🏠", "🏡",
    ],
  },
  {
    id: "objects",
    name: "Objects & Symbols",
    icon: Lightbulb,
    emojis: [
      "💡", "🔦", "🕯️", "💸", "💵", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "🔩", "⚙️", "🔒", "🔑", "🛡️",
      "☎️", "💻", "🖥️", "📷", "🎥", "📼", "💿", "📚", "📝", "✉️", "📦", "📌", "📎", "📁", "📂", "🗑️", "🔮",
    ],
  },
  {
    id: "flags",
    name: "Flags",
    icon: Flag,
    emojis: [
      "🏁", "🚩", "🎌", "🏴", "🏳️", "🌈", "🇮🇳", "🇺🇸", "🇬🇧", "🇨🇦", "🇩🇪", "🇯🇵", "🇫🇷", "🇦🇺", "🇧🇷", "🇷🇺", "🇰🇷",
    ],
  },
];

const VYBE_STICKERS = [
  { id: "s1", name: "Heart Fire", url: "https://media.giphy.com/media/26hpKMT7M4iRodPJ6/giphy.gif" },
  { id: "s2", name: "Love Pop", url: "https://media.giphy.com/media/l41K3o5TzNVg59Y6g/giphy.gif" },
  { id: "s3", name: "Sparkle Heart", url: "https://media.giphy.com/media/l3vR4CdLInEAotvuM/giphy.gif" },
  { id: "s4", name: "Party Cat", url: "https://media.giphy.com/media/3o7TKsjN9uXYo1me9a/giphy.gif" },
  { id: "s5", name: "Fire Flame", url: "https://media.giphy.com/media/13HgwVL9Z0W6yw/giphy.gif" },
  { id: "s6", name: "Cute Wow", url: "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif" },
  { id: "s7", name: "Dancing Mood", url: "https://media.giphy.com/media/l0HlHJGHe3yAMhdQY/giphy.gif" },
  { id: "s8", name: "Clap Hands", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
];

export const VybeExpressionPicker = ({ initialTab = "emojis", onSelectEmoji, onSendSticker, onClose }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
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

  const filteredStickers = searchQuery.trim()
    ? VYBE_STICKERS.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : VYBE_STICKERS;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-16 left-0 z-50 w-76 sm:w-84 max-w-[calc(100vw-2rem)] h-96 bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur-2xl"
    >
      {/* TABS HEADER */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-inset/60">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("emojis")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "emojis" ? "bg-surface text-primary shadow-xs" : "text-text-secondary hover:text-text"
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stickers")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "stickers" ? "bg-surface text-primary shadow-xs" : "text-text-secondary hover:text-text"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stickers</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-text-secondary hover:text-text hover:bg-surface transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="p-2 border-b border-border/60 bg-surface/30">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "emojis" ? "Search emoji..." : "Search stickers..."}
            className="w-full bg-surface-inset border border-border text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-primary/50 text-text placeholder-text-muted"
          />
        </div>
      </div>

      {/* EMOJIS VIEW */}
      {activeTab === "emojis" && (
        <>
          {/* Category Scroller */}
          {!searchQuery.trim() && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 overflow-x-auto hide-scrollbar bg-surface/10">
              {EMOJI_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    title={category.name}
                    className={`p-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                      isActive ? "bg-surface text-primary border border-border" : "text-text-muted hover:text-text"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Emoji Grid */}
          <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
            <div className="grid grid-cols-7 gap-2">
              {filteredEmojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition duration-150 cursor-pointer rounded-lg hover:bg-surface-hover"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* STICKERS VIEW */}
      {activeTab === "stickers" && (
        <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
          <p className="text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">Vybe Reaction Stickers</p>
          <div className="grid grid-cols-2 gap-2">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => onSendSticker(sticker.url)}
                className="group relative aspect-square bg-surface border border-border rounded-xl overflow-hidden p-2 hover:border-primary/50 hover:scale-105 transition cursor-pointer flex items-center justify-center shadow-xs"
              >
                <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" />
                <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-text bg-surface/90 border border-border rounded py-0.5 opacity-0 group-hover:opacity-100 transition text-center truncate">
                  {sticker.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VybeExpressionPicker;

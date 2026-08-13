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
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", " Volleyball", "🏐", "🎱", "🏓", "🏸", "🏒", "🏏", "⛳", "🏹", "🎣",
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

const INSTAGRAM_STICKERS = [
  { id: "s1", name: "Heart Fire", url: "https://media.giphy.com/media/26hpKMT7M4iRodPJ6/giphy.gif" },
  { id: "s2", name: "Love Pop", url: "https://media.giphy.com/media/l41K3o5TzNVg59Y6g/giphy.gif" },
  { id: "s3", name: "Sparkle Heart", url: "https://media.giphy.com/media/l3vR4CdLInEAotvuM/giphy.gif" },
  { id: "s4", name: "Party Cat", url: "https://media.giphy.com/media/3o7TKsjN9uXYo1me9a/giphy.gif" },
  { id: "s5", name: "Fire Flame", url: "https://media.giphy.com/media/13HgwVL9Z0W6yw/giphy.gif" },
  { id: "s6", name: "Cute Wow", url: "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif" },
  { id: "s7", name: "Dancing Mood", url: "https://media.giphy.com/media/l0HlHJGHe3yAMhdQY/giphy.gif" },
  { id: "s8", name: "Clap Hands", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
];

export const InstagramExpressionPicker = ({ initialTab = "emojis", onSelectEmoji, onSendSticker, onClose }) => {
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
    ? INSTAGRAM_STICKERS.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : INSTAGRAM_STICKERS;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-16 left-0 z-50 w-76 sm:w-84 h-96 bg-surface-inset/95 border border-border/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur-2xl"
    >
      {/* Top Header Mode Tabs: Emojis vs Stickers */}
      <div className="flex items-center justify-between p-2.5 border-b border-border/80 bg-surface-overlay shrink-0">
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("emojis")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === "emojis" ? "bg-surface-hover text-text shadow" : "text-text-secondary hover:text-text"
            }`}
          >
            Emojis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stickers")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              activeTab === "stickers" ? "bg-surface-hover text-rose-400 shadow" : "text-text-secondary hover:text-text"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stickers</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface hover:bg-surface-hover transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="p-2 border-b border-border/60 bg-surface/40 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder={activeTab === "emojis" ? "Search emojis..." : "Search stickers..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border/85 rounded-xl pl-8 pr-3 py-1.5 text-xs text-text outline-none focus:border-border-strong transition placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* EMOJIS VIEW */}
      {activeTab === "emojis" && (
        <>
          {!searchQuery && (
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40 bg-surface-inset/40 shrink-0 overflow-x-auto hide-scrollbar gap-1">
              {EMOJI_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`p-1.5 rounded-xl transition cursor-pointer shrink-0 ${
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

          <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
            <p className="text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">
              {searchQuery ? "Search Results" : currentCategory.name}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-9 h-9 rounded-xl hover:bg-surface-hover hover:scale-125 transition-all duration-150 flex items-center justify-center text-xl cursor-pointer select-none"
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
          <p className="text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">Instagram Reaction Stickers</p>
          <div className="grid grid-cols-2 gap-2">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => onSendSticker(sticker.url)}
                className="group relative aspect-square bg-surface border border-border/80 rounded-xl overflow-hidden p-2 hover:border-rose-500/50 hover:scale-105 transition cursor-pointer flex items-center justify-center"
              >
                <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" />
                <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-text bg-surface-overlay rounded py-0.5 opacity-0 group-hover:opacity-100 transition text-center truncate">
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

export default InstagramExpressionPicker;

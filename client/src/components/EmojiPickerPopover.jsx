// src/components/EmojiPickerPopover.jsx - Viewport-Aware Auto-Flipping Floating Emoji Reaction Popover
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Smile, Clock, Heart, Dog, Utensils, Trophy, Lamp, Flag } from "lucide-react";
import { triggerHaptic } from "../lib/interactiveEffects";

const EMOJI_CATEGORIES = [
  {
    id: "frequent",
    name: "Recent",
    icon: Clock,
    emojis: ["❤️", "😂", "🔥", "✨", "👍", "😍", "🥺", "🙌", "💯", "💀", "🎉", "🚀", "💬", "🎁", "🌟", "👀", "😭", "🤯", "😎", "🥳", "👏", "🙏", "🤩", "🥰"],
  },
  {
    id: "smileys",
    name: "Smileys",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😇", "🥰", "😍", "🤩", "😘", "😗",
      "☺️", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🧐", "🤓", "😎", "🥸", "🥳",
      "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
      "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤔", "🫣", "🫡", "🫠", "🫥", "🤐",
      "🥴", "😵", "😲", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🤠", "🤡", "👻", "💩", "🤖", "👾", "👽"
    ],
  },
  {
    id: "gestures",
    name: "People",
    icon: Heart,
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕",
      "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳",
      "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄"
    ],
  },
  {
    id: "animals",
    name: "Nature",
    icon: Dog,
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵",
      "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝",
      "🐛", "🦋", "🐌", "🐞", "🐜", "🕷️", "🕸️", "🦂", "💐", "🌸", "💮", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷"
    ],
  },
  {
    id: "food",
    name: "Food",
    icon: Utensils,
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝",
      "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨",
      "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆",
      "🌮", "🌯", "🍿", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍩", "🍪", "🎂", "🍰", "🧁", "🍫", "🍬"
    ],
  },
  {
    id: "activities",
    name: "Activities",
    icon: Trophy,
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏐", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍",
      "🏏", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂",
      "🎮", "🕹️", "🎲", "🧩", "🎯", "🎳", "🎨", "🎭", "🎪", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸"
    ],
  },
  {
    id: "objects",
    name: "Objects",
    icon: Lamp,
    emojis: [
      "💡", "🔦", "🕯️", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "⚒️",
      "🛠️", "⛏️", "🔩", "⚙️", "🧱", "⛓️", "🧲", "💣", "🔪", "🗡️", "⚔️", "🛡️", "🔮", "🧿", "📿", "💈", "⚗️",
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"
    ],
  },
  {
    id: "flags",
    name: "Flags",
    icon: Flag,
    emojis: [
      "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇮🇳", "🇺🇸", "🇬🇧", "🇨🇦", "🇦🇺", "🇩🇪", "🇫🇷", "🇯🇵"
    ],
  },
];

export const EmojiPickerPopover = ({
  triggerRef,
  onSelectEmoji,
  onClose,
  align = "right", // "right" for SenderMessage, "left" for ReceiverMessage
}) => {
  const [activeCategory, setActiveCategory] = useState("frequent");
  const [searchQuery, setSearchQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, isBottom: false, isReady: false });
  const popoverRef = useRef(null);

  // Compute exact viewport bounding coordinates with auto-flip and auto-clamp
  useLayoutEffect(() => {
    const updatePosition = () => {
      const popoverWidth = Math.min(300, window.innerWidth - 20);
      const popoverHeight = 275;

      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceAbove = rect.top - 10;
        const isBottom = spaceAbove < popoverHeight;

        let top = isBottom ? rect.bottom + 6 : rect.top - popoverHeight - 6;
        if (top + popoverHeight > window.innerHeight - 10) {
          top = window.innerHeight - popoverHeight - 10;
        }
        if (top < 10) top = 10;

        let left = align === "right" ? rect.right - popoverWidth : rect.left;
        if (left + popoverWidth > window.innerWidth - 10) {
          left = window.innerWidth - popoverWidth - 10;
        }
        if (left < 10) left = 10;

        setPos({ top, left, isBottom, isReady: true });
      } else {
        // Fallback to center-screen placement
        setPos({
          top: Math.max(10, (window.innerHeight - popoverHeight) / 2),
          left: Math.max(10, (window.innerWidth - popoverWidth) / 2),
          isBottom: false,
          isReady: true,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [triggerRef, align]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        (!triggerRef?.current || !triggerRef.current.contains(e.target))
      ) {
        onClose?.();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose, triggerRef]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  const filteredEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((emoji) => emoji.includes(searchQuery.trim()))
    : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ opacity: pos.isReady ? 1 : 0 }}
      >
        <motion.div
          ref={popoverRef}
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 420 }}
          style={{
            position: "fixed",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            transformOrigin: `${align === "right" ? "right" : "left"} ${pos.isBottom ? "top" : "bottom"}`,
          }}
          data-emoji-picker="true"
          className="pointer-events-auto w-[295px] sm:w-[305px] h-[275px] bg-surface/98 backdrop-blur-2xl border border-border/90 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden select-none text-text"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Search Bar */}
          <div className="p-2 border-b border-border/60 bg-bg-subtle/60 flex items-center gap-1.5 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search emoji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border/80 rounded-lg pl-7.5 pr-6 py-1 text-xs text-text outline-none focus:border-primary transition placeholder:text-text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchQuery("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose?.();
              }}
              className="p-1 text-text-secondary hover:text-text rounded-lg hover:bg-surface-hover transition cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compact Category Tabs */}
          {!searchQuery && (
            <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border/50 bg-bg-subtle/30 overflow-x-auto hide-scrollbar shrink-0 justify-between">
              {EMOJI_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerHaptic("light");
                      setActiveCategory(cat.id);
                    }}
                    className={`flex-1 py-1 px-1 rounded-lg transition cursor-pointer flex items-center justify-center min-w-[28px] ${
                      isActive
                        ? "bg-primary text-white shadow-2xs font-bold"
                        : "text-text-secondary hover:text-text hover:bg-surface-hover"
                    }`}
                    title={cat.name}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Emoji Grid */}
          <div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
            {searchQuery ? (
              <div>
                <p className="text-[10px] font-bold text-text-muted mb-1 uppercase tracking-wider px-1">
                  Results ({filteredEmojis.length})
                </p>
                <div className="grid grid-cols-6 gap-1 text-center justify-items-center">
                  {filteredEmojis.map((emoji, index) => (
                    <button
                      key={`s-${emoji}-${index}`}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerHaptic("medium");
                        onSelectEmoji(emoji);
                      }}
                      className="w-8.5 h-8.5 rounded-lg hover:bg-surface-hover hover:scale-125 active:scale-95 transition-all duration-150 flex items-center justify-center text-xl cursor-pointer select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {filteredEmojis.length === 0 && (
                  <div className="text-center py-8 text-text-muted text-xs">
                    No emoji found
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-bold text-text-muted mb-1 uppercase tracking-wider px-1">
                  {currentCategory.name}
                </p>
                <div className="grid grid-cols-6 gap-1 text-center justify-items-center">
                  {currentCategory.emojis.map((emoji, index) => (
                    <button
                      key={`${currentCategory.id}-${emoji}-${index}`}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerHaptic("medium");
                        onSelectEmoji(emoji);
                      }}
                      className="w-8.5 h-8.5 rounded-lg hover:bg-surface-hover hover:scale-125 active:scale-95 transition-all duration-150 flex items-center justify-center text-xl cursor-pointer select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default EmojiPickerPopover;

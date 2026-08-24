import React, { useMemo } from "react";
import { triggerHaptic } from "../lib/interactiveEffects";

/**
 * MessageReactionBadge
 * Renders the WhatsApp / Instagram style floating reaction capsule at the edge of the message bubble.
 */
const MessageReactionBadge = ({
  reactions = [],
  currentUserId,
  onClick,
  isSender = false,
}) => {
  // Extract unique emojis (up to 3 distinct displayed)
  const uniqueEmojis = useMemo(() => {
    if (!reactions || reactions.length === 0) return [];
    const set = new Set();
    reactions.forEach((r) => {
      if (r?.emoji) set.add(r.emoji);
    });
    return Array.from(set).slice(0, 3);
  }, [reactions]);

  // Check if current user reacted
  const myReaction = useMemo(() => {
    if (!reactions || reactions.length === 0) return null;
    return reactions.find(
      (r) => (r?.user?._id || r?.user?.id || r?.user || "").toString() === currentUserId?.toString()
    );
  }, [reactions, currentUserId]);

  if (!reactions || reactions.length === 0) return null;

  const count = reactions.length;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        triggerHaptic("light");
        onClick?.();
      }}
      title="View reactions"
      className={`absolute -bottom-2.5 ${
        isSender ? "right-2" : "left-2"
      } z-20 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface/98 dark:bg-zinc-850/98 border ${
        myReaction
          ? "border-primary/60 text-primary shadow-primary/20 bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/30"
          : "border-border/90 text-text shadow-black/10 hover:border-text-secondary/40"
      } shadow-md backdrop-blur-xl cursor-pointer select-none hover:scale-105 active:scale-95 transition-all duration-150`}
    >
      {/* Distinct Emojis */}
      <div className="flex items-center -space-x-1">
        {uniqueEmojis.map((emoji, idx) => (
          <span key={idx} className="text-xs leading-none">
            {emoji}
          </span>
        ))}
      </div>

      {/* Count (shown if > 1 or multiple people) */}
      {count > 1 && (
        <span className={`text-[10px] font-bold ml-1 ${myReaction ? "text-primary font-extrabold" : "text-text-secondary"}`}>
          {count}
        </span>
      )}
    </div>
  );
};

export default React.memo(MessageReactionBadge);

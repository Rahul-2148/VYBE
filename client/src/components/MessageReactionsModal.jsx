import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import dp from "../assets/dp3.png";
import VerifiedBadge from "./VerifiedBadge";
import { triggerHaptic } from "../lib/interactiveEffects";

const MessageReactionsModal = ({
  isOpen,
  onClose,
  reactions = [],
  currentUserId,
  onRemoveReaction,
}) => {
  const [activeTab, setActiveTab] = useState("all");

  // Group reactions by emoji
  const emojiGroups = useMemo(() => {
    const map = {};
    reactions.forEach((r) => {
      if (!map[r.emoji]) map[r.emoji] = [];
      map[r.emoji].push(r);
    });
    return map;
  }, [reactions]);

  const uniqueEmojis = useMemo(() => Object.keys(emojiGroups), [emojiGroups]);

  const filteredReactions = useMemo(() => {
    if (activeTab === "all") return reactions;
    return emojiGroups[activeTab] || [];
  }, [activeTab, reactions, emojiGroups]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Sheet Content */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="relative w-full sm:max-w-md bg-surface border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] sm:max-h-[560px] text-text"
        >
          {/* Mobile Drag Pill */}
          <div className="sm:hidden w-full flex justify-center pt-3 pb-1 bg-surface">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text">Reactions</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {reactions.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Emoji Filter Tabs */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border overflow-x-auto hide-scrollbar bg-bg-subtle/80">
            <button
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("all");
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:text-text hover:bg-surface-hover border border-border"
              }`}
            >
              All {reactions.length}
            </button>

            {uniqueEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab(emoji);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === emoji
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface text-text-secondary hover:text-text hover:bg-surface-hover border border-border"
                }`}
              >
                <span className="text-sm">{emoji}</span>
                <span>{emojiGroups[emoji]?.length || 0}</span>
              </button>
            ))}
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50 p-2 sm:p-3 bg-surface">
            {filteredReactions.map((r, i) => {
              const u = r.user || {};
              const isMe = (u._id || u.id || u).toString() === currentUserId?.toString();
              const avatar =
                u.profileImage?.url ||
                (typeof u.profileImage === "string" ? u.profileImage : null) ||
                u.profilePicture?.url ||
                (typeof u.profilePicture === "string" ? u.profilePicture : null) ||
                dp;

              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-surface-hover transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border">
                      <img src={avatar} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-text truncate">
                          {isMe ? "You" : u.name || u.userName || "User"}
                        </span>
                        {u.isVerified && <VerifiedBadge size={14} />}
                      </div>
                      <p className="text-xs text-text-muted truncate">
                        {isMe ? "Tap emoji to remove" : `@${u.userName || "user"}`}
                      </p>
                    </div>
                  </div>

                  {/* Reaction Emoji & Remove Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isMe ? (
                      <button
                        onClick={() => {
                          triggerHaptic("medium");
                          onRemoveReaction?.(r.emoji);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition cursor-pointer border border-rose-500/20"
                        title="Remove your reaction"
                      >
                        <span className="text-base">{r.emoji}</span>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-xl p-1 drop-shadow-xs">{r.emoji}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MessageReactionsModal;

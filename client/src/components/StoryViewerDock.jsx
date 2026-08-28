import React, { useState } from "react";
import { Send, Heart, Share2 } from "lucide-react";
import { FaHeart } from "react-icons/fa";

const QUICK_EMOJIS = ["❤️", "😂", "🔥", "😭", "👏", "😮", "🎉", "💯"];

export const StoryViewerDock = ({
  isLiked = false,
  replyText = "",
  onReplyChange,
  onReplySubmit,
  onReactEmoji,
  onToggleLike,
  onOpenShare,
}) => {
  return (
    <div
      className="flex flex-col gap-2.5 w-full select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick Floating Emojis */}
      <div className="flex items-center justify-between px-1">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReactEmoji(emoji)}
            className="text-2xl hover:scale-135 active:scale-90 transition-transform duration-150 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] cursor-pointer"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Reply Input Bar & Actions */}
      <div className="flex items-center gap-2">
        <form
          onSubmit={onReplySubmit}
          className="flex-1 flex items-center bg-black/40 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2.5 shadow-lg focus-within:border-white/50 transition"
        >
          <input
            type="text"
            placeholder="Send message..."
            value={replyText}
            onChange={(e) => onReplyChange(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder:text-white/60 outline-none"
          />
          {replyText.trim() && (
            <button
              type="submit"
              className="ml-2 text-rose-400 hover:text-rose-300 font-bold transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Like Button */}
        <button
          type="button"
          onClick={onToggleLike}
          className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 text-white transition active:scale-90 shadow-lg cursor-pointer"
          title={isLiked ? "Unlike" : "Like story"}
        >
          {isLiked ? (
            <FaHeart className="w-5 h-5 text-[#ff3040] animate-[heartPop_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]" />
          ) : (
            <Heart className="w-5 h-5 text-white hover:text-rose-400 transition" />
          )}
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={onOpenShare}
          className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 text-white transition active:scale-90 shadow-lg cursor-pointer"
          title="Share story"
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
};

export default StoryViewerDock;

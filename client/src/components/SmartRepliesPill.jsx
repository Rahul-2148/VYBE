import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import api from "../lib/axios";

export const SmartRepliesPill = ({ lastMessageText, onSelectReply }) => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!lastMessageText) return;

    api
      .get(`/ai/smart-replies?messageText=${encodeURIComponent(lastMessageText)}`)
      .then((res) => {
        if (res.data.success) {
          setSuggestions(res.data.suggestions || []);
        }
      })
      .catch(() => setSuggestions([]));
  }, [lastMessageText]);

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-2 bg-surface-inset/80 border-t border-border/60 backdrop-blur w-full">
      <div className="w-full max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Replies:</span>
        </div>

        <div className="flex items-center gap-2">
          {suggestions.map((text, i) => (
            <button
              key={i}
              onClick={() => onSelectReply(text)}
              className="px-3 py-1 bg-surface hover:bg-surface-hover border border-border hover:border-rose-500/50 rounded-full text-xs text-text hover:text-text transition shrink-0 whitespace-nowrap shadow-sm cursor-pointer"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartRepliesPill;

import React from "react";
import { Sparkles, Users, Star } from "lucide-react";

export const FeedFilterBar = ({ activeMode, onChangeMode }) => {
  const modes = [
    { id: "for-you", label: "For You", icon: Sparkles },
    { id: "following", label: "Following", icon: Users },
    { id: "favorites", label: "Favorites", icon: Star },
  ];

  return (
    <div className="w-full flex items-center justify-center gap-2 p-2 bg-surface border border-border rounded-2xl max-w-sm mx-auto shadow-lg">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = activeMode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChangeMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              isActive
                ? "bg-gradient-to-r from-pink-500 to-rose-600 text-text shadow"
                : "text-text-secondary hover:text-text hover:bg-surface-hover"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default FeedFilterBar;

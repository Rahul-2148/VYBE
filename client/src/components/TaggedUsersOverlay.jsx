import React from "react";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TaggedUsersOverlay = ({ taggedUsers = [], showTags, setShowTags }) => {
  const navigate = useNavigate();

  if (!taggedUsers || taggedUsers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Tap indicator button bottom left */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowTags((prev) => !prev);
        }}
        className="absolute bottom-3 left-3 p-2 rounded-full bg-surface-overlay text-text hover:bg-bg/90 pointer-events-auto backdrop-blur transition border border-white/10 shadow-lg"
        title="Show tagged people"
      >
        <User className="w-4 h-4 text-rose-400" />
      </button>

      {/* Tag Bubbles Overlay */}
      {showTags &&
        taggedUsers.map((item, index) => {
          const user = item.user;
          if (!user) return null;
          const userName = user.userName || user.name || "User";

          return (
            <div
              key={index}
              style={{ left: `${item.x || 50}%`, top: `${item.y || 50}%` }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${userName}`);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-surface-overlay backdrop-blur border border-border-strong px-3 py-1 rounded-xl text-text text-xs font-bold shadow-2xl pointer-events-auto cursor-pointer hover:bg-rose-600 transition flex items-center gap-1.5 animate-in fade-in zoom-in duration-200"
            >
              <span>@{userName}</span>
            </div>
          );
        })}
    </div>
  );
};

export default TaggedUsersOverlay;

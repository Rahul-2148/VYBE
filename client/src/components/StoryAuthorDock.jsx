import React from "react";
import { Sparkles, ChevronUp, Users } from "lucide-react";
import dp from "../assets/dp3.png";

export const StoryAuthorDock = ({
  viewers = [],
  onOpenActivity,
  onOpenHighlight,
}) => {
  const viewerPreview = viewers.slice(0, 3);
  const totalViews = viewers.length;

  return (
    <div
      className="flex items-center justify-between gap-3 w-full select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Activity / Viewers Button */}
      <button
        type="button"
        onClick={onOpenActivity}
        className="flex-1 flex items-center justify-between px-4 py-2.5 bg-black/45 hover:bg-black/65 backdrop-blur-xl border border-white/20 rounded-full transition shadow-lg group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {viewerPreview.length > 0 ? (
            <div className="flex -space-x-2 shrink-0">
              {viewerPreview.map((v, i) => (
                <img
                  key={v._id || i}
                  src={v.profileImage?.url || dp}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border-2 border-black"
                />
              ))}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70">
              <Users className="w-3.5 h-3.5" />
            </div>
          )}

          <span className="text-xs font-bold text-white group-hover:text-rose-400 transition truncate">
            {totalViews > 0 ? `Activity (${totalViews})` : "No views yet"}
          </span>
        </div>

        <ChevronUp className="w-4 h-4 text-white/70 group-hover:-translate-y-0.5 transition" />
      </button>

      {/* Quick Highlight Button */}
      <button
        type="button"
        onClick={onOpenHighlight}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-black/45 hover:bg-black/65 backdrop-blur-xl border border-white/20 rounded-full text-white transition shadow-lg active:scale-95 cursor-pointer"
        title="Add to Highlight"
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold text-white">Highlight</span>
      </button>
    </div>
  );
};

export default StoryAuthorDock;

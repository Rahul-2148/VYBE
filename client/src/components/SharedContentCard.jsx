import React from "react";
import { ExternalLink, Play, User, Image as ImageIcon, Sparkles, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";

export const SharedContentCard = ({ sharedData, type }) => {
  const navigate = useNavigate();

  if (!sharedData) return null;

  const rawType = (type?.replace("shared_", "") || "post").toLowerCase();

  const handleNavigate = (e) => {
    e.stopPropagation();
    if ((rawType === "post" || rawType === "share") && sharedData._id) {
      navigate(`/?postId=${sharedData._id}`);
    } else if ((rawType === "reel" || rawType === "loop") && sharedData._id) {
      navigate(`/reels?reelId=${sharedData._id}`, { state: { initialLoopId: sharedData._id } });
    } else if (rawType === "story" && sharedData._id) {
      navigate(`/story/${sharedData._id}`);
    } else if ((rawType === "profile" || rawType === "user") && (sharedData.userName || sharedData.author?.userName)) {
      navigate(`/profile/${sharedData.userName || sharedData.author?.userName}`);
    }
  };

  const authorName = sharedData.author?.userName || sharedData.userName || "user";
  const authorAvatar = sharedData.author?.profileImage?.url || sharedData.profileImage?.url || dp;
  const mediaUrl = sharedData.mediaUrl || sharedData.media?.url || (Array.isArray(sharedData.media) ? sharedData.media[0]?.url : null) || (Array.isArray(sharedData.carousel) ? sharedData.carousel[0]?.url : null);

  return (
    <div
      onClick={handleNavigate}
      className="w-full max-w-[280px] sm:max-w-xs bg-surface/90 border border-border/90 rounded-2xl overflow-hidden cursor-pointer hover:border-border-strong hover:scale-[1.01] transition-all duration-200 shadow-xl my-1 group"
    >
      {/* Header Info */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-bg/40">
        <img
          src={authorAvatar}
          alt=""
          className="w-6 h-6 rounded-full object-cover border border-border-strong/80"
        />
        <div className="truncate flex-1 min-w-0">
          <p className="text-[11px] font-bold text-text truncate leading-tight">
            @{authorName}
          </p>
          <span className="text-[9px] text-text-secondary capitalize font-medium">
            {rawType === "reel" ? "Reel" : rawType === "profile" ? "Profile" : rawType === "story" ? "Story" : "Post"}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text transition" />
      </div>

      {/* Media / Image Thumbnail */}
      <div className="relative aspect-[4/3] bg-surface-inset overflow-hidden flex items-center justify-center">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-rose-500">
            {rawType === "profile" ? <User className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
          </div>
        )}

        {rawType === "reel" && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-surface-overlay backdrop-blur border border-white/20 flex items-center justify-center text-text shadow-lg group-hover:scale-110 transition">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Caption & Action Footer */}
      <div className="px-3 py-2 bg-surface/60">
        {sharedData.caption && (
          <p className="text-[11px] text-text line-clamp-2 leading-snug mb-1 font-normal">
            {sharedData.caption}
          </p>
        )}
        <div className="flex items-center justify-between text-[10px] font-bold text-blue-400 group-hover:text-blue-300 pt-0.5">
          <span>{rawType === "reel" ? "Watch Reel" : rawType === "profile" ? "View Profile" : "View Post"}</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};

export default SharedContentCard;

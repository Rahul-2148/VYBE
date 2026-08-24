import React from "react";
import { ExternalLink, Play, User, Image as ImageIcon, Music, Sparkles, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import VerifiedBadge from "./VerifiedBadge";

export const SharedContentCard = ({ sharedData, type }) => {
  const navigate = useNavigate();

  if (!sharedData) return null;

  const rawType = (type?.replace("shared_", "") || "post").toLowerCase();

  const handleNavigate = (e) => {
    e.stopPropagation();
    if ((rawType === "post" || rawType === "share") && sharedData._id) {
      navigate(`/?postId=${sharedData._id}`);
    } else if (rawType === "reel" && sharedData._id) {
      navigate(`/reels?reelId=${sharedData._id}`, { state: { initialReelId: sharedData._id } });
    } else if (rawType === "story" && sharedData._id) {
      navigate(`/story/${sharedData._id}`);
    } else if ((rawType === "profile" || rawType === "user") && (sharedData.userName || sharedData.author?.userName)) {
      navigate(`/profile/${sharedData.userName || sharedData.author?.userName}`);
    } else if (rawType === "audio" || rawType === "music") {
      const idOrTitle = sharedData._id || sharedData.id || sharedData.title || "";
      navigate(`/audio/${encodeURIComponent(idOrTitle)}`);
    }
  };

  const authorName = sharedData.author?.userName || sharedData.author?.name || sharedData.artist || sharedData.userName || "Audio";
  const authorAvatar = sharedData.author?.profileImage?.url || (typeof sharedData.author?.profileImage === "string" ? sharedData.author?.profileImage : null) || sharedData.coverUrl || sharedData.profileImage?.url || dp;
  const isVerified = Boolean(sharedData.author?.isVerified || sharedData.isVerified);
  const mediaUrl = sharedData.mediaUrl || sharedData.coverUrl || sharedData.media?.url || (Array.isArray(sharedData.media) ? sharedData.media[0]?.url : null) || (Array.isArray(sharedData.carousel) ? sharedData.carousel[0]?.url : null);

  return (
    <div
      onClick={handleNavigate}
      className="w-[230px] sm:w-[250px] max-w-full bg-surface/95 border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 shadow-md my-1 group select-none"
    >
      {/* Header Info */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border/40 bg-bg/50">
        <img
          src={authorAvatar}
          alt=""
          className="w-5 h-5 rounded-full object-cover border border-border"
        />
        <div className="truncate flex-1 min-w-0 flex items-center gap-1">
          <p className="text-[11px] font-bold text-text truncate leading-tight">
            {rawType === "audio" || rawType === "music" ? authorName : `@${authorName}`}
          </p>
          {isVerified && <VerifiedBadge size="xs" />}
        </div>
        <span className="text-[9px] text-text-muted capitalize font-medium shrink-0">
          {rawType === "reel" ? "Reel" : rawType === "profile" ? "Profile" : rawType === "story" ? "Story" : rawType === "audio" || rawType === "music" ? "Audio" : "Post"}
        </span>
      </div>

      {/* Media / Image Thumbnail */}
      <div className="relative aspect-[4/3] bg-surface-hover/50 overflow-hidden flex items-center justify-center">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary">
            {rawType === "profile" ? (
              <User className="w-5 h-5" />
            ) : rawType === "audio" || rawType === "music" ? (
              <Music className="w-5 h-5" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </div>
        )}

        {rawType === "reel" && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {(rawType === "audio" || rawType === "music") && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition">
              <Music className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Caption & Action Footer */}
      <div className="px-2.5 py-2 bg-surface/40">
        {(sharedData.caption || sharedData.title) && (
          <p className="text-[11px] text-text line-clamp-1 leading-snug mb-1 font-normal">
            {sharedData.caption || sharedData.title}
          </p>
        )}
        <div className="flex items-center justify-between text-[10px] font-bold text-rose-500 group-hover:text-rose-400">
          <span>
            {rawType === "reel"
              ? "Watch Reel"
              : rawType === "profile"
              ? "View Profile"
              : rawType === "audio" || rawType === "music"
              ? "Listen Audio"
              : "View Post"}
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};

export default SharedContentCard;

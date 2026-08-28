import React from "react";
import { Link } from "react-router-dom";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  MoreVertical,
  X,
  Star,
  Music,
} from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";
import dp from "../assets/dp3.png";

export const StoryHeaderHUD = ({
  author,
  isOwnStory = false,
  isCloseFriends = false,
  timeAgo = "now",
  music = null,
  isMuted = false,
  isPaused = false,
  onToggleMute,
  onTogglePause,
  onOpenOptions,
  onClose,
}) => {
  const authorAvatar = author?.profileImage?.url || dp;
  const authorUsername = author?.userName || "User";

  return (
    <div className="flex items-center justify-between gap-2 w-full select-none">
      {/* Author Profile Info */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          to={`/profile/${authorUsername}`}
          onClick={(e) => e.stopPropagation()}
          className="relative shrink-0 group cursor-pointer"
        >
          <div
            className={`p-[1.5px] rounded-full ${
              isCloseFriends
                ? "bg-gradient-to-tr from-[#25d366] to-[#059669]"
                : "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]"
            }`}
          >
            <img
              src={authorAvatar}
              alt=""
              className="w-9 h-9 rounded-full object-cover border-[1.5px] border-black bg-zinc-800"
            />
          </div>
          {isCloseFriends && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-[#25d366] text-black rounded-full p-0.5 shadow">
              <Star className="w-2.5 h-2.5 fill-current" />
            </div>
          )}
        </Link>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              to={`/profile/${authorUsername}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-bold text-white hover:underline truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
            >
              {authorUsername}
            </Link>
            {author?.isVerified && <VerifiedBadge className="w-3 h-3 text-[#0095f6]" />}
            <span className="text-[11px] text-white/70 font-medium drop-shadow shrink-0">
              · {timeAgo}
            </span>
          </div>

          {/* Close Friends or Music pill */}
          <div className="flex items-center gap-2 mt-0.5">
            {isCloseFriends && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#25d366]/20 border border-[#25d366]/40 text-[#25d366] text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>Close Friends</span>
              </span>
            )}

            {music && (
              <div className="inline-flex items-center gap-1 text-[10px] text-white/90 font-medium truncate max-w-[140px] drop-shadow">
                <div className="flex items-end gap-[1.5px] h-2.5 px-0.5">
                  <span className="w-[2px] h-full bg-rose-400 rounded-full animate-[eqBounce_0.8s_ease-in-out_infinite_alternate]" />
                  <span className="w-[2px] h-2/3 bg-pink-400 rounded-full animate-[eqBounce_0.6s_ease-in-out_infinite_alternate_0.2s]" />
                  <span className="w-[2px] h-4/5 bg-purple-400 rounded-full animate-[eqBounce_0.7s_ease-in-out_infinite_alternate_0.4s]" />
                </div>
                <span className="truncate">{music.title || "Soundtrack"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Action Icons */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Audio Mute/Unmute */}
        <button
          type="button"
          onClick={onToggleMute}
          className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition backdrop-blur-md cursor-pointer"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Pause/Resume Toggle */}
        <button
          type="button"
          onClick={onTogglePause}
          className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition backdrop-blur-md cursor-pointer"
          title={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* More Options */}
        <button
          type="button"
          onClick={onOpenOptions}
          className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition backdrop-blur-md cursor-pointer"
          title="More Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Close Story */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition backdrop-blur-md cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StoryHeaderHUD;

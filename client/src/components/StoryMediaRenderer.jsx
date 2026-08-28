import React from "react";
import StoryVideoPlayer from "./StoryVideo";
import { Loader2 } from "lucide-react";

export const StoryMediaRenderer = ({
  story,
  filter = "none",
  isPaused = false,
  isMuted = false,
  mediaLoading = false,
  onLoadedData,
  onVideoEnd,
  imgRef,
}) => {
  if (!story) return null;

  const filterClassMap = {
    none: "",
    clarendon: "contrast-125 saturate-125",
    gingham: "sepia-20 hue-rotate-[-10deg] contrast-90",
    juno: "contrast-115 saturate-140 brightness-105",
    lark: "contrast-90 saturate-120 brightness-110",
    ludwig: "contrast-105 brightness-105 saturate-95",
    moon: "grayscale contrast-110 brightness-110",
    reyes: "sepia-30 contrast-85 brightness-110 saturate-75",
    slumber: "saturate-65 contrast-100 brightness-95",
    crema: "sepia-20 contrast-90 brightness-105",
    aden: "hue-rotate-[-20deg] contrast-90 brightness-120 saturate-85",
  };

  const activeFilterClass = filterClassMap[filter] || "";

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-black">
      {/* 1. Loading Spinner Overlay */}
      {mediaLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
        </div>
      )}

      {/* 2. Text-only Story Mode */}
      {story.mediaType === "text" || (!story.media?.url && story.caption) ? (
        <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-amber-500 via-rose-600 to-purple-800">
          <p className="text-2xl sm:text-3xl font-extrabold text-white leading-relaxed tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] whitespace-pre-wrap">
            {story.caption}
          </p>
        </div>
      ) : story.mediaType === "video" ? (
        /* 3. Video Story Mode */
        <StoryVideoPlayer
          src={story.media?.url}
          isPaused={isPaused}
          isMuted={isMuted}
          onLoadedData={onLoadedData}
          onEnded={onVideoEnd}
        />
      ) : (
        /* 4. Image Story Mode */
        <img
          ref={imgRef}
          src={story.media?.url}
          alt=""
          onLoad={onLoadedData}
          className={`w-full h-full object-cover transition-all duration-300 ${activeFilterClass}`}
        />
      )}

      {/* 5. Shared Entity Card if present */}
      {story.sharedEntity && (
        <div className="absolute inset-x-6 bottom-24 z-20 p-3.5 bg-black/65 backdrop-blur-xl border border-white/20 rounded-2xl text-white shadow-2xl space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-[10px] font-bold text-white">
              {story.sharedEntity.authorName?.[0] || "U"}
            </div>
            <span className="text-xs font-bold truncate">@{story.sharedEntity.authorName || "User"}</span>
          </div>
          {story.sharedEntity.caption && (
            <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
              {story.sharedEntity.caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryMediaRenderer;

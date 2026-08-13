import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

export const PostCarousel = ({ mediaList = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!mediaList || mediaList.length === 0) return null;

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentIndex < mediaList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="relative w-full aspect-square bg-bg overflow-hidden group">
      {/* Media Rendering */}
      {mediaList[currentIndex]?.type === "video" ? (
        <VideoPlayer media={mediaList[currentIndex].url} />
      ) : (
        <img src={mediaList[currentIndex]?.url} alt="" loading="lazy" className="w-full h-full object-cover" />
      )}

      {/* Item Counter Badge top right */}
      {mediaList.length > 1 && (
        <div className="absolute top-3 right-3 bg-surface-overlay backdrop-blur text-text text-[11px] font-mono px-2.5 py-1 rounded-full border border-white/10 shadow">
          {currentIndex + 1}/{mediaList.length}
        </div>
      )}

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface-overlay text-text hover:bg-surface-overlay transition opacity-0 group-hover:opacity-100 shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {currentIndex < mediaList.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface-overlay text-text hover:bg-surface-overlay transition opacity-0 group-hover:opacity-100 shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Pagination Dot Indicators bottom center */}
      {mediaList.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-1.5 z-10 pointer-events-none">
          {mediaList.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === i ? "w-5 bg-rose-500 shadow" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PostCarousel;

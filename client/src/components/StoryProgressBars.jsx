import React from "react";

export const StoryProgressBars = ({
  storiesCount = 1,
  currentIndex = 0,
  progress = 0,
}) => {
  return (
    <div className="flex items-center gap-1.5 w-full">
      {Array.from({ length: storiesCount }).map((_, idx) => {
        let fillPercent = 0;
        if (idx < currentIndex) fillPercent = 100;
        else if (idx === currentIndex) fillPercent = Math.min(100, Math.max(0, progress));

        return (
          <div
            key={idx}
            className="flex-1 h-[2.5px] sm:h-[3px] bg-white/30 rounded-full overflow-hidden backdrop-blur-xs"
          >
            <div
              className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default StoryProgressBars;

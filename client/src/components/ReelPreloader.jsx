import React, { useEffect } from "react";

export const ReelPreloader = ({ loops = [], currentIndex = 0 }) => {
  useEffect(() => {
    // Preload next 2 videos in the feed
    const preloadUrls = [];
    if (loops[currentIndex + 1]?.media?.url) preloadUrls.push(loops[currentIndex + 1].media.url);
    if (loops[currentIndex + 2]?.media?.url) preloadUrls.push(loops[currentIndex + 2].media.url);

    preloadUrls.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = url;
      document.head.appendChild(link);

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    });
  }, [loops, currentIndex]);

  return (
    <div className="hidden" aria-hidden="true">
      {/* Invisible video buffers to prime browser media cache */}
      {loops[currentIndex + 1]?.media?.url && (
        <video src={loops[currentIndex + 1].media.url} preload="auto" muted playsInline />
      )}
      {loops[currentIndex + 2]?.media?.url && (
        <video src={loops[currentIndex + 2].media.url} preload="auto" muted playsInline />
      )}
    </div>
  );
};

export default ReelPreloader;

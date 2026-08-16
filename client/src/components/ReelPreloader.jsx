import React, { useEffect, useState } from "react";
import { getDataSaverMode } from "../lib/mediaQualitySettings";

export const ReelPreloader = ({ reels = [], currentIndex = 0 }) => {
  const items = reels;
  const [dataSaver, setDataSaver] = useState(getDataSaverMode());

  useEffect(() => {
    const handleDataSaverChanged = (e) => {
      setDataSaver(e.detail);
    };
    window.addEventListener("vybe-data-saver-changed", handleDataSaverChanged);
    return () => {
      window.removeEventListener("vybe-data-saver-changed", handleDataSaverChanged);
    };
  }, []);

  useEffect(() => {
    // If Data Saver is enabled, do NOT preload background videos to save mobile data
    if (dataSaver) return;

    // Preload next 2 videos in the feed
    const preloadUrls = [];
    if (items[currentIndex + 1]?.media?.url) preloadUrls.push(items[currentIndex + 1].media.url);
    if (items[currentIndex + 2]?.media?.url) preloadUrls.push(items[currentIndex + 2].media.url);

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
  }, [items, currentIndex]);

  return (
    <div className="hidden" aria-hidden="true">
      {/* Invisible video buffers to prime browser media cache */}
      {items[currentIndex + 1]?.media?.url && (
        <video src={items[currentIndex + 1].media.url} preload="auto" muted playsInline />
      )}
      {items[currentIndex + 2]?.media?.url && (
        <video src={items[currentIndex + 2].media.url} preload="auto" muted playsInline />
      )}
    </div>
  );
};

export default ReelPreloader;

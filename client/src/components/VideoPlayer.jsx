import { useEffect, useRef, useState } from "react";
import { FiVolume2, FiVolumeX } from "react-icons/fi";
import { getOptimizedMediaUrl } from "../lib/mediaQualitySettings";

const VideoPlayer = ({ media }) => {
  const videoTag = useRef(null);
  const [mute, setMute] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const handleClick = () => {
    if (isPlaying) {
      videoTag.current.pause();
      setIsPlaying(false);
    } else {
      videoTag.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const currentVideo = videoTag.current;
    if (!currentVideo) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          currentVideo.play().catch(() => null);
          setIsPlaying(true);
        } else {
          currentVideo.pause();
          setIsPlaying(false);
        }
      },
      {
        threshold: 0.6,
      }
    );

    observer.observe(currentVideo);

    return () => {
      observer.unobserve(currentVideo);
    };
  }, []);

  return (
    <div onClick={handleClick} className="h-[100%] relative cursor-pointer max-w-full rounded-2xl overflow-hidden select-none">
      <video
        ref={videoTag}
        src={getOptimizedMediaUrl(media, "video")}
        preload="metadata"
        playsInline
        loop
        muted={mute}
        className="h-[100%] cursor-pointer w-full rounded-2xl object-cover pointer-events-none"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMute((prev) => !prev);
        }}
        className="absolute bottom-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/10 text-white transition cursor-pointer z-30 interactive-tap shadow-lg"
        title={mute ? "Unmute" : "Mute"}
      >
        {!mute ? (
          <FiVolume2 className="w-4 h-4 text-white" />
        ) : (
          <FiVolumeX className="w-4 h-4 text-zinc-300" />
        )}
      </button>
    </div>
  );
};

export default VideoPlayer;

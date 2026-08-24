import { useEffect, useRef } from "react";

const MAX_VIDEO_DURATION = 60; // 60s max per story segment

const StoryVideoPlayer = ({ media, isPaused, onProgress, onEnd }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => null);
    }
  }, [isPaused]);

  useEffect(() => {
    if (onProgress) onProgress(0);
  }, [media, onProgress]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const duration = Math.min(video.duration, MAX_VIDEO_DURATION);
    const percent = (video.currentTime / duration) * 100;
    if (onProgress) onProgress(percent);

    if (video.currentTime >= MAX_VIDEO_DURATION) {
      if (onEnd) onEnd();
    }
  };

  return (
    <video
      ref={videoRef}
      src={media}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnd}
    />
  );
};

export default StoryVideoPlayer;

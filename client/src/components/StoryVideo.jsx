import { useEffect, useRef } from "react";

const MAX_VIDEO_DURATION = 300; // 5 min (seconds)

const StoryVideoPlayer = ({ media, isPaused, onProgress, onEnd }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isPaused) videoRef.current.pause();
    else videoRef.current.play();
  }, [isPaused]);

  useEffect(() => {
    onProgress(0); // reset progress when video changes
  }, [media]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const duration = Math.min(video.duration, MAX_VIDEO_DURATION);
    const percent = (video.currentTime / duration) * 100;
    onProgress(percent);

    // ⛔ safety: 5 min se zyada na chale
    if (video.currentTime >= MAX_VIDEO_DURATION) {
      onEnd();
    }
  };

  return (
    <video
      ref={videoRef}
      src={media}
      autoPlay
      playsInline
      //   muted
      className="w-full h-full object-contain"
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnd}
    />
  );
};

export default StoryVideoPlayer;

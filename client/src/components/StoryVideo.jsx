import React, { useEffect, useRef } from "react";

const MAX_VIDEO_DURATION = 60; // 60s max per story segment

const StoryVideoPlayer = ({
  src,
  media,
  isPaused,
  isMuted = false,
  onProgress,
  onLoadedData,
  onEnded,
}) => {
  const videoRef = useRef(null);
  const videoSrc = src || media;

  useEffect(() => {
    if (!videoRef.current) return;

    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => null);
    }
  }, [isPaused]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (onProgress) onProgress(0);
  }, [videoSrc, onProgress]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const duration = Math.min(video.duration, MAX_VIDEO_DURATION);
    const percent = (video.currentTime / duration) * 100;
    if (onProgress) onProgress(percent);

    if (video.currentTime >= MAX_VIDEO_DURATION) {
      if (onEnded) onEnded();
    }
  };

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      autoPlay
      playsInline
      muted={isMuted}
      className="w-full h-full object-cover select-none"
      onLoadedData={onLoadedData}
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnded}
    />
  );
};

export default StoryVideoPlayer;

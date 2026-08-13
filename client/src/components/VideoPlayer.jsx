import { useEffect, useRef, useState } from "react";
import { FiVolume2, FiVolumeX } from "react-icons/fi";

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
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoTag.current;
        if (entry.isIntersecting) {
          video.play();
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      {
        threshold: 0.6,
      }
    );

    if (videoTag.current) {
      observer.observe(videoTag.current);
    }

    return () => {
      if (videoTag.current) {
        observer.unobserve(videoTag.current);
      }
    };
  }, []);

  return (
    <div className="h-[100%] relative cursor-pointer max-w-full rounded-2xl overflow-hidden">
      <video
        ref={videoTag}
        src={media}
        preload="metadata"
        loop
        muted={mute}
        className="h-[100%] cursor-pointer w-full rounded-2xl object-cover"
        onClick={handleClick}
      />
      <div
        className="absolute bottom-[10px] right-[10px]"
        onClick={() => setMute((prev) => !prev)}
      >
        {!mute ? (
          <FiVolume2 className="w-[20px] h-[20px] text-text font-semibold" />
        ) : (
          <FiVolumeX className="w-[20px] h-[20px] text-text font-semibold" />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;

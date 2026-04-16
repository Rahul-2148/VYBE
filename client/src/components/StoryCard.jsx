import { useEffect, useRef, useState } from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import dp from "../assets/dp3.png";
import { useSelector } from "react-redux";
import { FiEye } from "react-icons/fi";
import axios from "axios";
import { SERVER_URL } from "../App";
import StoryVideoPlayer from "./StoryVideo";

const STORY_IMAGE_DURATION = 10000; // image = 10 sec

const StoryCard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const stories = location.state?.stories || [];
  const nextUserStory = location.state?.nextUserStory || null;
  const prevUserStory = location.state?.prevUserStory || null;

  const { userData } = useSelector((state) => state.user);

  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  const startY = useRef(0);
  const intervalRef = useRef(null);

  const startX = useRef(0);
  const deltaX = useRef(0);
  const [slideDir, setSlideDir] = useState(null); // "left" | "right"

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    deltaX.current = e.touches[0].clientX - startX.current;
  };

  const handleTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;
    const diffY = endY - startY.current;

    // ⬇️ swipe down = close
    if (diffY > 120) {
      navigate(-1);
      return;
    }

    // ⬅️➡️ horizontal swipe
    if (Math.abs(deltaX.current) > 80) {
      if (deltaX.current < 0 && nextUserStory) {
        goNextUser();
      } else if (deltaX.current > 0 && location?.state?.prevUserStory) {
        goPrevUser();
      }
    }

    deltaX.current = 0;
  };

  const goNextUser = () => {
    setSlideDir("left");
    setTimeout(() => {
      navigate("/story", {
        replace: true,
        state: {
          stories: nextUserStory.stories,
          nextUserStory: nextUserStory.next,
          prevUserStory: nextUserStory.prev,
        },
      });
    }, 250);
  };

  const goPrevUser = () => {
    setSlideDir("right");
    setTimeout(() => {
      navigate("/story", {
        replace: true,
        state: {
          stories: location.state.prevUserStory.stories,
          nextUserStory: location.state.prevUserStory.next,
          prevUserStory: location.state.prevUserStory.prev,
        },
      });
    }, 250);
  };

  if (!stories.length) {
    return null; // wait for state
  }

  const story = stories[storyIndex];
  const isOwnStory =
    story?.author?._id === userData?.user?._id ||
    story?.author?.userName === userData?.user?.userName;

  // 👁 mark story as viewed
  useEffect(() => {
    if (!story?._id) return;
    axios.post(
      `${SERVER_URL}/api/v1/story/view/${story._id}`,
      {},
      { withCredentials: true }
    );
  }, [story]);

  // ⏳ Progress handling
  useEffect(() => {
    setProgress(0);
    clearInterval(intervalRef.current);

    // ✅ ONLY IMAGE STORY USES TIMER
    if (story?.mediaType === "image") {
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setProgress((p) => {
            if (p >= 100) {
              handleNext();
              return 0;
            }
            return p + 1;
          });
        }
      }, STORY_IMAGE_DURATION / 100);
    }

    return () => clearInterval(intervalRef.current);
  }, [storyIndex, isPaused, story?.mediaType]);

  useEffect(() => {
    setSlideDir(null);
    setStoryIndex(0);
    setProgress(0);
  }, [location.state?.stories]);

  // Navigate
  const handleNext = () => {
    // next story of SAME USER
    if (storyIndex < stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      return;
    }

    // 👇 USER FINISHED → AUTO NEXT USER
    if (nextUserStory) {
      setSlideDir("left"); // animation

      setTimeout(() => {
        navigate("/story", {
          replace: true,
          state: {
            stories: nextUserStory.stories,
            nextUserStory: nextUserStory.next,
            prevUserStory: nextUserStory.prev,
          },
        });
      }, 250);

      return;
    }

    // LAST USER & LAST STORY → CLOSE STORY VIEWER
    navigate(-1);
  };

  const handlePrev = () => {
    if (storyIndex > 0) setStoryIndex((i) => i - 1);
  };

  // Tap
  const handleTap = (e) => {
    const screenWidth = window.innerWidth;
    if (e.clientX < screenWidth / 2) handlePrev();
    else handleNext();
  };

  // Pause story when viewers modal open
  useEffect(() => {
    setIsPaused(showViewers);
  }, [showViewers]);

  if (!story) return null;

  return (
    <div
      className="fixed inset-0 bg-black flex justify-center"
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStartCapture={() => setIsPaused(true)}
      onTouchEndCapture={() => setIsPaused(false)}
    >
      {/* STORY BOX */}
      <div
        className={`relative w-full max-w-[420px] h-full bg-black transition-transform duration-300 ${
          slideDir === "left" ? "story-slide-left" : ""
        } ${slideDir === "right" ? "story-slide-right" : ""}`}
      >
        {/* MEDIA */}
        {story?.mediaType === "image" && (
          <img
            src={story.media.url}
            className="w-full h-full object-contain"
            alt=""
          />
        )}

        {story?.mediaType === "video" && (
          <StoryVideoPlayer
            media={story.media.url}
            isPaused={isPaused || showViewers}
            onProgress={(p) => setProgress(p)}
            onEnd={handleNext}
          />
        )}

        {/* OVERLAY */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          {/* Back */}
          <div
            className="absolute top-4 left-3 pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              navigate(-1);
            }}
          >
            <MdOutlineKeyboardBackspace className="w-7 h-7 text-white" />
          </div>

          {/* Progress */}
          <div className="absolute top-4 left-3 right-3 flex gap-1">
            {stories.map((_, i) => (
              <div key={i} className="flex-1 h-[3px] bg-gray-700 rounded">
                <div
                  className="h-full bg-white"
                  style={{
                    width:
                      i < storyIndex
                        ? "100%"
                        : i === storyIndex
                        ? `${progress}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author */}
          <div className="absolute top-10 left-3 flex items-center gap-3">
            <img
              src={story?.author?.profileImage?.url || dp}
              className="w-9 h-9 rounded-full"
              alt=""
            />
            <span className="text-white text-sm font-semibold">
              {story?.author?.userName}
            </span>
          </div>

          {/* Viewers */}
          {isOwnStory && !showViewers && (
            <div
              className="absolute bottom-4 left-4 flex items-center gap-2 text-white pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                setShowViewers(true);
              }}
            >
              <FiEye className="w-4 h-4" />
              <span className="text-sm">
                {story?.viewers?.length || 0} viewers
              </span>
            </div>
          )}

          {/* Viewer list */}
          {showViewers && (
            <div className="absolute bottom-0 left-0 w-full h-[50%] bg-black/90 p-4 pointer-events-auto">
              <div
                className="text-white mb-3"
                onClick={() => setShowViewers(false)}
              >
                Close
              </div>
              {story?.viewers?.map((v) => (
                <div key={v._id} className="flex items-center gap-3 mb-2">
                  <img
                    src={v.profileImage?.url || dp}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-white">{v.userName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryCard;

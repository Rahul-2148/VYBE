import React, { useState } from "react";
import { FiPlus, FiCheck } from "react-icons/fi";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import { useSelector, useDispatch } from "react-redux";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import { setUserData } from "../redux/features/userSlice";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

const StoryDp = ({ userName, profileImage, storyGroup }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { feed } = useSelector((state) => state.story);

  const currentUserId = userData?.user?._id || userData?._id;
  const [followLoading, setFollowLoading] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);

  const authorId =
    storyGroup?.author?._id ||
    storyGroup?.author ||
    storyGroup?.userId ||
    storyGroup?._id;
  const targetIdStr = authorId ? (authorId._id || authorId).toString() : null;

  const isFollowing =
    Boolean(
      targetIdStr &&
        userData?.user?.following?.some(
          (u) => u && (u._id || u).toString() === targetIdStr
        )
    ) || justFollowed;

  const isOwnStory =
    !targetIdStr ||
    targetIdStr === currentUserId?.toString() ||
    userName === "Your Story" ||
    userName === "Add Story";

  const hasStories = Boolean(storyGroup && storyGroup.stories && storyGroup.stories.length > 0);

  // Check if all stories in this group have been viewed by the current user
  const isViewed =
    hasStories &&
    storyGroup.stories.every((story) =>
      story.viewers?.some(
        (v) => v === currentUserId || v?._id?.toString() === currentUserId
      )
    );

  const isCloseFriendsStory =
    storyGroup?.hasCloseFriendsStory ||
    storyGroup?.stories?.some((s) => s.visibleTo === "closeFriends");

  const handleClick = () => {
    triggerHaptic("light");

    if (isOwnStory && !hasStories) {
      navigate("/upload?type=story");
      return;
    }

    if (!hasStories) return;

    const groupUserName = storyGroup.author?.userName || storyGroup.userName;
    const currentIndex = feed.findIndex(
      (f) => (f.author?.userName || f.userName) === groupUserName
    );

    navigate("/story", {
      state: {
        initialUserIndex: currentIndex >= 0 ? currentIndex : 0,
      },
    });
  };

  const handleAddStoryClick = (e) => {
    e.stopPropagation();
    triggerHaptic("medium");
    microAudio.playPop();
    navigate("/upload?type=story");
  };

  const handleQuickFollow = async (e) => {
    e.stopPropagation();
    if (!targetIdStr || followLoading) return;
    triggerHaptic("medium");
    microAudio.playShimmer();
    setFollowLoading(true);
    try {
      const res = await api.get(`/user/follow/${targetIdStr}`);
      if (res.data?.user) {
        dispatch(setUserData({ ...userData, user: res.data.user }));
      }
      setJustFollowed(true);
      snackbar.success(`Followed @${userName}`);
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Could not follow");
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-[76px] items-center gap-1.5 shrink-0 select-none group relative">
      {/* Outer Story Ring */}
      <div
        id="story-dp-ring"
        data-testid="story-dp-avatar"
        onClick={handleClick}
        className={`w-[74px] h-[74px] rounded-full p-[2.5px] flex items-center justify-center cursor-pointer transition-all duration-300 transform group-hover:scale-105 active:scale-95 relative z-10 ${
          hasStories
            ? isViewed
              ? "border-2 border-border/80 bg-transparent opacity-75"
              : isCloseFriendsStory
              ? "bg-gradient-to-tr from-[#25d366] via-[#10b981] to-[#059669] shadow-emerald-500/25 shadow-md animate-badge-glow"
              : "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-pink-500/25 shadow-md animate-instagram-glow"
            : "border border-border/60 bg-transparent"
        }`}
      >
        {/* Inner Gap & Avatar Container */}
        <div className="w-full h-full bg-bg rounded-full p-[2.5px] relative overflow-hidden flex items-center justify-center">
          <img
            src={profileImage || dp}
            alt=""
            className="w-full h-full object-cover rounded-full select-none"
            loading="lazy"
          />
        </div>
      </div>

      {/* Close Friends Green Star Badge */}
      {!isOwnStory && hasStories && !isViewed && isCloseFriendsStory && (
        <div
          className="absolute top-[2px] right-[2px] bg-emerald-500 text-black rounded-full p-[3px] border-2 border-bg shadow-md z-20 flex items-center justify-center pointer-events-none"
          title="Close Friends Story"
        >
          <Star className="w-2.5 h-2.5 fill-black text-black" />
        </div>
      )}

      {/* Your Story: Plus (+) Action Badge */}
      {isOwnStory && (
        <button
          type="button"
          id="story-dp-add-btn"
          data-testid="story-dp-add-btn"
          onClick={handleAddStoryClick}
          className="absolute bottom-[20px] right-[1px] bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-full p-1 border-2 border-bg shadow-lg hover:scale-115 active:scale-90 transition cursor-pointer z-20 flex items-center justify-center"
          title="Add Story"
        >
          <FiPlus className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      )}

      {/* Quick Follow Badge for Unfollowed Users */}
      {!isOwnStory && hasStories && !isFollowing && (
        <button
          type="button"
          onClick={handleQuickFollow}
          disabled={followLoading}
          className="absolute bottom-[20px] right-[1px] bg-[#0095f6] hover:bg-[#1877f2] active:scale-90 text-white rounded-full p-1 border-2 border-bg shadow-lg hover:scale-115 transition cursor-pointer z-20 flex items-center justify-center disabled:opacity-50"
          title={`Follow @${userName}`}
        >
          {justFollowed ? (
            <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <FiPlus className="w-3.5 h-3.5 stroke-[3]" />
          )}
        </button>
      )}

      {/* Author Name */}
      <span
        className={`text-[11px] font-medium truncate w-full text-center tracking-tight transition-colors ${
          isViewed ? "text-text-muted font-normal" : "text-text font-semibold"
        }`}
      >
        {userName}
      </span>
    </div>
  );
};

export default StoryDp;

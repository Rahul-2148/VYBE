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

const StoryDp = ({ userName, profileImage, storyGroup, userIndex }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { feed } = useSelector((state) => state.story);

  const currentUserId = userData?.user?._id || userData?._id;
  const [followLoading, setFollowLoading] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);

  const authorId = storyGroup?.author?._id || storyGroup?.author || storyGroup?.userId || storyGroup?._id;
  const targetIdStr = authorId ? (authorId._id || authorId).toString() : null;

  const isFollowing = Boolean(
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

  // Check if all stories are viewed
  const isViewed =
    storyGroup?.stories?.length > 0 &&
    storyGroup.stories.every((story) =>
      story.viewers?.some(
        (v) => v === currentUserId || v?._id?.toString() === currentUserId
      )
    );

  const handleClick = () => {
    triggerHaptic("light");
    if (
      (userName === "Your Story" || userName === "Add Story") &&
      (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0)
    ) {
      navigate("/upload?type=story");
      return;
    }

    if (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0) {
      return;
    }

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

  const isCloseFriendsStory =
    storyGroup?.hasCloseFriendsStory ||
    storyGroup?.stories?.some((s) => s.visibleTo === "closeFriends");

  return (
    <div className="flex flex-col w-[76px] items-center gap-1.5 shrink-0 select-none group relative">
      <div
        onClick={handleClick}
        className={`w-[74px] h-[74px] rounded-full p-[2.5px] flex items-center justify-center cursor-pointer transition-all duration-300 transform group-hover:scale-105 active:scale-95 relative z-10 ${
          storyGroup
            ? isViewed
              ? "bg-surface-hover border border-border opacity-70"
              : isCloseFriendsStory
              ? "bg-gradient-to-tr from-emerald-400 via-teal-500 to-green-600 shadow-emerald-500/20 shadow-lg animate-badge-glow"
              : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-purple-500/20 shadow-lg animate-badge-glow"
            : "bg-surface-hover"
        }`}
      >
        <div className="w-full h-full bg-bg rounded-full p-[2px] relative overflow-hidden">
          <img
            src={profileImage || dp}
            alt=""
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>

      {/* Close Friends Green Star Indicator Badge on Story Ring */}
      {!isOwnStory && storyGroup && !isViewed && isCloseFriendsStory && (
        <div
          className="absolute top-[2px] right-[2px] bg-emerald-500 text-black rounded-full p-[3px] border-2 border-bg shadow-lg z-20 flex items-center justify-center pointer-events-none"
          title="Close Friends Story"
        >
          <Star className="w-2.5 h-2.5 fill-black text-black" />
        </div>
      )}

      {/* Your Story Add (+) Badge */}
      {isOwnStory &&
        ((userName === "Your Story" && (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0)) ||
          userName === "Add Story") && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate("/upload?type=story");
            }}
            className="absolute bottom-[22px] right-[2px] bg-rose-600 text-white rounded-full p-1 border-2 border-bg shadow-lg hover:scale-110 active:scale-95 transition cursor-pointer z-20 flex items-center justify-center"
            title="Add Story"
          >
            <FiPlus className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        )}

      {/* Quick Follow Badge on Story Ring for Unfollowed Creators */}
      {!isOwnStory && storyGroup && !isFollowing && (
        <button
          onClick={handleQuickFollow}
          disabled={followLoading}
          className="absolute bottom-[22px] right-[2px] bg-blue-500 hover:bg-blue-600 active:scale-90 text-white rounded-full p-1 border-2 border-bg shadow-lg hover:scale-110 transition cursor-pointer z-20 flex items-center justify-center disabled:opacity-50"
          title={`Follow @${userName}`}
        >
          {justFollowed ? (
            <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <FiPlus className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </button>
      )}

      <div className={`text-[11px] font-medium truncate w-full text-center tracking-tight ${isViewed ? "text-text-muted" : "text-text"}`}>
        {userName}
      </div>
    </div>
  );
};

export default StoryDp;

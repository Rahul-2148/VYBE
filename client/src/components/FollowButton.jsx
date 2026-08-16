import React from "react";
import { motion } from "framer-motion";
import { snackbar } from "../lib/snackbar";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/features/userSlice";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import api from "../lib/axios";

export const FollowButton = ({ targetUserId, targetUser = null, tailwind, onFollowChange }) => {
  const { userData, profileData } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const currentUserId = userData?.user?._id || userData?._id;
  const targetIdStr = targetUserId ? (targetUserId._id || targetUserId).toString() : null;

  const isFollowing = Boolean(
    targetIdStr &&
      userData?.user?.following?.some(
        (u) => u && (u._id || u).toString() === targetIdStr
      )
  );

  const isFollower = Boolean(
    targetIdStr &&
      userData?.user?.followers?.some(
        (u) => u && (u._id || u).toString() === targetIdStr
      )
  );

  const targetUserObj = targetUser || (profileData?.user?._id?.toString() === targetIdStr ? profileData.user : null);

  const isRequested = Boolean(
    currentUserId &&
      targetUserObj?.followRequests?.some(
        (id) => id && (id._id || id).toString() === currentUserId.toString()
      )
  );

  const handleFollow = async () => {
    triggerHaptic("medium");
    if (!isFollowing) {
      microAudio.playShimmer();
    } else {
      microAudio.playBubble();
    }

    try {
      const result = await api.get(`/user/follow/${targetUserId}`);
      dispatch(
        setUserData({
          ...userData,
          user: result.data.user,
        })
      );

      snackbar.success(result.data.message);
      if (onFollowChange) onFollowChange();
    } catch (error) {
      snackbar.error(error.response?.data?.message || "Follow toggle failed");
    }
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.02 }}
      className={`cursor-pointer select-none transition-all ${tailwind || "px-4 py-1.5 rounded-full text-xs font-bold shadow"}`} 
      onClick={handleFollow}
    >
      {isFollowing ? "Following" : isRequested ? "Requested" : isFollower ? "Follow Back" : "Follow"}
    </motion.button>
  );
};

export default FollowButton;

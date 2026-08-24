import React, { useState } from "react";
import { motion } from "framer-motion";
import { snackbar } from "../lib/snackbar";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/features/userSlice";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import api from "../lib/axios";

export const FollowButton = ({
  targetUserId,
  targetUser = null,
  isFollowerProp = false,
  tailwind,
  onFollowChange,
}) => {
  const { userData, profileData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const currentUserId = userData?.user?._id || userData?._id;
  const targetIdStr = targetUserId ? (targetUserId._id || targetUserId).toString() : null;

  const isFollowing = Boolean(
    targetIdStr &&
      userData?.user?.following?.some(
        (u) => u && (u._id || u).toString() === targetIdStr
      )
  );

  const isFollower = Boolean(
    isFollowerProp ||
    (targetIdStr &&
      userData?.user?.followers?.some(
        (u) => u && (u._id || u).toString() === targetIdStr
      ))
  );

  const targetUserObj = targetUser || (profileData?.user?._id?.toString() === targetIdStr ? profileData.user : null);

  const isRequested = Boolean(
    currentUserId &&
      targetUserObj?.followRequests?.some(
        (id) => id && (id._id || id).toString() === currentUserId.toString()
      )
  );

  const handleFollow = async (e) => {
    if (e) e.stopPropagation();
    if (!targetIdStr) return;
    if (loading) return;

    setLoading(true);
    triggerHaptic("medium");
    if (!isFollowing) {
      microAudio.playShimmer();
    } else {
      microAudio.playBubble();
    }

    try {
      const result = await api.get(`/user/follow/${targetIdStr}`);
      if (result.data?.user) {
        dispatch(
          setUserData({
            ...userData,
            user: result.data.user,
          })
        );
      }

      snackbar.success(result.data?.message || "Success");
      if (onFollowChange) onFollowChange();
    } catch (error) {
      snackbar.error(error.response?.data?.message || "Follow action failed");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Base Styles if no custom tailwind is provided, or state-based styling
  const defaultClass = isFollowing
    ? "bg-surface-hover hover:bg-surface-active text-text border border-border px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs"
    : isRequested
    ? "bg-surface-inset border border-amber-500/30 text-amber-400 px-3.5 py-1.5 rounded-full text-xs font-semibold"
    : "bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md";

  const buttonClass = tailwind ? tailwind : defaultClass;

  return (
    <motion.button 
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.02 }}
      disabled={loading}
      className={`cursor-pointer select-none transition-all disabled:opacity-50 ${buttonClass}`} 
      onClick={handleFollow}
    >
      {loading ? "..." : isFollowing ? "Following" : isRequested ? "Requested" : isFollower ? "Follow Back" : "Follow"}
    </motion.button>
  );
};

export default FollowButton;


import React from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/features/userSlice";
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
    try {
      const result = await api.get(`/user/follow/${targetUserId}`);
      dispatch(
        setUserData({
          ...userData,
          user: result.data.user,
        })
      );

      toast.success(result.data.message);
      if (onFollowChange) onFollowChange();
    } catch (error) {
      toast.error(error.response?.data?.message || "Follow toggle failed");
    }
  };

  return (
    <button className={tailwind} onClick={handleFollow}>
      {isFollowing ? "Following" : isRequested ? "Requested" : isFollower ? "Follow Back" : "Follow"}
    </button>
  );
};

export default FollowButton;

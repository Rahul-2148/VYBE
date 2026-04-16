import axios from "axios";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { SERVER_URL } from "../App";
import { setUserData } from "../redux/features/userSlice";

const FollowButton = ({ targetUserId, tailwind }) => {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const isFollowing = userData?.user?.following?.some(
    (u) => u._id?.toString() === targetUserId
  );

  const handleFollow = async () => {
    try {
      const result = await axios.get(
        `${SERVER_URL}/api/v1/user/follow/${targetUserId}`,
        { withCredentials: true }
      );

      dispatch(
        setUserData({
          ...userData,
          user: result.data.user,
        })
      );

      toast.success(result.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  return (
    <button className={tailwind} onClick={handleFollow}>
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
};

export default FollowButton;

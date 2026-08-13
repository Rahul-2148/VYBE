import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSuggestedUsers } from "../redux/features/userSlice";
import api from "../lib/axios";

const GetSuggestedUsers = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (!userData?._id) return;

    const fetchUser = async () => {
      try {
        const result = await api.get("/user/suggested");
        if (result?.data?.users) {
          dispatch(setSuggestedUsers(result.data.users));
        }
      } catch (error) {
        console.error("GetSuggestedUsers error:", error);
      }
    };
    fetchUser();
  }, [dispatch, userData?._id]);

  return null;
};

export default GetSuggestedUsers;

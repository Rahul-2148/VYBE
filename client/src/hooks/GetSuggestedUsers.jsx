import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SERVER_URL } from "../App";
import { setSuggestedUsers } from "../redux/features/userSlice";

const GetSuggestedUsers = () => {
  const dispatch = useDispatch();

  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await axios.get(`${SERVER_URL}/api/v1/user/suggested`, {
          withCredentials: true,
        });
        dispatch(setSuggestedUsers(result?.data?.users));
        // console.log(result);
      } catch (error) {
        console.log(error);
      }
    };
    fetchUser();
  }, [userData]);
};

export default GetSuggestedUsers;

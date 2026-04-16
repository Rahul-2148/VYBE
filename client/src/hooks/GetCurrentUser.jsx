import axios from "axios";
import { useEffect } from "react";
import { SERVER_URL } from "../App";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/features/userSlice";

const GetCurrentUser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await axios.get(
          `${SERVER_URL}/api/v1/user/current-user`,
          { withCredentials: true }
        );

        // console.log(result);
        dispatch(setUserData(result.data));
      } catch (error) {
        console.log(error);
      }
    };

    fetchUser();
  }, [dispatch]);

  return null;
};

export default GetCurrentUser;

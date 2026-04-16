import axios from "axios";
import { useEffect } from "react";
import { SERVER_URL } from "../App";
import { useDispatch, useSelector } from "react-redux";
import { setPostData } from "../redux/features/postSlice";

const GetAllPosts = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        const result = await axios.get(
          `${SERVER_URL}/api/v1/post/get-all-posts`,
          {
            withCredentials: true,
          }
        );
        // console.log(result);
        dispatch(setPostData(result?.data?.posts));
      } catch (error) {
        console.log(error);
      }
    };
    fetchAllPosts();
  }, [dispatch, userData]);
};

export default GetAllPosts;

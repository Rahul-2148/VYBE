import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setPostData } from "../redux/features/postSlice";
import api from "../lib/axios";

const GetAllPosts = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (!userData?._id) return;

    const fetchAllPosts = async () => {
      try {
        const result = await api.get("/post/get-all-posts");
        if (result.data?.posts) {
          dispatch(setPostData(result.data.posts));
        }
      } catch (error) {
        console.error("GetAllPosts error:", error);
      }
    };
    fetchAllPosts();
  }, [dispatch, userData?._id]);

  return null;
};

export default GetAllPosts;

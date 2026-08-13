import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setStoryFeed } from "../redux/features/storySlice";
import api from "../lib/axios";

const GetStoryFeed = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const userId = userData?._id || userData?.user?._id;
    if (!userId) return;

    const fetchFeed = async () => {
      try {
        const res = await api.get("/story/feed");
        if (res.data?.stories) {
          dispatch(setStoryFeed(res.data.stories));
        }
      } catch (err) {
        console.error("Story feed error:", err);
      }
    };

    fetchFeed();
  }, [dispatch, userData?._id]);

  return null;
};

export default GetStoryFeed;

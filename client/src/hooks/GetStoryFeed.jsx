import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { SERVER_URL } from "../App";
import { setStoryFeed } from "../redux/features/storySlice";

const GetStoryFeed = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await axios.get(`${SERVER_URL}/api/v1/story/feed`, {
          withCredentials: true,
        });

        // console.log(res.data);
        dispatch(setStoryFeed(res.data.stories));
      } catch (err) {
        console.log("Story feed error:", err);
      }
    };

    fetchFeed();
  }, [dispatch]);

  return null;
};

export default GetStoryFeed;

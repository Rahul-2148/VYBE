import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setStoryFeed } from "../redux/features/storySlice";
import { useGetStoriesFeedQuery } from "../redux/api/apiSlice";

const GetStoryFeed = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const userId = userData?._id || userData?.user?._id;

  // RTK Query with instant cache & stale-while-revalidate
  const { data: storyData } = useGetStoriesFeedQuery(undefined, {
    skip: !userId,
  });

  useEffect(() => {
    if (storyData?.stories) {
      dispatch(setStoryFeed(storyData.stories));
    }
  }, [storyData, dispatch]);

  return null;
};

export default GetStoryFeed;

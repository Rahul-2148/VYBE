import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import StoryCard from "../components/StoryCard";
import api from "../lib/axios";
import { setStoryFeed } from "../redux/features/storySlice";
import { Loader2 } from "lucide-react";

const Story = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { feed } = useSelector((s) => s.story);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If state has highlight/story data, we are ready
    if (state?.stories && state.stories.length > 0) return;
    if (state?.initialUserIndex !== undefined && feed?.length > 0) return;

    // If Redux feed is empty, fetch feed from API
    if (!feed || feed.length === 0) {
      setLoading(true);
      api
        .get("/story/feed")
        .then((res) => {
          if (res.data?.success && res.data.feed?.length > 0) {
            dispatch(setStoryFeed(res.data.feed));
          } else {
            navigate("/");
          }
        })
        .catch(() => {
          navigate("/");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [state, feed, dispatch, navigate]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs text-zinc-400 font-medium">Loading stories...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[100vh] bg-black flex justify-center items-center overflow-hidden select-none">
      <StoryCard />
    </div>
  );
};

export default Story;

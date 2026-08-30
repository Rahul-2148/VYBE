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
  const [loading, setLoading] = useState(() => {
    if (state?.stories && state.stories.length > 0) return false;
    if (feed && feed.length > 0) return false;
    return true;
  });

  useEffect(() => {
    // If state has highlight/story data or feed is present, nothing to fetch
    if ((state?.stories && state.stories.length > 0) || (feed && feed.length > 0)) {
      return;
    }

    let isMounted = true;
    // If Redux feed is empty, fetch feed from API
    api
      .get("/story/feed")
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success && res.data.feed?.length > 0) {
          dispatch(setStoryFeed(res.data.feed));
        } else {
          navigate("/");
        }
      })
      .catch(() => {
        if (isMounted) navigate("/");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [state, feed, dispatch, navigate]);

  if (loading) {
    return (
      <div className="w-full h-[100dvh] bg-black flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs text-zinc-400 font-medium">Loading stories...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] bg-black flex justify-center items-center overflow-hidden select-none">
      <StoryCard
        feed={state?.stories || feed}
        initialIndex={state?.initialIndex || 0}
        onClose={() => navigate("/")}
      />
    </div>
  );
};

export default Story;

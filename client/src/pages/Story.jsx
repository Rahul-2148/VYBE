import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import StoryCard from "../components/StoryCard";

const Story = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hasStories = state?.stories && state.stories.length > 0;
    const hasUserIndex = state?.initialUserIndex !== undefined;
    if (!state || (!hasStories && !hasUserIndex)) {
      navigate("/");
    }
  }, [state, navigate]);

  if (!state) return null;

  return (
    <div className="w-full h-[100vh] bg-bg flex justify-center items-center">
      <StoryCard />
    </div>
  );
};

export default Story;

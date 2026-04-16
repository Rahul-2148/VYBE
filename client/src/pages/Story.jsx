import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import StoryCard from "../components/StoryCard";

const Story = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state || !state.stories || state.stories.length === 0) {
      navigate("/");
    }
  }, [state, navigate]);

  if (!state) return null;

  return (
    <div className="w-full h-[100vh] bg-black flex justify-center items-center">
      <StoryCard stories={state.stories} />
    </div>
  );
};

export default Story;

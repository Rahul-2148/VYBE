import { FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp.jpg";
import { useSelector } from "react-redux";

const StoryDp = ({ userName, profileImage, storyGroup, userIndex }) => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { feed } = useSelector((state) => state.story);

  const currentUserId = userData?.user?._id;

  // 🔹 check if all stories are viewed
  const isViewed =
    storyGroup?.stories?.length > 0 &&
    storyGroup.stories.every((story) =>
      story.viewers?.some(
        (v) => v === currentUserId || v?._id?.toString() === currentUserId
      )
    );

  const handleClick = () => {
    // ➕ Your Story but no stories
    if (
      userName === "Your Story" &&
      (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0)
    ) {
      navigate("/upload");
      return;
    }

    if (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0) {
      return;
    }

    // find index safely from feed
    const currentIndex = feed.findIndex(
      (f) => f.userName === storyGroup.userName
    );

    const next = feed[currentIndex + 1] || null;
    const prev = feed[currentIndex - 1] || null;

    navigate("/story", {
      state: {
        stories: storyGroup.stories,

        nextUserStory: next
          ? {
              stories: next.stories,
              next: feed[currentIndex + 2] || null,
              prev: storyGroup,
            }
          : null,

        prevUserStory: prev
          ? {
              stories: prev.stories,
              next: storyGroup,
              prev: feed[currentIndex - 2] || null,
            }
          : null,
      },
    });
  };

  return (
    <div className="flex flex-col w-[80px] items-center gap-[5px]">
      <div
        onClick={handleClick}
        className={`w-[80px] h-[80px] rounded-full flex items-center justify-center cursor-pointer
        ${
          storyGroup
            ? isViewed
              ? "bg-gray-700"
              : "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
            : "bg-gray-700"
        }`}
      >
        <div className="w-[70px] h-[70px] bg-black rounded-full overflow-hidden relative">
          <img
            src={profileImage || dp}
            alt=""
            className="w-full h-full object-cover"
          />

          {!storyGroup && userName === "Your Story" && (
            <FiPlus className="w-[22px] h-[22px] bg-white text-black absolute bottom-[4px] right-[4px] rounded-full p-[2px]" />
          )}
        </div>
      </div>

      <div className="text-[13px] text-white truncate w-full text-center">
        {userName}
      </div>
    </div>
  );
};

export default StoryDp;

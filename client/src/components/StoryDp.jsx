import { FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import { useSelector } from "react-redux";

const StoryDp = ({ userName, profileImage, storyGroup, userIndex }) => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { feed } = useSelector((state) => state.story);

  const currentUserId = userData?.user?._id;

  // Check if all stories are viewed
  const isViewed =
    storyGroup?.stories?.length > 0 &&
    storyGroup.stories.every((story) =>
      story.viewers?.some(
        (v) => v === currentUserId || v?._id?.toString() === currentUserId
      )
    );

  const handleClick = () => {
    if (
      (userName === "Your Story" || userName === "Add Story") &&
      (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0)
    ) {
      navigate("/upload?type=story");
      return;
    }

    if (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0) {
      return;
    }

    const groupUserName = storyGroup.author?.userName || storyGroup.userName;
    const currentIndex = feed.findIndex(
      (f) => (f.author?.userName || f.userName) === groupUserName
    );

    const next = feed[currentIndex + 1] || null;
    const prev = feed[currentIndex - 1] || null;

    navigate("/story", {
      state: {
        initialUserIndex: currentIndex,
      },
    });
  };

  const isCloseFriendsStory = storyGroup?.stories?.some((s) => s.visibleTo === "closeFriends");

  return (
    <div className="flex flex-col w-[76px] items-center gap-1.5 shrink-0 select-none group relative">
      <div
        onClick={handleClick}
        className={`w-[74px] h-[74px] rounded-full p-[2.5px] flex items-center justify-center cursor-pointer transition-all duration-300 transform group-hover:scale-105 active:scale-95 relative z-10 ${
          storyGroup
            ? isViewed
              ? "bg-surface-hover border border-border opacity-70"
              : isCloseFriendsStory
              ? "bg-gradient-to-tr from-emerald-400 via-teal-500 to-green-600 shadow-emerald-500/20 shadow-lg"
              : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-purple-500/20 shadow-lg"
            : "bg-surface-hover"
        }`}
      >
        <div className="w-full h-full bg-bg rounded-full p-[2px] relative overflow-hidden">
          <img
            src={profileImage || dp}
            alt=""
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>

      {((userName === "Your Story" && (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0)) ||
        userName === "Add Story") && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate("/upload?type=story");
          }}
          className="absolute bottom-[22px] right-[2px] bg-rose-600 text-text rounded-full p-1 border-2 border-bg shadow-lg hover:scale-110 transition cursor-pointer z-20 flex items-center justify-center"
          title="Add Story"
        >
          <FiPlus className="w-3.5 h-3.5" />
        </div>
      )}

      <div className={`text-[11px] font-medium truncate w-full text-center tracking-tight ${isViewed ? "text-text-muted" : "text-text"}`}>
        {userName}
      </div>
    </div>
  );
};

export default StoryDp;

import logo from "../assets/logo.png";
import { FaRegHeart } from "react-icons/fa";
import StoryDp from "./StoryDp";
import Navbar from "./Navbar";
import { useSelector } from "react-redux";
import Post from "./Post";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Feed = () => {
  const { postData } = useSelector((state) => state.post);
  const { userData } = useSelector((state) => state.user);
  const { yourStory, followingStories } = useSelector((state) => state.story);
  const navigate = useNavigate();

  return (
    <div className="lg:w-[50%] w-full bg-black min-h-[100vh] lg:h-[100vh] relative lg:overflow-y-auto hide-scrollbar">
      <div className="w-full h-[100px] flex items-center justify-between p-[20px] lg:hidden">
        <img src={logo} alt="" className="w-[80px]" />
        <div className="flex items-center gap-[15px]">
          <FaRegHeart className="text-white w-[25px] h-[25px] " />
          <MessageCircle
            onClick={() => navigate("/messages")}
            className="text-white w-[25px] h-[25px] "
          />
        </div>
      </div>

      <div className="flex w-full justify-start overflow-x-auto gap-[10px] items-center p-[20px] hide-scrollbar">
        <StoryDp
          userName="Your Story"
          profileImage={userData?.user?.profileImage?.url}
          storyGroup={yourStory}
        />

        {followingStories.map((group, index) => (
          <StoryDp
            key={group.author._id}
            userName={group.author.userName}
            profileImage={group.author.profileImage?.url}
            storyGroup={group}
            userIndex={index + 1}
          />
        ))}
      </div>

      <div className="w-full min-h-[100vh] flex flex-col items-center gap-[20px] p-[10px] pt-[40px] bg-white rounded-t-[60px] pb-[120px] relative">
        <Navbar />

        {postData?.map((post, index) => {
          return <Post key={index} post={post} />;
        })}
      </div>
    </div>
  );
};

export default Feed;

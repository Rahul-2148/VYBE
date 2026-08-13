import React, { useEffect, useState, useRef } from "react";
import logo from "../assets/logo.png";
import { FaRegHeart } from "react-icons/fa";
import StoryDp from "./StoryDp";
import Navbar from "./Navbar";
import { useSelector, useDispatch } from "react-redux";
import Post from "./Post";
import SponsoredPost from "./SponsoredPost";
import FeedFilterBar from "./FeedFilterBar";
import { MessageCircle, Loader2, Sparkles, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/axios";
import { setPostData } from "../redux/features/postSlice";
import GetStoryFeed from "../hooks/GetStoryFeed";
import { useTheme } from "../lib/themeContext";

const Feed = () => {
  const themeCtx = useTheme();
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, []);

  GetStoryFeed();
  const { postData } = useSelector((state) => state.post);
  const { userData } = useSelector((state) => state.user);
  const { yourStory, followingStories } = useSelector((state) => state.story);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetPostId = searchParams.get("postId");

  const [feedMode, setFeedMode] = useState("for-you");
  const [feedAds, setFeedAds] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    fetchRankedFeed(feedMode);
  }, [feedMode]);

  useEffect(() => {
    if (targetPostId && postData?.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-rose-500", "transition-all", "duration-500");
          setTimeout(() => el.classList.remove("ring-2", "ring-rose-500"), 2500);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [targetPostId, postData]);

  const fetchAds = async () => {
    try {
      const res = await api.get("/monetization/ad/feed");
      if (res.data.success) {
        setFeedAds(res.data.ads || []);
      }
    } catch (e) {
      console.warn("Feed: fetchAds failed", e);
    }
  };

  const fetchRankedFeed = async (mode) => {
    try {
      setLoadingFeed(true);
      const res = await api.get(`/post/ranked-feed?mode=${mode}`);
      if (res.data.success) {
        dispatch(setPostData(res.data.posts));
      }
    } catch (e) {
      console.warn("Feed: fetchRankedFeed failed", e);
    } finally {
      setLoadingFeed(false);
    }
  };

  return (
    <div ref={feedRef} className="w-full lg:w-[48%] xl:w-[44%] h-full bg-bg text-text border-x border-border/80 relative overflow-y-auto hide-scrollbar flex flex-col items-center shrink-0 pt-4 lg:pt-8">

      {/* Mobile Top Header */}
      <div className="w-full h-16 flex items-center justify-between px-4 lg:hidden border-b border-border/80 sticky top-0 z-50 bg-bg/90 backdrop-blur-md">
        <img src={logo} alt="VYBE" className="h-7 object-contain cursor-pointer" style={{ filter: themeCtx.resolvedTheme === "dark" ? "none" : "invert(1)" }} onClick={() => navigate("/")} />
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/communities")} className="p-1.5 text-text hover:text-text transition cursor-pointer" title="Communities">
            <Users className="w-5 h-5" />
          </button>
          <button onClick={() => navigate("/notifications")} className="p-1.5 text-text hover:text-text transition cursor-pointer">
            <FaRegHeart className="w-5 h-5 text-text" />
          </button>
          <button onClick={() => navigate("/messages")} className="p-1.5 text-text hover:text-text transition cursor-pointer">
            <MessageCircle className="w-5 h-5 text-text" />
          </button>
        </div>
      </div>

      {/* Stories Tray */}
      <div className="w-full h-28 flex items-center justify-start overflow-x-auto gap-4 px-4 border-b border-border/80 hide-scrollbar bg-bg z-10 shrink-0">
        {yourStory && yourStory.stories?.length > 0 ? (
          <>
            <StoryDp
              userName="Add Story"
              profileImage={userData?.user?.profileImage?.url}
              storyGroup={null}
            />
            <StoryDp
              userName="Your Story"
              profileImage={userData?.user?.profileImage?.url}
              storyGroup={yourStory}
            />
          </>
        ) : (
          <StoryDp
            userName="Your Story"
            profileImage={userData?.user?.profileImage?.url}
            storyGroup={null}
          />
        )}

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

      {/* Algorithmic Feed Filter Bar */}
      <div className="w-full max-w-[540px] px-4 pt-4">
        <FeedFilterBar activeMode={feedMode} onChangeMode={(m) => setFeedMode(m)} />
      </div>

      {/* Feed Content */}
      <div className="w-full flex flex-col items-center gap-6 p-2 md:p-4 pb-24 max-w-[540px]">
        {loadingFeed ? (
          <div className="flex flex-col items-center gap-3 text-text-muted py-16 text-xs font-medium">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span>Curating your feed...</span>
          </div>
        ) : postData?.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center border border-border">
              <Sparkles className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-text text-base font-bold">No posts found</h3>
            <p className="text-xs text-text-secondary max-w-xs">Follow users or explore popular posts to populate your feed.</p>
          </div>
        ) : (
          postData?.map((post, index) => {
            const adIndex = Math.floor(index / 4);
            const showAd = index > 0 && index % 4 === 0 && feedAds[adIndex % feedAds.length];

            return (
              <React.Fragment key={post._id || index}>
                <Post post={post} />
                {showAd && <SponsoredPost ad={feedAds[adIndex % feedAds.length]} />}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Navigation Bar (Mobile / Tablet bottom dock) */}
      <Navbar />
    </div>
  );
};

export default Feed;

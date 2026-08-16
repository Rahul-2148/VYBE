import React, { useEffect, useState, useRef } from "react";
import logo from "../assets/logo.png";
import { FaRegHeart } from "react-icons/fa";
import StoryDp from "./StoryDp";
import Navbar from "./Navbar";
import { useSelector, useDispatch } from "react-redux";
import Post from "./Post";
import SponsoredPost from "./SponsoredPost";
import FeedFilterBar from "./FeedFilterBar";
import { MessageCircle, Loader2, Sparkles, Users, Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/axios";
import { useGetRankedFeedPostsQuery, useGetMonetizationAdsQuery } from "../redux/api/apiSlice";
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
  const { unreadNotificationsCount } = useSelector((state) => state.notification || {});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetPostId = searchParams.get("postId");

  const [feedMode, setFeedMode] = useState("for-you");

  // RTK Query hooks with instant memory cache & stale-while-revalidate
  const { data: feedData, isLoading: isFeedLoading, refetch: refetchFeed } = useGetRankedFeedPostsQuery(feedMode, {
    refetchOnMountOrArgChange: true,
  });
  const { data: adsData } = useGetMonetizationAdsQuery();

  const posts = feedData?.posts || postData || [];
  const feedAds = adsData?.ads || [];

  // Sync to Redux slice for any legacy consumers
  useEffect(() => {
    if (feedData?.posts) {
      dispatch(setPostData(feedData.posts));
    }
  }, [feedData, dispatch]);

  useEffect(() => {
    if (targetPostId && posts?.length > 0) {
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
  }, [targetPostId, posts]);

  return (
    <div ref={feedRef} className="w-full lg:w-[48%] xl:w-[44%] h-full bg-bg text-text border-x border-border/80 relative overflow-y-auto hide-scrollbar flex flex-col items-center shrink-0 pt-4 lg:pt-8">

      {/* Mobile Top Header (Exact App Layout) */}
      <div className="w-full h-14 flex items-center justify-between px-3 lg:hidden border-b border-border/80 sticky top-0 z-50 bg-bg/95 backdrop-blur-md select-none">
        {/* Left: Create (+) */}
        <button
          onClick={() => navigate("/upload")}
          className="p-2 text-text hover:text-rose-500 active:scale-95 transition cursor-pointer flex items-center justify-center"
          title="Create (Post, Reel, Story)"
        >
          <Plus className="w-7 h-7 stroke-[2]" />
        </button>

        {/* Center: Brand Logo */}
        <div className="flex items-center justify-center flex-1">
          <img
            src={logo}
            alt="VYBE"
            className="h-7 object-contain cursor-pointer theme-logo-adaptive"
            onClick={() => navigate("/")}
          />
        </div>

        {/* Right: Communities & Notifications */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/communities")}
            className="p-2 text-text hover:text-purple-400 active:scale-95 transition cursor-pointer relative flex items-center justify-center"
            title="Communities"
          >
            <Users className="w-6 h-6 stroke-[1.8]" />
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="p-2 text-text hover:text-rose-500 active:scale-95 transition cursor-pointer relative flex items-center justify-center"
            title="Notifications"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-text"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#ff3040] shadow-[0_0_8px_rgba(255,48,64,0.9)] ring-2 ring-bg animate-pulse" />
            )}
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
        {isFeedLoading && posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-text-muted py-16 text-xs font-medium">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span>Curating your feed...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center border border-border">
              <Sparkles className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-text text-base font-bold">No posts found</h3>
            <p className="text-xs text-text-secondary max-w-xs">Follow users or explore popular posts to populate your feed.</p>
          </div>
        ) : (
          posts.map((post, index) => {
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

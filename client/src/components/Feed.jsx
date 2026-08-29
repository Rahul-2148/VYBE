import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import logo from "../assets/logo.png";
import { FaRegHeart } from "react-icons/fa";
import StoryDp from "./StoryDp";
import LiveStoryDp from "./LiveStoryDp";
import Navbar from "./Navbar";
import { useSelector, useDispatch } from "react-redux";
import Post from "./Post";
import SponsoredPost from "./SponsoredPost";
import FeedFilterBar from "./FeedFilterBar";
import CloseFriendsModal from "./CloseFriendsModal";
import RenderErrorBoundary from "./RenderErrorBoundary";
import PullToRefresh from "./PullToRefresh";
import { MessageCircle, Loader2, Sparkles, Users, Star, Compass, UserPlus, Plus, Bell, Video } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import { useGetRankedFeedPostsQuery, useGetMonetizationAdsQuery } from "../redux/api/apiSlice";
import { setPostData } from "../redux/features/postSlice";
import GetStoryFeed from "../hooks/GetStoryFeed";
import { useMeet } from "../context/MeetContext";

const Feed = () => {
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, []);

  GetStoryFeed();
  const { activeMeeting } = useMeet();
  const { postData } = useSelector((state) => state.post);
  const { userData } = useSelector((state) => state.user);
  const { yourStory, followingStories } = useSelector((state) => state.story);
  const { unreadNotificationsCount } = useSelector((state) => state.notification || {});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetPostId = searchParams.get("postId");

  const [feedMode, setFeedMode] = useState("for-you");
  const [showCloseFriendsModal, setShowCloseFriendsModal] = useState(false);
  const [activeLives, setActiveLives] = useState([]);

  // Fetch active live broadcasts on mount and listen to socket
  useEffect(() => {
    let mounted = true;
    const fetchActiveLives = async () => {
      try {
        const res = await api.get("/live/active");
        if (res.data.success && mounted) {
          setActiveLives(res.data.lives || []);
        }
      } catch (e) {
        console.warn("Feed active lives load failed:", e?.message);
      }
    };
    fetchActiveLives();

    const socket = getSocket();
    if (!socket) return;

    const handleCreatorLive = (data) => {
      setActiveLives((prev) => {
        if (prev.some((l) => l._id === data.streamId)) return prev;
        return [
          {
            _id: data.streamId,
            title: data.title,
            host: data.host,
            isLive: true,
          },
          ...prev,
        ];
      });
    };

    const handleCreatorEnded = (data) => {
      setActiveLives((prev) => prev.filter((l) => l._id !== data.streamId));
    };

    socket.on("live:creator-started", handleCreatorLive);
    socket.on("live:creator-ended", handleCreatorEnded);

    // Silent background refresh on mobile app resume
    const handleAppResumed = () => {
      fetchActiveLives();
    };
    window.addEventListener("vybe:app_resumed", handleAppResumed);

    return () => {
      mounted = false;
      socket.off("live:creator-started", handleCreatorLive);
      socket.off("live:creator-ended", handleCreatorEnded);
      window.removeEventListener("vybe:app_resumed", handleAppResumed);
    };
  }, []);

  // RTK Query hooks with instant memory cache & stale-while-revalidate
  const {
    data: feedData,
    isLoading: isFeedLoading,
    isFetching: isFeedFetching,
    refetch: _refetchFeed,
  } = useGetRankedFeedPostsQuery(feedMode, {
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    const handleAppResumed = () => {
      _refetchFeed();
    };
    window.addEventListener("vybe:app_resumed", handleAppResumed);
    return () => window.removeEventListener("vybe:app_resumed", handleAppResumed);
  }, [_refetchFeed]);

  const { data: adsData } = useGetMonetizationAdsQuery();

  // If feedData has been returned for current mode, use it; otherwise fallback to postData
  const posts = useMemo(
    () => (feedData?.posts !== undefined ? feedData.posts : postData || []),
    [feedData, postData]
  );
  const feedAds = adsData?.ads || [];
  const isSwitchingModes = isFeedFetching && (!feedData || feedData.mode !== feedMode);

  // Sync to Redux slice for any legacy consumers
  useEffect(() => {
    if (feedData?.posts && feedData.mode === feedMode) {
      dispatch(setPostData(feedData.posts));
    }
  }, [feedData, feedMode, dispatch]);

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

  const handleRefreshFeed = useCallback(async () => {
    try {
      await Promise.all([
        _refetchFeed(),
        api.get("/story/following-story").catch(() => {}),
        api.get("/live/active").then((res) => {
          if (res.data?.success) setActiveLives(res.data.lives || []);
        }).catch(() => {}),
      ]);
    } catch (e) {
      console.warn("Feed pull refresh:", e);
    }
  }, [_refetchFeed]);

  return (
    <PullToRefresh
      onRefresh={handleRefreshFeed}
      isRefreshing={isFeedFetching}
      className="w-full lg:w-[48%] xl:w-[44%] h-full bg-bg text-text border-x border-border/80 hide-scrollbar flex flex-col items-center shrink-0 pt-4 lg:pt-8"
    >
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

        {/* Right: Meet (Video Calls), Communities & Notifications */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => navigate("/meet")}
            className="p-2 text-text hover:text-blue-500 active:scale-95 transition cursor-pointer relative flex items-center justify-center"
            title="Vybe Meet (Video Calls)"
          >
            <Video className="w-6 h-6 stroke-[1.8] text-text" />
            {activeMeeting?.meetingId && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] ring-2 ring-bg animate-pulse" />
            )}
          </button>
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
            <Bell className="w-6 h-6 stroke-[1.8] text-text" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#ff3040] shadow-[0_0_8px_rgba(255,48,64,0.9)] ring-2 ring-bg animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Stories & Live Tray */}
      <div className="w-full h-28 flex items-center justify-start overflow-x-auto gap-4 px-4 border-b border-border/80 hide-scrollbar bg-bg z-10 shrink-0">
        {/* Active Live Broadcasts (Top Priority Glowing Rings) */}
        {activeLives.map((stream) => (
          <LiveStoryDp key={stream._id} stream={stream} />
        ))}

        {/* Your Story tile (Instagram single tile with + badge) */}
        <StoryDp
          userName="Your story"
          profileImage={userData?.user?.profileImage?.url}
          storyGroup={yourStory || null}
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

      {/* Algorithmic Feed Filter Bar */}
      <div className="w-full max-w-[540px] px-4 pt-4">
        <FeedFilterBar activeMode={feedMode} onChangeMode={(m) => setFeedMode(m)} />
      </div>

      {/* Feed Content */}
      <div className="w-full flex flex-col items-center gap-6 p-2 md:p-4 pb-24 max-w-[540px]">
        {(isFeedLoading || isSwitchingModes) && posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-text-muted py-16 text-xs font-medium">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span>Curating {feedMode === "following" ? "Following" : feedMode === "favorites" ? "Favorites" : "For You"} feed...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center gap-4 py-16 px-6 text-center bg-surface/40 border border-border/70 rounded-3xl backdrop-blur-sm shadow-sm mt-4">
            {feedMode === "following" ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Users className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="text-text text-base font-bold">No Posts from Following</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    You haven't followed any creators who have posted yet, or their posts haven't appeared.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => navigate("/explore")}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Explore Creators</span>
                  </button>
                  <button
                    onClick={() => setFeedMode("for-you")}
                    className="py-2 px-3.5 rounded-xl text-xs font-bold bg-surface border border-border hover:bg-surface-hover text-text transition active:scale-95 cursor-pointer"
                  >
                    For You
                  </button>
                </div>
              </>
            ) : feedMode === "favorites" ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Star className="w-7 h-7 text-amber-400 fill-amber-400/20" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="text-text text-base font-bold">No Favorites Posts</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Add close friends and favorite creators to your Favorites list to see their latest posts here.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setShowCloseFriendsModal(true)}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Manage Favorites</span>
                  </button>
                  <button
                    onClick={() => setFeedMode("for-you")}
                    className="py-2 px-3.5 rounded-xl text-xs font-bold bg-surface border border-border hover:bg-surface-hover text-text transition active:scale-95 cursor-pointer"
                  >
                    For You
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-rose-500" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="text-text text-base font-bold">No Posts Found</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Follow more creators or explore trending posts to curate your personalized feed.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/explore")}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm active:scale-95 cursor-pointer mt-2"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Explore Trending</span>
                </button>
              </>
            )}
          </div>
        ) : (
          posts.map((post, index) => {
            const adIndex = Math.floor(index / 4);
            const showAd = index > 0 && index % 4 === 0 && feedAds[adIndex % feedAds.length];

            return (
              <React.Fragment key={post._id || index}>
                <RenderErrorBoundary>
                  <Post post={post} />
                </RenderErrorBoundary>
                {showAd && <SponsoredPost ad={feedAds[adIndex % feedAds.length]} />}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Close Friends / Favorites Management Modal */}
      {showCloseFriendsModal && (
        <CloseFriendsModal
          isOpen={showCloseFriendsModal}
          onClose={() => setShowCloseFriendsModal(false)}
        />
      )}

      {/* Navigation Bar (Mobile / Tablet bottom dock) */}
      <Navbar />
    </PullToRefresh>
  );
};

export default Feed;

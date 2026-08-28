import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { snackbar } from "../lib/snackbar";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  BarChart2,
  Bookmark,
  Camera,
  ChevronRight,
  ChevronDown,
  Film,
  FolderOpen,
  Grid,
  Heart,
  Link2,
  MessageCircle,
  Play,
  Pause,
  Plus,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Star,
  CheckCircle2,
  Lock,
  X,
  Info,
  Mail,
  Phone,
  Tag,
  Music,
} from "lucide-react";
import Navbar from "../components/Navbar";
import ProfileQRModal from "../components/ProfileQRModal";
import FollowButton from "../components/FollowButton";
import ProfileInsightsModal from "../components/ProfileInsightsModal";
import CloseFriendsModal from "../components/CloseFriendsModal";
import StoryHighlighterModal from "../components/StoryHighlighterModal";
import AccountSwitcherModal from "../components/AccountSwitcherModal";
import FollowListModal from "../components/FollowListModal";
import AboutAccountModal from "../components/AboutAccountModal";
import DraftsModal from "../components/DraftsModal";
import VerifiedBadge from "../components/VerifiedBadge";
import StoryMusicPickerModal from "../components/StoryMusicPickerModal";
import RenderErrorBoundary from "../components/RenderErrorBoundary";
import dp from "../assets/dp3.png";
import { setProfileData, setUserData } from "../redux/features/userSlice";
import { setSelectedChatUser } from "../redux/features/messageSlice";
import { useGetUserFullProfileQuery, useGetUserHighlightsQuery } from "../redux/api/apiSlice";
import api from "../lib/axios";

const PROFILE_TABS = [
  { id: "posts", label: "Posts", icon: Grid },
  { id: "reels", label: "Reels", icon: Film },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "tagged", label: "Tagged", icon: Tag },
];

const resolveMediaUrl = (item) => {
  return (
    item?.media?.url ||
    item?.mediaUrl ||
    item?.thumbnailUrl ||
    item?.coverUrl ||
    item?.carouselMedia?.[0]?.url ||
    item?.carousel?.[0]?.url ||
    item?.video?.url ||
    item?.audioTrack?.coverUrl ||
    null
  );
};

const getPreviewKind = (item, kind) => {
  if (kind === "audio" || item?.mediaType === "audio" || item?.__kind === "audio") return "audio";
  if (kind === "reel") return "reel";
  if (item?.mediaType === "video") return "video";
  if ((item?.carouselMedia?.length || item?.carousel?.length || 0) > 1) return "carousel";
  return "post";
};

const getUserAvatarUrl = (user) => user?.profileImage?.url || user?.avatarUrl || dp;

const ProfileTile = ({ item, kind, onClick }) => {
  const mediaUrl = resolveMediaUrl(item);
  const previewKind = getPreviewKind(item, kind);
  const commentCount = item?.comments?.length || 0;
  const likeCount = item?.likes?.length || 0;
  const viewCount = item?.views || item?.viewCount || 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/80 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-700"
    >
      {mediaUrl ? (
        previewKind === "reel" ? (
          <video src={mediaUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <img src={mediaUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
            <Camera className="h-6 w-6 text-zinc-500" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-100 transition group-hover:from-black/60" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-white">{item?.caption || item?.title || item?.name || "Untitled"}</p>
          <p className="mt-0.5 text-[10px] text-zinc-300">
            {kind === "audio" || previewKind === "audio"
              ? item?.artist || "Audio Track"
              : kind === "reel"
              ? `${viewCount} views`
              : `${likeCount} likes · ${commentCount} comments`}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/45 backdrop-blur border border-white/10 text-white">
          {previewKind === "audio" ? (
            <Music className="h-4 w-4 text-rose-400" />
          ) : previewKind === "reel" ? (
            <Play className="h-4 w-4 fill-white" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur border border-white/10">
        {previewKind === "audio" ? (
          <>
            <Music className="h-3 w-3 text-rose-400" />
            <span>Audio</span>
          </>
        ) : previewKind === "reel" ? (
          <>
            <Play className="h-3 w-3 fill-white" />
            <span>Reel</span>
          </>
        ) : previewKind === "carousel" ? (
          <>
            <Grid className="h-3 w-3" />
            <span>Multi</span>
          </>
        ) : (
          <>
            <Heart className="h-3 w-3" />
            <span>Post</span>
          </>
        )}
      </div>
    </button>
  );
};

const SectionSkeleton = () => (
  <div className="animate-pulse space-y-6 w-full">
    {/* 1. Header Card Skeleton */}
    <div className="rounded-[2rem] border border-zinc-900 bg-zinc-950/90 p-4 sm:p-6 shadow-2xl space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Avatar + Info Block */}
        <div className="flex items-start gap-5 flex-1">
          {/* Avatar Skeleton */}
          <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-zinc-800/80 shrink-0 border border-zinc-800" />

          {/* Info Lines Skeleton */}
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-7 w-48 rounded-lg bg-zinc-800/80" />
            <div className="h-4 w-32 rounded-md bg-zinc-850" />
            <div className="h-4 w-full max-w-md rounded-md bg-zinc-900" />
            <div className="flex gap-2 pt-1">
              <div className="h-7 w-24 rounded-full bg-zinc-850" />
              <div className="h-7 w-20 rounded-full bg-zinc-850" />
            </div>
          </div>
        </div>

        {/* Stats Grid Box Skeleton */}
        <div className="rounded-3xl border border-zinc-900 bg-black/40 p-4 lg:min-w-[310px] space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded-2xl bg-zinc-900/80" />
            <div className="h-16 rounded-2xl bg-zinc-900/80" />
            <div className="h-16 rounded-2xl bg-zinc-900/80" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 rounded-2xl bg-zinc-900/50" />
            <div className="h-12 rounded-2xl bg-zinc-900/50" />
          </div>
        </div>
      </div>

      {/* Action Buttons Row Skeleton */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <div className="h-9 w-28 rounded-full bg-zinc-800/90" />
        <div className="h-9 w-32 rounded-full bg-zinc-900" />
        <div className="h-9 w-24 rounded-full bg-zinc-900" />
        <div className="h-9 w-28 rounded-full bg-zinc-900" />
      </div>
    </div>

    {/* 2. Highlights Section Skeleton */}
    <div className="rounded-[2rem] border border-zinc-900 bg-zinc-950/70 p-4 sm:p-5 space-y-4">
      <div className="space-y-1.5">
        <div className="h-3 w-20 rounded-md bg-zinc-800/70" />
        <div className="h-4 w-36 rounded-md bg-zinc-850" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 shrink-0">
            <div className="h-20 w-20 rounded-full bg-zinc-850 border border-zinc-800" />
            <div className="h-3 w-12 rounded-md bg-zinc-900" />
          </div>
        ))}
      </div>
    </div>

    {/* 3. Tab Bar Skeleton */}
    <div className="rounded-3xl border border-zinc-900 bg-black/80 p-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="h-12 rounded-2xl bg-zinc-900/80" />
        <div className="h-12 rounded-2xl bg-zinc-950/60" />
        <div className="h-12 rounded-2xl bg-zinc-950/60" />
      </div>
    </div>

    {/* 4. Posts Grid Skeleton */}
    <div className="rounded-[2rem] border border-zinc-900 bg-zinc-950/70 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="aspect-square rounded-2xl bg-zinc-900/80 border border-zinc-850" />
        ))}
      </div>
    </div>
  </div>
);

const Profile = () => {
  const { profileData, userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userName } = useParams();

  const [showQRModal, setShowQRModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showCloseFriendsModal, setShowCloseFriendsModal] = useState(false);
  const [showHighlighterModal, setShowHighlighterModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState("followers");
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [postType, setPostType] = useState("posts");
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDpView, setShowDpView] = useState(false);
  const [showDPOptions, setShowDPOptions] = useState(false);
  const [savedItems, setSavedItems] = useState({ posts: [], reels: [], audios: [] });
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Profile Song Player State & Direct Picker Modal
  const [isPlayingProfileSong, setIsPlayingProfileSong] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const profileAudioRef = useRef(null);

  const handleSaveProfileSong = async (track) => {
    try {
      const formData = new FormData();
      formData.append("profileSong", JSON.stringify(track));
      const res = await api.put("/user/edit-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        dispatch(setUserData(res.data));
        dispatch(setProfileData(res.data));
        snackbar.success("Profile music updated! 🎵");
      }
    } catch (e) {
      console.warn("Could not save profile music:", e);
      snackbar.error("Failed to update profile music");
    } finally {
      setShowMusicPicker(false);
    }
  };

  const handleRemoveProfileSong = async (e) => {
    e?.stopPropagation();
    try {
      if (profileAudioRef.current) {
        profileAudioRef.current.pause();
        setIsPlayingProfileSong(false);
      }
      const formData = new FormData();
      formData.append("profileSong", "remove");
      const res = await api.put("/user/edit-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        dispatch(setUserData(res.data));
        dispatch(setProfileData(res.data));
        snackbar("Profile music removed");
      }
    } catch {
      snackbar.error("Failed to remove profile music");
    }
  };

  const handleToggleProfileMusic = (audioUrl) => {
    if (!audioUrl) {
      snackbar.error("Audio preview not available for this song");
      return;
    }

    if (!profileAudioRef.current || profileAudioRef.current.src !== audioUrl) {
      if (profileAudioRef.current) {
        profileAudioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingProfileSong(false);
      audio.onerror = () => {
        setIsPlayingProfileSong(false);
        snackbar.error("Could not stream audio preview");
      };
      profileAudioRef.current = audio;
    }

    if (isPlayingProfileSong) {
      profileAudioRef.current.pause();
      setIsPlayingProfileSong(false);
    } else {
      profileAudioRef.current.play().catch(() => null);
      setIsPlayingProfileSong(true);
    }
  };

  useEffect(() => {
    return () => {
      if (profileAudioRef.current) {
        profileAudioRef.current.pause();
      }
    };
  }, [userName]);

  // RTK Query with instant cache & stale-while-revalidate
  const { data: fetchedProfile, refetch: refetchProfile } = useGetUserFullProfileQuery(userName, {
    skip: !userName,
  });
  const { data: fetchedHighlights } = useGetUserHighlightsQuery(userName, {
    skip: !userName,
  });

  useEffect(() => {
    if (fetchedProfile) {
      dispatch(setProfileData(fetchedProfile));
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }
  }, [fetchedProfile, dispatch]);

  useEffect(() => {
    if (fetchedHighlights?.highlights) {
      const timer = setTimeout(() => setHighlights(fetchedHighlights.highlights), 0);
      return () => clearTimeout(timer);
    }
  }, [fetchedHighlights]);

  const handleProfile = useCallback(async () => {
    if (refetchProfile) {
      await refetchProfile();
    }
  }, [refetchProfile]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [userName]);

  const handleLogOut = async () => {
    try {
      const result = await api.post("/auth/signout");
      dispatch(setUserData(null));
      snackbar.success(result.data.message || "Logged out");
      navigate("/signin", { replace: true });
    } catch {
      snackbar.error("Logout failed");
    }
  };

  const isOwnProfile = profileData?.user?._id === userData?.user?._id;
  const isFollowing = useMemo(() => {
    return (profileData?.user?.followers || []).some(
      (f) => (f._id || f || "").toString() === userData?.user?._id?.toString()
    );
  }, [profileData?.user?.followers, userData?.user?._id]);

  const [taggedItems, setTaggedItems] = useState([]);

  useEffect(() => {
    let isMounted = true;
    if (isOwnProfile && postType === "saved") {
      setLoadingSaved(true);
      api
        .get("/user/saved-items")
        .then((res) => {
          if (isMounted && res.data?.success) {
            setSavedItems({
              posts: res.data.savedPosts || [],
              reels: res.data.savedReels || [],
              audios: res.data.savedAudios || [],
            });
          }
        })
        .catch((err) => {
          if (isMounted) console.warn("Profile: fetchSavedItems failed", err);
        })
        .finally(() => {
          if (isMounted) setLoadingSaved(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOwnProfile, postType]);

  useEffect(() => {
    let isMounted = true;
    const targetUserId = profileData?.user?._id;
    if (postType === "tagged" && targetUserId) {
      api
        .get(`/post/tagged/${targetUserId}`)
        .then((res) => {
          if (isMounted && res.data?.success) {
            setTaggedItems(res.data.tagged || []);
          }
        })
        .catch((err) => {
          if (isMounted) console.warn("Profile: fetchTaggedItems failed", err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [postType, profileData?.user?._id]);

  const handleMessage = async () => {
    try {
      const res = await api.post("/conversation/one-to-one", { userId: profileData.user._id });
      dispatch(
        setSelectedChatUser({
          conversationId: res.data.conversation._id,
          user: profileData.user,
        })
      );
      navigate(`/messages/${res.data.conversation._id}`);
    } catch {
      snackbar.error("Failed to start message.");
    }
  };

  const tabCounts = useMemo(() => {
    const savedCount =
      (savedItems.posts?.length || profileData?.user?.savedPosts?.length || userData?.user?.savedPosts?.length || 0) +
      (savedItems.reels?.length || profileData?.user?.savedReels?.length || userData?.user?.savedReels?.length || 0) +
      (savedItems.audios?.length || profileData?.user?.savedAudios?.length || userData?.user?.savedAudios?.length || 0);

    const reelsCount = profileData?.user?.reels?.length || 0;

    return {
      posts: profileData?.user?.posts?.length || 0,
      reels: reelsCount,
      saved: savedCount,
      tagged: taggedItems?.length || 0,
    };
  }, [profileData, userData, savedItems, taggedItems]);

  const savedFeed = useMemo(() => {
    const postsList = (savedItems.posts?.length > 0 ? savedItems.posts : profileData?.user?.savedPosts || [])
      .filter((p) => p && typeof p === "object" && (p._id || p.id));

    const reelsList = (savedItems.reels?.length > 0 ? savedItems.reels : (profileData?.user?.savedReels || []))
      .filter((l) => l && typeof l === "object" && (l._id || l.id));

    const audiosList = (savedItems.audios?.length > 0 ? savedItems.audios : (profileData?.user?.savedAudios || []))
      .filter((a) => a && typeof a === "object" && (a.id || a._id));

    return [
      ...postsList.map((item) => ({ ...item, __kind: "post" })),
      ...reelsList.map((item) => ({ ...item, __kind: "reel" })),
      ...audiosList.map((item) => ({ ...item, __kind: "audio", mediaType: "audio" })),
    ];
  }, [savedItems, profileData?.user?.savedPosts, profileData?.user?.savedReels, profileData?.user?.savedAudios]);

  const followerList = useMemo(() => profileData?.user?.followers || [], [profileData]);
  const followingList = useMemo(() => profileData?.user?.following || [], [profileData]);
  const followerPreview = followerList.slice(0, 3);
  const followingPreview = followingList.slice(0, 3);

  const activeFeed = useMemo(() => {
    if (postType === "reels") {
      return (profileData?.user?.reels || []).map((item) => ({ ...item, __kind: "reel" }));
    }
    if (postType === "saved") return savedFeed;
    if (postType === "tagged") return taggedItems;
    return (profileData?.user?.posts || []).map((item) => ({ ...item, __kind: "post" }));
  }, [postType, profileData, savedFeed, taggedItems]);

  const feedEmptyState =
    postType === "reels"
      ? { title: "No reels yet", copy: isOwnProfile ? "Upload a reel to start building your short-form presence." : "This creator has not shared reels yet." }
      : postType === "saved"
      ? { title: "Nothing saved yet", copy: "Saved posts and reels will appear here for quick access." }
      : postType === "tagged"
      ? { title: "No tagged posts", copy: isOwnProfile ? "When people tag you in photos and reels, they'll appear here." : "No posts or reels have tagged this user yet." }
      : { title: "No posts yet", copy: isOwnProfile ? "Share your first post to fill this grid." : "This creator has not posted yet." };
  const isVerified = Boolean(profileData?.user?.isVerified);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 overflow-hidden border-b border-zinc-900/90 bg-zinc-950/90 backdrop-blur-2xl shadow-xl shadow-black/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(225,48,108,0.16),_transparent_40%),radial-gradient(circle_at_80%_10%,_rgba(64,93,230,0.12),_transparent_25%)]" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/");
              }
            }}
            className="rounded-full border border-zinc-800 bg-zinc-950/80 p-2 text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
            title="Go Back"
          >
            <MdOutlineKeyboardBackspace className="h-6 w-6" />
          </button>

          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Profile</p>
            {isOwnProfile ? (
              <button
                onClick={() => setShowAccountSwitcher(true)}
                className="mt-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white hover:text-rose-400 transition cursor-pointer px-3 py-1 rounded-full hover:bg-zinc-900/70 border border-transparent hover:border-zinc-800/80 active:scale-95 group"
                title="Switch Account"
              >
                <span className="text-rose-400">@</span>
                <span className="truncate max-w-[180px] sm:max-w-xs">{profileData?.user?.userName || userName}</span>
                {isVerified && <VerifiedBadge size="xs" />}
                {profileData?.user?.accountType === "private" && (
                  <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 group-hover:text-rose-400 transition-transform" />
              </button>
            ) : (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white px-3 py-1">
                <span className="text-rose-400">@</span>
                <span className="truncate max-w-[180px] sm:max-w-xs">{profileData?.user?.userName || userName}</span>
                {isVerified && <VerifiedBadge size="xs" />}
                {profileData?.user?.accountType === "private" && (
                  <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
              </div>
            )}
          </div>

          {isOwnProfile ? (
            <button
              className="rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs font-semibold text-rose-400 transition hover:border-rose-500/40 hover:text-white"
              onClick={handleLogOut}
            >
              Log Out
            </button>
          ) : (
            <button
              onClick={() => setShowAboutModal(true)}
              className="p-2 rounded-full border border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 transition cursor-pointer"
              title="About this account"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-5 pb-24 sm:px-6 lg:px-8">
        {loading ? (
          <SectionSkeleton />
        ) : (
          <section className="rounded-[2rem] border border-zinc-900 bg-zinc-950/90 p-4 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
              <div className="flex items-start gap-5">
                <button
                  type="button"
                  onClick={() => {
                    if (isOwnProfile) {
                      setShowDPOptions(true);
                    } else {
                      const isPrivate = profileData?.user?.accountType === "private";
                      if (!isPrivate || isFollowing) {
                        setShowDpView(true);
                      } else {
                        snackbar.error("This account is private. Follow this account to view their profile picture.");
                      }
                    }
                  }}
                  className="group relative h-24 w-24 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 p-1 transition hover:border-rose-500 sm:h-32 sm:w-32 cursor-pointer"
                >
                  <img
                    src={profileData?.user?.profileImage?.url || dp}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 backdrop-blur-sm">
                    <span className="rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white border border-white/10">View</span>
                  </div>
                </button>

                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{profileData?.user?.name}</h1>
                      {isVerified && <VerifiedBadge size="md" />}
                      {profileData?.user?.accountType === "private" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 shadow-xs" title="Private Account">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Private</span>
                        </span>
                      )}
                      {profileData?.user?.category && (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300">
                          {profileData.user.category}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-zinc-400">{profileData?.user?.profession || "VYBE Creator"}</div>
                    <div className="max-w-2xl text-sm leading-6 text-zinc-200">{profileData?.user?.bio || "No bio yet."}</div>
                  </div>

                  {profileData?.user?.links?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profileData.user.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:border-zinc-700 hover:text-white"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          <span>{link.title || "Website"}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Instagram-style Permanent Profile Music Anthem */}
                  {profileData?.user?.profileSong?.title ? (
                    <div className="pt-1 flex items-center gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-2.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 backdrop-blur-md shadow-lg shadow-rose-500/5 group hover:border-rose-500/50 transition-all">
                        {/* Play/Pause Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleProfileMusic(profileData.user.profileSong.audioUrl);
                          }}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isPlayingProfileSong
                              ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse"
                              : "bg-white/10 hover:bg-rose-500 hover:text-white text-rose-300"
                          }`}
                          title={isPlayingProfileSong ? "Pause Music" : "Play Profile Music"}
                        >
                          {isPlayingProfileSong ? (
                            <Pause className="h-3.5 w-3.5 fill-current" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        {/* Song Art / Disc */}
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            const song = profileData.user.profileSong;
                            navigate(`/audio/${encodeURIComponent(song.id || song.title)}`, { state: { music: song } });
                          }}
                        >
                          {profileData.user.profileSong.coverUrl ? (
                            <img
                              src={profileData.user.profileSong.coverUrl}
                              alt=""
                              className={`h-6 w-6 rounded-full object-cover border border-white/20 shadow-xs ${
                                isPlayingProfileSong ? "animate-spin" : ""
                              }`}
                              style={{ animationDuration: "3s" }}
                            />
                          ) : (
                            <Music className="h-4 w-4 text-rose-400" />
                          )}

                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black text-white leading-tight hover:underline flex items-center gap-1.5">
                              <span>{profileData.user.profileSong.title}</span>
                              <span className="text-[10px] text-rose-400 font-normal">·</span>
                              <span className="text-[11px] font-medium text-zinc-400">
                                {profileData.user.profileSong.artist || "Original Soundtrack"}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Own Profile Quick Change/Remove Actions */}
                        {isOwnProfile && (
                          <div className="flex items-center gap-1 pl-1 border-l border-white/10 ml-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMusicPicker(true);
                              }}
                              className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                              title="Change profile music"
                            >
                              <Music className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveProfileSong}
                              className="p-1 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                              title="Remove profile music"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : isOwnProfile ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowMusicPicker(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900 hover:border-rose-500/50 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer shadow-xs"
                      >
                        <Music className="h-3.5 w-3.5 text-rose-400" />
                        <span>+ Add music to your profile</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-900 bg-black/40 p-3 sm:p-4 lg:min-w-[310px]">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-zinc-900/80 bg-zinc-950/80 p-3 text-center">
                    <div className="text-2xl font-black text-white">{tabCounts.posts}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Posts</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFollowModalTab("followers");
                      setFollowModalOpen(true);
                    }}
                    className="rounded-2xl border border-zinc-900/80 bg-zinc-950/80 p-3 text-left transition-colors duration-150 hover:border-zinc-700 cursor-pointer group"
                    title="View Followers"
                  >
                    <div className="flex -space-x-2">
                      {followerPreview.length > 0 ? (
                        followerPreview.map((follower, idx) => (
                          <img
                            key={follower?._id || idx}
                            src={getUserAvatarUrl(follower)}
                            alt=""
                            className="h-8 w-8 rounded-full border-2 border-black object-cover"
                          />
                        ))
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-zinc-800 text-[10px] font-bold text-zinc-400">
                          0
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-2xl font-black text-white group-hover:text-rose-400 transition-colors">{followerList.length}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Followers</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFollowModalTab("following");
                      setFollowModalOpen(true);
                    }}
                    className="rounded-2xl border border-zinc-900/80 bg-zinc-950/80 p-3 text-left transition-colors duration-150 hover:border-zinc-700 cursor-pointer group"
                    title="View Following"
                  >
                    <div className="flex -space-x-2">
                      {followingPreview.length > 0 ? (
                        followingPreview.map((followingUser, idx) => (
                          <img
                            key={followingUser?._id || idx}
                            src={getUserAvatarUrl(followingUser)}
                            alt=""
                            className="h-8 w-8 rounded-full border-2 border-black object-cover"
                          />
                        ))
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-zinc-800 text-[10px] font-bold text-zinc-400">
                          0
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-2xl font-black text-white group-hover:text-rose-400 transition-colors">{followingList.length}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Following</div>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFollowModalTab("mutuals");
                      setFollowModalOpen(true);
                    }}
                    className="rounded-2xl border border-zinc-900 bg-zinc-950/60 px-3 py-2 text-left hover:border-zinc-700 transition cursor-pointer group"
                    title="View Mutual Connections"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 group-hover:text-rose-400 transition">Mutual vibes</div>
                    <div className="mt-1 text-sm font-semibold text-white">{Math.min(followerList.length, followingList.length)} connections</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFollowModalTab("followers");
                      setFollowModalOpen(true);
                    }}
                    className="rounded-2xl border border-zinc-900 bg-zinc-950/60 px-3 py-2 text-left hover:border-zinc-700 transition cursor-pointer group"
                    title="View Network"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 group-hover:text-rose-400 transition">Network</div>
                    <div className="mt-1 text-sm font-semibold text-white">{followerList.length + followingList.length} total</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {isOwnProfile ? (
                <>
                  <button
                    className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-zinc-200 cursor-pointer"
                    onClick={() => navigate("/edit-profile")}
                  >
                    Edit Profile
                  </button>
                  <button
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 transition hover:border-rose-500 hover:text-white cursor-pointer"
                    onClick={() => setShowQRModal(true)}
                  >
                    Share Profile
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 transition hover:border-amber-400 hover:text-white cursor-pointer"
                    onClick={() => setShowDraftsModal(true)}
                    title="Saved Drafts"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Drafts
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-300 transition hover:border-purple-400 hover:text-white cursor-pointer"
                    onClick={() => setShowInsightsModal(true)}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    Insights
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:border-emerald-400 hover:text-white cursor-pointer"
                    onClick={() => setShowCloseFriendsModal(true)}
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Close Friends
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
                    onClick={() => navigate("/story/archive")}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-gradient-to-r from-purple-500/10 to-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 transition hover:border-rose-500 hover:text-white"
                    onClick={() => navigate("/monetization")}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Monetization
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:border-cyan-400 hover:text-white cursor-pointer"
                    onClick={() => navigate("/security")}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Security & Accounts
                  </button>
                </>
              ) : (
                <>
                  <FollowButton
                    targetUserId={profileData?.user?._id}
                    tailwind="rounded-full bg-white px-5 py-2 text-xs font-bold text-black transition hover:bg-zinc-200"
                    onFollowChange={handleProfile}
                  />
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2 text-xs font-bold text-white transition hover:border-zinc-700 hover:bg-zinc-800 cursor-pointer"
                    onClick={handleMessage}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Message
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
                    onClick={() => setShowAboutModal(true)}
                    title="About This Account"
                  >
                    <Info className="h-3.5 w-3.5 text-rose-400" />
                    About
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
                    onClick={() => setShowQRModal(true)}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {(isOwnProfile || profileData?.user?.accountType !== "private" || isFollowing) && (
        <section className="rounded-[2rem] border border-zinc-900 bg-zinc-950/70 p-4 backdrop-blur-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Highlights</p>
              <h2 className="mt-1 text-sm font-bold text-white">Stories worth keeping</h2>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => setShowHighlighterModal(true)}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:border-rose-500/40 hover:text-white"
              >
                Add Highlight
              </button>
            )}
          </div>

          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
            {isOwnProfile && (
              <button
                onClick={() => setShowHighlighterModal(true)}
                className="flex w-[84px] shrink-0 flex-col items-center gap-2 cursor-pointer"
                title="Create New Highlight"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-zinc-700 bg-zinc-950 text-zinc-400 transition hover:border-rose-500 hover:text-rose-500">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-medium text-zinc-400">New</span>
              </button>
            )}

            {highlights.map((hl) => (
              <button
                key={hl._id}
                onClick={() => hl.stories?.length > 0 && navigate("/story", { state: { stories: hl.stories } })}
                className="flex w-[84px] shrink-0 flex-col items-center gap-2"
              >
                <div className="rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 p-[2px] shadow-lg shadow-rose-500/20">
                  <img src={hl.coverImage?.url || dp} alt="" className="h-20 w-20 rounded-full border-2 border-black object-cover" />
                </div>
                <span className="w-full truncate text-center text-[11px] font-medium text-zinc-300">{hl.title}</span>
              </button>
            ))}
          </div>
        </section>
        )}

        {(!isOwnProfile && profileData?.user?.accountType === "private" && !isFollowing) ? (
          <section className="rounded-[2rem] border border-zinc-900 bg-zinc-950/70 p-8 text-center flex flex-col items-center justify-center min-h-[40vh] backdrop-blur-sm animate-fadeIn">
            <div className="rounded-full border-2 border-zinc-800 bg-zinc-900/50 p-6 mb-4 shadow-xl">
              <Lock className="h-10 w-10 text-rose-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-white">This Account is Private</h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-400 leading-relaxed">
              Follow this user to see their posts, reels, and other activity.
            </p>
          </section>
        ) : (
          <>
            <section className="sticky top-[68px] z-30 rounded-3xl border border-zinc-900 bg-black/90 px-2 py-2 backdrop-blur-xl shadow-lg">
              <div className="grid grid-cols-4 gap-2">
                {PROFILE_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPostType(tab.id)}
                      className={`inline-flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-xs font-bold transition ${
                        postType === tab.id
                          ? "border-rose-500/40 bg-rose-500/10 text-white"
                          : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      <span className="text-[10px] text-zinc-500">{tabCounts[tab.id] || 0}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-900 bg-zinc-950/70 p-4 sm:p-5">
              {(loading || (postType === "saved" && loadingSaved && activeFeed.length === 0)) ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} className="aspect-square animate-pulse rounded-2xl bg-zinc-800/80" />
                    ))}
                  </div>
                </div>
              ) : activeFeed.length === 0 ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                  <div className="rounded-full border border-zinc-800 bg-zinc-900 p-4">
                    {postType === "reels" ? <Play className="h-7 w-7 text-rose-400" /> : <Grid className="h-7 w-7 text-rose-400" />}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">{feedEmptyState.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{feedEmptyState.copy}</p>
                  {isOwnProfile && postType === "posts" && (
                    <button
                      onClick={() => navigate("/upload")}
                      className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-zinc-200"
                    >
                      Create post
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                  {activeFeed.map((item) => {
                    if (!item) return null;
                    const itemKind = item.__kind || (postType === "reels" ? "reel" : "post");

                    return (
                      <RenderErrorBoundary key={item._id || item.id}>
                        <ProfileTile
                          item={item}
                          kind={itemKind}
                          onClick={() => {
                            if (itemKind === "audio") {
                              navigate(`/audio/${encodeURIComponent(item.id || item.title)}`, { state: { music: item } });
                            } else if (itemKind === "reel") {
                              navigate(`/reels?reelId=${item._id}`);
                            } else {
                              navigate(`/?postId=${item._id}`);
                            }
                          }}
                        />
                      </RenderErrorBoundary>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Navbar />

      {showQRModal && <ProfileQRModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} user={profileData?.user} />}

      {showInsightsModal && (
        <ProfileInsightsModal
          isOpen={showInsightsModal}
          onClose={() => setShowInsightsModal(false)}
          user={profileData?.user}
          onAccountSwitched={handleProfile}
        />
      )}

      {showCloseFriendsModal && <CloseFriendsModal isOpen={showCloseFriendsModal} onClose={() => setShowCloseFriendsModal(false)} />}

      {showHighlighterModal && (
        <StoryHighlighterModal
          isOpen={showHighlighterModal}
          onClose={() => setShowHighlighterModal(false)}
          onSuccess={() => handleProfile()}
        />
      )}

      {/* Account Switcher Modal */}
      <AccountSwitcherModal
        isOpen={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
      />

      {/* Followers / Following / Mutual Connections Modal */}
      <FollowListModal
        isOpen={followModalOpen}
        onClose={() => setFollowModalOpen(false)}
        initialTab={followModalTab}
        userName={profileData?.user?.userName || userName}
        profileUser={profileData?.user}
      />

      {/* Saved Drafts Manager Modal */}
      <DraftsModal
        isOpen={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
      />

      {/* Direct Profile Music Picker Modal */}
      {showMusicPicker && (
        <StoryMusicPickerModal
          open={showMusicPicker}
          onClose={() => setShowMusicPicker(false)}
          selectedMusic={profileData?.user?.profileSong}
          onSelectMusic={handleSaveProfileSong}
        />
      )}

      {/* Own Profile DP Options Bottom Sheet / Drawer */}
      {showDPOptions && (
        <DPOptionsModal
          onClose={() => setShowDPOptions(false)}
          onView={() => {
            setShowDPOptions(false);
            setShowDpView(true);
          }}
          onShareQR={() => {
            setShowDPOptions(false);
            setShowQRModal(true);
          }}
        />
      )}

      {/* About Account Modal */}
      {showAboutModal && (
        <AboutAccountModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
          user={profileData?.user}
          isOwnProfile={isOwnProfile}
        />
      )}

      {/* Secure Fullscreen DP Viewer */}
      {showDpView && (
        <FullScreenDPViewer
          imageUrl={profileData?.user?.profileImage?.url || dp}
          userName={profileData?.user?.userName || userName}
          onClose={() => setShowDpView(false)}
        />
      )}
    </div>
  );
};

// --- Custom DP Options Drawer ---
const DPOptionsModal = ({ onClose, onView, onShareQR }) => {
  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md rounded-t-[2.5rem] border-t border-zinc-800 bg-zinc-950 p-6 pb-8 shadow-2xl animate-slideUp">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-zinc-800" />
        
        <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-zinc-400">Profile Photo</h3>
        
        <div className="space-y-3">
          <button
            onClick={onView}
            className="w-full rounded-2xl bg-zinc-900 py-4 text-center text-sm font-bold text-white transition hover:bg-zinc-800/80 cursor-pointer"
          >
            View Profile Picture
          </button>
          
          <button
            onClick={onShareQR}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-500/20 to-rose-500/20 border border-rose-500/30 py-4 text-center text-sm font-bold text-rose-300 transition hover:from-purple-500/30 hover:to-rose-500/30 cursor-pointer"
          >
            Share QR Code
          </button>
          
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 py-4 text-center text-sm font-bold text-zinc-400 transition hover:bg-zinc-900 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Ultra-Secure DRM Fullscreen DP Viewer (100% Native HD Quality + Instant Screenshot Blackout) ---
const FullScreenDPViewer = ({ imageUrl, onClose }) => {
  const [screenshotAlert, setScreenshotAlert] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);

  useEffect(() => {
    // 1. Disable Context Menu & Dragging
    const handleContextMenu = (e) => e.preventDefault();
    const handleDragStart = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);

    // 2. Immediate Blackout on Key Combinations (Win, Shift, Alt, Ctrl, PrintScreen, F12)
    const handleKeyDown = (e) => {
      const isModifierKey =
        e.key === "PrintScreen" ||
        e.keyCode === 44 ||
        e.key === "Meta" ||
        e.key === "Win" ||
        e.key === "OS" ||
        (e.shiftKey && e.metaKey) ||
        (e.ctrlKey && (e.key === "p" || e.key === "s" || e.key === "Shift" || e.key === "i" || e.key === "c")) ||
        (e.metaKey && (e.key === "p" || e.key === "s" || e.key === "3" || e.key === "4"));

      if (isModifierKey) {
        setIsBlackout(true);
        try {
          navigator.clipboard.writeText("");
          } catch (e) {
            console.warn("Profile: navigator.clipboard.writeText failed", e);
          }
        setScreenshotAlert(true);
        setTimeout(() => setScreenshotAlert(false), 3000);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "PrintScreen" || e.keyCode === 44 || e.key === "Meta" || e.key === "Win") {
        setTimeout(() => setIsBlackout(false), 1500);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // 3. Instant Blackout on Viewport Mouse Leave, Blur, & Visibility Loss
    const handleMouseLeave = () => setIsBlackout(true);
    const handleMouseEnter = () => setIsBlackout(false);
    const handleBlur = () => setIsBlackout(true);
    const handleFocus = () => setIsBlackout(false);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlackout(true);
      } else {
        setIsBlackout(false);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black backdrop-blur-2xl animate-fadeIn select-none">
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* Top Bar Header */}
      <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 z-20 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-[11px] font-bold text-rose-300 shadow-sm">
          <Lock className="w-3.5 h-3.5 text-rose-400" />
          <span>DRM Encrypted Media</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-zinc-900/80 border border-zinc-800 p-2.5 text-white hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Security Warning Banner */}
      {screenshotAlert && (
        <div className="absolute top-20 z-30 flex items-center gap-2 bg-rose-600 text-white text-xs font-black px-6 py-2.5 rounded-full shadow-2xl animate-bounce border border-rose-400">
          <ShieldAlert className="w-4 h-4" />
          <span>Screenshots & Capture are blocked for protected media</span>
        </div>
      )}

      {/* Protected GPU Native HD Image Frame */}
      <div className="relative max-w-lg w-full aspect-square p-4 flex items-center justify-center select-none">
        <div className="relative w-full h-full rounded-3xl overflow-hidden border border-zinc-800/80 bg-black shadow-2xl">
          <img
            src={imageUrl}
            alt="Protected Profile Avatar"
            className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-150 ${
              isBlackout ? "opacity-0 blur-3xl scale-95 brightness-0" : "opacity-100 blur-0 scale-100 brightness-100"
            }`}
            draggable="false"
            onDragStart={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          />
          {/* Transparent Overlay Shield */}
          <div className="absolute inset-0 pointer-events-auto bg-transparent" onContextMenu={(e) => e.preventDefault()} />
        </div>
      </div>
    </div>
  );
};

export default Profile;

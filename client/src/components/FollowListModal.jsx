import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { X, Search, Users, UserCheck, UserPlus, Loader2, Sparkles, Lock } from "lucide-react";
import dp from "../assets/dp3.png";
import VerifiedBadge from "./VerifiedBadge";
import FollowButton from "./FollowButton";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";

const FollowListModal = ({ isOpen, onClose, initialTab = "followers", userName, profileUser }) => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const currentUserId = userData?.user?._id || userData?._id;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [mutualsList, setMutualsList] = useState([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0, mutuals: 0 });

  // Update tab if initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery("");
    }
  }, [isOpen, initialTab]);

  // Fetch lists from backend
  const fetchData = useCallback(async () => {
    if (!userName || !isOpen) return;
    setLoading(true);
    try {
      const [followersRes, followingRes, mutualsRes] = await Promise.all([
        api.get(`/user/${userName}/followers`).catch(() => ({ data: { followers: [] } })),
        api.get(`/user/${userName}/following`).catch(() => ({ data: { following: [] } })),
        api.get(`/user/${userName}/mutuals`).catch(() => ({ data: { mutuals: [] } })),
      ]);

      const followers = followersRes.data?.followers || [];
      const following = followingRes.data?.following || [];
      const mutuals = mutualsRes.data?.mutuals || [];

      setFollowersList(followers);
      setFollowingList(following);
      setMutualsList(mutuals);

      setCounts({
        followers: followersRes.data?.count ?? followers.length,
        following: followingRes.data?.count ?? following.length,
        mutuals: mutualsRes.data?.count ?? mutuals.length,
      });
    } catch (err) {
      console.warn("FollowListModal: error fetching list", err);
      // Fallback to local profileUser props if provided
      if (profileUser) {
        const fList = profileUser.followers || [];
        const fgList = profileUser.following || [];
        setFollowersList(fList);
        setFollowingList(fgList);
        setCounts({ followers: fList.length, following: fgList.length, mutuals: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [userName, isOpen, profileUser]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Filter current list by search query
  const currentList = useMemo(() => {
    let source = [];
    if (activeTab === "followers") source = followersList;
    else if (activeTab === "following") source = followingList;
    else if (activeTab === "mutuals") source = mutualsList;

    if (!searchQuery.trim()) return source;

    const q = searchQuery.toLowerCase().trim();
    return source.filter(
      (u) =>
        u?.userName?.toLowerCase().includes(q) ||
        u?.name?.toLowerCase().includes(q) ||
        u?.profession?.toLowerCase().includes(q)
    );
  }, [activeTab, followersList, followingList, mutualsList, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full sm:max-w-[480px] h-[85vh] sm:h-[580px] max-h-[90vh] bg-surface border border-border sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-text animate-in slide-in-from-bottom-5 duration-250">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-text">
              @{userName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-border px-2">
          <button
            onClick={() => {
              setActiveTab("followers");
              setSearchQuery("");
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === "followers" ? "text-primary" : "text-text-secondary hover:text-text"
            }`}
          >
            <span>Followers</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-inset border border-border/60 text-text-muted font-semibold">
              {counts.followers}
            </span>
            {activeTab === "followers" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("following");
              setSearchQuery("");
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === "following" ? "text-primary" : "text-text-secondary hover:text-text"
            }`}
          >
            <span>Following</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-inset border border-border/60 text-text-muted font-semibold">
              {counts.following}
            </span>
            {activeTab === "following" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("mutuals");
              setSearchQuery("");
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === "mutuals" ? "text-primary" : "text-text-secondary hover:text-text"
            }`}
          >
            <span>Mutuals</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-inset border border-border/60 text-text-muted font-semibold">
              {counts.mutuals}
            </span>
            {activeTab === "mutuals" && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Live Search Input */}
        <div className="p-3 border-b border-border/60 bg-surface-inset/40">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${activeTab}...`}
              className="w-full h-10 pl-9 pr-8 bg-surface border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 rounded-full text-text-muted hover:text-text text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* User List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading {activeTab}...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center p-6">
              <div className="w-12 h-12 rounded-full bg-surface-inset border border-border flex items-center justify-center text-text-muted mb-1">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-text">
                {searchQuery ? "No users found" : `No ${activeTab} yet`}
              </h3>
              <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                {searchQuery
                  ? `We couldn't find anyone matching "${searchQuery}".`
                  : activeTab === "followers"
                  ? `@${userName} doesn't have any followers yet.`
                  : activeTab === "following"
                  ? `@${userName} is not following anyone yet.`
                  : "Mutual connections will appear when both of you follow each other."}
              </p>
            </div>
          ) : (
            currentList.map((userItem) => {
              if (!userItem) return null;
              const isSelf = userItem._id === currentUserId;
              const avatar = userItem.profileImage?.url || userItem.avatarUrl || dp;

              return (
                <div
                  key={userItem._id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-surface-hover transition gap-3 group"
                >
                  {/* Clickable Profile Info */}
                  <div
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${userItem.userName}`);
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={avatar}
                        alt={userItem.userName}
                        className="w-11 h-11 rounded-full object-cover border border-border group-hover:border-primary/50 transition"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-text truncate group-hover:text-primary transition">
                          {userItem.userName}
                        </span>
                        {userItem.isVerified && <VerifiedBadge size="xs" />}
                        {userItem.accountType === "private" && (
                          <Lock className="w-3 h-3 text-text-muted shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate">
                        {userItem.name || userItem.profession || "VYBE Member"}
                      </p>
                    </div>
                  </div>

                  {/* Follow Button */}
                  {!isSelf && (
                    <div className="shrink-0">
                      <FollowButton targetUserId={userItem._id} size="sm" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, X, Check, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/axios";
import dp from "../assets/dp3.png";

export const CloseFriendsModal = ({ isOpen, onClose }) => {
  const [closeFriends, setCloseFriends] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFriendsData = async () => {
      try {
        setLoading(true);
        const [cfRes, userRes] = await Promise.all([
          api.get("/story/close-friends"),
          api.get("/user/current-user"),
        ]);

        if (cfRes.data.success) {
          setCloseFriends(cfRes.data.closeFriends.map((f) => f._id || f));
        }

        if (userRes.data?.user?.following) {
          setFollowingUsers(userRes.data.user.following);
        }
      } catch (err) {
        toast.error("Failed to load close friends list.");
      } finally {
        setLoading(false);
      }
    };

    fetchFriendsData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleCloseFriend = async (targetUserId) => {
    try {
      const res = await api.post(`/story/close-friends/toggle/${targetUserId}`);
      if (res.data.success) {
        if (res.data.isCloseFriend) {
          setCloseFriends([...closeFriends, targetUserId]);
          toast.success(res.data.message || "Added to Close Friends ⭐️");
        } else {
          setCloseFriends(closeFriends.filter((id) => id !== targetUserId));
          toast.success(res.data.message || "Removed from Close Friends");
        }
      }
    } catch (err) {
      toast.error("Failed to update close friend status.");
    }
  };

  const filteredUsers = followingUsers.filter(
    (u) =>
      u.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-surface border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Star className="w-5 h-5 fill-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Close Friends ({closeFriends.length})</h3>
                <p className="text-xs text-text-secondary">Share stories exclusively with your closest circle.</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search followers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-inset border border-border rounded-xl text-sm outline-none text-text focus:border-emerald-500"
            />
          </div>

          {/* Friends List */}
          <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="text-center py-8 text-text-muted">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading friends...
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No users found.</p>
            ) : (
              filteredUsers.map((user) => {
                const uid = user._id || user;
                const isCloseFriend = closeFriends.includes(uid);

                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset/60 border border-border/80"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.profileImage?.url || dp}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                      <div>
                        <p className="text-sm font-semibold text-text">{user.userName}</p>
                        <p className="text-xs text-text-secondary">{user.name}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleCloseFriend(uid)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        isCloseFriend
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                          : "bg-surface-hover hover:bg-surface-active text-text border border-border-strong"
                      }`}
                    >
                      {isCloseFriend ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CloseFriendsModal;

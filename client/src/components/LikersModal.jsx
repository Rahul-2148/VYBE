import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";
import dp from "../assets/dp3.png";
import VerifiedBadge from "./VerifiedBadge";
import FollowButton from "./FollowButton";
import { triggerHaptic } from "../lib/interactiveEffects";

export const LikersModal = ({ isOpen, onClose, postId, reelId }) => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const [likers, setLikers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const followingList = useMemo(() => {
    return userData?.user?.following || userData?.following || [];
  }, [userData?.user?.following, userData?.following]);
  const followingIds = useMemo(() => {
    return new Set(followingList.map((f) => (f?._id || f)?.toString()));
  }, [followingList]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLikers = async () => {
      try {
        setLoading(true);
        const endpoint = postId
          ? `/post/likers/${postId}`
          : `/reel/likers/${reelId}`;
        const res = await api.get(endpoint);
        setLikers(res.data?.likers || []);
      } catch (err) {
        console.error("Failed to load likers:", err);
        setLikers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLikers();
  }, [isOpen, postId, reelId]);

  const filteredLikers = useMemo(() => {
    const list = likers.filter((user) => {
      const name = (user.name || "").toLowerCase();
      const userName = (user.userName || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || userName.includes(q);
    });

    return list.sort((a, b) => {
      const aFollow = followingIds.has((a?._id || a)?.toString()) ? 1 : 0;
      const bFollow = followingIds.has((b?._id || b)?.toString()) ? 1 : 0;
      if (aFollow !== bFollow) return bFollow - aFollow;
      if (a?.isVerified !== b?.isVerified) return (b?.isVerified ? 1 : 0) - (a?.isVerified ? 1 : 0);
      return (a?.userName || "").localeCompare(b?.userName || "");
    });
  }, [likers, searchQuery, followingIds]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="likers-modal-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) onClose();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[1100] flex items-end justify-center p-0 bg-black/50 backdrop-blur-[2px] select-none"
        >
          <motion.div
            key="likers-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            dragSnapToOrigin
            onDragEnd={(e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) {
                triggerHaptic("light");
                onClose();
              }
            }}
            className="relative w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] md:rounded-t-[32px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col h-[64vh] md:h-[60vh] max-h-[600px] text-text"
          >
            {/* Top Drag Notch */}
            <div className="w-10 h-1 rounded-full bg-border-strong mx-auto mt-2.5 mb-1 shrink-0 opacity-60 cursor-pointer hover:opacity-100 transition" onClick={onClose} />
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 md:py-4 border-b border-border bg-surface-hover/20">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                <h3 className="text-base font-bold tracking-wide text-text">Likes</h3>
                <span className="text-xs font-semibold text-text-secondary">({likers.length})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            {likers.length > 0 && (
              <div className="px-5 py-3 border-b border-border bg-surface-hover/10">
                <div className="flex items-center gap-2 bg-surface-hover border border-border rounded-2xl px-3 py-2 text-xs">
                  <Search className="w-3.5 h-3.5 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search who liked..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent outline-none text-text placeholder:text-text-secondary"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-text-secondary hover:text-text"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-text-secondary">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <span className="text-xs font-medium">Loading likers...</span>
                </div>
              ) : filteredLikers.length === 0 ? (
                <div className="text-center py-12 text-xs text-text-secondary">
                  {searchQuery ? "No matching users found" : "No likes yet. Be the first!"}
                </div>
              ) : (
                filteredLikers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2 rounded-2xl hover:bg-surface-hover/50 transition"
                  >
                    <div
                      onClick={() => {
                        triggerHaptic("selection");
                        navigate(`/profile/${user.userName}`);
                        onClose();
                      }}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <img
                        src={user.profileImage?.url || dp}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-text truncate">
                            {user.userName}
                          </span>
                          {user.isVerified && <VerifiedBadge size={14} />}
                        </div>
                        {user.name && (
                          <span className="text-[11px] text-text-secondary truncate">
                            {user.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-3 shrink-0">
                      <FollowButton
                        targetUserId={user._id}
                        tailwind="px-3 py-1 bg-white/[0.08] hover:bg-rose-600 border border-white/15 text-white text-[11px] font-bold rounded-xl transition"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LikersModal;

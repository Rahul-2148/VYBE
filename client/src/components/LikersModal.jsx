import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const followingList = useMemo(() => {
    return userData?.user?.following || userData?.following || [];
  }, [userData?.user?.following, userData?.following]);
  const followingIds = useMemo(() => {
    return new Set(followingList.map((f) => (f?._id || f)?.toString()));
  }, [followingList]);

  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    const endpoint = postId
      ? `/post/likers/${postId}`
      : `/reel/likers/${reelId}`;

    api
      .get(endpoint)
      .then((res) => {
        if (isSubscribed) {
          setLikers(res.data?.likers || []);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.error("Failed to load likers:", err);
          setLikers([]);
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
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

  if (typeof document === "undefined") return null;

  return createPortal(
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
          className="fixed inset-0 z-[1200] flex items-end justify-center p-0 bg-black/75 backdrop-blur-md select-none"
        >
          <motion.div
            key="likers-modal-container"
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
              if (info.offset.y > 60 || info.velocity.y > 300) {
                triggerHaptic("light");
                onClose();
              }
            }}
            className="w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] md:rounded-t-[32px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col h-[70vh] max-h-[580px] text-text"
          >
            {/* Top Drag Handle Notch */}
            <div
              className="w-10 h-1 bg-border-strong rounded-full opacity-60 mx-auto mt-2.5 mb-1 cursor-pointer hover:opacity-100 transition shrink-0"
              onClick={onClose}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-hover/20 shrink-0">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span className="font-bold text-sm text-text">Likes</span>
                <span className="text-xs text-text-secondary">({likers.length})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                title="Close"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-2.5 border-b border-border bg-surface/50">
              <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search likers..."
                  className="w-full bg-surface-hover border border-border rounded-full pl-9 pr-4 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-rose-500 transition"
                />
              </div>
            </div>

            {/* Likers List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-border-subtle hide-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <p className="text-xs">Loading likes...</p>
                </div>
              ) : filteredLikers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-center gap-2">
                  <Heart className="w-8 h-8 opacity-20 text-rose-500" />
                  <p className="text-xs">
                    {searchQuery.trim() ? "No users found" : "No likes yet"}
                  </p>
                </div>
              ) : (
                filteredLikers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-xl transition cursor-pointer"
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${user.userName}`);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={user.profileImage?.url || dp}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
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
    </AnimatePresence>,
    document.body
  );
};

export default LikersModal;

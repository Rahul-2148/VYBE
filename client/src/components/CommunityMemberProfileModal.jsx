// client/src/components/CommunityMemberProfileModal.jsx
import React from "react";
import { motion } from "framer-motion";
import {
  X,
  MessageCircle,
  Phone,
  Video,
  Crown,
  Shield,
  Calendar,
  UserMinus,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setFloatingDockOpen } from "../redux/features/messageSlice";

export const CommunityMemberProfileModal = ({
  isOpen,
  member,
  community,
  currentUserId,
  onClose,
  onKickMember,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  if (!isOpen || !member) return null;

  const user = member.user || member;
  const isMe = user._id?.toString() === currentUserId?.toString();
  const isOwner = (community?.owner?._id || community?.owner)?.toString() === user._id?.toString();
  const currentMember = community?.members?.find(
    (m) => (m.user?._id || m.user)?.toString() === currentUserId?.toString()
  );
  const isCurrentOwner = (community?.owner?._id || community?.owner)?.toString() === currentUserId?.toString();
  const isCurrentAdmin = isCurrentOwner || currentMember?.roles?.includes("admin");

  const roles = member.roles || ["member"];
  const isAdmin = roles.includes("admin");
  const isMod = roles.includes("moderator");

  const handleStartDM = () => {
    onClose?.();
    dispatch(setFloatingDockOpen(true));
    navigate(`/messages/${user._id}`);
  };

  const handleStartCall = (type) => {
    window.dispatchEvent(
      new CustomEvent("vybe:initiate-call", {
        detail: { type, user },
      })
    );
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="bg-surface border border-border w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative"
      >
        {/* Banner header */}
        <div className="h-20 bg-gradient-to-r from-purple-700 via-indigo-600 to-rose-600 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition cursor-pointer backdrop-blur-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Details */}
        <div className="p-5 relative -mt-10">
          {/* Avatar */}
          <div className="flex items-end justify-between mb-3">
            <div className="relative">
              <div className="w-18 h-18 rounded-2xl bg-surface border-4 border-surface overflow-hidden shadow-xl flex items-center justify-center font-black text-xl text-text">
                {user.profileImage?.url ? (
                  <img src={user.profileImage.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.userName?.[0]?.toUpperCase() || "U"
                )}
              </div>
              {user.isOnline && (
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface rounded-full" />
              )}
            </div>

            {/* Quick Profile View Link */}
            <button
              onClick={() => {
                onClose?.();
                navigate(`/profile/${user.userName}`);
              }}
              className="px-3 py-1.5 bg-surface-inset hover:bg-surface border border-border rounded-xl text-xs font-semibold text-text flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Full Profile</span>
              <ExternalLink className="w-3 h-3 text-text-muted" />
            </button>
          </div>

          {/* Name & Username */}
          <div className="mb-3">
            <h4 className="text-base font-bold text-text flex items-center gap-1.5">
              {user.name || `@${user.userName}`}
              {isOwner && <Crown className="w-4 h-4 text-amber-400" title="Server Owner" />}
              {isAdmin && !isOwner && <Shield className="w-4 h-4 text-purple-400" title="Admin" />}
            </h4>
            <span className="text-xs text-text-secondary">@{user.userName}</span>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-xs text-text-secondary bg-surface-inset/60 p-2.5 rounded-xl border border-border/60 mb-3">
              {user.bio}
            </p>
          )}

          {/* Roles Badges */}
          <div className="mb-4">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1.5">
              Roles
            </span>
            <div className="flex flex-wrap gap-1.5">
              {isOwner && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Owner
                </span>
              )}
              {isAdmin && !isOwner && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
              {isMod && !isAdmin && !isOwner && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Moderator
                </span>
              )}
              {!isOwner && !isAdmin && !isMod && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-inset text-text-secondary border border-border text-[11px] font-semibold">
                  Member
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!isMe && (
            <div className="space-y-2 pt-2 border-t border-border/80">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleStartDM}
                  className="py-2 px-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>

                <button
                  onClick={() => handleStartCall("audio")}
                  className="py-2 px-2 bg-surface-inset hover:bg-surface border border-border text-text rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Call</span>
                </button>

                <button
                  onClick={() => handleStartCall("video")}
                  className="py-2 px-2 bg-surface-inset hover:bg-surface border border-border text-text rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-purple-400" />
                  <span>Video</span>
                </button>
              </div>

              {/* Admin Moderation */}
              {isCurrentAdmin && !isOwner && (
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => {
                      onKickMember?.(user._id);
                      onClose?.();
                    }}
                    className="text-xs font-bold text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5" /> Kick Member
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CommunityMemberProfileModal;

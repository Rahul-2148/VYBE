import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, X, MessageSquareQuote, Video, Send, Check, Loader2, Sparkles } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import dp from "../assets/dp3.png";

export const ReelReshareModal = ({
  isOpen,
  onClose,
  reel,
  onOpenRemix,
  onOpenShare,
  onSuccess,
}) => {
  const [thoughts, setThoughts] = useState("");
  const [showThoughtsInput, setShowThoughtsInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isReshared, setIsReshared] = useState(false);

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

  const handleInstantReshare = async () => {
    try {
      setLoading(true);
      triggerHaptic("medium");
      microAudio.playPop();

      const res = await api.post(`/reel/reshare/${reel?._id}`, { thoughts: thoughts.trim() });
      if (res.data.success) {
        setIsReshared(res.data.isReshared);
        if (res.data.isReshared) {
          snackbar.success("Reel reshared to your profile! ✨");
        } else {
          snackbar.success("Reshare removed from your profile");
        }
        if (onSuccess) onSuccess(res.data);
        setTimeout(() => {
          onClose();
        }, 300);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to reshare reel");
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && reel && (
        <motion.div
          key="reel-reshare-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[5000] flex items-end justify-center p-0 bg-black/60 backdrop-blur-[3px] select-none"
        >
          <motion.div
            key="reel-reshare-sheet"
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
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] md:rounded-t-[32px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.85)] p-5 text-text h-auto max-h-[85vh] md:max-h-[640px] overflow-hidden flex flex-col space-y-4"
          >
          {/* Top Drag Notch */}
          <div
            className="w-10 h-1 rounded-full bg-border-strong mx-auto mb-1 shrink-0 opacity-60 cursor-pointer hover:opacity-100 transition"
            onClick={onClose}
          />
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                <Repeat className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-text">Reshare & Repost</h3>
                <p className="text-[11px] text-text-secondary">Share @{reel?.author?.userName}'s reel with your friends</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reel Mini Card Preview */}
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-surface-inset border border-border">
            <div className="w-14 h-20 rounded-xl overflow-hidden bg-black shrink-0 relative border border-border/80">
              <video
                src={reel?.media?.url}
                muted
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <img
                  src={reel?.author?.profileImage?.url || dp}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className="text-xs font-bold text-text truncate">@{reel?.author?.userName}</span>
              </div>
              <p className="text-[11px] text-text-secondary line-clamp-2 mt-1">
                {reel?.caption || "Original video reel"}
              </p>
            </div>
          </div>

          {/* Thoughts Input Box (When expanded) */}
          {showThoughtsInput ? (
            <div className="space-y-2 pt-1 animate-in fade-in zoom-in-95 duration-150">
              <textarea
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                placeholder="Add your thoughts about this reel..."
                maxLength={280}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface border border-border text-xs text-text placeholder-text-muted outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">{280 - thoughts.length} characters left</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowThoughtsInput(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-text-secondary hover:text-text hover:bg-surface-hover font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleInstantReshare}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Post Reshare</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Action Options */
            <div className="space-y-2 pt-1">
              {/* 1. Instant Repost to Profile */}
              <button
                type="button"
                disabled={loading}
                onClick={handleInstantReshare}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border hover:border-border-strong transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Repeat className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text group-hover:text-rose-400 transition-colors">
                      {isReshared ? "Remove from Profile" : "Repost to Your Profile"}
                    </h4>
                    <p className="text-[10px] text-text-secondary">
                      Instantly shares this video to your profile feed for your followers
                    </p>
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                ) : isReshared ? (
                  <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
                    Repost
                  </span>
                )}
              </button>

              {/* 2. Reshare with Thoughts */}
              <button
                type="button"
                onClick={() => setShowThoughtsInput(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border hover:border-border-strong transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageSquareQuote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text group-hover:text-purple-400 transition-colors">
                      Reshare with Thoughts
                    </h4>
                    <p className="text-[10px] text-text-secondary">Add your own caption or commentary before reposting</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-xl border border-purple-500/20">
                  Quote
                </span>
              </button>

              {/* 3. Remix this Reel */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenRemix) onOpenRemix();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border hover:border-border-strong transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text group-hover:text-cyan-400 transition-colors">
                      Remix this Reel
                    </h4>
                    <p className="text-[10px] text-text-secondary">Create a side-by-side reaction or duet video</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-500/20">
                  Remix
                </span>
              </button>

              {/* 4. Send in Direct Message */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenShare) onOpenShare();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border hover:border-border-strong transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text group-hover:text-amber-400 transition-colors">
                      Send to Friends
                    </h4>
                    <p className="text-[10px] text-text-secondary">Share via chat or copy shareable link</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                  Share
                </span>
              </button>
            </div>
          )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ReelReshareModal;

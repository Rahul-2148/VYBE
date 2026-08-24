import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Trash2, Edit3, Film, Grid, Sparkles, Loader2, ArrowRight, FolderOpen, Clock } from "lucide-react";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";
import { deleteDraftMediaLocal } from "../lib/draftStorage";

const DraftsModal = ({ isOpen, onClose, onResumeDraft }) => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      api
        .get("/post/drafts")
        .then((res) => {
          if (isMounted && res.data?.success) {
            setDrafts(res.data.drafts || []);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn("DraftsModal: failed to load drafts", err);
            snackbar.error("Failed to load drafts");
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Delete draft
  const handleDeleteDraft = async (e, draftId) => {
    e.stopPropagation();
    setDeletingId(draftId);
    try {
      await api.delete(`/post/drafts/${draftId}`);
      deleteDraftMediaLocal(draftId).catch(() => {});
      setDrafts((prev) => prev.filter((d) => d._id !== draftId));
      snackbar.success("Draft discarded 🗑️");
    } catch (err) {
      console.warn("DraftsModal: failed to delete draft", err);
      snackbar.error("Failed to delete draft");
    } finally {
      setDeletingId(null);
    }
  };

  // Resume draft
  const handleResume = (draft) => {
    onClose();
    if (onResumeDraft) {
      onResumeDraft(draft);
    } else {
      // Navigate to /upload passing draft in location.state
      navigate(`/upload?type=${draft.draftType || "post"}`, {
        state: { resumedDraft: draft, type: draft.draftType || "post" },
      });
    }
  };

  // Filter drafts by type
  const filteredDrafts = drafts.filter((d) => {
    if (activeFilter === "all") return true;
    const type = d.draftType || "post";
    if (activeFilter === "reel") return type === "reel";
    return type === activeFilter;
  });

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full sm:max-w-[560px] h-[85vh] sm:h-[600px] max-h-[90vh] bg-surface border border-border sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-text animate-in slide-in-from-bottom-5 duration-250">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-text">Saved Drafts</h2>
              <p className="text-[11px] text-text-secondary">
                {drafts.length} draft{drafts.length !== 1 ? "s" : ""} saved in your workspace
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border/60 bg-surface-inset/30 overflow-x-auto hide-scrollbar">
          {[
            { id: "all", label: "All Drafts" },
            { id: "post", label: "Posts" },
            { id: "reel", label: "Reels" },
            { id: "story", label: "Stories" },
          ].map((tab) => {
            const count =
              tab.id === "all"
                ? drafts.length
                : tab.id === "reel"
                ? drafts.filter((d) => (d.draftType || "post") === "reel").length
                : drafts.filter((d) => (d.draftType || "post") === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === tab.id
                    ? "bg-primary text-text shadow-sm"
                    : "bg-surface border border-border text-text-secondary hover:text-text"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-inset text-text-muted">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Drafts List / Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading your saved drafts...</p>
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 gap-3 text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-surface-inset border border-border flex items-center justify-center text-text-muted">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text">No drafts found</h3>
                <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                  {activeFilter === "all"
                    ? "When you create a post, reel, or story and tap 'Save Draft', it will be saved here so you can finish anytime."
                    : `You have no saved ${activeFilter === "reel" ? "reels" : activeFilter + "s"} drafts.`}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  const targetType =
                    activeFilter === "reel"
                      ? "reel"
                      : activeFilter === "story"
                      ? "story"
                      : "post";
                  navigate(`/upload?type=${targetType}`, { state: { type: targetType } });
                }}
                className="mt-2 px-4 py-2 bg-gradient-to-tr from-pink-500 to-rose-600 text-white rounded-full text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer"
              >
                {activeFilter === "reel"
                  ? "Create New Reel"
                  : activeFilter === "story"
                  ? "Create New Story"
                  : activeFilter === "post"
                  ? "Create New Post"
                  : "Create Something New"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredDrafts.map((draft) => {
                const previewImg =
                  draft.mediaPreview ||
                  draft.mediaItems?.[0]?.preview ||
                  draft.mediaItems?.[0]?.url;
                const draftType = draft.draftType || "post";
                const isDeleting = deletingId === draft._id;

                return (
                  <div
                    key={draft._id}
                    onClick={() => handleResume(draft)}
                    className="group relative bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition duration-200 flex flex-col cursor-pointer shadow-xs hover:shadow-md"
                  >
                    {/* Media Thumbnail Container */}
                    <div className="relative aspect-[4/3] bg-zinc-950 w-full overflow-hidden">
                      {previewImg ? (
                        <img
                          src={previewImg}
                          alt="Draft preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-inset text-text-muted">
                          {draftType === "reel" ? (
                            <Film className="w-8 h-8 opacity-40" />
                          ) : (
                            <Grid className="w-8 h-8 opacity-40" />
                          )}
                        </div>
                      )}

                      {/* Type Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                            draftType === "reel"
                              ? "bg-purple-600/90 text-white"
                              : draftType === "story"
                              ? "bg-amber-600/90 text-white"
                              : "bg-rose-600/90 text-white"
                          }`}
                        >
                          {draftType === "reel" ? "Reel" : draftType}
                        </span>
                      </div>

                      {/* Discard / Delete Button */}
                      <button
                        onClick={(e) => handleDeleteDraft(e, draft._id)}
                        disabled={isDeleting}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white transition backdrop-blur-md cursor-pointer opacity-90 hover:opacity-100"
                        title="Delete draft"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Time pill */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-medium text-white/90">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{getRelativeTime(draft.createdAt)}</span>
                      </div>
                    </div>

                    {/* Draft Info Body */}
                    <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                      <div>
                        <p className="text-xs font-semibold text-text line-clamp-2 leading-snug">
                          {draft.caption ? draft.caption : <span className="italic text-text-muted">No caption</span>}
                        </p>
                        {draft.location && (
                          <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                            📍 {draft.location}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] font-bold text-primary">
                        <span>Resume & Edit</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftsModal;

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Archive, Plus, Trash2, ArrowLeft, Eye, Clock, ShieldCheck,
  Image as ImageIcon, Film, Type, ArrowUpDown, Sparkles
} from "lucide-react";
import { snackbar } from "../lib/snackbar";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import moment from "moment";
import api from "../lib/axios";
import StoryHighlighterModal from "../components/StoryHighlighterModal";

export const StoryArchive = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // all, image, video, text
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest

  const fetchArchive = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/story/archive");
      if (res.data.success) {
        setStories(res.data.stories || []);
      }
    } catch (err) {
      console.warn("Failed to load Story Archive:", err);
      snackbar.error("Failed to load Story Archive.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchArchive();
    })();
    return () => {
      mounted = false;
    };
  }, [fetchArchive]);

  const [storyToDelete, setStoryToDelete] = useState(null);

  const handleDeleteStory = (storyId) => {
    setStoryToDelete(storyId);
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;
    try {
      const res = await api.delete(`/story/${storyToDelete}`);
      if (res.data.success) {
        snackbar.success("Story deleted from archive 🗑️");
        setStories((prev) => prev.filter((s) => s._id !== storyToDelete));
      }
    } catch (err) {
      console.warn("Failed to delete story:", err);
      snackbar.error("Failed to delete story.");
    } finally {
      setStoryToDelete(null);
    }
  };

  // Filter Counts
  const counts = useMemo(() => {
    const image = stories.filter((s) => s.mediaType === "image").length;
    const video = stories.filter((s) => s.mediaType === "video").length;
    const text = stories.filter((s) => s.mediaType === "text").length;
    return { all: stories.length, image, video, text };
  }, [stories]);

  // Filtered & Sorted Stories
  const displayedStories = useMemo(() => {
    let result = [...stories];

    if (activeFilter === "image") {
      result = result.filter((s) => s.mediaType === "image");
    } else if (activeFilter === "video") {
      result = result.filter((s) => s.mediaType === "video");
    } else if (activeFilter === "text") {
      result = result.filter((s) => s.mediaType === "text");
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [stories, activeFilter, sortOrder]);

  // Calculate days remaining before 30-day auto-purge
  const getDaysLeft = (story) => {
    const refDate = story.archivedAt ? new Date(story.archivedAt) : new Date(story.createdAt);
    const msPassed = Date.now() - refDate.getTime();
    const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
    const left = 30 - daysPassed;
    return Math.max(left, 1);
  };

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Story Archive</h1>
              <p className="text-xs text-text-secondary">Your past stories are privately saved here after 24 hours.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsHighlightModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-semibold rounded-xl transition shadow-lg hover:opacity-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Highlight</span>
        </button>
      </div>

      {/* Archive Selector Tabs & 30-Day Policy Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 bg-surface p-1 rounded-xl border border-border w-fit">
          <button
            onClick={() => navigate("/story/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md cursor-pointer"
          >
            Stories Archive
          </button>
          <button
            onClick={() => navigate("/post/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-text cursor-pointer"
          >
            Posts & Reels Archive
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-text-muted bg-surface/80 px-3 py-1.5 rounded-xl border border-border w-fit">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Saved for 30 days. Add to <strong>Highlights</strong> to preserve forever!</span>
        </div>
      </div>

      {/* Filter Pills & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
              activeFilter === "all"
                ? "bg-text text-bg border-text font-bold"
                : "bg-surface text-text-secondary border-border hover:text-text hover:bg-surface-hover"
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-70">({counts.all})</span>
          </button>
          <button
            onClick={() => setActiveFilter("image")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
              activeFilter === "image"
                ? "bg-text text-bg border-text font-bold"
                : "bg-surface text-text-secondary border-border hover:text-text hover:bg-surface-hover"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Photos</span>
            <span className="text-[10px] opacity-70">({counts.image})</span>
          </button>
          <button
            onClick={() => setActiveFilter("video")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
              activeFilter === "video"
                ? "bg-text text-bg border-text font-bold"
                : "bg-surface text-text-secondary border-border hover:text-text hover:bg-surface-hover"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Videos</span>
            <span className="text-[10px] opacity-70">({counts.video})</span>
          </button>
          <button
            onClick={() => setActiveFilter("text")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
              activeFilter === "text"
                ? "bg-text text-bg border-text font-bold"
                : "bg-surface text-text-secondary border-border hover:text-text hover:bg-surface-hover"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
            <span className="text-[10px] opacity-70">({counts.text})</span>
          </button>
        </div>

        {/* Sort Order Button */}
        <button
          onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-secondary hover:text-text rounded-xl border border-border text-xs font-medium transition cursor-pointer"
          title="Toggle sort order"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-rose-400" />
          <span>{sortOrder === "newest" ? "Newest First" : "Oldest First"}</span>
        </button>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="text-center py-16 text-text-muted">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading private archive...
        </div>
      ) : displayedStories.length === 0 ? (
        <div className="text-center py-16 text-text-muted space-y-2">
          <Archive className="w-12 h-12 text-text-muted mx-auto" />
          <p className="text-sm font-semibold">
            {activeFilter === "all" ? "No Archived Stories" : `No Archived ${activeFilter.toUpperCase()} Stories`}
          </p>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            Stories you post will automatically be saved here after 24 hours.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {displayedStories.map((story) => {
            const daysLeft = getDaysLeft(story);
            return (
              <motion.div
                key={story._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-surface border border-border/70 group shadow-xs cursor-pointer"
              >
                {story.mediaType === "image" ? (
                  <img src={story.media?.url} alt="" className="w-full h-full object-cover" />
                ) : story.mediaType === "video" ? (
                  <video src={story.media?.url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-rose-900 p-3 flex items-center justify-center text-center">
                    <p className="text-xs font-bold text-white line-clamp-4">{story.caption || "Text Story"}</p>
                  </div>
                )}

                {/* Expiration Countdown Tag */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-semibold text-amber-300 shadow">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{daysLeft}d left</span>
                </div>

                {/* Gradient Hover Overlay */}
                <div
                  onClick={() =>
                    navigate("/story", {
                      state: {
                        stories: [story],
                        initialUserIndex: 0,
                      },
                    })
                  }
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex flex-col justify-between"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStory(story._id);
                    }}
                    className="self-end p-1.5 rounded-lg bg-rose-600/80 text-white hover:bg-rose-600 transition cursor-pointer"
                    title="Delete from archive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between text-xs text-white">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-zinc-300" />
                      <span>{story.viewers?.length || 0}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {moment(story.createdAt).format("MMM D")}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {storyToDelete && (
        <div
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setStoryToDelete(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete from Archive?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This will permanently delete this story from your archive. This action cannot be undone.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={confirmDeleteStory}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                Delete Story
              </button>
              <button
                onClick={() => setStoryToDelete(null)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryArchive;

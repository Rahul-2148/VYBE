import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, Image as ImageIcon } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

export const StoryHighlighterModal = ({ isOpen, onClose, onSuccess }) => {
  const [archivedStories, setArchivedStories] = useState([]);
  const [selectedStoryIds, setSelectedStoryIds] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchArchive = async () => {
      try {
        setLoading(true);
        const res = await api.get("/story/archive");
        if (res.data.success) {
          setArchivedStories(res.data.stories);
        }
      } catch (err) {
        snackbar.error("Failed to load archived stories.");
      } finally {
        setLoading(false);
      }
    };

    fetchArchive();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleStorySelect = (storyId) => {
    if (selectedStoryIds.includes(storyId)) {
      setSelectedStoryIds(selectedStoryIds.filter((id) => id !== storyId));
    } else {
      setSelectedStoryIds([...selectedStoryIds, storyId]);
    }
  };

  const handleCreateHighlight = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      snackbar.error("Please enter a Highlight title.");
      return;
    }

    if (selectedStoryIds.length === 0) {
      snackbar.error("Please select at least one story for your Highlight.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/story/highlight/create", {
        title: title.trim(),
        storyIds: selectedStoryIds,
      });

      if (res.data.success) {
        snackbar.success("New Highlight added to your Profile! ✨");
        if (onSuccess) onSuccess(res.data.highlight);
        onClose();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to create Highlight.");
    } finally {
      setSubmitting(false);
    }
  };

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
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">New Story Highlight</h3>
                <p className="text-xs text-text-secondary">Curate your favorite stories on your profile.</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateHighlight} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Highlight Title
              </label>
              <input
                type="text"
                placeholder="e.g. Vacation, Fitness, Highlights..."
                maxLength={30}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-surface-inset border border-border rounded-xl outline-none text-text focus:border-rose-500 text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Select Stories ({selectedStoryIds.length} selected)
              </label>

              {loading ? (
                <div className="text-center py-8 text-text-muted">
                  <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading story archive...
                </div>
              ) : archivedStories.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-8">No stories in archive yet.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                  {archivedStories.map((story) => {
                    const isSelected = selectedStoryIds.includes(story._id);

                    return (
                      <div
                        key={story._id}
                        onClick={() => toggleStorySelect(story._id)}
                        className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 transition ${
                          isSelected ? "border-rose-500 scale-95 shadow-lg" : "border-transparent opacity-80 hover:opacity-100"
                        }`}
                      >
                        {story.mediaType === "image" ? (
                          <img src={story.media?.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={story.media?.url} className="w-full h-full object-cover" />
                        )}

                        {isSelected && (
                          <div className="absolute inset-0 bg-rose-500/30 flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow">
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || selectedStoryIds.length === 0}
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-semibold rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Save Highlight to Profile"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StoryHighlighterModal;

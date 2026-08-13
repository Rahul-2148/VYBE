import React, { useEffect, useState, useCallback } from "react";
import { Archive, Plus, Trash2, ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";
import StoryHighlighterModal from "../components/StoryHighlighterModal";

export const StoryArchive = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);

  const fetchArchive = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/story/archive");
      if (res.data.success) {
        setStories(res.data.stories);
      }
    } catch (err) {
      console.warn("Failed to load Story Archive:", err);
      toast.error("Failed to load Story Archive.");
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

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm("Permanently delete this story from your archive?")) return;

    try {
      const res = await api.delete(`/story/${storyId}`);
      if (res.data.success) {
        toast.success("Story deleted.");
        setStories(stories.filter((s) => s._id !== storyId));
      }
    } catch (err) {
      console.warn("Failed to delete story:", err);
      toast.error("Failed to delete story.");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition"
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
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-text text-xs font-semibold rounded-xl transition shadow-lg hover:opacity-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Highlight</span>
        </button>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="text-center py-16 text-text-muted">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading private archive...
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16 text-text-muted space-y-2">
          <Archive className="w-12 h-12 text-text-muted mx-auto" />
          <p className="text-sm font-semibold">No Archived Stories</p>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            Stories you post will automatically be saved here after 24 hours.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {stories.map((story) => (
            <motion.div
              key={story._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-surface border border-border group"
            >
              {story.mediaType === "image" ? (
                <img src={story.media?.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={story.media?.url} className="w-full h-full object-cover" />
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex flex-col justify-between">
                <button
                  onClick={() => handleDeleteStory(story._id)}
                  className="self-end p-1.5 rounded-lg bg-rose-600/80 text-text hover:bg-rose-600 transition"
                  title="Delete from archive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 text-xs text-text">
                  <Eye className="w-3.5 h-3.5 text-text-secondary" />
                  <span>{story.viewers?.length || 0} views</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Highlighter Modal */}
      {isHighlightModalOpen && (
        <StoryHighlighterModal
          isOpen={isHighlightModalOpen}
          onClose={() => setIsHighlightModalOpen(false)}
          onSuccess={() => fetchArchive()}
        />
      )}
    </div>
  );
};

export default StoryArchive;

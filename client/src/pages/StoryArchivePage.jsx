import React, { useEffect, useState, useCallback } from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { Calendar, RefreshCw, Sparkles, Trash2, Eye } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import moment from "moment";

export const StoryArchivePage = () => {
  const navigate = useNavigate();
  const [archivedStories, setArchivedStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArchivedStories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/story/archive");
      if (res.data?.success) {
        setArchivedStories(res.data.stories || []);
      }
    } catch {
      snackbar.error("Failed to load archived stories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchArchivedStories();
    })();
    return () => {
      mounted = false;
    };
  }, [fetchArchivedStories]);

  const handleRestore = async (storyId) => {
    try {
      const res = await api.post(`/story/restore/${storyId}`);
      if (res.data?.success) {
        snackbar.success("Story restored to feed!");
        fetchArchivedStories();
      }
    } catch {
      snackbar.error("Failed to restore story.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-surface-hover text-text hover:text-text transition cursor-pointer"
          >
            <MdOutlineKeyboardBackspace className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Story Archive</h1>
            <p className="text-xs text-text-secondary">Only you can see your archived stories</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : archivedStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Calendar className="w-12 h-12 text-text-muted" />
          <p className="text-sm font-semibold text-text-secondary">No archived stories yet</p>
          <p className="text-xs text-text-muted max-w-xs">
            Stories automatically archive after 24 hours so you can revisit them anytime.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {archivedStories.map((story) => (
            <div
              key={story._id}
              className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-surface border border-border group shadow-lg"
            >
              {story.mediaType === "image" ? (
                <img src={story.media?.url} className="w-full h-full object-cover" alt="" />
              ) : (
                <video src={story.media?.url} className="w-full h-full object-cover" />
              )}

              {/* Overlay Metadata */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 p-3 flex flex-col justify-between opacity-90 group-hover:opacity-100 transition">
                <span className="text-[10px] font-bold text-text bg-bg/50 backdrop-blur px-2 py-1 rounded-md self-start">
                  {moment(story.createdAt).format("MMM D, YYYY")}
                </span>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-text">
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    <span>{story.viewers?.length || 0}</span>
                  </div>

                  <button
                    onClick={() => handleRestore(story._id)}
                    className="p-1.5 rounded-full bg-rose-600 text-text hover:bg-rose-500 transition shadow cursor-pointer"
                    title="Restore to Feed"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoryArchivePage;

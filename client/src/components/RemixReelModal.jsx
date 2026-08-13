import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, X, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/axios";

export const RemixReelModal = ({ isOpen, onClose, originalLoop, onSuccess }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !originalLoop) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast.error("Please select a valid video file.");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadRemix = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      toast.error("Please record or select a video for your Remix.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("media", videoFile);
    formData.append("caption", caption);

    try {
      const res = await api.post(`/loop/remix/${originalLoop._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("Remix Reel Published! 🎬");
        if (onSuccess) onSuccess(res.data.loop);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish Remix.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-surface border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-text shadow">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Remix this Reel</h3>
                <p className="text-xs text-text-secondary">Create a side-by-side response with @{originalLoop.author?.userName}</p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUploadRemix} className="space-y-6">
            {/* Side by Side Preview Layout */}
            <div className="grid grid-cols-2 gap-3 h-64 bg-surface-inset p-3 rounded-2xl border border-border">
              {/* Original Reel */}
              <div className="relative h-full rounded-xl overflow-hidden bg-bg border border-border">
                <video src={originalLoop.media?.url} autoPlay loop muted className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-[10px] bg-surface-overlay px-2 py-0.5 rounded text-text">Original</span>
              </div>

              {/* User Remix Video Preview or Upload trigger */}
              <div className="relative h-full rounded-xl overflow-hidden bg-surface border border-dashed border-border-strong flex items-center justify-center">
                {videoPreview ? (
                  <video src={videoPreview} autoPlay loop muted className="w-full h-full object-cover" />
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 cursor-pointer text-center space-y-2">
                    <Upload className="w-8 h-8 text-rose-500" />
                    <span className="text-xs font-semibold text-text">Select Video File</span>
                    <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Caption</label>
              <input
                type="text"
                placeholder="Write a caption for your Remix..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-3 bg-surface-inset border border-border rounded-xl outline-none text-text text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !videoFile}
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-text font-semibold rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Publish Remix Reel 🎬"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RemixReelModal;

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, X, Upload, Check } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

export const RemixReelModal = ({ isOpen, onClose, originalReel, onSuccess }) => {
  const currentOriginal = originalReel;
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        snackbar.error("Please select a valid video file.");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadRemix = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      snackbar.error("Please record or select a video for your Remix.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("media", videoFile);
    formData.append("caption", caption);

    try {
      const res = await api.post(`/reel/remix/${currentOriginal._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        snackbar.success("Remix Reel Published! 🎬");
        if (onSuccess) onSuccess(res.data.reel);
        onClose();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to publish Remix.");
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && currentOriginal && (
        <motion.div
          key="remix-reel-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[5000] flex items-end justify-center p-0 bg-black/60 backdrop-blur-[3px] select-none"
        >
          <motion.div
            key="remix-reel-sheet"
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
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] md:rounded-t-[32px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.85)] p-5 text-text max-h-[85vh] overflow-y-auto flex flex-col space-y-5"
          >
            {/* Top Drag Notch */}
            <div
              className="w-10 h-1 rounded-full bg-border-strong mx-auto mb-1 shrink-0 opacity-60 cursor-pointer hover:opacity-100 transition"
              onClick={onClose}
            />
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-text shadow">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Remix this Reel</h3>
                <p className="text-xs text-text-secondary">Create a side-by-side response with @{originalReel.author?.userName}</p>
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
                <video src={originalReel.media?.url} autoPlay muted onEnded={(e) => { e.target.currentTime = 0; e.target.play().catch(() => null); }} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-[10px] bg-surface-overlay px-2 py-0.5 rounded text-text">Original</span>
              </div>

              {/* User Remix Video Preview or Upload trigger */}
              <div className="relative h-full rounded-xl overflow-hidden bg-surface border border-dashed border-border-strong flex items-center justify-center">
                {videoPreview ? (
                  <video src={videoPreview} autoPlay muted onEnded={(e) => { e.target.currentTime = 0; e.target.play().catch(() => null); }} className="w-full h-full object-cover" />
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default RemixReelModal;

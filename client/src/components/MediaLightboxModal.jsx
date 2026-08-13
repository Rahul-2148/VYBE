import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, ZoomIn } from "lucide-react";
import { toast } from "sonner";

export const MediaLightboxModal = ({ isOpen, onClose, mediaUrl, mediaType = "image" }) => {
  if (!isOpen || !mediaUrl) return null;

  const handleDownload = async () => {
    try {
      const res = await fetch(mediaUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vybe-media-${Date.now()}.${mediaType === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Media downloaded!");
    } catch {
      window.open(mediaUrl, "_blank");
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[700] bg-bg/90 backdrop-blur-xl flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Floating Controls Bar */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2.5 rounded-full bg-surface/80 hover:bg-surface-hover text-text border border-border-strong/60 backdrop-blur transition cursor-pointer"
              title="Download Media"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-surface/80 hover:bg-surface-hover text-text border border-border-strong/60 backdrop-blur transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Media Content Display */}
          {mediaType === "video" ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl border border-border"
            />
          ) : (
            <img
              src={mediaUrl}
              alt=""
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-border"
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MediaLightboxModal;

// client/src/components/CommunityMediaLightbox.jsx
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ExternalLink, Maximize2 } from "lucide-react";

export const CommunityMediaLightbox = ({ media, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!media?.url) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none cursor-zoom-out"
    >
      {/* Top action bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 flex items-center gap-2 z-10 cursor-default"
      >
        <a
          href={media.url}
          download={media.name || "vybe_media"}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition backdrop-blur-xs cursor-pointer"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </a>

        <button
          onClick={onClose}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition backdrop-blur-xs cursor-pointer"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Media Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl relative cursor-default"
      >
        {media.type === "video" ? (
          <video src={media.url} controls autoPlay className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
        ) : (
          <img src={media.url} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
        )}

        {media.name && (
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-semibold truncate">
            {media.name}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CommunityMediaLightbox;

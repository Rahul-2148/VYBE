import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Film, Download, Trash2, Share2, Play, Clock,
  Eye, Heart, Sparkles, AlertCircle, X, Loader2
} from "lucide-react";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";
import ShareLiveAsReelModal from "./ShareLiveAsReelModal";
import ConfirmDialogModal from "./ConfirmDialogModal";

/**
 * LiveArchiveTab
 * Displays creator's past live stream broadcasts stored in the 30-day Live Archive.
 * Allows replaying, downloading, sharing as Reel, or deleting recordings.
 */
export const LiveArchiveTab = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replayStream, setReplayStream] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeShareArchive, setActiveShareArchive] = useState(null);

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const res = await api.get("/live/archive");
      if (res.data?.success) {
        setArchives(res.data.archives || []);
      }
    } catch (err) {
      console.warn("fetchArchives error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    api
      .get("/live/archive")
      .then((res) => {
        if (isMounted && res.data?.success) {
          setArchives(res.data.archives || []);
        }
      })
      .catch((err) => {
        console.warn("fetchArchives error", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, streamId: null });

  const executeDeleteArchive = async (streamId) => {
    try {
      const res = await api.delete(`/live/archive/${streamId}`);
      if (res.data.success) {
        setArchives((prev) => prev.filter((a) => a._id !== streamId));
        snackbar.success("Live archive recording deleted");
      }
    } catch (err) {
      console.error("Delete archive error", err);
      snackbar.error("Failed to delete archive");
    } finally {
      setDeleteModal({ isOpen: false, streamId: null });
    }
  };

  const handleDeleteArchive = (streamId) => {
    setDeleteModal({ isOpen: true, streamId });
  };

  const handleDownload = (archive) => {
    if (!archive.recording?.url) {
      snackbar.error("No recording file available for download");
      return;
    }
    const a = document.createElement("a");
    a.href = archive.recording.url;
    a.download = `vybe-live-${archive._id}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    snackbar.success("Downloading live recording... 📥");
  };

  const formatDuration = (secs) => {
    if (!secs) return "0s";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-pink-500" />
        <p className="text-xs">Loading Live Archive...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 30-Day Info Banner */}
      <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex items-start gap-3 text-xs text-zinc-400">
        <Clock className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-zinc-200">Live Archive:</strong> Only you can see your live video archive. Videos are available for 30 days before being permanently deleted. Share any broadcast to your Reels to keep it permanently.
        </p>
      </div>

      {/* Archives Grid */}
      {archives.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mx-auto">
            <Radio className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-white">No Live Videos in Archive</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            When you go live and end your broadcast, your recordings will appear here for 30 days.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {archives.map((archive) => (
            <motion.div
              key={archive._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group"
            >
              {/* Media Thumbnail / Preview */}
              <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                {archive.recording?.thumbnailUrl || archive.recording?.url ? (
                  <img
                    src={archive.recording?.thumbnailUrl || archive.recording?.url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Radio className="w-8 h-8 text-zinc-700 mx-auto mb-1" />
                    <span className="text-[10px] text-zinc-500">Audio/Video Broadcast</span>
                  </div>
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[10px] font-bold text-white">
                  {formatDuration(archive.stats?.durationSeconds)}
                </div>

                {/* Replay Play Button */}
                {archive.recording?.url && (
                  <button
                    onClick={() => setReplayStream(archive)}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-90 group-hover:scale-110 hover:bg-pink-600 transition cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </button>
                )}
              </div>

              {/* Card Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white truncate">{archive.title || "Live Broadcast"}</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(archive.startedAt || archive.createdAt)}</p>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-zinc-500" />
                    {archive.peakViewers || archive.stats?.peakViewers || 1}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-pink-500" />
                    {archive.stats?.totalHearts || 0}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {/* Share as Reel */}
                  <button
                    onClick={() => {
                      setActiveShareArchive(archive);
                      setShowShareModal(true);
                    }}
                    disabled={Boolean(archive.sharedAsReel)}
                    className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      archive.sharedAsReel
                        ? "bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:opacity-95 shadow-md shadow-pink-600/20"
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{archive.sharedAsReel ? "Shared" : "Share as Reel"}</span>
                  </button>

                  {/* Download */}
                  {archive.recording?.url && (
                    <button
                      onClick={() => handleDownload(archive)}
                      title="Download to device"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteArchive(archive._id)}
                    title="Delete recording"
                    className="p-2 rounded-xl bg-zinc-800/50 hover:bg-rose-950/40 hover:text-rose-400 text-zinc-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* REPLAY VIDEO MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {replayStream && (
        <div className="fixed inset-0 z-[800] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div>
                <h3 className="text-xs font-bold text-white">{replayStream.title || "Live Replay"}</h3>
                <p className="text-[10px] text-zinc-400">{formatDate(replayStream.startedAt)}</p>
              </div>
              <button
                onClick={() => setReplayStream(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-[9/16] max-h-[500px] bg-black flex items-center justify-center overflow-hidden">
              <video
                src={replayStream.recording?.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SHARE AS REEL MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showShareModal && activeShareArchive && (
        <ShareLiveAsReelModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setActiveShareArchive(null);
            fetchArchives();
          }}
          streamId={activeShareArchive._id}
          recordedUrl={activeShareArchive.recording?.url}
          stats={activeShareArchive.stats}
          streamTitle={activeShareArchive.title}
        />
      )}

      {/* Confirmation Dialog Modal */}
      <ConfirmDialogModal
        isOpen={deleteModal.isOpen}
        title="Delete Recording"
        message="Are you sure you want to permanently delete this broadcast archive recording?"
        confirmLabel="Delete Recording"
        onConfirm={() => executeDeleteArchive(deleteModal.streamId)}
        onCancel={() => setDeleteModal({ isOpen: false, streamId: null })}
      />
    </div>
  );
};

export default LiveArchiveTab;

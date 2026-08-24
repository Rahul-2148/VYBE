import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Film, Download, Trash2, ArrowRight, CheckCircle2, Loader2, Sparkles, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";

/**
 * ShareLiveAsReelModal
 * Displayed post-broadcast to allow creator to:
 * 1. Share the live recording as a Reel to their profile/feed
 * 2. Download the raw recording to device
 * 3. Delete/Discard the recording
 */
export const ShareLiveAsReelModal = ({
  isOpen,
  onClose,
  streamId,
  recordedBlob,
  recordedUrl,
  stats = {},
  streamTitle = "Live Video",
}) => {
  const navigate = useNavigate();
  const [caption, setCaption] = useState(`${streamTitle} — Live Replay 🔴`);
  const [isSharing, setIsSharing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState("preview"); // "preview" | "caption" | "sharing" | "done"
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  // Local object URL for video preview
  const videoPreviewUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : recordedUrl;

  // Download raw video to device
  const handleDownload = () => {
    if (!recordedBlob && !recordedUrl) {
      snackbar.error("No recording available to download");
      return;
    }
    setIsDownloading(true);
    try {
      const url = recordedBlob ? URL.createObjectURL(recordedBlob) : recordedUrl;
      const a = document.createElement("a");
      a.href = url;
      a.download = `vybe-live-${streamId || Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      snackbar.success("Live video downloaded to device! 📥");
    } catch (err) {
      console.error("Download error:", err);
      snackbar.error("Failed to download video");
    } finally {
      setIsDownloading(false);
    }
  };

  // Upload recording and share as Reel
  const handleShareAsReel = async () => {
    if (!streamId) {
      snackbar.error("Live stream ID missing");
      return;
    }

    try {
      setIsSharing(true);
      setStep("sharing");

      // 1. Upload recording file if we have a recorded blob
      if (recordedBlob) {
        const formData = new FormData();
        formData.append("recording", recordedBlob, `live-recording-${streamId}.mp4`);

        await api.post(`/live/upload-recording/${streamId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        });
      }

      // 2. Share as Reel via API
      const res = await api.post(`/live/share-as-reel/${streamId}`, {
        caption: caption.trim(),
      });

      if (res.data.success) {
        setStep("done");
        snackbar.success("Live replay published as a Reel! 🎬");
        setTimeout(() => {
          onClose();
          navigate("/reels");
        }, 1500);
      }
    } catch (err) {
      console.error("Share as reel error:", err);
      snackbar.error(err.response?.data?.message || "Failed to share live as Reel");
      setStep("caption");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[800] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Share Live Replay</h3>
              <p className="text-[11px] text-zinc-400">Publish your broadcast to Reels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {step === "preview" && (
            <>
              {/* Video Preview */}
              <div className="relative aspect-[9/16] max-h-[300px] w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 mx-auto flex items-center justify-center">
                {videoPreviewUrl ? (
                  <video
                    src={videoPreviewUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Film className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">Video preview ready</p>
                  </div>
                )}
              </div>

              {/* Stream Stats Pill */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/70 border border-zinc-800/60 rounded-2xl text-center">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Duration</span>
                  <p className="text-xs font-bold text-white">{stats.durationSeconds ? `${Math.floor(stats.durationSeconds / 60)}m ${stats.durationSeconds % 60}s` : "0s"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Peak Viewers</span>
                  <p className="text-xs font-bold text-rose-400">{stats.peakViewers || 1}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Hearts</span>
                  <p className="text-xs font-bold text-pink-400">{stats.totalHearts || 0}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setStep("caption")}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-pink-600/20 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share as Reel</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex-1 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="py-3 px-4 bg-zinc-900/60 border border-zinc-800/60 hover:bg-rose-950/40 hover:border-rose-800/50 text-zinc-400 hover:text-rose-400 text-xs font-semibold rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Discard</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {step === "caption" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Reel Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Write a caption for your live replay..."
                  className="w-full p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-pink-500 resize-none"
                />
                <div className="flex justify-between items-center mt-1.5 text-[10px] text-zinc-500">
                  <span>Replay will be permanently saved to your profile</span>
                  <span>{caption.length}/500</span>
                </div>
              </div>

              {/* Quick Tags */}
              <div className="flex flex-wrap gap-1.5">
                {["#LiveReplay", "#VybeLive", "#Creator", "#Community"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCaption((prev) => `${prev} ${tag}`)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-pink-400 hover:border-pink-500/40 transition cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  className="px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-2xl hover:bg-zinc-800 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleShareAsReel}
                  disabled={isSharing}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-pink-600/20 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publish to Reels</span>
                </button>
              </div>
            </div>
          )}

          {step === "sharing" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-pink-500/20 text-pink-500 mx-auto flex items-center justify-center animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Publishing Live Replay...</h4>
                <p className="text-xs text-zinc-400 mt-1">Uploading video and creating your Reel</p>
              </div>
              {uploadProgress > 0 && (
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800 max-w-xs mx-auto">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">Live Replay Shared!</h4>
              <p className="text-xs text-zinc-400">Your live video is now available in your Reels tab</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ShareLiveAsReelModal;

import React, { useState } from "react";
import {
  X,
  Smartphone,
  Gauge,
  Subtitles,
  Bookmark,
  BookmarkCheck,
  Repeat,
  Copy,
  QrCode,
  Send,
  Disc,
  Eye,
  EyeOff,
  HelpCircle,
  Flag,
  Trash2,
  MessageSquareOff,
  MessageSquare,
  Check,
  ChevronRight,
  Info,
  Download,
  AlertTriangle,
  Sparkles,
  Wifi,
  WifiOff,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import AIInfoModal from "./AIInfoModal";
import { snackbar } from "../lib/snackbar";
import { triggerHaptic } from "../lib/interactiveEffects";
import { getDataSaverMode, setDataSaverMode } from "../lib/mediaQualitySettings";
import api from "../lib/axios";

export const ReelOptionsModal = ({
  isOpen,
  onClose,
  reel,
  isAuthor,
  isSaved,
  onToggleSave,
  onOpenRemix,
  onOpenReshare,
  onOpenShare,
  onOpenViewers,
  playbackSpeed,
  onChangePlaybackSpeed,
  applySpeedToAll = false,
  onToggleApplySpeedToAll = () => {},
  autoScroll,
  onToggleAutoScroll,
  onDeleteReel,
  onNotInterested,
  onToggleComments,
  commentsDisabled,
}) => {
  const [activeSubView, setActiveSubView] = useState("main"); // "main" | "speed" | "qr" | "why" | "report"
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isSubmittingTuning, setIsSubmittingTuning] = useState(false);
  const [showAIInfoModal, setShowAIInfoModal] = useState(false);
  const [dataSaver, setDataSaver] = useState(getDataSaverMode());

  const reelUrl = typeof window !== "undefined"
    ? `${window.location.origin}/reels?reelId=${reel._id}`
    : `https://vybe.app/reels?reelId=${reel._id}`;

  const handleCopyLink = async () => {
    triggerHaptic("selection");
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(reelUrl);
      }
      snackbar.success("Reel link copied to clipboard!");
    } catch {
      snackbar.info("Link: " + reelUrl);
    }
    onClose();
  };

  const handleNotInterestedClick = async () => {
    triggerHaptic("warning");
    setIsSubmittingTuning(true);
    try {
      await api.post(`/reel/not-interested/${reel._id}`);
      snackbar.success("We'll show fewer reels like this in your feed.");
      if (onNotInterested) onNotInterested();
      onClose();
    } catch {
      snackbar.error("Failed to update preferences");
    } finally {
      setIsSubmittingTuning(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      snackbar.error("Please select a reason for reporting");
      return;
    }
    setIsSubmittingReport(true);
    try {
      await api.post(`/reel/report/${reel._id}`, {
        reason: reportReason,
        details: reportDetails,
      });
      snackbar.success("Thank you for your report. Our team will review it.");
      onClose();
    } catch {
      snackbar.error("Failed to submit report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const reportReasons = [
    { id: "spam", label: "Spam or Scam" },
    { id: "hate_speech", label: "Hate speech or symbols" },
    { id: "harassment", label: "Bullying or harassment" },
    { id: "nudity", label: "Nudity or sexual content" },
    { id: "violence", label: "Violence or dangerous content" },
    { id: "false_info", label: "False information or misleading" },
    { id: "intellectual_property", label: "Copyright or IP violation" },
    { id: "other", label: "Other issue" },
  ];

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <AnimatePresence>
      {isOpen && reel && (
        <motion.div
          key="reel-options-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) onClose();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[5000] flex items-end justify-center p-0 bg-black/60 backdrop-blur-[3px] select-none"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute inset-0 z-0"
            title="Close options"
          />

          <motion.div
            key="reel-options-sheet"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
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
                triggerHaptic("light");
                onClose();
              }
            }}
            className="relative z-10 w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] md:rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col h-[70vh] max-h-[620px] text-text"
          >
            {/* TOP DRAG NOTCH / HANDLE */}
            <div
              className="w-10 h-1 rounded-full bg-border-strong mx-auto mt-2.5 mb-1 shrink-0 opacity-60 cursor-pointer hover:opacity-100 transition"
              onClick={onClose}
            />

        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70 bg-surface-hover/20">
          <div className="flex items-center gap-2">
            {activeSubView !== "main" && (
              <button
                onClick={() => setActiveSubView("main")}
                className="text-xs text-primary font-bold hover:underline mr-1 cursor-pointer"
              >
                Back
              </button>
            )}
            <h2 className="text-sm font-bold text-text capitalize">
              {activeSubView === "main" && "Reel Options"}
              {activeSubView === "speed" && "Playback Speed"}
              {activeSubView === "qr" && "Reel QR Code"}
              {activeSubView === "why" && "Why you're seeing this"}
              {activeSubView === "report" && "Report Reel"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ===================== MAIN VIEW ===================== */}
          {activeSubView === "main" && (
            <>
              {/* PRIMARY TOGGLE CONTROLS (Auto-Scroll & Captions) */}
              <div className="bg-surface-inset/80 border border-border rounded-2xl p-3 space-y-3 shadow-xs">
                {/* AUTO-SCROLL TOGGLE */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text flex items-center gap-2">
                        <span>Auto-scroll</span>
                        <span className="text-[10px] font-semibold px-2 py-0.2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full">
                          Hands-Free
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary">
                        Plays next reel automatically on finish
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoScroll}
                    aria-label="Toggle auto-scroll hands-free mode"
                    onClick={() => {
                      triggerHaptic("selection");
                      onToggleAutoScroll();
                      snackbar.info(!autoScroll ? "Auto-scroll turned On 🎬" : "Auto-scroll turned Off");
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      autoScroll ? "bg-rose-500" : "bg-surface-hover border border-border"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        autoScroll ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px bg-border/60" />

                {/* PLAYBACK SPEED BUTTON */}
                <button
                  onClick={() => setActiveSubView("speed")}
                  className="w-full flex items-center justify-between py-1 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text flex items-center gap-1.5">
                        <span>Playback Speed</span>
                        {applySpeedToAll && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-full">
                            All Reels
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary">
                        Current: <span className="font-semibold text-primary">{playbackSpeed}x</span>
                        <span className="text-text-muted ml-1">
                          {applySpeedToAll ? "(All reels)" : "(This reel only)"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text transition-transform group-hover:translate-x-1" />
                </button>

                <div className="h-px bg-border/60" />

                {/* DATA SAVER TOGGLE */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      {dataSaver ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text">Data Saver Mode</div>
                      <p className="text-[11px] text-text-secondary">
                        {dataSaver ? "Streaming with reduced data consumption" : "Stream in full definition"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dataSaver}
                    aria-label="Toggle Data Saver"
                    onClick={() => {
                      triggerHaptic("selection");
                      const next = !dataSaver;
                      setDataSaver(next);
                      setDataSaverMode(next);
                      snackbar.info(next ? "Data Saver Mode Turned On 📶" : "Data Saver Turned Off (Full HD)");
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      dataSaver ? "bg-cyan-500" : "bg-surface-hover border border-border"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        dataSaver ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* ACTION MENU LIST */}
              <div className="space-y-1">
                {/* Save Bookmark */}
                <button
                  onClick={() => {
                    onToggleSave();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Bookmark className="w-5 h-5 text-text-secondary" />
                  )}
                  <span>{isSaved ? "Saved to Bookmarks" : "Save to Bookmarks"}</span>
                </button>

                {/* Reshare & Repost */}
                <button
                  onClick={() => {
                    if (onOpenReshare) onOpenReshare();
                    else if (onOpenRemix) onOpenRemix();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                >
                  <Repeat className="w-5 h-5 text-rose-400" />
                  <span>Reshare & Repost</span>
                </button>

                {/* Remix */}
                <button
                  onClick={() => {
                    onOpenRemix();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                >
                  <Repeat className="w-5 h-5 text-purple-400" />
                  <span>Remix this Reel</span>
                </button>

                {/* Views & Insights */}
                <button
                  onClick={() => {
                    if (onOpenViewers) onOpenViewers();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                >
                  <Eye className="w-5 h-5 text-blue-400" />
                  <span>Views & Insights ({reel?.views || 0})</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                >
                  <Copy className="w-5 h-5 text-emerald-400" />
                  <span>Copy Link</span>
                </button>

                {/* Share To... */}
                <button
                  onClick={() => {
                    onOpenShare();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                >
                  <Send className="w-5 h-5 text-blue-400" />
                  <span>Share via Direct & Apps</span>
                </button>

                {/* QR Code */}
                <button
                  onClick={() => setActiveSubView("qr")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                >
                  <QrCode className="w-5 h-5 text-cyan-400" />
                  <span>Reel QR Code</span>
                </button>

                {/* About Made with AI */}
                {reel?.aiLabel?.isAIGenerated && (
                  <button
                    onClick={() => {
                      triggerHaptic("selection");
                      setShowAIInfoModal(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/25 text-purple-300 transition cursor-pointer text-xs font-semibold"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-purple-400 fill-purple-400/20 animate-pulse" />
                      <span>About Made with AI</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400/70" />
                  </button>
                )}

                {/* Why seeing this reel */}
                <button
                  onClick={() => setActiveSubView("why")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                >
                  <HelpCircle className="w-5 h-5 text-text-muted" />
                  <span>Why you're seeing this reel</span>
                </button>

                {/* Not Interested */}
                <button
                  onClick={handleNotInterestedClick}
                  disabled={isSubmittingTuning}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold disabled:opacity-50"
                >
                  <EyeOff className="w-5 h-5 text-orange-400" />
                  <span>Not Interested</span>
                </button>

                {/* Creator Only Actions */}
                {isAuthor && (
                  <>
                    <div className="h-px bg-border my-2" />
                    {/* Toggle Comments */}
                    <button
                      onClick={() => {
                        onToggleComments();
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text transition cursor-pointer text-xs font-semibold"
                    >
                      {commentsDisabled ? (
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <MessageSquareOff className="w-5 h-5 text-amber-400" />
                      )}
                      <span>{commentsDisabled ? "Turn on commenting" : "Turn off commenting"}</span>
                    </button>

                    {/* Delete Reel */}
                    <button
                      onClick={() => {
                        onDeleteReel();
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/15 text-rose-500 transition cursor-pointer text-xs font-bold"
                    >
                      <Trash2 className="w-5 h-5 text-rose-500" />
                      <span>Delete Reel</span>
                    </button>
                  </>
                )}

                {/* Report Reel (Non-author) */}
                {!isAuthor && (
                  <>
                    <div className="h-px bg-border my-2" />
                    <button
                      onClick={() => setActiveSubView("report")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500 transition cursor-pointer text-xs font-bold"
                    >
                      <Flag className="w-5 h-5 text-red-500" />
                      <span>Report Reel</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* ===================== PLAYBACK SPEED SUB-VIEW ===================== */}
          {activeSubView === "speed" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-text">Select Playback Speed</p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Adjust how fast or slow video & audio play:
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      triggerHaptic("selection");
                      onChangePlaybackSpeed(speed);
                    }}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${
                      playbackSpeed === speed
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                        : "bg-surface-inset border-border text-text hover:bg-surface-hover"
                    }`}
                  >
                    <span>{speed}x</span>
                    {speed === 1.0 && <span className="text-[10px] opacity-75 font-normal ml-0.5">(1X)</span>}
                    {playbackSpeed === speed && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                ))}
              </div>

              {/* APPLY TO ALL REELS TOGGLE */}
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text flex items-center gap-1.5">
                        <span>Apply to all reels</span>
                        {applySpeedToAll && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary leading-snug mt-0.5">
                        {applySpeedToAll
                          ? `All reels will play at ${playbackSpeed}x speed`
                          : "Speed will only apply to this current reel"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={applySpeedToAll}
                    aria-label="Toggle apply speed to all reels"
                    onClick={() => {
                      triggerHaptic("selection");
                      const next = !applySpeedToAll;
                      onToggleApplySpeedToAll(next);
                      if (next) {
                        snackbar.success(`Playback speed (${playbackSpeed}x) will apply to all reels ⏩`);
                      } else {
                        snackbar.info("Playback speed will only apply to this reel");
                      }
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      applySpeedToAll ? "bg-purple-600" : "bg-surface-hover border border-border"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        applySpeedToAll ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setActiveSubView("main")}
                className="w-full py-2.5 bg-surface hover:bg-surface-hover border border-border text-text font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* ===================== QR CODE SUB-VIEW ===================== */}
          {activeSubView === "qr" && (
            <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
              <div className="p-4 bg-white rounded-3xl shadow-xl">
                <QRCode
                  value={reelUrl}
                  size={190}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Scan with Camera</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Point any phone camera to instantly watch this reel on VYBE.
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 bg-surface-inset border border-border hover:bg-surface-hover text-text font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-primary" />
                <span>Copy Direct URL</span>
              </button>
            </div>
          )}

          {/* ===================== WHY SEEING THIS SUB-VIEW ===================== */}
          {activeSubView === "why" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-surface-inset border border-border rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-text space-y-1">
                  <p className="font-bold">Algorithmic Recommendation Transparency</p>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    This reel was selected for your feed based on multiple signals:
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-surface-hover border border-border/80 flex items-center gap-2 text-text">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Trending engagement and watch retention in your region</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-hover border border-border/80 flex items-center gap-2 text-text">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Topics related to accounts and audio tracks you interact with</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-hover border border-border/80 flex items-center gap-2 text-text">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Creators followed by accounts you frequently connect with</span>
                </div>
              </div>

              <button
                onClick={handleNotInterestedClick}
                className="w-full py-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-xs rounded-xl hover:bg-orange-500/20 transition cursor-pointer"
              >
                Don't show reels like this again
              </button>
            </div>
          )}

          {/* ===================== REPORT SUB-VIEW ===================== */}
          {activeSubView === "report" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold">Select a reason for reporting</span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {reportReasons.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReportReason(r.id)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold border transition flex items-center justify-between cursor-pointer ${
                      reportReason === r.id
                        ? "bg-red-500/15 border-red-500 text-red-400"
                        : "bg-surface-inset border-border text-text hover:bg-surface-hover"
                    }`}
                  >
                    <span>{r.label}</span>
                    {reportReason === r.id && <Check className="w-4 h-4 text-red-500" />}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Additional details (optional)..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={2}
                className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-text outline-none focus:border-red-500 resize-none"
              />

              <button
                onClick={handleSubmitReport}
                disabled={!reportReason || isSubmittingReport}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-40 shadow-md"
              >
                {isSubmittingReport ? "Submitting Report..." : "Submit Report"}
              </button>
            </div>
          )}
        </div>
      </motion.div>

          {/* AI Transparency Disclosure Modal */}
          <AIInfoModal
            isOpen={showAIInfoModal}
            onClose={() => setShowAIInfoModal(false)}
            aiLabel={reel?.aiLabel}
            authorName={reel?.author?.name || `@${reel?.author?.userName}` || "The creator"}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReelOptionsModal;

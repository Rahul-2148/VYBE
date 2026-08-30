import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Bot,
  ShieldCheck,
  HelpCircle,
  Layers,
  ChevronDown,
  CheckCircle2,
  Wand2,
  AlertCircle,
  Info,
} from "lucide-react";
import moment from "moment";
import { triggerHaptic } from "../lib/interactiveEffects";

export const AIInfoModal = ({
  isOpen,
  onClose,
  aiLabel = {},
  authorName = "The creator",
}) => {
  const [showGuidelines, setShowGuidelines] = useState(false);

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

  const handleClose = () => {
    triggerHaptic("light");
    onClose();
  };

  const toolName = aiLabel?.tool || "Generative AI";
  const contentType = aiLabel?.contentType || "Image / Video";
  const disclosedAt = aiLabel?.disclosedAt
    ? moment(aiLabel.disclosedAt).format("MMM D, YYYY")
    : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          key="ai-info-modal-wrapper"
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[5500] flex items-end justify-center font-sans select-none"
        >
          {/* Backdrop */}
          <motion.div
            key="ai-info-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          />

          {/* Sheet / Modal Container */}
          <motion.div
          key="ai-info-sheet"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          dragSnapToOrigin
          onDragEnd={(e, info) => {
            if (info.offset.y > 60 || info.velocity.y > 300) {
              handleClose();
            }
          }}
          className="relative z-10 w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] md:rounded-t-[32px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.85)] overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Top Drag Notch Handle */}
          <div
            className="w-10 h-1 bg-border-strong rounded-full opacity-60 mx-auto mt-2.5 mb-1 cursor-pointer hover:opacity-100 transition shrink-0"
            onClick={handleClose}
          />

          {/* Header */}
          <div className="px-5 pt-3.5 pb-3 flex items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-[1.5px] flex items-center justify-center shadow-md shadow-purple-500/20">
                <div className="w-full h-full bg-surface rounded-[9px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400/20 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-text flex items-center gap-1.5">
                  Made with AI
                </h3>
                <p className="text-[10px] text-text-muted font-medium">AI Transparency & Disclosure</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-hover active:scale-95 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="px-5 py-4 overflow-y-auto space-y-4 text-sm hide-scrollbar">
            {/* Top Disclosure Notice Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-surface-inset border border-purple-500/20 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-bold text-text text-xs sm:text-sm">
                    {authorName} labeled this content as made with AI
                  </p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    This media contains photorealistic imagery, synthetic voice, or scenes created or heavily modified using artificial intelligence.
                  </p>
                </div>
              </div>

              {/* Tag / Tool Info Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {toolName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] font-bold text-purple-300">
                    <Wand2 className="w-3 h-3 text-purple-400" />
                    <span>{toolName}</span>
                  </span>
                )}
                {contentType && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-semibold text-text-secondary capitalize">
                    <Layers className="w-3 h-3 text-text-muted" />
                    <span>{contentType}</span>
                  </span>
                )}
                {disclosedAt && (
                  <span className="text-[10px] text-text-muted ml-auto font-medium">
                    Labeled on {disclosedAt}
                  </span>
                )}
              </div>
            </div>

            {/* Why This Label Matters (Instagram Standard) */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                About AI Labels on VYBE
              </h4>

              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-inset border border-border/70">
                  <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-text">Community Trust & Authenticity</p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      We help you know when images, videos, or voices are AI-generated rather than real physical captures to prevent misinformation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-inset border border-border/70">
                  <div className="p-1.5 rounded-lg bg-pink-500/15 text-pink-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-text">Self-Disclosure & Detection</p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Creators can label their content upon upload, or labels can be detected automatically via C2PA / SynthID metadata.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Guidelines Accordion */}
            <div className="border border-border rounded-2xl overflow-hidden bg-surface-inset">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setShowGuidelines(!showGuidelines);
                }}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-bold text-text hover:bg-surface transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  <span>What requires an AI label?</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                    showGuidelines ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {showGuidelines && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-3.5 pt-1 space-y-2 text-[11px] text-text-secondary border-t border-border/50">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Requires Label:</strong> Photorealistic people, synthetic voices, deepfakes, AI art, or fully generated videos.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                        <span>
                          <strong>Does Not Require:</strong> Minor photo touch-ups, color correction, standard filters, or auto-captioning.
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-border bg-surface shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-purple-600/25 transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AIInfoModal;

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Bot, ShieldCheck, HelpCircle, Layers, ExternalLink, ChevronDown, CheckCircle2 } from "lucide-react";
import { triggerHaptic } from "../lib/interactiveEffects";

const AIInfoModal = ({ isOpen, onClose, aiLabel, authorName = "The creator" }) => {
  const [showGuidelines, setShowGuidelines] = useState(false);

  if (!isOpen) return null;

  const toolName = aiLabel?.tool || "Generative AI Tool";
  const contentType = aiLabel?.contentType || "media";
  const disclosedAt = aiLabel?.disclosedAt ? new Date(aiLabel.disclosedAt).toLocaleDateString() : null;

  const handleClose = () => {
    triggerHaptic("light");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        />

        {/* Sheet / Modal Container */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full sm:max-w-lg bg-bg border border-border/80 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
        >
          {/* Mobile Drag Indicator */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-1.5 bg-border rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 p-[1.5px] flex items-center justify-center shadow-md shadow-purple-500/20">
                <div className="w-full h-full bg-bg rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400 fill-purple-400/20 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-text flex items-center gap-1.5">
                  Made with AI
                </h3>
                <p className="text-[11px] text-text-muted">AI Transparency Disclosure</p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-hover active:scale-95 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="px-6 py-5 overflow-y-auto space-y-5 text-sm hide-scrollbar">
            {/* Top Disclosure Notice Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-surface border border-purple-500/20 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-text text-sm">
                    {authorName} labeled this content as made with AI
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    This post contains synthetic or heavily modified media generated with artificial intelligence technology.
                  </p>
                </div>
              </div>

              {/* Tag / Tool Info Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {aiLabel?.tool && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-semibold text-purple-300">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Tool: {aiLabel.tool}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border text-xs font-medium text-text-secondary capitalize">
                  <Layers className="w-3 h-3 text-text-muted" />
                  Type: {contentType}
                </span>
                {disclosedAt && (
                  <span className="text-[11px] text-text-muted ml-auto">
                    Disclosed {disclosedAt}
                  </span>
                )}
              </div>
            </div>

            {/* Why This Label Matters */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                About AI on VYBE
              </h4>

              <div className="space-y-2.5">
                {/* Point 1 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface border border-border/70">
                  <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs text-text">Transparency for Community Trust</p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      We help users know when images, videos, or voices aren't real captures. This prevents misinformation and deepfakes.
                    </p>
                  </div>
                </div>

                {/* Point 2 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface border border-border/70">
                  <div className="p-1.5 rounded-lg bg-pink-500/15 text-pink-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs text-text">Detection & Creator Self-Labeling</p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Labels can be added by creators upon upload or detected automatically through industry-standard C2PA / SynthID metadata.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Guidelines Accordion */}
            <div className="border border-border/80 rounded-2xl overflow-hidden bg-surface/50">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setShowGuidelines(!showGuidelines);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-text hover:bg-surface transition"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  What counts as AI content?
                </span>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${showGuidelines ? "rotate-180" : ""}`} />
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
                    <div className="px-4 pb-4 pt-1 space-y-2 text-[11px] text-text-secondary border-t border-border/50">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Requires Label:</strong> Photorealistic humans, cloned synthetic voices, fully AI generated scenes, or face swaps.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                        <span><strong>Does not require label:</strong> Basic color grading, noise reduction, standard beauty touch-ups, or text animations.</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border/70 bg-bg/90 backdrop-blur-md">
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-purple-600/25 transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AIInfoModal;

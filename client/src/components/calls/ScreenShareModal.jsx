import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MonitorUp, Shield, X } from "lucide-react";
import { triggerHaptic } from "../../lib/interactiveEffects";

export const ScreenShareModal = ({
  isOpen,
  onClose,
  onConfirm,
  targetUserName = "Participant",
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md select-none">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center gap-4"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
            <MonitorUp className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white leading-tight">
              Start sharing your screen?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
              Vybe will transmit your selected screen, window, or browser tab in high-definition to <span className="font-semibold text-white">@{targetUserName}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>End-to-end encrypted screen stream</span>
          </div>

          <div className="w-full flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                triggerHaptic("medium");
                onConfirm();
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer active:scale-95"
            >
              Share Screen
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScreenShareModal;

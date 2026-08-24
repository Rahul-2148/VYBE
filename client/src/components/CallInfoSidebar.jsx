import React, { useState } from "react";
import { X, Copy, ShieldCheck, Link2, Info, Check } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

export const CallInfoSidebar = ({ isOpen, onClose }) => {
  const [isCopied, setIsCopied] = useState(false);
  if (!isOpen) return null;

  const joinUrl = window.location.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setIsCopied(true);
      triggerHaptic("success");
      microAudio?.playPop?.();
      snackbar.success("Meeting joining link copied to clipboard! 📋");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      snackbar.error("Could not copy link");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f20] text-white select-none overflow-hidden font-sans border-l border-zinc-700/80">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-700/80 shrink-0">
        <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Meeting Details</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Joining Info</h4>
          <p className="text-xs text-white font-medium break-all">{joinUrl}</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow ${
            isCopied
              ? "bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20 scale-[0.98]"
              : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95"
          }`}
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 text-white animate-in zoom-in-75 duration-200" />
              <span>Joining Info Copied! ✓</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Joining Info</span>
            </>
          )}
        </button>

        <div className="p-3.5 rounded-2xl bg-[#28292a] border border-zinc-700/60 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <h5 className="text-xs font-bold text-white">Encrypted Meeting</h5>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Audio and video streams are transmitted with high-performance WebRTC peer-to-peer security.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallInfoSidebar;

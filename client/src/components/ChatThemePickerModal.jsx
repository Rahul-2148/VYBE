import React from "react";
import { X, Check, Palette, Sparkles } from "lucide-react";
import api from "../lib/axios";
import { toast } from "sonner";

export const THEME_OPTIONS = [
  {
    id: "default",
    name: "Instagram Classic",
    gradient: "from-purple-600 via-pink-600 to-rose-500",
    previewBg: "bg-gradient-to-r from-purple-600 to-rose-500",
    description: "Signature Instagram gradient",
  },
  {
    id: "sunset",
    name: "Sunset Flame",
    gradient: "from-rose-500 via-amber-500 to-yellow-500",
    previewBg: "bg-gradient-to-r from-rose-500 to-amber-500",
    description: "Warm sunset hues",
  },
  {
    id: "ocean",
    name: "Oceanic Blue",
    gradient: "from-cyan-500 via-blue-600 to-indigo-600",
    previewBg: "bg-gradient-to-r from-cyan-500 to-indigo-600",
    description: "Deep oceanic blue flow",
  },
  {
    id: "forest",
    name: "Emerald Glow",
    gradient: "from-emerald-500 via-teal-600 to-green-600",
    previewBg: "bg-gradient-to-r from-emerald-500 to-teal-600",
    description: "Vibrant emerald green",
  },
  {
    id: "lavender",
    name: "Cyber Lavender",
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
    previewBg: "bg-gradient-to-r from-indigo-500 to-pink-500",
    description: "Soft cyber lavender glow",
  },
  {
    id: "midnight",
    name: "Midnight Stealth",
    gradient: "from-zinc-700 via-zinc-800 to-zinc-900",
    previewBg: "bg-surface-hover",
    description: "Minimalist OLED dark mode",
  },
];

export const ChatThemePickerModal = ({ isOpen, onClose, conversationId, currentTheme = "default", onThemeChanged }) => {
  if (!isOpen) return null;

  const handleSelectTheme = async (themeId) => {
    try {
      const res = await api.patch(`/conversation/theme/${conversationId}`, { theme: themeId });
      if (res.data?.success) {
        toast.success(`Theme updated to ${THEME_OPTIONS.find((t) => t.id === themeId)?.name}`);
        onThemeChanged(themeId);
        onClose();
      }
    } catch {
      toast.error("Failed to update theme");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-surface-inset border border-border rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Chat Themes</h3>
              <p className="text-[11px] text-text-secondary">Customize background & bubble style</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface hover:bg-surface-hover transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme List Grid */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto hide-scrollbar pr-1">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-surface border-purple-500/60 shadow-lg shadow-purple-500/5"
                    : "bg-surface/50 border-border/80 hover:border-border-strong hover:bg-surface/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${theme.previewBg} shadow-inner shrink-0 flex items-center justify-center text-text`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text">{theme.name}</p>
                    <p className="text-[10px] text-text-secondary">{theme.description}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-purple-400 font-bold shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatThemePickerModal;

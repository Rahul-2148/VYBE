import React, { useState } from "react";
import {
  X, Check, Palette, Sparkles, Eye, LayoutGrid, Sun, Moon,
  CheckCheck, Heart, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";
import { CHAT_THEMES, getChatThemeById } from "../lib/chatThemes";
import { useTheme } from "../lib/themeContext";
import dp from "../assets/dp3.png";

export { CHAT_THEMES, getChatThemeById };

export const ChatThemePickerModal = ({
  isOpen,
  onClose,
  conversationId,
  currentTheme = "default",
  onThemeChanged
}) => {
  const { theme: appTheme } = useTheme();
  const isAppDark = appTheme === "dark";

  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedThemeId, setSelectedThemeId] = useState(currentTheme);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "preview"
  const [previewIsDark, setPreviewIsDark] = useState(isAppDark);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const filteredThemes = activeCategory === "all"
    ? CHAT_THEMES
    : CHAT_THEMES.filter((t) => t.category === activeCategory);

  const selectedThemeObj = getChatThemeById(selectedThemeId);

  const handleApplyTheme = async (themeIdToApply) => {
    const targetId = themeIdToApply || selectedThemeId;
    try {
      setIsApplying(true);
      const res = await api.patch(`/conversation/theme/${conversationId}`, { theme: targetId });
      if (res.data?.success) {
        const themeObj = getChatThemeById(targetId);
        snackbar.success(`Theme updated to ${themeObj.name} ✨`);
        if (onThemeChanged) onThemeChanged(targetId);
        onClose();
      }
    } catch {
      snackbar.error("Failed to update theme");
    } finally {
      setIsApplying(false);
    }
  };

  const handleSelectInGrid = (themeId) => {
    setSelectedThemeId(themeId);
  };

  const handleOpenPreview = (themeId) => {
    setSelectedThemeId(themeId);
    setViewMode("preview");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-inset border border-border rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Chat Themes & Wallpapers</h3>
              <p className="text-[11px] text-text-secondary">Custom textures, prints & ambient gradients</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Grid vs Live Preview */}
            <div className="flex items-center bg-surface border border-border rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-surface-hover text-text shadow-xs"
                    : "text-text-muted hover:text-text"
                }`}
                title="Grid List Mode"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === "preview"
                    ? "bg-purple-500 text-white shadow-xs"
                    : "text-text-muted hover:text-text"
                }`}
                title="Live Preview Mode"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface hover:bg-surface-hover transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= VIEW MODE: GRID LIST ================= */}
        {viewMode === "grid" && (
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-surface rounded-2xl border border-border shrink-0">
              {[
                { id: "all", label: "All Themes" },
                { id: "printed", label: "Printed Wallpapers 🖼️" },
                { id: "gradient", label: "Gradients 🎨" },
                { id: "minimal", label: "Minimal ⚡" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition cursor-pointer text-center ${
                    activeCategory === tab.id
                      ? "bg-surface-hover text-text shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Theme Cards List */}
            <div className="space-y-2 flex-1 overflow-y-auto hide-scrollbar pr-1">
              {filteredThemes.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                const isCurrent = currentTheme === theme.id;

                return (
                  <div
                    key={theme.id}
                    onClick={() => handleSelectInGrid(theme.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-surface border-purple-500/80 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30"
                        : "bg-surface/50 border-border/80 hover:border-border-strong hover:bg-surface/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl ${theme.previewBg} border border-border/50 shadow-inner shrink-0 flex items-center justify-center`}>
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-text truncate">{theme.name}</p>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              Active
                            </span>
                          )}
                          {theme.previewBadge && !isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                              {theme.previewBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5">{theme.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(theme.id);
                        }}
                        className="p-1.5 rounded-xl bg-surface-hover hover:bg-purple-500/20 text-text-secondary hover:text-purple-400 border border-border/80 transition cursor-pointer text-xs font-medium flex items-center gap-1"
                        title="Preview Live Wallpaper"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyTheme(theme.id);
                        }}
                        disabled={isApplying}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                            : "bg-surface hover:bg-surface-hover text-text border border-border"
                        }`}
                      >
                        {isSelected && isCurrent ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= VIEW MODE: LIVE PREVIEW ================= */}
        {viewMode === "preview" && (
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-200">
            {/* Preview Subheader: Theme info & Light/Dark Simulation Toggle */}
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text">{selectedThemeObj.name}</span>
                <span className="text-[10px] text-text-muted">Live Interactive Preview</span>
              </div>

              <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewIsDark(false)}
                  className={`p-1 rounded-lg transition cursor-pointer ${
                    !previewIsDark ? "bg-amber-400/20 text-amber-500" : "text-text-muted hover:text-text"
                  }`}
                  title="Simulate Light Mode"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIsDark(true)}
                  className={`p-1 rounded-lg transition cursor-pointer ${
                    previewIsDark ? "bg-indigo-400/20 text-indigo-400" : "text-text-muted hover:text-text"
                  }`}
                  title="Simulate Dark Mode"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* LIVE CHAT SIMULATION MOCKUP CARD */}
            <div
              className="w-full flex-1 rounded-2xl border border-border overflow-hidden relative shadow-inner p-3.5 flex flex-col justify-between transition-colors duration-300 min-h-[260px]"
              style={selectedThemeObj.getBackground?.(previewIsDark) || {}}
            >
              {/* Mockup Chat Header */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-surface/80 backdrop-blur-md border border-border/60 shadow-xs mb-3">
                <img src={dp} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text truncate leading-tight">Alex Rivera</p>
                  <p className="text-[9px] text-green-500 leading-tight">Online</p>
                </div>
              </div>

              {/* Mockup Message Stream */}
              <div className="space-y-3 flex-1 flex flex-col justify-end">
                {/* Incoming Message */}
                <div className="flex items-end gap-2 max-w-[85%] mr-auto">
                  <img src={dp} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-border" />
                  <div className={`p-2.5 rounded-2xl rounded-bl-sm text-xs space-y-1 ${selectedThemeObj.receiverBubble}`}>
                    <p className="leading-snug">Hey! How does this wallpaper look on your screen? ✨</p>
                    <span className="text-[9px] text-text-muted block text-right">10:42 AM</span>
                  </div>
                </div>

                {/* Outgoing Message with Reaction Pill */}
                <div className="flex flex-col items-end max-w-[85%] ml-auto space-y-1">
                  <div className={`p-2.5 rounded-2xl rounded-br-sm text-xs text-white space-y-1 ${selectedThemeObj.senderBubble}`}>
                    <p className="leading-snug">Looks super crisp and modern! Setting this as our chat theme 🔥</p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-white/70">
                      <span>10:43 AM</span>
                      <CheckCheck className="w-3.5 h-3.5 text-cyan-200 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Sample Reaction Pill */}
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[10px] text-white border border-white/20 -mt-2 mr-2 shadow-xs">
                    <span>❤️</span>
                    <span className="font-semibold">2</span>
                  </div>
                </div>

                {/* Incoming Message 2 */}
                <div className="flex items-end gap-2 max-w-[80%] mr-auto">
                  <img src={dp} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-border" />
                  <div className={`p-2 rounded-2xl rounded-bl-sm text-xs ${selectedThemeObj.receiverBubble}`}>
                    <p className="leading-snug">Awesome, love the vibe! 🚀</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Themes Carousel Row in Preview */}
            <div className="space-y-1 shrink-0">
              <p className="text-[10px] font-semibold text-text-muted px-1">Switch Wallpaper Preview:</p>
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                {CHAT_THEMES.map((theme) => {
                  const isCurrentSelected = selectedThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedThemeId(theme.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shrink-0 transition cursor-pointer ${
                        isCurrentSelected
                          ? "bg-purple-500/20 border-purple-500 text-purple-400 ring-1 ring-purple-500/40"
                          : "bg-surface border-border text-text-secondary hover:text-text hover:bg-surface-hover"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full ${theme.previewBg} border border-border shrink-0`} />
                      <span className="text-[11px] whitespace-nowrap">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview Action Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className="flex-1 py-2 px-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border text-text font-bold text-xs transition cursor-pointer"
              >
                Back to List
              </button>

              <button
                type="button"
                disabled={isApplying}
                onClick={() => handleApplyTheme(selectedThemeId)}
                className="flex-1 py-2 px-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isApplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Apply This Wallpaper</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatThemePickerModal;

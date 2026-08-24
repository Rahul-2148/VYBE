// client/src/components/ChatThemePickerModal.jsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  X, Check, Palette, Sparkles, Eye, LayoutGrid, Sun, Moon,
  CheckCheck, Type, Sliders, CheckCircle2, Loader2, Globe, RotateCcw,
  MessageSquare
} from "lucide-react";
import { snackbar } from "../lib/snackbar";
import { CHAT_THEMES, getChatThemeById, getResolvedThemeId } from "../lib/chatThemes";
import { useTheme } from "../lib/themeContext";
import {
  FONT_SIZES,
  FONT_STYLES,
  getChatTypography,
  saveChatTypography,
  getActiveFontClasses
} from "../lib/chatTypography";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import dp from "../assets/dp3.png";

export const ChatThemePickerModal = ({
  isOpen,
  onClose,
  conversationId,
  chatName = "",
  currentTheme = "default",
  onThemeChanged
}) => {
  const { theme: appTheme } = useTheme();
  const isAppDark = appTheme === "dark";
  const { userData } = useSelector((state) => state.user);
  const currentUserId = userData?.user?._id || userData?._id;

  // Active top navigation tab: "themes" | "typography"
  const [modalTab, setModalTab] = useState("themes");

  const globalDefault = typeof window !== "undefined" ? localStorage.getItem("vybe_global_chat_theme") : null;
  const dedicatedOverride = currentUserId && conversationId
    ? localStorage.getItem(`chat_theme_${currentUserId}_${conversationId}`)
    : null;

  const hasDedicatedOverride = Boolean(dedicatedOverride);
  const activeAppliedTheme = getResolvedThemeId(currentUserId, conversationId, currentTheme);

  // --- THEMES STATE ---
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedThemeId, setSelectedThemeId] = useState(activeAppliedTheme);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "preview"
  const [previewIsDark, setPreviewIsDark] = useState(isAppDark);
  const [isApplying, setIsApplying] = useState(false);

  // --- WHATSAPP / INSTAGRAM STYLE CONFIRMATION DIALOG STATE ---
  const [confirmModal, setConfirmModal] = useState({ open: false, themeId: null });
  const [applyScope, setApplyScope] = useState(hasDedicatedOverride ? "chat" : "all");

  // --- TYPOGRAPHY STATE ---
  const [typography, setTypography] = useState(() => getChatTypography());

  if (!isOpen) return null;

  const filteredThemes = activeCategory === "all"
    ? CHAT_THEMES
    : CHAT_THEMES.filter((t) => t.category === activeCategory);

  const selectedThemeObj = getChatThemeById(selectedThemeId);
  const activeFontClasses = getActiveFontClasses(typography);

  const handleOpenConfirm = (themeId) => {
    try {
      triggerHaptic("light");
      microAudio.playPop();
    } catch {
      // Audio fallback
    }
    setConfirmModal({ open: true, themeId: themeId || selectedThemeId });
  };

  const handleApplyTheme = async (themeIdToApply, applyGlobally = false) => {
    const targetId = themeIdToApply || selectedThemeId;
    try {
      setIsApplying(true);
      if (applyGlobally) {
        // Set as Global default wallpaper for this user (WhatsApp standard)
        if (currentUserId) {
          localStorage.setItem(`vybe_global_chat_theme_${currentUserId}`, targetId);
          // Clear any chat-specific override for this chat so it uses the user's new global default
          if (conversationId) {
            localStorage.removeItem(`chat_theme_${currentUserId}_${conversationId}`);
          }
        }
        localStorage.setItem("vybe_global_chat_theme", targetId);
        window.dispatchEvent(new CustomEvent("chat-theme-changed", { detail: { isGlobal: true, theme: targetId } }));
      } else {
        // Set dedicated theme for this chat for this user only (Private, No Conflict)
        if (currentUserId && conversationId) {
          localStorage.setItem(`chat_theme_${currentUserId}_${conversationId}`, targetId);
          window.dispatchEvent(new CustomEvent("chat-theme-changed", { detail: { conversationId, theme: targetId } }));
        }
      }

      const themeObj = getChatThemeById(targetId);
      snackbar.success(
        applyGlobally
          ? `Wallpaper set as default for ALL your chats (${themeObj.name}) ✨`
          : `Wallpaper set for this chat (${themeObj.name}) 🎨`
      );
      if (onThemeChanged) onThemeChanged(targetId);
      setConfirmModal({ open: false, themeId: null });
      onClose();
    } catch {
      snackbar.error("Failed to update theme");
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setIsApplying(true);
      if (currentUserId && conversationId) {
        localStorage.removeItem(`chat_theme_${currentUserId}_${conversationId}`);
        window.dispatchEvent(new CustomEvent("chat-theme-changed", { detail: { conversationId, theme: "default" } }));
      }
      snackbar.success("Reset to default chat wallpaper ✨");
      if (onThemeChanged) onThemeChanged("default");
      onClose();
    } catch {
      snackbar.error("Failed to reset theme");
    } finally {
      setIsApplying(false);
    }
  };

  const handleSelectFontSize = (sizeId) => {
    const updated = { ...typography, fontSizeId: sizeId };
    setTypography(updated);
    saveChatTypography(updated);
    try {
      triggerHaptic("light");
      microAudio.playPop();
    } catch {
      // Audio fallback
    }
  };

  const handleSelectFontStyle = (styleId) => {
    const updated = { ...typography, fontStyleId: styleId };
    setTypography(updated);
    saveChatTypography(updated);
    try {
      triggerHaptic("light");
      microAudio.playPop();
    } catch {
      // Audio fallback
    }
  };

  const targetThemeForModal = confirmModal.themeId ? getChatThemeById(confirmModal.themeId) : selectedThemeObj;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-inset border border-border rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalTab("themes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                modalTab === "themes"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-surface text-text-secondary hover:text-text"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Wallpapers</span>
            </button>

            <button
              type="button"
              onClick={() => setModalTab("typography")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                modalTab === "typography"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-surface text-text-secondary hover:text-text"
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Font & Style</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {modalTab === "themes" && (
              <div className="flex items-center bg-surface rounded-xl p-0.5 border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === "grid" ? "bg-purple-500 text-white shadow-xs" : "text-text-muted hover:text-text"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === "preview" ? "bg-purple-500 text-white shadow-xs" : "text-text-muted hover:text-text"
                  }`}
                  title="Live Preview Mode"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface hover:bg-surface-hover transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= 1. TAB: WALLPAPERS & THEMES ================= */}
        {modalTab === "themes" && (
          <>
            {viewMode === "grid" && (
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0">
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

                {/* Global vs Dedicated Status Banner */}
                {hasDedicatedOverride ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs shrink-0">
                    <span className="text-purple-300 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Custom wallpaper active for this chat</span>
                    </span>
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={handleResetToDefault}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border text-[11px] font-bold text-text-secondary hover:text-text transition cursor-pointer flex items-center gap-1"
                      title="Remove custom wallpaper and use global default"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset to Default</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface/60 border border-border/60 text-[11px] text-text-muted shrink-0">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-text-secondary" />
                      <span>Default theme active across all chats</span>
                    </span>
                    <span className="font-semibold text-text-secondary">{getChatThemeById(globalDefault || "default").name}</span>
                  </div>
                )}

                <div className="space-y-2 flex-1 overflow-y-auto hide-scrollbar pr-1">
                  {filteredThemes.map((theme) => {
                    const isSelected = selectedThemeId === theme.id;
                    const isCurrent = activeAppliedTheme === theme.id;

                    return (
                      <div
                        key={theme.id}
                        onClick={() => setSelectedThemeId(theme.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-surface border-purple-500 ring-1 ring-purple-500/40 shadow-sm"
                            : "bg-surface/60 border-border hover:border-border-strong hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl border border-border/80 relative overflow-hidden flex items-center justify-center shrink-0 shadow-inner"
                            style={theme.getBackground?.(previewIsDark) || {}}
                          >
                            <div className="absolute inset-0 bg-black/10"></div>
                            <Sparkles className="w-4 h-4 text-white drop-shadow-sm z-10" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-text truncate">{theme.name}</p>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                  Applied
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
                              setSelectedThemeId(theme.id);
                              setViewMode("preview");
                            }}
                            className="p-1.5 rounded-xl bg-surface-hover hover:bg-purple-500/20 text-text-secondary hover:text-purple-400 border border-border/80 transition cursor-pointer text-xs font-medium flex items-center gap-1"
                            title="Live Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenConfirm(theme.id);
                            }}
                            disabled={isApplying}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                              isCurrent
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs"
                                : isSelected
                                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                                : "bg-surface hover:bg-surface-hover text-text border border-border"
                            }`}
                          >
                            {isCurrent ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" />
                                <span>Applied</span>
                              </>
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

            {viewMode === "preview" && (
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-200">
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
                      title="Light Mode Preview"
                    >
                      <Sun className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIsDark(true)}
                      className={`p-1 rounded-lg transition cursor-pointer ${
                        previewIsDark ? "bg-indigo-400/20 text-indigo-400" : "text-text-muted hover:text-text"
                      }`}
                      title="Dark Mode Preview"
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mockup */}
                <div
                  className="w-full flex-1 rounded-2xl border border-border overflow-hidden relative shadow-inner p-3.5 flex flex-col justify-between transition-colors duration-300 min-h-[240px]"
                  style={selectedThemeObj.getBackground?.(previewIsDark) || {}}
                >
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-surface/80 backdrop-blur-md border border-border/60 shadow-xs mb-3">
                    <img src={dp} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text truncate leading-tight">{chatName || "Alex Rivera"}</p>
                      <p className="text-[9px] text-green-500 leading-tight">Online</p>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1 flex flex-col justify-end">
                    <div className="flex items-end gap-2 max-w-[85%] mr-auto">
                      <img src={dp} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-border" />
                      <div className={`p-2.5 rounded-2xl rounded-bl-sm text-xs space-y-1 ${selectedThemeObj.receiverBubble}`}>
                        <p className="leading-snug">Hey! How does this wallpaper look on your screen? ✨</p>
                        <span className="text-[9px] text-text-muted block text-right">10:42 AM</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end max-w-[85%] ml-auto space-y-1">
                      <div className={`p-2.5 rounded-2xl rounded-br-sm text-xs text-white space-y-1 ${selectedThemeObj.senderBubble}`}>
                        <p className="leading-snug">Looks super crisp and modern! Setting this as our chat theme 🔥</p>
                        <div className="flex items-center justify-end gap-1 text-[9px] text-white/70">
                          <span>10:43 AM</span>
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-200 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Horizontal Wallpaper Selector Slider */}
                <div className="space-y-1 shrink-0">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-text-muted">Tap to switch wallpaper</span>
                    <span className="text-[10px] text-purple-400 font-semibold">{filteredThemes.length} wallpapers</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1 px-0.5">
                    {filteredThemes.map((theme) => {
                      const isSelected = selectedThemeId === theme.id;
                      const isCurrent = activeAppliedTheme === theme.id;

                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            setSelectedThemeId(theme.id);
                            try {
                              triggerHaptic("light");
                              microAudio.playPop();
                            } catch {
                              // Audio fallback
                            }
                          }}
                          className={`flex-shrink-0 w-20 p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-1 text-center ${
                            isSelected
                              ? "bg-surface border-purple-500 ring-2 ring-purple-500/40 shadow-md scale-105"
                              : "bg-surface/60 border-border hover:border-border-strong hover:bg-surface"
                          }`}
                        >
                          <div
                            className="w-full h-10 rounded-xl border border-border/60 relative overflow-hidden flex items-center justify-center shadow-inner"
                            style={theme.getBackground?.(previewIsDark) || {}}
                          >
                            <div className="absolute inset-0 bg-black/10"></div>
                            {isCurrent && (
                              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black z-10"></span>
                            )}
                            {isSelected && (
                              <span className="z-10 p-0.5 rounded-full bg-purple-600/90 text-white shadow">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-text truncate max-w-full leading-tight">
                            {theme.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className="py-2 px-3.5 rounded-2xl bg-surface hover:bg-surface-hover border border-border text-text font-bold text-xs transition cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenConfirm(selectedThemeId)}
                    className="flex-1 py-2 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Set Wallpaper...</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= 2. TAB: CHAT FONT SIZE & STYLES ================= */}
        {modalTab === "typography" && (
          <div className="space-y-4 flex-1 overflow-y-auto hide-scrollbar">
            {/* Live Typography Preview Bubble */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="font-bold flex items-center gap-1.5 text-text">
                  <Type className="w-4 h-4 text-purple-400" />
                  <span>Preview Text Style</span>
                </span>
                <span className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider">
                  {typography.fontStyleId} • {typography.fontSizeId}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-200">
                <p className={`leading-relaxed ${activeFontClasses}`}>
                  Hey! The quick brown fox jumps over the lazy dog. 🦊✨
                </p>
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>Text Size</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FONT_SIZES.map((size) => {
                  const isSelected = typography.fontSizeId === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => handleSelectFontSize(size.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-1 text-center ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20"
                          : "bg-surface hover:bg-surface-hover text-text border-border"
                      }`}
                    >
                      <span className="text-xs font-bold">{size.name}</span>
                      <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-text-muted"}`}>
                        {size.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Style & Family Selector */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-purple-400" />
                <span>Font Family & Mood</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FONT_STYLES.map((style) => {
                  const isSelected = typography.fontStyleId === style.id;
                  return (
                    <div
                      key={style.id}
                      onClick={() => handleSelectFontStyle(style.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-surface border-purple-500 ring-1 ring-purple-500 shadow-md scale-101"
                          : "bg-surface/60 border-border hover:border-border-strong hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className="text-xs font-bold text-text truncate"
                          style={{
                            fontFamily: style.fontFamily,
                            fontWeight: style.fontWeight || "bold",
                            letterSpacing: style.letterSpacing || "normal",
                          }}
                        >
                          {style.name}
                        </span>
                        {style.tag && (
                          <span className={`text-[8.5px] px-1.5 py-0.2 rounded-md font-bold shrink-0 border ${style.badgeColor || "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}>
                            {style.tag}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[12px] text-text-muted line-clamp-1 mt-0.5"
                        style={{
                          fontFamily: style.fontFamily,
                          fontWeight: style.fontWeight || "normal",
                          letterSpacing: style.letterSpacing || "normal",
                        }}
                      >
                        {style.previewText}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto-saved footer */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-text-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Auto-saved instantly to all chats</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="py-1.5 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-border text-text font-bold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. WHATSAPP/INSTAGRAM STYLE CONFIRMATION DIALOG ================= */}
        {confirmModal.open && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-surface border border-border rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400 mb-2">
                  <Palette className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-text">Set Wallpaper</h3>
                <p className="text-xs text-text-muted">
                  Apply <span className="font-semibold text-text">{targetThemeForModal.name}</span>
                </p>
              </div>

              <div className="space-y-2">
                {/* OPTION 1: For this chat */}
                {conversationId && (
                  <div
                    onClick={() => setApplyScope("chat")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition select-none ${
                      applyScope === "chat"
                        ? "bg-purple-500/10 border-purple-500/80 ring-1 ring-purple-500/40"
                        : "bg-surface-inset border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="mt-0.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${applyScope === "chat" ? "border-purple-500 bg-purple-600" : "border-border"}`}>
                        {applyScope === "chat" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                        <span>For this chat {chatName ? `(@${chatName})` : ""}</span>
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">Only this specific conversation will use this custom wallpaper</p>
                    </div>
                  </div>
                )}

                {/* OPTION 2: For all chats */}
                <div
                  onClick={() => setApplyScope("all")}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition select-none ${
                    applyScope === "all"
                      ? "bg-purple-500/10 border-purple-500/80 ring-1 ring-purple-500/40"
                      : "bg-surface-inset border-border hover:bg-surface-hover"
                  }`}
                >
                  <div className="mt-0.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${applyScope === "all" ? "border-purple-500 bg-purple-600" : "border-border"}`}>
                      {applyScope === "all" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-text flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>For all chats in {previewIsDark ? "dark" : "light"} theme</span>
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">Sets as your standard default wallpaper across all current & future chats</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: false, themeId: null })}
                  className="flex-1 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => handleApplyTheme(confirmModal.themeId, applyScope === "all")}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Set Wallpaper"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatThemePickerModal;

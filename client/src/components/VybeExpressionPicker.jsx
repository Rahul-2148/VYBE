// client/src/components/VybeExpressionPicker.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Smile, Clock, Heart, Dog, FastForward, Activity,
  Lightbulb, Sparkles, MapPin, Flag, Plus, Trash2, Image,
  Palette, Send, Flame, MessageSquare, Wand2, Camera, Upload, Type,
  RotateCcw, Loader2
} from "lucide-react";
import {
  ANIMATED_3D_STICKERS,
  INDIAN_MEME_STICKERS,
  GENZ_MEME_STICKERS,
  ALL_BUILTIN_STICKERS,
  getRecentStickers,
  addRecentSticker,
  getCustomStickers,
  saveCustomSticker,
  deleteCustomSticker,
  createRealisticDesiSticker,
} from "../lib/stickerData";

const GIPHY_API_KEY = "Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g";

const EMOJI_CATEGORIES = [
  {
    id: "frequent",
    name: "Frequently Used",
    icon: Clock,
    emojis: ["❤️", "😂", "🔥", "✨", "👍", "😍", "🥺", "🙌", "💯", "💀", "🎉", "🚀", "💬", "🎁", "🌟", "👀", "😭", "🤯", "😎", "🥳"],
  },
  {
    id: "smileys",
    name: "Smileys & Emotion",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😇", "🥰", "😍", "🤩", "😘", "😗",
      "☺️", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🧐", "🤓", "😎", "🥸", "🥳",
      "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
      "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤔", "🫣", "🤭", "🫡", "🤫", "🫠",
      "🫥", "🤐", "🥴", "😵", "😲", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🤠", "🤡", "👻", "💀", "👽", "👾",
    ],
  },
  {
    id: "gestures",
    name: "Gestures & Hands",
    icon: Heart,
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕",
      "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳",
      "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄",
    ],
  },
  {
    id: "animals",
    name: "Animals & Nature",
    icon: Dog,
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉",
      "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝",
      "🐛", "🦋", "🐌", "🐞", "🐜", "🕷️", "🕸️", "🦂", "💐", "🌸", "💮", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷",
    ],
  },
  {
    id: "food",
    name: "Food & Drink",
    icon: FastForward,
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝",
      "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨",
      "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆",
    ],
  },
  {
    id: "activities",
    name: "Activities & Sports",
    icon: Activity,
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🎱", "🏓", "🏸", "🏒", "🏏", "⛳", "🏹", "🎣",
      "🥊", "🥋", "🛹", "🎿", "🏂", "🏋️", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚴",
    ],
  },
  {
    id: "objects",
    name: "Objects & Symbols",
    icon: Lightbulb,
    emojis: [
      "💡", "🔦", "🕯️", "💸", "💵", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "🔩", "⚙️", "🔒", "🔑", "🛡️",
      "☎️", "💻", "🖥️", "📷", "🎥", "📼", "💿", "📚", "📝", "✉️", "📦", "📌", "📎", "📁", "📂", "🗑️", "🔮",
    ],
  },
];

const STICKER_CATEGORIES = [
  { id: "all", name: "All", icon: Sparkles },
  { id: "recent", name: "Recent", icon: Clock },
  { id: "animated", name: "3D Animated", icon: Sparkles },
  { id: "indian", name: "Desi Memes", icon: Flame },
  { id: "genz", name: "Vibe & Genz", icon: Heart },
  { id: "custom", name: "My Stickers", icon: Palette },
];

const ACCESSORY_PROPS = ["🕶️", "👑", "🔥", "🧢", "💰", "⭐", "🎉", "💯"];

export const VybeExpressionPicker = ({
  initialTab = "emojis",
  onSelectEmoji,
  onSendSticker,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState("frequent");
  const [activeStickerCategory, setActiveStickerCategory] = useState("animated");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Online Animated Sticker Search
  const [onlineStickers, setOnlineStickers] = useState([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const searchDebounceRef = useRef(null);

  // Custom Stickers State
  const [recentStickers, setRecentStickers] = useState(() => getRecentStickers());
  const [customStickers, setCustomStickers] = useState(() => getCustomStickers());
  
  // Custom Studio Creator State
  const [showStudio, setShowStudio] = useState(false);
  const [studioMode, setStudioMode] = useState("photo"); // "photo" | "text"
  const [uploadedImageSrc, setUploadedImageSrc] = useState(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [selectedProp, setSelectedProp] = useState(null);
  const [characterName, setCharacterName] = useState("Babu Bhaiya");
  const [dialogueText, setDialogueText] = useState("Paisa Hi Paisa Hoga!");
  const [dialogueTag, setDialogueTag] = useState("Hera Pheri");
  const [dialogueEmoji, setDialogueEmoji] = useState("🤑");
  
  const popoverRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        !e.target.closest("[data-expression-trigger]")
      ) {
        onClose?.();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Live GIPHY Animated Sticker Search
  const performOnlineStickerSearch = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setOnlineStickers([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);
    try {
      // 1. Search animated stickers first
      const stickerRes = await fetch(
        `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          query.trim()
        )}&limit=24&rating=g`
      );
      const stickerData = await stickerRes.json();
      let results = (stickerData.data || []).map((item) => ({
        id: `giphy_st_${item.id}`,
        name: item.title || query,
        category: "online",
        url: item.images?.fixed_height?.url || item.images?.downsized?.url || item.images?.original?.url,
      }));

      // 2. If fewer than 8 stickers, also fetch animated GIFs for richer meme results
      if (results.length < 8) {
        const gifRes = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
            query.trim()
          )}&limit=16&rating=g`
        );
        const gifData = await gifRes.json();
        const gifResults = (gifData.data || []).map((item) => ({
          id: `giphy_gif_${item.id}`,
          name: item.title || query,
          category: "online",
          url: item.images?.fixed_height?.url || item.images?.downsized?.url || item.images?.original?.url,
        }));
        results = [...results, ...gifResults];
      }

      setOnlineStickers(results.filter((r) => Boolean(r.url)));
    } catch (err) {
      console.warn("Online sticker search error:", err);
    } finally {
      setIsSearchingOnline(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "stickers") return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchQuery.trim()) {
      searchDebounceRef.current = setTimeout(() => {
        performOnlineStickerSearch(searchQuery);
      }, 350);
    } else {
      const timer = setTimeout(() => {
        setOnlineStickers([]);
        setIsSearchingOnline(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab, performOnlineStickerSearch]);

  // Redraw Canvas for Photo Sticker Studio
  useEffect(() => {
    if (!showStudio || studioMode !== "photo" || !uploadedImageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = uploadedImageSrc;

    img.onload = () => {
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);

      ctx.save();

      // Draw Die-cut white border
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 6;
      ctx.fill();

      // Clip image in inner circle
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 18, 0, Math.PI * 2);
      ctx.clip();

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 18, 18, size - 36, size - 36);
      ctx.restore();

      if (selectedProp) {
        ctx.font = "52px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(selectedProp, size / 2, 70);
      }

      if (topText.trim()) {
        ctx.font = "900 22px 'Impact', 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4.5;
        ctx.strokeText(topText.toUpperCase(), size / 2, 45);
        ctx.fillText(topText.toUpperCase(), size / 2, 45);
      }

      if (bottomText.trim()) {
        ctx.font = "900 22px 'Impact', 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4.5;
        ctx.strokeText(bottomText.toUpperCase(), size / 2, size - 35);
        ctx.fillText(bottomText.toUpperCase(), size / 2, size - 35);
      }
    };
  }, [showStudio, studioMode, uploadedImageSrc, topText, bottomText, selectedProp]);

  // Emojis Filter
  const currentEmojiCategory = EMOJI_CATEGORIES.find((c) => c.id === activeEmojiCategory) || EMOJI_CATEGORIES[0];
  const filteredEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((emoji) => emoji.includes(searchQuery.trim()))
    : currentEmojiCategory.emojis;

  // Stickers Filter
  const getStickersByCategory = () => {
    if (activeStickerCategory === "recent") return recentStickers;
    if (activeStickerCategory === "animated") return ANIMATED_3D_STICKERS;
    if (activeStickerCategory === "indian") return INDIAN_MEME_STICKERS;
    if (activeStickerCategory === "genz") return GENZ_MEME_STICKERS;
    if (activeStickerCategory === "custom") return customStickers;
    return [...customStickers, ...ALL_BUILTIN_STICKERS];
  };

  const currentStickers = getStickersByCategory();
  const localFilteredStickers = searchQuery.trim()
    ? ALL_BUILTIN_STICKERS.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentStickers;

  const displayStickers = searchQuery.trim()
    ? [...onlineStickers, ...localFilteredStickers]
    : currentStickers;

  const handleSelectSticker = (sticker) => {
    addRecentSticker(sticker);
    setRecentStickers(getRecentStickers());
    if (onSendSticker) {
      onSendSticker({
        id: sticker.id,
        name: sticker.name,
        url: sticker.url,
        dataUrl: sticker.url,
        type: "sticker",
      });
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImageSrc(event.target.result);
      setStudioMode("photo");
      setShowStudio(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSavePhotoSticker = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const newSticker = {
      id: `custom_${Date.now()}`,
      name: topText || bottomText || "Custom Photo Sticker",
      category: "custom",
      url: dataUrl,
    };

    const updated = saveCustomSticker(newSticker);
    setCustomStickers(updated);
    setShowStudio(false);
    setUploadedImageSrc(null);
    setTopText("");
    setBottomText("");
    setSelectedProp(null);
    handleSelectSticker(newSticker);
  };

  const handleSaveDialogueSticker = (e) => {
    e.preventDefault();
    if (!dialogueText.trim()) return;

    const newSticker = {
      id: `custom_dlg_${Date.now()}`,
      name: dialogueText.trim(),
      category: "custom",
      url: createRealisticDesiSticker({
        character: characterName.trim() || "Desi Vibe",
        dialogue: dialogueText.trim(),
        hindiDialogue: "",
        movie: dialogueTag.trim() || "Original",
        theme: "purple",
        badgeIcon: dialogueEmoji || "🔥",
        badgeBg: "#7c3aed",
        dialogueColor: "#ffffff",
      }),
    };

    const updated = saveCustomSticker(newSticker);
    setCustomStickers(updated);
    setShowStudio(false);
    handleSelectSticker(newSticker);
  };

  const handleDeleteCustomSticker = (e, id) => {
    e.stopPropagation();
    const updated = deleteCustomSticker(id);
    setCustomStickers(updated);
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-12 sm:bottom-14 left-0 sm:left-auto right-0 sm:right-auto z-[250] w-full sm:w-96 max-w-[calc(100vw-1.5rem)] h-[380px] sm:h-[430px] max-h-[75vh] bg-surface/98 border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur-2xl ring-1 ring-border/50 select-none"
    >
      {/* ── 1. TOP HEADER: EMOJIS VS STICKERS ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-surface-inset/80">
        <div className="flex items-center gap-1.5 bg-surface/80 p-1 rounded-2xl border border-border/80">
          <button
            type="button"
            onClick={() => setActiveTab("emojis")}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "emojis"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stickers")}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "stickers"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Animated Stickers</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-surface transition cursor-pointer"
          title="Close Picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── 2. SEARCH BAR ── */}
      <div className="p-2.5 border-b border-border/60 bg-surface/30">
        <div className="relative flex items-center">
          {isSearchingOnline ? (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin absolute left-3 pointer-events-none" />
          ) : (
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 pointer-events-none" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "emojis"
                ? "Search emoji..."
                : "Search live animated stickers (e.g. jethalal, hera pheri, cat)..."
            }
            className="w-full bg-surface-inset border border-border text-xs rounded-2xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-primary text-text placeholder-text-muted transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-text-muted hover:text-text text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── 3. EMOJIS VIEW ── */}
      {activeTab === "emojis" && (
        <div className="flex-1 flex flex-col min-h-0">
          {!searchQuery.trim() && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-border/40 overflow-x-auto hide-scrollbar bg-surface/20 shrink-0">
              {EMOJI_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                const isActive = activeEmojiCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveEmojiCategory(category.id)}
                    title={category.name}
                    className={`p-2 rounded-xl transition shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-text-muted hover:text-text hover:bg-surface"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
            <div className="grid grid-cols-7 gap-2">
              {filteredEmojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:scale-125 transition duration-150 cursor-pointer rounded-xl hover:bg-surface-hover active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. STICKERS VIEW ── */}
      {activeTab === "stickers" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sticker Category Bar */}
          {!searchQuery.trim() && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 overflow-x-auto hide-scrollbar bg-surface/20 shrink-0">
              {STICKER_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeStickerCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveStickerCategory(cat.id);
                      setShowStudio(false);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer shrink-0 ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface border border-border text-text-secondary hover:text-text hover:bg-surface-hover"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cat.name}</span>
                    {cat.id === "custom" && customStickers.length > 0 && (
                      <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full">
                        {customStickers.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Hidden File Input for Custom Photo Sticker Studio */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
          />

          {/* ── CUSTOM STICKER STUDIO DRAWER ── */}
          {showStudio ? (
            <div className="flex-1 overflow-y-auto p-3.5 hide-scrollbar space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStudioMode("photo")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                      studioMode === "photo" ? "bg-primary text-white" : "bg-surface text-text-secondary"
                    }`}
                  >
                    📸 Photo Sticker
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode("text")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                      studioMode === "text" ? "bg-primary text-white" : "bg-surface text-text-secondary"
                    }`}
                  >
                    ✍️ Dialogue Sticker
                  </button>
                </div>
                <button
                  onClick={() => setShowStudio(false)}
                  className="text-text-muted hover:text-text p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* PHOTO STICKER MAKER */}
              {studioMode === "photo" && (
                <div className="space-y-2.5">
                  {!uploadedImageSrc ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-44 border-2 border-dashed border-primary/50 hover:border-primary rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-surface/50 hover:bg-surface transition"
                    >
                      <Camera className="w-8 h-8 text-primary mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-text">Click to Upload Any Photo</p>
                      <p className="text-[10px] text-text-muted mt-1">Converts your photo into a real die-cut sticker!</p>
                    </div>
                  ) : (
                    <>
                      {/* Live Canvas Preview */}
                      <div className="flex items-center justify-center p-1">
                        <canvas
                          ref={canvasRef}
                          className="w-36 h-36 rounded-2xl drop-shadow-xl border border-white/20 bg-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-text-muted uppercase">Top Caption</label>
                          <input
                            type="text"
                            maxLength={15}
                            value={topText}
                            onChange={(e) => setTopText(e.target.value)}
                            placeholder="e.g. ME WHEN"
                            className="w-full bg-surface-inset border border-border rounded-xl px-2.5 py-1 text-xs text-text outline-none focus:border-primary mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-text-muted uppercase">Bottom Caption</label>
                          <input
                            type="text"
                            maxLength={15}
                            value={bottomText}
                            onChange={(e) => setBottomText(e.target.value)}
                            placeholder="e.g. EXAM CANCELLED"
                            className="w-full bg-surface-inset border border-border rounded-xl px-2.5 py-1 text-xs text-text outline-none focus:border-primary mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase">Sticker Props / Accessories</label>
                        <div className="flex gap-1.5 mt-1 overflow-x-auto hide-scrollbar py-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProp(null)}
                            className={`px-2 py-1 text-xs rounded-lg border ${
                              selectedProp === null ? "bg-primary text-white border-primary" : "border-border text-text-muted"
                            }`}
                          >
                            None
                          </button>
                          {ACCESSORY_PROPS.map((prop) => (
                            <button
                              key={prop}
                              type="button"
                              onClick={() => setSelectedProp(prop)}
                              className={`p-1 text-base rounded-lg transition cursor-pointer ${
                                selectedProp === prop ? "bg-primary/20 border border-primary scale-110" : "hover:bg-surface"
                              }`}
                            >
                              {prop}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSavePhotoSticker}
                          className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Create & Send Sticker</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="py-2 px-3 bg-surface hover:bg-surface-hover border border-border text-text font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* DIALOGUE STICKER MAKER */}
              {studioMode === "text" && (
                <form onSubmit={handleSaveDialogueSticker} className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase">Character / Name</label>
                    <input
                      type="text"
                      maxLength={18}
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      placeholder="e.g. Babu Bhaiya / Munna"
                      className="w-full bg-surface-inset border border-border rounded-xl px-2.5 py-1.5 text-xs text-text outline-none focus:border-primary mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase">Punchline / Dialogue</label>
                    <input
                      type="text"
                      required
                      maxLength={25}
                      value={dialogueText}
                      onChange={(e) => setDialogueText(e.target.value)}
                      placeholder="e.g. Yeh Baburao Ka Style Hai!"
                      className="w-full bg-surface-inset border border-border rounded-xl px-2.5 py-1.5 text-xs text-text outline-none focus:border-primary mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase">Avatar Emoji</label>
                      <div className="flex gap-1 mt-1 overflow-x-auto hide-scrollbar py-0.5">
                        {["🔥", "👓", "🤑", "👑", "💀", "😂", "⚡", "🕶️"].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setDialogueEmoji(em)}
                            className={`p-1.5 text-sm rounded-lg cursor-pointer ${
                              dialogueEmoji === em ? "bg-primary/20 border border-primary" : "hover:bg-surface-hover"
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase">Movie / Tag</label>
                      <input
                        type="text"
                        maxLength={15}
                        value={dialogueTag}
                        onChange={(e) => setDialogueTag(e.target.value)}
                        placeholder="e.g. Mirzapur"
                        className="w-full bg-surface-inset border border-border rounded-xl px-2.5 py-1 text-xs text-text outline-none focus:border-primary mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Create & Send</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStudio(false)}
                      className="py-2 px-3 bg-surface hover:bg-surface-hover border border-border text-text font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ── REGULAR STICKERS GRID ── */
            <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
              {/* Studio Banner for Custom Tab */}
              {activeStickerCategory === "custom" && !searchQuery && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStudioMode("photo");
                      setShowStudio(true);
                    }}
                    className="p-2.5 bg-surface hover:bg-surface-hover border border-dashed border-primary/60 rounded-2xl flex items-center justify-center gap-2 text-primary font-bold text-xs cursor-pointer transition shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Photo Sticker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStudioMode("text");
                      setShowStudio(true);
                    }}
                    className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition shadow-xs"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Text Sticker</span>
                  </button>
                </div>
              )}

              {/* Online Search Header Indicator */}
              {searchQuery.trim() && (
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-bold text-text-muted flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Live Animated Results for "{searchQuery}"
                  </span>
                  <span className="text-[10px] text-text-muted font-medium">
                    {displayStickers.length} results
                  </span>
                </div>
              )}

              {/* Empty state */}
              {displayStickers.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-text-muted">
                  {isSearchingOnline ? (
                    <>
                      <Loader2 className="w-8 h-8 mb-2 animate-spin text-primary" />
                      <p className="text-xs font-bold text-text">Searching live animated stickers...</p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-8 h-8 mb-2 opacity-30 text-primary" />
                      <p className="text-xs font-bold text-text">
                        {activeStickerCategory === "recent"
                          ? "No recent stickers yet"
                          : activeStickerCategory === "custom"
                          ? "No custom stickers created yet"
                          : "No matching stickers found"}
                      </p>
                      <p className="text-[11px] mt-1 text-text-muted max-w-[220px]">
                        {activeStickerCategory === "recent"
                          ? "Send any sticker to see it appear in your recents tray!"
                          : activeStickerCategory === "custom"
                          ? "Use the Photo or Text buttons above to create your own custom stickers!"
                          : "Try searching another phrase or check other categories."}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {displayStickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      onClick={() => handleSelectSticker(sticker)}
                      className="group relative aspect-square bg-surface hover:bg-surface-hover border border-border hover:border-primary/60 rounded-2xl p-2 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center shadow-xs hover:scale-105 active:scale-95 overflow-hidden"
                    >
                      <img
                        src={sticker.url}
                        alt={sticker.name}
                        className="w-full h-full object-contain select-none drop-shadow-sm group-hover:drop-shadow-md transition"
                        loading="lazy"
                      />

                      {/* Custom Delete Button */}
                      {sticker.category === "custom" && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomSticker(e, sticker.id)}
                          className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer hover:scale-110 shadow"
                          title="Delete Custom Sticker"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {/* Sticker Name Pill */}
                      {sticker.name && (
                        <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-text bg-surface/90 border border-border rounded-md py-0.5 opacity-0 group-hover:opacity-100 transition text-center truncate shadow-xs">
                          {sticker.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VybeExpressionPicker;

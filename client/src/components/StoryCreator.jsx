import React, { useRef, useState, useEffect } from "react";
import {
  X,
  Type,
  Smile,
  Music,
  Pencil,
  Send,
  RotateCw,
  Camera,
  Trash2,
  Palette,
  Star,
  Image as ImageIcon,
  Loader2,
  Check,
  Download,
  Sparkles,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  Plus,
  Quote,
  Flame,
  Zap,
  BookOpen,
  Eye,
  Settings,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/axios";
import { setStoryFeed } from "../redux/features/storySlice";
import StoryMusicPickerModal from "./StoryMusicPickerModal";
import StoryStickersDrawer from "./StoryStickersDrawer";
import dp from "../assets/dp3.png";

// Text Story Fonts
const FONTS = [
  { id: "classic", name: "Classic", className: "font-sans font-bold" },
  { id: "modern", name: "Modern", className: "font-mono uppercase tracking-widest font-bold" },
  { id: "neon", name: "Neon", className: "font-serif italic font-black" },
  { id: "typewriter", name: "Typewriter", className: "font-mono font-medium" },
  { id: "bold", name: "Bold", className: "font-extrabold tracking-tight" },
  { id: "serif", name: "Editorial", className: "font-serif font-bold tracking-normal" },
];

// Rich Instagram-Style Text Story Theme Templates
const TEXT_THEMES = [
  {
    id: "sunset_aura",
    name: "Sunset Aura",
    gradient: "from-amber-500 via-rose-600 to-purple-800",
    font: FONTS[4], // Bold
    textColor: "#ffffff",
    highlightStyle: "glass",
    icon: "🌅",
  },
  {
    id: "neon_cyber",
    name: "Cyberpunk",
    gradient: "from-cyan-500 via-indigo-900 to-purple-950",
    font: FONTS[2], // Neon
    textColor: "#22d3ee",
    highlightStyle: "neon",
    icon: "⚡",
  },
  {
    id: "midnight_gold",
    name: "Midnight Noir",
    gradient: "from-zinc-950 via-neutral-900 to-black",
    font: FONTS[5], // Editorial
    textColor: "#fef08a",
    highlightStyle: "solid",
    icon: "✨",
  },
  {
    id: "pastel_dream",
    name: "Pastel Dream",
    gradient: "from-pink-400 via-purple-300 to-indigo-400",
    font: FONTS[0], // Classic
    textColor: "#ffffff",
    highlightStyle: "glass",
    icon: "🌸",
  },
  {
    id: "flame_energy",
    name: "Flame Pulse",
    gradient: "from-red-600 via-orange-600 to-amber-500",
    font: FONTS[4], // Bold
    textColor: "#ffffff",
    highlightStyle: "solid",
    icon: "🔥",
  },
  {
    id: "emerald_luxury",
    name: "Emerald Glow",
    gradient: "from-emerald-950 via-teal-900 to-cyan-950",
    font: FONTS[1], // Modern
    textColor: "#a7f3d0",
    highlightStyle: "neon",
    icon: "💎",
  },
  {
    id: "vintage_journal",
    name: "Vintage Diary",
    gradient: "from-amber-950 via-stone-900 to-zinc-950",
    font: FONTS[3], // Typewriter
    textColor: "#fed7aa",
    highlightStyle: "transparent",
    icon: "📜",
  },
  {
    id: "aurora_hologram",
    name: "Aurora Borealis",
    gradient: "from-violet-600 via-fuchsia-600 to-cyan-500",
    font: FONTS[0], // Classic
    textColor: "#ffffff",
    highlightStyle: "glass",
    icon: "🌌",
  },
  {
    id: "card_minimal",
    name: "Clean Minimal",
    gradient: "from-zinc-900 via-zinc-900 to-zinc-950",
    font: FONTS[0], // Classic
    textColor: "#ffffff",
    highlightStyle: "transparent",
    icon: "🖤",
  },
];

// Color Swatches
const COLORS = [
  "#ffffff",
  "#000000",
  "#f43f5e",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#84cc16",
  "#eab308",
  "#f97316",
];

// 11 Instagram Photo/Video Filters
const FILTERS = [
  { id: "none", name: "Normal", class: "", canvasFilter: "none" },
  { id: "clarendon", name: "Clarendon", class: "contrast-[1.20] saturate-[1.25] hue-rotate-[-5deg]", canvasFilter: "contrast(120%) saturate(125%) hue-rotate(-5deg)" },
  { id: "juno", name: "Juno", class: "sepia-[0.20] contrast-[1.15] saturate-[1.30] hue-rotate-[10deg]", canvasFilter: "sepia(20%) contrast(115%) saturate(130%) hue-rotate(10deg)" },
  { id: "lark", name: "Lark", class: "brightness-[1.10] contrast-[0.90] saturate-[0.95]", canvasFilter: "brightness(110%) contrast(90%) saturate(95%)" },
  { id: "gingham", name: "Gingham", class: "brightness-[1.05] contrast-[0.85] sepia-[0.30] saturate-[0.85]", canvasFilter: "brightness(105%) contrast(85%) sepia(30%) saturate(85%)" },
  { id: "crema", name: "Crema", class: "sepia-[0.45] contrast-[0.95] brightness-[1.05] saturate-[0.90]", canvasFilter: "sepia(45%) contrast(95%) brightness(105%) saturate(90%)" },
  { id: "aden", name: "Aden", class: "hue-rotate-[-10deg] saturate-[0.85] contrast-[0.90] brightness-[1.15] sepia-[0.20]", canvasFilter: "hue-rotate(-10deg) saturate(85%) contrast(90%) brightness(115%) sepia(20%)" },
  { id: "ludwig", name: "Ludwig", class: "contrast-[1.05] saturate-[0.95] sepia-[0.10]", canvasFilter: "contrast(105%) saturate(95%) sepia(10%)" },
  { id: "slumber", name: "Slumber", class: "saturate-[0.60] sepia-[0.40] contrast-[0.80] brightness-[1.00]", canvasFilter: "saturate(60%) sepia(40%) contrast(80%) brightness(100%)" },
  { id: "reyes", name: "Reyes", class: "sepia-[0.35] brightness-[1.10] contrast-[0.85] saturate-[0.75]", canvasFilter: "sepia(35%) brightness(110%) contrast(85%) saturate(75%)" },
  { id: "moon", name: "Moon", class: "grayscale-[1.0] contrast-[1.10] brightness-[1.10]", canvasFilter: "grayscale(100%) contrast(110%) brightness(110%)" },
];

export const StoryCreator = ({ onClose, initialState }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  // Story Mode: 'media' | 'text' | 'templates'
  const [mode, setMode] = useState("media");

  // Multi-item Queue state (upload multiple stories in 1 go)
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sharedEntityData, setSharedEntityData] = useState(initialState?.sharedEntity || null);

  useEffect(() => {
    if (initialState?.initialMediaUrl) {
      const isVid = initialState.initialMediaUrl.endsWith(".mp4") || initialState.initialMediaUrl.includes("/video/");
      setItems([
        {
          preview: initialState.initialMediaUrl,
          mediaType: isVid ? "video" : "image",
          file: null,
          stickers: [],
          filter: "none",
          isShared: true,
        },
      ]);
    }
  }, [initialState]);

  const activeItem = items[activeIndex] || null;
  const mediaPreview = activeItem?.preview || null;
  const mediaType = activeItem?.mediaType || "image";
  const selectedFile = activeItem?.file || null;
  const stickers = activeItem?.stickers || [];
  const filter = activeItem?.filter || "none";

  // Camera State
  const [useCamera, setUseCamera] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  // Text Story State & Themes
  const [activeTheme, setActiveTheme] = useState(TEXT_THEMES[0]);
  const [textContent, setTextContent] = useState("");
  const [selectedFont, setSelectedFont] = useState(TEXT_THEMES[0].font);
  const [textColor, setTextColor] = useState(TEXT_THEMES[0].textColor);
  const [highlightStyle, setHighlightStyle] = useState(TEXT_THEMES[0].highlightStyle); // 'transparent' | 'solid' | 'glass' | 'neon'
  const [textAlign, setTextAlign] = useState("center"); // 'left' | 'center' | 'right'

  // Privacy Target
  const [visibleTo, setVisibleTo] = useState("public");

  // Modals & Panels
  const [showStickersDrawer, setShowStickersDrawer] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showThemesDrawer, setShowThemesDrawer] = useState(false);
  const [customOverlayText, setCustomOverlayText] = useState("");

  // Music Data
  const [selectedMusic, setSelectedMusic] = useState(null);

  // Dragging state
  const [activeDragIdx, setActiveDragIdx] = useState(null);
  const [selectedStickerIdx, setSelectedStickerIdx] = useState(null);
  const startDragPosition = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const fileInputRef = useRef(null);
  const additionalFileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#f43f5e");
  const [brushSize, setBrushSize] = useState(6);

  // 1. Live Camera Handlers
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setUseCamera(true);
      setItems([]);
      setActiveIndex(0);
    } catch (err) {
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext("2d");

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], `capture_${Date.now()}.png`, { type: "image/png" });
      const newItem = {
        file,
        preview: URL.createObjectURL(blob),
        mediaType: "image",
        stickers: [],
        filter: "none",
      };
      setItems((prev) => [...prev, newItem]);
      setActiveIndex(items.length);
      stopCamera();
    }, "image/png");
  };

  useEffect(() => {
    if (useCamera) {
      startCamera();
    }
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // 2. Drag & Drop Sticker Repositioning
  const handleStartDrag = (e, index) => {
    e.preventDefault();
    setActiveDragIdx(index);
    setSelectedStickerIdx(index);

    const targetItem = items[activeIndex];
    const sticker = targetItem?.stickers?.[index];
    if (sticker) {
      startDragPosition.current = {
        x: sticker.position?.x || 50,
        y: sticker.position?.y || 50,
      };
    }
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (activeDragIdx === null) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;

      x = Math.max(8, Math.min(92, x));
      y = Math.max(8, Math.min(92, y));

      setItems((prev) => {
        if (!prev[activeIndex]) return prev;
        const next = [...prev];
        const activeStickers = [...(next[activeIndex].stickers || [])];
        activeStickers[activeDragIdx] = {
          ...activeStickers[activeDragIdx],
          position: { x, y },
        };
        next[activeIndex] = {
          ...next[activeIndex],
          stickers: activeStickers,
        };
        return next;
      });
    };

    const handleEnd = () => {
      if (activeDragIdx !== null) {
        setItems((prev) => {
          if (!prev[activeIndex]) return prev;
          const sticker = prev[activeIndex].stickers?.[activeDragIdx];
          if (sticker) {
            // Delete if dropped in bottom trash bin
            if (sticker.position?.y > 82) {
              toast.success("Sticker removed");
              const next = [...prev];
              next[activeIndex] = {
                ...next[activeIndex],
                stickers: next[activeIndex].stickers.filter((_, i) => i !== activeDragIdx),
              };
              setSelectedStickerIdx(null);
              return next;
            }

            // Quick click toggle style
            const dragX = Math.abs((sticker.position?.x || 50) - (startDragPosition.current?.x || 50));
            const dragY = Math.abs((sticker.position?.y || 50) - (startDragPosition.current?.y || 50));

            if (dragX < 1.5 && dragY < 1.5) {
              const next = [...prev];
              const updatedSticker = { ...next[activeIndex].stickers[activeDragIdx] };
              updatedSticker.styleIndex =
                ((updatedSticker.styleIndex || 0) + 1) %
                (updatedSticker.type === "music_sticker" ? 4 : 3);
              next[activeIndex].stickers[activeDragIdx] = updatedSticker;
              return next;
            }
          }
          return prev;
        });
        setActiveDragIdx(null);
      }
    };

    if (activeDragIdx !== null) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [activeDragIdx, activeIndex]);

  const handleSetFilter = (newFilterId) => {
    setItems((prev) => {
      if (!prev[activeIndex]) return prev;
      const next = [...prev];
      next[activeIndex] = {
        ...next[activeIndex],
        filter: newFilterId,
      };
      return next;
    });
  };

  // Apply Theme Template
  const handleSelectTheme = (theme) => {
    setActiveTheme(theme);
    setSelectedFont(theme.font);
    setTextColor(theme.textColor);
    setHighlightStyle(theme.highlightStyle);
    setShowThemesDrawer(false);
    toast(`Applied Theme: ${theme.name}`, { icon: theme.icon });
  };

  // 3. File Input Select (Initial & Multi-Slide Addition)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      mediaType: file.type.includes("video") ? "video" : "image",
      stickers: [],
      filter: "none",
    }));

    setItems((prev) => [...prev, ...newItems]);
    setActiveIndex(items.length);
    setMode("media");
    stopCamera();
  };

  // Remove slide from multi-queue
  const handleRemoveSlide = (idx, e) => {
    e.stopPropagation();
    setItems((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      if (activeIndex >= filtered.length) {
        setActiveIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  // 4. Drawing Canvas Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // 5. Add Text Overlay to Media
  const handleAddTextOverlay = () => {
    if (!customOverlayText.trim()) return;
    handleAddSticker({
      type: "overlay",
      overlay: {
        text: customOverlayText.trim(),
        icon: "",
      },
    });
    setCustomOverlayText("");
    setShowTextModal(false);
  };

  // 6. Add Sticker
  const handleAddSticker = (sticker) => {
    setItems((prev) => {
      const next = [...prev];
      if (mode === "text") {
        if (!next[0]) {
          next[0] = { preview: null, mediaType: "text", stickers: [], filter: "none" };
        }
        next[0].stickers = [
          ...(next[0].stickers || []),
          { ...sticker, position: { x: 50, y: 50 }, scale: 1, styleIndex: 0 },
        ];
        return next;
      }

      if (!next[activeIndex]) {
        toast.error("Please add a photo or video first");
        return prev;
      }
      const currentStickers = next[activeIndex].stickers || [];
      next[activeIndex] = {
        ...next[activeIndex],
        stickers: [
          ...currentStickers,
          { ...sticker, position: { x: 50, y: 50 }, scale: 1, styleIndex: 0 },
        ],
      };
      return next;
    });
    setShowStickersDrawer(false);
    toast.success("Sticker added! Drag to position.");
  };

  // 7. Download Crafted Story
  const handleDownloadStory = () => {
    if (!mediaPreview) return;
    const a = document.createElement("a");
    a.href = mediaPreview;
    a.download = `vybe-story-${Date.now()}.${mediaType === "video" ? "mp4" : "png"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Story downloaded to device!");
  };

  // 8. Publish Stories Batch
  const handlePublishStory = async () => {
    if (mode === "text" && !textContent.trim()) {
      toast.error("Please write something in your text story");
      return;
    }

    if (mode === "media" && items.length === 0 && !useCamera) {
      toast.error("Please select a photo or video");
      return;
    }

    setIsLoading(true);
    setUploadProgressText("Sharing story...");

    try {
      if (mode === "text") {
        const textStickers = items[0]?.stickers || [];
        const res = await api.post("/story/upload", {
          mediaType: "text",
          caption: textContent.trim(),
          mediaUrl: `text_theme_${activeTheme.id}`,
          stickers: JSON.stringify(textStickers),
          visibleTo,
          music: selectedMusic ? JSON.stringify(selectedMusic) : null,
        });

        if (res.data?.success) {
          toast.success("Story published! ✨");
          api.get("/story/feed").then((feedRes) => {
            if (feedRes.data?.success) dispatch(setStoryFeed(feedRes.data.feed));
          });
          setIsLoading(false);
          if (onClose) onClose();
          else navigate("/");
        }
        return;
      }

      // Media Stories Batch Upload (Uploads all multi-slides in sequence)
      for (let i = 0; i < items.length; i++) {
        setUploadProgressText(`Uploading slide ${i + 1} of ${items.length}...`);
        const item = items[i];
        const formData = new FormData();

        if (item.file) {
          formData.append("media", item.file);
        } else if (item.preview) {
          formData.append("mediaUrl", item.preview);
        }

        formData.append("mediaType", item.mediaType);
        formData.append("filter", item.filter || "none");
        formData.append("visibleTo", visibleTo);
        formData.append("stickers", JSON.stringify(item.stickers || []));

        if (selectedMusic) {
          formData.append("music", JSON.stringify(selectedMusic));
        }

        if (sharedEntityData) {
          formData.append("sharedEntity", JSON.stringify(sharedEntityData));
        }

        await api.post("/story/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success("Stories published successfully! 🚀");
      api.get("/story/feed").then((feedRes) => {
        if (feedRes.data?.success) dispatch(setStoryFeed(feedRes.data.feed));
      });

      setIsLoading(false);
      if (onClose) onClose();
      else navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish story.");
      setIsLoading(false);
    }
  };

  // Render stickers overlay inside editor
  const renderStickersInEditor = () => {
    const targetStickers = mode === "text" ? items[0]?.stickers || [] : stickers;

    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {targetStickers.map((s, index) => {
          return (
            <div
              key={index}
              onMouseDown={(e) => handleStartDrag(e, index)}
              onTouchStart={(e) => handleStartDrag(e, index)}
              style={{
                position: "absolute",
                left: `${s.position?.x || 50}%`,
                top: `${s.position?.y || 50}%`,
                transform: `translate(-50%, -50%) scale(${s.scale || 1})`,
                pointerEvents: "auto",
                cursor: "grab",
              }}
              className={`transition-shadow duration-150 select-none ${
                selectedStickerIdx === index ? "ring-2 ring-rose-500 rounded-2xl p-1" : ""
              }`}
            >
              {/* 1. Poll */}
              {s.type === "poll" && (
                <div className="bg-white/95 text-black rounded-2xl p-3 shadow-2xl text-center w-52 border border-white/40">
                  <p className="font-bold text-xs mb-2">{s.poll?.question || "Ask a question..."}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 py-1.5 bg-black/10 rounded-xl font-bold text-xs">Yes</div>
                    <div className="flex-1 py-1.5 bg-black/10 rounded-xl font-bold text-xs">No</div>
                  </div>
                </div>
              )}

              {/* 2. Quiz */}
              {s.type === "quiz" && (
                <div className="bg-white/95 text-black rounded-2xl p-3 shadow-2xl text-center w-52 border border-white/40">
                  <p className="font-bold text-xs mb-2">{s.quiz?.question || "Quiz question..."}</p>
                  <div className="space-y-1">
                    {(s.quiz?.options || ["Option A", "Option B"]).map((opt, i) => (
                      <div key={i} className="py-1 bg-black/10 rounded-lg text-[10px] font-bold">
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Question */}
              {s.type === "question" && (
                <div className="bg-white/95 text-black rounded-2xl p-3 shadow-2xl text-center w-52 border border-white/40">
                  <p className="font-bold text-[11px] mb-2">{s.question?.prompt || "Ask me a question"}</p>
                  <div className="w-full h-7 rounded-lg bg-black/10" />
                </div>
              )}

              {/* 4. Slider */}
              {s.type === "slider" && (
                <div className="bg-white/95 text-black rounded-2xl p-2.5 shadow-2xl flex items-center gap-2 w-52 border border-white/40">
                  <span className="text-xl">{s.slider?.emoji || "🔥"}</span>
                  <div className="flex-1 h-1.5 bg-black/20 rounded-full relative">
                    <div className="w-4 h-4 bg-orange-500 rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 shadow" />
                  </div>
                </div>
              )}

              {/* 5. Countdown */}
              {s.type === "countdown" && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-3 shadow-2xl text-center space-y-1 w-48">
                  <span className="font-bold text-[10px] uppercase tracking-wider">{s.countdown?.title || "Countdown"}</span>
                  <div className="flex justify-center gap-2 text-sm font-black font-mono py-1">
                    <div>23h</div>
                    <div>59m</div>
                  </div>
                </div>
              )}

              {/* 6. Link */}
              {s.type === "link" && (
                <span className="inline-flex items-center gap-1 px-4 py-2 font-extrabold text-[11px] rounded-full shadow-2xl bg-white text-black border border-white/40">
                  🔗 {s.link?.title || s.link?.url}
                </span>
              )}

              {/* 7. Music Sticker */}
              {s.type === "music_sticker" && s.music_sticker && (
                <div className="bg-black/70 border border-white/20 backdrop-blur-md rounded-full p-2 flex items-center gap-2.5 text-left w-52 shadow-2xl text-white">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shrink-0 animate-spin-slow">
                    <Music className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black truncate">{s.music_sticker.title}</p>
                    <p className="text-[8px] text-white/70 font-semibold truncate">{s.music_sticker.artist}</p>
                  </div>
                </div>
              )}

              {/* 8. Text Overlay */}
              {s.type === "overlay" && (
                <div className="bg-white/95 text-black px-4 py-2 rounded-2xl shadow-2xl font-black text-sm border border-white/40">
                  {s.overlay?.text}
                </div>
              )}

              {/* 9. Emoji */}
              {s.type === "emoji" && (
                <div className="text-5xl text-center select-none drop-shadow-2xl">
                  {s.emoji?.val}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const resolvedFilterClass = FILTERS.find((f) => f.id === filter)?.class || "";

  // Text highlight wrapper class
  const getHighlightClass = () => {
    if (highlightStyle === "solid") return "bg-black/80 text-white px-4 py-2 rounded-2xl shadow-2xl border border-white/20";
    if (highlightStyle === "glass") return "bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-2xl border border-white/30 shadow-2xl";
    if (highlightStyle === "neon") return "bg-black/90 text-cyan-300 px-4 py-2 rounded-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)]";
    return "";
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black text-white flex flex-col justify-between select-none overflow-hidden font-sans">
      {/* TOP HEADER TOOLBAR (Instagram Studio Layout) */}
      <div className="h-14 shrink-0 px-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/90 to-transparent">
        {/* Close */}
        <button
          onClick={() => {
            stopCamera();
            if (onClose) onClose();
            else navigate(-1);
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mode Selector (Media, Text Story, Theme Templates) */}
        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md p-1 rounded-full text-xs font-bold border border-white/10">
          <button
            onClick={() => {
              setMode("media");
              stopCamera();
            }}
            className={`px-3.5 py-1 rounded-full transition ${mode === "media" ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white"}`}
          >
            Media
          </button>
          <button
            onClick={() => {
              setMode("text");
              stopCamera();
            }}
            className={`px-3.5 py-1 rounded-full transition ${mode === "text" ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white"}`}
          >
            Text Story
          </button>
        </div>

        {/* Studio Tools */}
        <div className="flex items-center gap-2">
          {/* Themes Drawer Toggle (in Text mode) */}
          {mode === "text" && (
            <button
              onClick={() => setShowThemesDrawer(!showThemesDrawer)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-lg cursor-pointer hover:scale-105 transition"
              title="Change Story Theme"
            >
              <span>{activeTheme.icon}</span>
              <span className="hidden sm:inline">{activeTheme.name}</span>
            </button>
          )}

          {/* Text Tool */}
          {mode === "media" && (
            <button
              onClick={() => setShowTextModal(true)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Add Text"
            >
              <Type className="w-5 h-5" />
            </button>
          )}

          {/* Stickers */}
          <button
            onClick={() => setShowStickersDrawer(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-rose-400 transition cursor-pointer"
            title="Stickers"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Music */}
          <button
            onClick={() => setShowMusicPicker(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-purple-400 transition cursor-pointer"
            title="Select Music"
          >
            <Music className="w-5 h-5" />
          </button>

          {/* Doodle Draw */}
          {mediaPreview && mode === "media" && (
            <button
              onClick={() => setShowDrawCanvas(!showDrawCanvas)}
              className={`p-2 rounded-full transition cursor-pointer ${
                showDrawCanvas ? "bg-rose-600 text-white" : "bg-white/10 hover:bg-white/20 text-amber-400"
              }`}
              title="Draw Sketch"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}

          {/* Download to Device */}
          {mediaPreview && (
            <button
              onClick={handleDownloadStory}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Save to Device"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* CENTER CREATIVE CANVAS VIEWPORT */}
      <div
        onClick={() => setSelectedStickerIdx(null)}
        className="flex-1 min-h-0 relative flex items-center justify-center p-2 sm:p-4 select-none touch-none"
      >
        {mode === "text" ? (
          /* TEXT STORY THEMED CANVAS */
          <div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[420px] h-full max-h-[82vh] aspect-[9/16] rounded-3xl bg-gradient-to-tr ${activeTheme.gradient} flex flex-col items-center justify-between p-6 shadow-2xl relative border border-white/15 overflow-hidden`}
          >
            {/* Top Text Style Controls (Font, Alignment, Highlight Style) */}
            <div className="w-full flex items-center justify-between z-30 pt-2">
              {/* Font Picker */}
              <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar max-w-[180px]">
                {FONTS.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setSelectedFont(font)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition whitespace-nowrap ${
                      selectedFont.id === font.id
                        ? "bg-white text-black shadow"
                        : "bg-black/30 text-white/80 hover:text-white"
                    }`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>

              {/* Text Highlight & Align Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const styles = ["transparent", "solid", "glass", "neon"];
                    const next = styles[(styles.indexOf(highlightStyle) + 1) % styles.length];
                    setHighlightStyle(next);
                  }}
                  className="px-2 py-1 bg-black/40 hover:bg-black/60 rounded-xl text-[10px] font-bold text-white border border-white/10 transition"
                  title="Toggle Highlight Banner"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const aligns = ["left", "center", "right"];
                    const next = aligns[(aligns.indexOf(textAlign) + 1) % aligns.length];
                    setTextAlign(next);
                  }}
                  className="p-1.5 bg-black/40 hover:bg-black/60 rounded-xl text-white border border-white/10 transition"
                >
                  {textAlign === "left" ? (
                    <AlignLeft className="w-3.5 h-3.5" />
                  ) : textAlign === "right" ? (
                    <AlignRight className="w-3.5 h-3.5" />
                  ) : (
                    <AlignCenter className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Main Interactive Text Area with Active Highlight Styling */}
            <div className="w-full my-auto z-20 flex justify-center">
              <div className={`w-full max-w-sm ${getHighlightClass()}`}>
                <textarea
                  rows={4}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type your story..."
                  className={`w-full bg-transparent text-2xl sm:text-3xl font-extrabold outline-none resize-none placeholder-white/50 leading-relaxed ${selectedFont.className}`}
                  style={{ color: textColor, textAlign }}
                />
              </div>
            </div>

            {renderStickersInEditor()}

            {/* Bottom Color Palette Swatches */}
            <div className="w-full flex items-center justify-center gap-2.5 z-30 pb-2">
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md p-2 px-3.5 rounded-full border border-white/15 overflow-x-auto hide-scrollbar max-w-[90%]">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer shrink-0 ${
                      textColor === c ? "border-white scale-125 shadow-lg" : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* MEDIA CANVAS & CAMERA VIEWPORT */
          <div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] h-full max-h-[82vh] aspect-[9/16] rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center"
          >
            {useCamera ? (
              /* Live Camera Viewport */
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover rounded-3xl ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                />

                {/* Camera HUD Controls */}
                <div className="absolute inset-x-0 bottom-6 z-40 flex items-center justify-around px-8">
                  <button
                    onClick={flipCamera}
                    className="p-3 bg-black/40 backdrop-blur-md border border-white/20 text-white rounded-full hover:bg-black/60 transition cursor-pointer"
                    title="Flip Camera"
                  >
                    <RotateCw className="w-6 h-6" />
                  </button>

                  <button
                    onClick={capturePhoto}
                    className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer bg-white/20 hover:bg-white/30 active:scale-95 transition"
                    title="Take Photo"
                  >
                    <div className="w-full h-full bg-white rounded-full shadow" />
                  </button>

                  <button
                    onClick={stopCamera}
                    className="p-3 bg-black/40 backdrop-blur-md border border-white/20 text-white rounded-full hover:bg-black/60 transition cursor-pointer"
                    title="Close Camera"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : mediaPreview ? (
              /* Image / Video Preview with Filter */
              mediaType === "image" ? (
                <img
                  src={mediaPreview}
                  alt=""
                  className={`w-full h-full object-cover pointer-events-none transition-all duration-200 ${resolvedFilterClass}`}
                />
              ) : (
                <video src={mediaPreview} controls autoPlay loop className="w-full h-full object-cover" />
              )
            ) : (
              /* Media Import Box */
              <div className="flex flex-col items-center justify-center gap-5 text-center p-6 w-full h-full">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 text-center p-6 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-3xl cursor-pointer transition w-4/5 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-rose-500 group-hover:scale-110 transition shadow-xl">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Import Photos & Videos</p>
                    <p className="text-[10px] text-zinc-400">Select multiple files from device</p>
                  </div>
                </div>

                <div
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center gap-3 text-center p-6 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-3xl cursor-pointer transition w-4/5 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-purple-400 group-hover:scale-110 transition shadow-xl">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Open Live Camera</p>
                    <p className="text-[10px] text-zinc-400">Capture with your camera</p>
                  </div>
                </div>
              </div>
            )}

            {/* Doodle Drawing Canvas */}
            {showDrawCanvas && mediaPreview && (
              <div className="absolute inset-0 z-30">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={680}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    startDrawing({ clientX: t.clientX, clientY: t.clientY });
                  }}
                  onTouchMove={(e) => {
                    const t = e.touches[0];
                    draw({ clientX: t.clientX, clientY: t.clientY });
                  }}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair"
                />

                {/* Doodle Controls (Color & Clear) */}
                <div className="absolute top-4 inset-x-4 z-40 flex items-center justify-between">
                  <button
                    onClick={clearCanvas}
                    className="bg-black/70 border border-white/20 text-white rounded-full px-3 py-1 text-[10px] font-bold cursor-pointer"
                  >
                    Clear Sketch
                  </button>
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur p-1.5 rounded-full">
                    {["#f43f5e", "#3b82f6", "#10b981", "#eab308", "#ffffff"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setBrushColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-4 h-4 rounded-full border ${brushColor === c ? "border-white scale-125" : "border-transparent"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stickers Overlay */}
            {mediaPreview && renderStickersInEditor()}

            {/* Trash Bin for Drag Deletion */}
            {activeDragIdx !== null && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-red-600/90 border border-red-500 text-white rounded-full p-3.5 shadow-2xl flex items-center justify-center animate-pulse scale-110">
                <Trash2 className="w-5 h-5" />
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              onChange={handleFileSelect}
              multiple
              hidden
            />
            <input
              type="file"
              ref={additionalFileInputRef}
              accept="image/*,video/*"
              onChange={handleFileSelect}
              multiple
              hidden
            />
          </div>
        )}

        {/* Sticker Scale Slider */}
        {selectedStickerIdx !== null && stickers[selectedStickerIdx] && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/85 backdrop-blur-md p-3.5 py-4 rounded-2xl border border-white/10 flex flex-col items-center gap-3 shadow-2xl"
          >
            <span className="text-[8px] uppercase font-bold text-zinc-400">Scale</span>
            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.05"
              value={stickers[selectedStickerIdx]?.scale || 1}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setItems((prev) => {
                  if (!prev[activeIndex]) return prev;
                  const next = [...prev];
                  next[activeIndex].stickers[selectedStickerIdx].scale = val;
                  return next;
                });
              }}
              className="w-24 cursor-pointer accent-rose-500 appearance-none bg-zinc-700 rounded-full h-1"
            />
            <button
              onClick={() => setSelectedStickerIdx(null)}
              className="p-1 bg-zinc-800 rounded-full text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* MULTI-SLIDE BATCH QUEUE THUMBNAILS (When multiple items exist) */}
      {items.length > 1 && mode === "media" && (
        <div className="w-full shrink-0 flex items-center justify-center gap-2.5 px-6 py-2 bg-black/70 border-t border-zinc-800 overflow-x-auto hide-scrollbar z-40">
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`relative w-11 h-14 rounded-xl border-2 cursor-pointer transition transform hover:scale-105 shrink-0 overflow-hidden ${
                activeIndex === index ? "border-rose-500 scale-105" : "border-zinc-700 opacity-60"
              }`}
            >
              {item.mediaType === "image" ? (
                <img src={item.preview} className="w-full h-full object-cover" alt="" />
              ) : (
                <video src={item.preview} className="w-full h-full object-cover" muted />
              )}
              <button
                onClick={(e) => handleRemoveSlide(index, e)}
                className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-red-600 rounded-full text-white transition"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}

          {/* Add more slides button */}
          <button
            onClick={() => additionalFileInputRef.current?.click()}
            className="w-11 h-14 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-400 hover:text-white transition shrink-0"
            title="Add another slide"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTERS CAROUSEL ROW */}
      {mediaPreview && mode === "media" && (
        <div className="w-full shrink-0 flex items-center justify-start overflow-x-auto gap-3 px-6 bg-black/90 border-t border-zinc-900 hide-scrollbar py-2 z-40">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => handleSetFilter(f.id)}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer p-1"
            >
              <div
                className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-transform ${
                  filter === f.id ? "border-rose-500 scale-110 ring-2 ring-rose-500/40" : "border-zinc-700"
                }`}
              >
                {mediaType === "image" ? (
                  <img src={mediaPreview} className={`w-full h-full object-cover ${f.class}`} alt="" />
                ) : (
                  <video src={mediaPreview} className={`w-full h-full object-cover ${f.class}`} muted />
                )}
              </div>
              <span className={`text-[8px] font-bold ${filter === f.id ? "text-rose-400" : "text-zinc-400"}`}>
                {f.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* BOTTOM 1-TAP PUBLISHING DOCK (Instagram Style) */}
      <div className="h-18 shrink-0 px-6 bg-black border-t border-zinc-900 flex items-center justify-between z-50">
        {/* Your Story */}
        <button
          onClick={() => {
            setVisibleTo("public");
            handlePublishStory();
          }}
          disabled={isLoading || (items.length === 0 && mode === "media" && !useCamera)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
        >
          <img src={userData?.user?.profileImage?.url || dp} className="w-5 h-5 rounded-full object-cover" alt="" />
          <span>Your Story</span>
        </button>

        {/* Close Friends */}
        <button
          onClick={() => {
            setVisibleTo("closeFriends");
            handlePublishStory();
          }}
          disabled={isLoading || (items.length === 0 && mode === "media" && !useCamera)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition cursor-pointer disabled:opacity-50"
        >
          <Star className="w-3.5 h-3.5 fill-current text-emerald-400" />
          <span>Close Friends</span>
        </button>

        {/* Send / Share button */}
        <button
          onClick={handlePublishStory}
          disabled={isLoading || (items.length === 0 && mode === "media" && !useCamera)}
          className="w-10 h-10 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-lg transition cursor-pointer disabled:opacity-50"
          title="Share Story"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-black" />}
        </button>
      </div>

      {/* THEMES & TEMPLATES MODAL DRAWER (Text Story Mode) */}
      {showThemesDrawer && (
        <div
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowThemesDrawer(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span>Choose Story Theme Template</span>
              </h3>
              <button
                onClick={() => setShowThemesDrawer(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 max-h-[350px] overflow-y-auto hide-scrollbar">
              {TEXT_THEMES.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme)}
                  className={`relative aspect-[9/14] rounded-2xl bg-gradient-to-tr ${theme.gradient} p-2 flex flex-col items-center justify-between cursor-pointer border-2 transition-all hover:scale-105 ${
                    activeTheme.id === theme.id ? "border-white scale-105 shadow-xl shadow-white/20" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  <span className="text-xl mt-2">{theme.icon}</span>
                  <span className="text-[10px] font-extrabold text-white text-center drop-shadow leading-tight mb-1">
                    {theme.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STICKERS DRAWER */}
      {showStickersDrawer && (
        <StoryStickersDrawer
          open={showStickersDrawer}
          onClose={() => setShowStickersDrawer(false)}
          onAddSticker={handleAddSticker}
        />
      )}

      {/* MUSIC PICKER MODAL */}
      {showMusicPicker && (
        <StoryMusicPickerModal
          open={showMusicPicker}
          onClose={() => setShowMusicPicker(false)}
          selectedMusic={selectedMusic}
          contentContext={{
            caption: mode === "text" ? textContent : customOverlayText,
            mediaName: activeItem?.file?.name || activeItem?.preview || "",
            mediaType: mode === "text" ? "text" : mediaType,
            theme: activeTheme?.id || "",
          }}
          onSelectMusic={(song) => {
            setSelectedMusic(song);
            toast.success(`Music Selected: ${song.title}`);
            handleAddSticker({
              type: "music_sticker",
              music_sticker: {
                title: song.title,
                artist: song.artist,
              },
            });
          }}
        />
      )}

      {/* ADD TEXT OVERLAY MODAL */}
      {showTextModal && (
        <div
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowTextModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold">Add Text Overlay</h3>
            <textarea
              value={customOverlayText}
              onChange={(e) => setCustomOverlayText(e.target.value)}
              placeholder="Type text overlay..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-sm text-white outline-none focus:border-rose-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTextModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTextOverlay}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs font-bold rounded-xl text-white"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryCreator;

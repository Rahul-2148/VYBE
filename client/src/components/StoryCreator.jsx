import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  X,
  Type,
  Smile,
  Music,
  Pencil,
  Send,
  RotateCw,
  RotateCcw,
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
  Minus,
  Quote,
  Flame,
  Zap,
  BookOpen,
  Eye,
  Settings,
  Link2,
  MapPin,
  AtSign,
  Hash,
  PlusCircle,
  FolderOpen,
  Users,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { setStoryFeed } from "../redux/features/storySlice";
import {
  generateDraftThumbnail,
  saveDraftMediaLocal,
} from "../lib/draftStorage";
import StoryMusicPickerModal from "./StoryMusicPickerModal";
import StoryStickersDrawer from "./StoryStickersDrawer";
import CloseFriendsModal from "./CloseFriendsModal";
import dp from "../assets/dp3.png";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

// Text Story Fonts
const FONTS = [
  { id: "classic", name: "Classic", className: "font-sans font-bold" },
  { id: "modern", name: "Modern", className: "font-mono uppercase tracking-widest font-bold" },
  { id: "neon", name: "Neon", className: "font-serif italic font-black" },
  { id: "typewriter", name: "Typewriter", className: "font-mono font-medium" },
  { id: "bold", name: "Bold", className: "font-extrabold tracking-tight" },
  { id: "serif", name: "Editorial", className: "font-serif font-bold tracking-normal" },
];

// Rich Text Story Theme Templates
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

// 11 Photo/Video Filters
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

export const StoryCreator = ({ onClose, onSwitchMode, initialState }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  // Story Mode: 'media' | 'text' | 'templates'
  const [mode, setMode] = useState("media");

  // Multi-item Queue state (upload multiple stories in 1 go)
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sharedEntityData] = useState(initialState?.sharedEntity || null);

  // Camera State
  const [useCamera, setUseCamera] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [selectedCameraId, setSelectedCameraId] = useState(null);
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
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [showCloseFriendsModal, setShowCloseFriendsModal] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(() => initialState?.resumedDraft?._id || null);

  // Music Data
  const [selectedMusic, setSelectedMusic] = useState(null);

  // Dragging state & Guideline Snap
  const [activeDragIdx, setActiveDragIdx] = useState(null);
  const [selectedStickerIdx, setSelectedStickerIdx] = useState(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [snapGuideX, setSnapGuideX] = useState(false);
  const [snapGuideY, setSnapGuideY] = useState(false);
  const startDragPosition = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const fileInputRef = useRef(null);
  const additionalFileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#f43f5e");
  const [brushSize, _setBrushSize] = useState(6);

  const activeItem = items[activeIndex] || null;
  const mediaPreview = activeItem?.preview || null;
  const mediaType = activeItem?.mediaType || "image";
  const stickers = activeItem?.stickers || [];
  const filter = activeItem?.filter || "none";

  const handleSetFilter = useCallback((newFilterId) => {
    setItems((prev) => {
      if (!prev[activeIndex]) return prev;
      const next = [...prev];
      next[activeIndex] = {
        ...next[activeIndex],
        filter: newFilterId,
      };
      return next;
    });
  }, [activeIndex]);

  useEffect(() => {
    if (initialState?.resumedDraft) {
      const draft = initialState.resumedDraft;
      const timer = setTimeout(() => {
        if (draft.caption) {
          setTextContent(draft.caption);
          setCustomOverlayText(draft.caption);
        }
        if (draft.audioTrack) setSelectedMusic(draft.audioTrack);
        if (draft.filter) handleSetFilter(draft.filter);
        if (draft.mediaPreview) {
          const isVid =
            draft.mediaPreview.startsWith("data:video") ||
            draft.mediaPreview.includes(".mp4") ||
            draft.mediaPreview.includes("/video/");
          setItems([
            {
              preview: draft.mediaPreview,
              mediaType: isVid ? "video" : "image",
              file: null,
              stickers: [],
              filter: draft.filter || "none",
              isShared: false,
            },
          ]);
          setMode("media");
        } else if (draft.caption) {
          setMode("text");
        }
        snackbar.success("Story draft loaded! ✏️");
      }, 0);
      return () => clearTimeout(timer);
    } else if (initialState?.initialMediaUrl) {
      const isVid = initialState.initialMediaUrl.endsWith(".mp4") || initialState.initialMediaUrl.includes("/video/");
      const timer = setTimeout(() => {
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
      }, 0);
      return () => clearTimeout(timer);
    } else if (initialState?.sharedEntity) {
      const entity = initialState.sharedEntity;
      const timer = setTimeout(() => {
        if (entity.entityType === "questionResponse") {
          setMode("text");
          setTextContent(`💬 Q&A with @${entity.authorName || "User"}:\n"${entity.caption || ""}"\n\n`);
          setActiveTheme(TEXT_THEMES[0]);
        } else if (entity.mediaUrl) {
          const isVid = entity.mediaUrl.endsWith(".mp4") || entity.mediaUrl.includes("/video/");
          setItems([
            {
              preview: entity.mediaUrl,
              mediaType: isVid ? "video" : "image",
              file: null,
              stickers: [],
              filter: "none",
              isShared: true,
            },
          ]);
          setMode("media");
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialState, handleSetFilter]);

  // Save Story to Drafts
  const handleSaveStoryDraft = async () => {
    if (!mediaPreview && !textContent.trim()) {
      snackbar.error("Story needs media or text to save as draft");
      return;
    }
    setIsLoading(true);
    try {
      let persistentPreview = "";
      if (activeItem?.file) {
        persistentPreview = await generateDraftThumbnail(activeItem.file);
      }
      if (!persistentPreview && mediaPreview?.startsWith("data:")) {
        persistentPreview = mediaPreview;
      }

      const res = await api.post("/post/drafts", {
        draftId: currentDraftId,
        draftType: "story",
        caption: mode === "text" ? textContent : customOverlayText || "",
        mediaPreview: persistentPreview,
        filter: filter || "normal",
        audioTrack: selectedMusic,
        mediaItems: activeItem ? [{ preview: persistentPreview, type: activeItem.type || "image" }] : [],
      });

      const savedDraftId = res.data?.draft?._id || currentDraftId;
      if (savedDraftId && activeItem?.file) {
        setCurrentDraftId(savedDraftId);
        await saveDraftMediaLocal(savedDraftId, [activeItem]);
      }

      snackbar.success(currentDraftId ? "Story draft updated! 📝" : "Story saved to Drafts! 📝");
      stopCamera();
      if (onClose) onClose();
      else navigate(-1);
    } catch (err) {
      console.warn("Failed to save story draft:", err);
      snackbar.error(err?.response?.data?.message || "Failed to save story draft");
    } finally {
      setIsLoading(false);
      setShowExitPrompt(false);
    }
  };

  const handleCloseClick = () => {
    if (mediaPreview || textContent.trim()) {
      setShowExitPrompt(true);
    } else {
      stopCamera();
      if (onClose) onClose();
      else navigate(-1);
    }
  };

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
    } catch {
      snackbar.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const flipCamera = async () => {
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === "videoinput"
      );
      if (devices.length > 1) {
        const currentIndex = devices.findIndex((d) => d.deviceId === selectedCameraId);
        const nextIndex = (currentIndex + 1) % devices.length;
        const nextDevice = devices[nextIndex];
        setSelectedCameraId(nextDevice.deviceId);
        const isRear = /back|rear|environment/i.test(nextDevice.label || "");
        setFacingMode(isRear ? "environment" : (nextIndex === 0 ? "user" : "environment"));
      } else {
        setSelectedCameraId(null);
        setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
      }
    } catch {
      setSelectedCameraId(null);
      setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    }
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
    if (!useCamera) return;
    let isCancelled = false;

    const initCam = async () => {
      try {
        let videoConstraint = {};
        if (selectedCameraId) {
          videoConstraint = { deviceId: { exact: selectedCameraId } };
        } else if (facingMode === "environment") {
          videoConstraint = { facingMode: { ideal: "environment" } };
        } else {
          videoConstraint = { facingMode: { ideal: "user" } };
        }

        let mediaStream = null;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...videoConstraint,
              width: { ideal: 1080 },
              height: { ideal: 1920 },
            },
            audio: false,
          });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode === "environment" ? "environment" : "user" },
            audio: false,
          });
        }

        if (isCancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        snackbar.error("Could not access camera. Please check permissions.");
      }
    };

    initCam();

    return () => {
      isCancelled = true;
    };
  }, [useCamera, facingMode, selectedCameraId]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // 2. Drag & Drop Sticker Repositioning
  const handleStartDrag = useCallback((e, index) => {
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
  }, [items, activeIndex]);

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

      x = Math.max(5, Math.min(95, x));
      y = Math.max(5, Math.min(95, y));

      // Magnetic Center Guidelines & Snapping
      if (Math.abs(x - 50) < 2.5) {
        x = 50;
        setSnapGuideX(true);
      } else {
        setSnapGuideX(false);
      }

      if (Math.abs(y - 50) < 2.5) {
        y = 50;
        setSnapGuideY(true);
      } else {
        setSnapGuideY(false);
      }

      // Check if hovering directly over trash target
      const overTrash = y > 84 && Math.abs(x - 50) < 18;
      setIsOverTrash(overTrash);

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
        setSnapGuideX(false);
        setSnapGuideY(false);

        setItems((prev) => {
          if (!prev[activeIndex]) return prev;
          const sticker = prev[activeIndex].stickers?.[activeDragIdx];
          if (sticker) {
            const isTrashDrop = isOverTrash || (sticker.position?.y > 86 && Math.abs((sticker.position?.x || 50) - 50) < 18);
            if (isTrashDrop) {
              triggerHaptic("medium");
              microAudio.playPop();
              snackbar.success("Sticker removed");
              const next = [...prev];
              next[activeIndex] = {
                ...next[activeIndex],
                stickers: next[activeIndex].stickers.filter((_, i) => i !== activeDragIdx),
              };
              setSelectedStickerIdx(null);
              setIsOverTrash(false);
              return next;
            }

            // Quick click toggle style
            const dragX = Math.abs((sticker.position?.x || 50) - (startDragPosition.current?.x || 50));
            const dragY = Math.abs((sticker.position?.y || 50) - (startDragPosition.current?.y || 50));

            if (dragX < 1.5 && dragY < 1.5) {
              triggerHaptic("light");
              microAudio.playPop();
              const next = [...prev];
              const updatedSticker = { ...next[activeIndex].stickers[activeDragIdx] };
              const maxStyles = updatedSticker.type === "music_sticker" ? 4 : 3;
              updatedSticker.styleIndex = ((updatedSticker.styleIndex || 0) + 1) % maxStyles;
              next[activeIndex].stickers[activeDragIdx] = updatedSticker;
              return next;
            }
          }
          return prev;
        });
        setIsOverTrash(false);
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
  }, [activeDragIdx, activeIndex, isOverTrash]);

  // Apply Theme Template
  const handleSelectTheme = (theme) => {
    setActiveTheme(theme);
    setSelectedFont(theme.font);
    setTextColor(theme.textColor);
    setHighlightStyle(theme.highlightStyle);
    setShowThemesDrawer(false);
    snackbar(`Applied Theme: ${theme.name}`, { icon: theme.icon });
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
        snackbar.error("Please add a photo or video first");
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
    snackbar.success("Sticker added! Drag to position.");
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
    snackbar.success("Story downloaded to device!");
  };

  // 8. Publish Stories Batch
  const handlePublishStory = async (targetVisibility) => {
    const finalVisibleTo = targetVisibility || visibleTo || "public";

    if (mode === "text" && !textContent.trim()) {
      snackbar.error("Please write something in your text story");
      return;
    }

    if (mode === "media" && items.length === 0 && !useCamera) {
      snackbar.error("Please select a photo or video");
      return;
    }

    setIsLoading(true);
    setUploadProgressText(
      finalVisibleTo === "closeFriends" ? "Sharing to Close Friends ⭐️..." : "Sharing story..."
    );

    try {
      if (mode === "text") {
        const textStickers = items[0]?.stickers || [];
        const res = await api.post("/story/upload", {
          mediaType: "text",
          caption: textContent.trim(),
          mediaUrl: `text_theme_${activeTheme.id}`,
          stickers: JSON.stringify(textStickers),
          visibleTo: finalVisibleTo,
          music: selectedMusic ? JSON.stringify(selectedMusic) : null,
        });

        if (res.data?.success) {
          snackbar.success(
            finalVisibleTo === "closeFriends"
              ? "Story shared to Close Friends! ⭐️"
              : "Story published! ✨"
          );
          api.get("/story/feed").then((feedRes) => {
            if (feedRes.data?.success) dispatch(setStoryFeed(feedRes.data.feed));
          });
          if (currentDraftId) {
            api.delete(`/post/drafts/${currentDraftId}`).catch(() => {});
          }
          setIsLoading(false);
          if (onClose) onClose();
          else navigate(-1);
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
        formData.append("visibleTo", finalVisibleTo);
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

      snackbar.success(
        finalVisibleTo === "closeFriends"
          ? "Stories shared to Close Friends! ⭐️"
          : "Stories published successfully! 🚀"
      );
      api.get("/story/feed").then((feedRes) => {
        if (feedRes.data?.success) dispatch(setStoryFeed(feedRes.data.feed));
      });

      if (currentDraftId) {
        api.delete(`/post/drafts/${currentDraftId}`).catch(() => {});
      }

      setIsLoading(false);
      if (onClose) onClose();
      else navigate(-1);
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to publish story.");
      setIsLoading(false);
    }
  };

  // Cycle single sticker style
  const toggleStickerStyle = (index) => {
    triggerHaptic("light");
    microAudio.playPop();
    setItems((prev) => {
      if (!prev[activeIndex]) return prev;
      const next = [...prev];
      const s = { ...next[activeIndex].stickers[index] };
      const max = s.type === "music_sticker" ? 4 : 3;
      s.styleIndex = ((s.styleIndex || 0) + 1) % max;
      next[activeIndex].stickers[index] = s;
      return next;
    });
  };

  // Delete single sticker
  const deleteSticker = (index) => {
    triggerHaptic("medium");
    microAudio.playPop();
    setItems((prev) => {
      if (!prev[activeIndex]) return prev;
      const next = [...prev];
      next[activeIndex].stickers = next[activeIndex].stickers.filter((_, i) => i !== index);
      return next;
    });
    setSelectedStickerIdx(null);
    snackbar.success("Sticker removed");
  };

  // Render stickers overlay inside editor
  const renderStickersInEditor = () => {
    const targetStickers = mode === "text" ? items[0]?.stickers || [] : stickers;

    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {targetStickers.map((s, index) => {
          const styleIdx = s.styleIndex || 0;
          const isSelected = selectedStickerIdx === index;

          return (
            <div
              key={index}
              onMouseDown={(e) => handleStartDrag(e, index)}
              onTouchStart={(e) => handleStartDrag(e, index)}
              style={{
                position: "absolute",
                left: `${s.position?.x || 50}%`,
                top: `${s.position?.y || 50}%`,
                transform: `translate(-50%, -50%) scale(${s.scale || 1}) rotate(${s.rotation || 0}deg)`,
                pointerEvents: "auto",
                cursor: "grab",
              }}
              className={`transition-all duration-150 select-none relative ${
                isSelected
                  ? "ring-2 ring-rose-500/90 shadow-2xl rounded-3xl p-1 scale-[1.02]"
                  : "hover:opacity-95"
              }`}
            >
              {/* On-Sticker Corner Quick Actions when selected */}
              {isSelected && (
                <>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSticker(index);
                    }}
                    className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl cursor-pointer hover:bg-red-500 transition active:scale-90 z-30 border border-white/30"
                    title="Delete Sticker"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Style Cycle Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStickerStyle(index);
                    }}
                    className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-xl cursor-pointer hover:bg-zinc-100 transition active:scale-90 z-30 border border-zinc-300"
                    title="Change Style"
                  >
                    <Palette className="w-3.5 h-3.5 text-rose-600" />
                  </button>
                </>
              )}

              {/* 1. Location */}
              {s.type === "location" && s.location && (
                <div
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-extrabold text-xs shadow-2xl transition-all ${
                    styleIdx === 1
                      ? "bg-black/85 text-white border border-white/20 backdrop-blur-xl"
                      : styleIdx === 2
                      ? "bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white border border-white/30"
                      : styleIdx === 3
                      ? "bg-transparent text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] border-none text-sm font-black"
                      : "bg-white/95 text-zinc-950 border border-white/60 backdrop-blur-md"
                  }`}
                >
                  <MapPin className={`w-4 h-4 shrink-0 ${styleIdx === 1 ? "text-cyan-400 fill-cyan-400" : styleIdx === 3 ? "text-red-500 fill-red-500 filter drop-shadow" : "text-rose-500 fill-rose-500"}`} />
                  <span className="truncate max-w-[200px]">{s.location.name}</span>
                </div>
              )}

              {/* 2. Mention */}
              {s.type === "mention" && s.mention && (
                <div
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-xs shadow-2xl transition-all ${
                    styleIdx === 1
                      ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white border border-white/30"
                      : styleIdx === 2
                      ? "bg-white/95 text-zinc-950 border border-white/50"
                      : styleIdx === 3
                      ? "bg-transparent text-emerald-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] border-none text-base font-black tracking-wide"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-white/20"
                  }`}
                >
                  <AtSign className="w-4 h-4" />
                  <span>{s.mention.username}</span>
                </div>
              )}

              {/* 3. Hashtag */}
              {s.type === "hashtag" && s.hashtag && (
                <div
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-xs shadow-2xl transition-all ${
                    styleIdx === 1
                      ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white border border-white/30"
                      : styleIdx === 2
                      ? "bg-white/95 text-zinc-950 border border-white/50"
                      : styleIdx === 3
                      ? "bg-transparent text-amber-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] border-none text-base font-black tracking-wide"
                      : "bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-white/20"
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>{s.hashtag.tag}</span>
                </div>
              )}

              {/* 4. Poll */}
              {s.type === "poll" && (
                <div
                  className={`rounded-2xl p-4 shadow-2xl text-center w-56 space-y-2 border transition-all ${
                    styleIdx === 1
                      ? "bg-zinc-950/90 text-white border-white/20 backdrop-blur-xl"
                      : styleIdx === 2
                      ? "bg-gradient-to-tr from-pink-600 via-rose-600 to-amber-600 text-white border-white/30"
                      : "bg-white/95 text-zinc-950 border-white/50"
                  }`}
                >
                  <p className="font-extrabold text-xs">{s.poll?.question || "Ask a question..."}</p>
                  <div className="flex gap-2">
                    <div className={`flex-1 py-2 rounded-xl font-bold text-xs shadow-sm border ${
                      styleIdx === 0 ? "bg-zinc-100 border-zinc-200" : "bg-white/20 border-white/30"
                    }`}>
                      {s.poll?.options?.[0] || "Yes"}
                    </div>
                    <div className={`flex-1 py-2 rounded-xl font-bold text-xs shadow-sm border ${
                      styleIdx === 0 ? "bg-zinc-100 border-zinc-200" : "bg-white/20 border-white/30"
                    }`}>
                      {s.poll?.options?.[1] || "No"}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Quiz */}
              {s.type === "quiz" && (
                <div className="bg-white/95 text-zinc-950 rounded-2xl p-3.5 shadow-2xl text-center w-56 border border-white/50 space-y-1.5">
                  <p className="font-extrabold text-xs text-zinc-900 mb-1">{s.quiz?.question || "Quiz question..."}</p>
                  <div className="space-y-1.5">
                    {(s.quiz?.options || ["Option A", "Option B"]).map((opt, i) => (
                      <div key={i} className="py-1.5 px-3 bg-zinc-100 rounded-xl text-[11px] font-bold flex items-center justify-between border border-zinc-200">
                        <span className="font-mono text-zinc-400 font-black">{String.fromCharCode(65 + i)}</span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Question */}
              {s.type === "question" && (
                <div className="bg-white/95 text-zinc-950 rounded-2xl p-4 shadow-2xl text-center w-56 border border-white/50 space-y-2">
                  <div className={`-mx-4 -mt-4 p-2.5 rounded-t-2xl text-white font-extrabold text-[10px] uppercase tracking-wider ${
                    styleIdx === 1 ? "bg-gradient-to-r from-amber-500 to-rose-600" : styleIdx === 2 ? "bg-gradient-to-r from-cyan-500 to-blue-600" : "bg-gradient-to-r from-purple-500 to-pink-500"
                  }`}>
                    Ask me a question
                  </div>
                  <p className="font-extrabold text-xs text-zinc-900">{s.question?.prompt || "Type something..."}</p>
                  <div className="w-full h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] text-zinc-400 font-medium">
                    Type an answer...
                  </div>
                </div>
              )}

              {/* 7. Slider */}
              {s.type === "slider" && (
                <div className="bg-white/95 text-zinc-950 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2 w-56 border border-white/50 text-center">
                  <p className="font-extrabold text-xs text-zinc-900">{s.slider?.question || "Rate this!"}</p>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-2xl drop-shadow">{s.slider?.emoji || "🔥"}</span>
                    <div className="flex-1 h-2 bg-zinc-200 rounded-full relative">
                      <div className="w-5 h-5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 shadow-md border-2 border-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* 8. Countdown */}
              {s.type === "countdown" && (
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl p-4 shadow-2xl text-center space-y-1.5 w-52 border border-white/30">
                  <span className="font-black text-[10px] uppercase tracking-widest text-cyan-200">{s.countdown?.title || "Countdown"}</span>
                  <div className="flex justify-center gap-3 text-base font-black font-mono py-1">
                    <div>23<span className="text-[9px] font-sans font-normal opacity-80 block">HRS</span></div>
                    <div>59<span className="text-[9px] font-sans font-normal opacity-80 block">MIN</span></div>
                    <div>00<span className="text-[9px] font-sans font-normal opacity-80 block">SEC</span></div>
                  </div>
                </div>
              )}

              {/* 9. Link */}
              {s.type === "link" && (
                <div className={`inline-flex items-center gap-1.5 px-4 py-2 font-extrabold text-xs rounded-full shadow-2xl border ${
                  styleIdx === 1
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-white/30"
                    : styleIdx === 2
                    ? "bg-black/85 text-white border-white/20"
                    : "bg-white text-zinc-950 border-white/50"
                }`}>
                  <Link2 className={`w-3.5 h-3.5 ${styleIdx === 0 ? "text-blue-600" : "text-white"}`} />
                  <span className="truncate max-w-[160px]">{s.link?.title || s.link?.url}</span>
                </div>
              )}

              {/* 10. Music Sticker */}
              {s.type === "music_sticker" && s.music_sticker && (
                <>
                  {styleIdx === 0 && (
                    <div className="bg-black/85 border border-white/20 backdrop-blur-xl rounded-full px-3.5 py-2 flex items-center gap-2.5 text-left w-60 shadow-2xl text-white">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shrink-0 animate-spin-slow shadow-lg">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-extrabold truncate text-white">{s.music_sticker.title}</p>
                        <p className="text-[9px] text-zinc-300 font-semibold truncate">{s.music_sticker.artist}</p>
                      </div>
                      <div className="flex items-end gap-0.5 h-3 pr-1">
                        <span className="w-0.5 bg-rose-400 animate-sound-wave-1 rounded-full" />
                        <span className="w-0.5 bg-rose-300 animate-sound-wave-2 rounded-full" />
                        <span className="w-0.5 bg-rose-400 animate-sound-wave-3 rounded-full" />
                      </div>
                    </div>
                  )}

                  {styleIdx === 1 && (
                    <div className="bg-white text-zinc-950 border border-white/30 rounded-full py-1.5 px-3.5 flex items-center gap-2 shadow-2xl text-left w-auto max-w-[210px]">
                      <div className="flex items-end gap-0.5 h-2.5">
                        <span className="w-0.5 bg-black rounded-full h-2 animate-bounce" />
                        <span className="w-0.5 bg-black rounded-full h-3 animate-bounce [animation-delay:0.15s]" />
                        <span className="w-0.5 bg-black rounded-full h-1.5 animate-bounce [animation-delay:0.3s]" />
                      </div>
                      <span className="text-[10px] font-black truncate">{s.music_sticker.title}</span>
                    </div>
                  )}

                  {styleIdx === 2 && (
                    <div className="bg-gradient-to-br from-zinc-900/95 to-black border border-white/10 rounded-2xl p-2.5 flex items-center gap-3 shadow-2xl text-left w-56 text-white">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-600 to-purple-600 flex items-center justify-center shrink-0 shadow-lg">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-white truncate">{s.music_sticker.title}</p>
                        <p className="text-[9px] text-zinc-400 font-semibold truncate">{s.music_sticker.artist || "Artist"}</p>
                      </div>
                    </div>
                  )}

                  {/* Style 3: Without Background Transparent Vinyl Badge */}
                  {styleIdx === 3 && (
                    <div className="bg-transparent px-2 py-1 flex items-center gap-2 text-left drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] text-white">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-cyan-400 flex items-center justify-center shrink-0 animate-spin-slow border border-white/50 shadow-lg">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate drop-shadow">{s.music_sticker.title}</p>
                        <p className="text-[9px] text-zinc-200 font-bold truncate drop-shadow">{s.music_sticker.artist || "Artist"}</p>
                      </div>
                    </div>
                  )}

                  {/* Style 4: Karaoke Floating Lyrics Line */}
                  {styleIdx === 4 && (
                    <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 p-2.5 shadow-2xl w-56 text-center text-white space-y-1">
                      <p className="text-xs font-black text-rose-400 animate-pulse tracking-wide truncate">🎵 {s.music_sticker.title}</p>
                      <p className="text-[9px] text-zinc-400 font-medium truncate">{s.music_sticker.artist || "Soundtrack"}</p>
                    </div>
                  )}
                </>
              )}

              {/* 11. GIF */}
              {s.type === "gif" && s.gif && (
                <img src={s.gif.url} alt="" className="w-28 h-28 object-contain drop-shadow-2xl pointer-events-none" />
              )}

              {/* 12. Add Yours */}
              {s.type === "addYours" && (
                <div className="bg-gradient-to-tr from-pink-500 via-rose-600 to-purple-600 text-white p-3.5 rounded-2xl shadow-2xl text-center w-52 border border-white/30 space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-black tracking-wider uppercase">Add Yours</span>
                  </div>
                  <p className="text-xs font-extrabold text-white drop-shadow">{s.addYours?.prompt || "Your turn"}</p>
                </div>
              )}

              {/* 13. Time */}
              {s.type === "time" && (
                <div className={`shadow-2xl transition-all ${
                  styleIdx === 1
                    ? "bg-white text-zinc-950 font-sans font-extrabold text-xl tracking-widest border border-white/40 px-4 py-2 rounded-2xl"
                    : styleIdx === 2
                    ? "bg-transparent text-cyan-300 font-mono font-black text-3xl drop-shadow-[0_0_15px_rgba(34,211,238,0.9)] border-none px-2"
                    : "bg-black/85 backdrop-blur-md text-white font-mono font-black text-2xl border border-white/30 tracking-tight px-4 py-2 rounded-2xl"
                }`}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* 14. Day */}
              {s.type === "day" && (
                <div className={`shadow-2xl uppercase tracking-widest text-center font-black transition-all ${
                  styleIdx === 1
                    ? "bg-white text-zinc-950 border border-white/50 px-4 py-2 rounded-2xl text-sm"
                    : styleIdx === 2
                    ? "bg-transparent text-yellow-300 text-2xl drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] border-none px-2 font-black"
                    : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white border border-white/30 px-4 py-2 rounded-2xl text-sm"
                }`}>
                  {new Date().toLocaleDateString([], { weekday: 'long' })}
                </div>
              )}

              {/* 15. Text Overlay */}
              {s.type === "overlay" && (
                <div className="bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl font-black text-sm border border-white/30 tracking-wide">
                  {s.overlay?.text}
                </div>
              )}

              {/* 16. Emoji */}
              {s.type === "emoji" && (
                <div className="text-6xl text-center select-none drop-shadow-2xl">
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
      {/* TOP HEADER TOOLBAR (Studio Layout) */}
      <div className="h-14 shrink-0 px-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/90 to-transparent">
        {/* Close / Back to Workspace */}
        <button
          onClick={handleCloseClick}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          title="Back to Create"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Global Create Mode Selector (Post, Story, Reels) or Sub-mode */}
        {onSwitchMode ? (
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md p-1 rounded-full text-xs font-bold border border-white/10 shadow-lg">
            <button
              onClick={() => {
                triggerHaptic("light");
                stopCamera();
                onSwitchMode("post");
              }}
              className="px-3 py-1 rounded-full transition text-zinc-400 hover:text-white cursor-pointer"
            >
              Post
            </button>
            <button
              className="px-3.5 py-1 rounded-full transition bg-white text-black shadow font-extrabold"
            >
              Story
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                stopCamera();
                onSwitchMode("reel");
              }}
              className="px-3 py-1 rounded-full transition text-zinc-400 hover:text-white cursor-pointer"
            >
              Reels
            </button>
          </div>
        ) : (
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
        )}

        {/* Studio Tools */}
        <div className="flex items-center gap-2">
          {/* Save Story Draft */}
          {(mediaPreview || textContent.trim()) && (
            <button
              onClick={handleSaveStoryDraft}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-amber-400 transition cursor-pointer"
              title="Save Story Draft"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
          )}

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
                <video src={mediaPreview} controls autoPlay onEnded={(e) => { e.target.currentTime = 0; e.target.play().catch(() => null); }} className="w-full h-full object-cover" />
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

            {/* Magnetic Center Guidelines */}
            {snapGuideX && (
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-cyan-400 z-30 pointer-events-none shadow-[0_0_10px_#22d3ee]" />
            )}
            {snapGuideY && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-cyan-400 z-30 pointer-events-none shadow-[0_0_10px_#22d3ee]" />
            )}

            {/* Reactive Trash Bin for Drag Deletion */}
            {activeDragIdx !== null && (
              <div
                className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full flex items-center justify-center transition-all duration-200 pointer-events-none ${
                  isOverTrash
                    ? "bg-red-600 border-2 border-red-300 text-white scale-125 shadow-[0_0_30px_rgba(239,68,68,0.9)] p-4"
                    : "bg-black/80 border border-white/20 text-zinc-300 scale-100 p-3.5 backdrop-blur-xl"
                }`}
              >
                <Trash2 className={`w-6 h-6 ${isOverTrash ? "text-white animate-bounce" : "text-zinc-300"}`} />
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

        {/* On-Canvas Sticker Transform & Style HUD */}
        {selectedStickerIdx !== null && stickers[selectedStickerIdx] && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/90 backdrop-blur-2xl px-4 py-2.5 rounded-full border border-white/20 flex items-center gap-3 shadow-2xl animate-fade-in"
          >
            {/* Scale Down */}
            <button
              onClick={() => {
                triggerHaptic("light");
                setItems((prev) => {
                  if (!prev[activeIndex]) return prev;
                  const next = [...prev];
                  const cur = next[activeIndex].stickers[selectedStickerIdx].scale || 1;
                  next[activeIndex].stickers[selectedStickerIdx].scale = Math.max(0.4, cur - 0.15);
                  return next;
                });
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
              title="Scale Down"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Scale Slider */}
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
              className="w-20 cursor-pointer accent-rose-500 appearance-none bg-zinc-700 rounded-full h-1"
            />

            {/* Scale Up */}
            <button
              onClick={() => {
                triggerHaptic("light");
                setItems((prev) => {
                  if (!prev[activeIndex]) return prev;
                  const next = [...prev];
                  const cur = next[activeIndex].stickers[selectedStickerIdx].scale || 1;
                  next[activeIndex].stickers[selectedStickerIdx].scale = Math.min(2.5, cur + 0.15);
                  return next;
                });
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
              title="Scale Up"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-white/20 mx-0.5" />

            {/* Rotate Left */}
            <button
              onClick={() => {
                triggerHaptic("light");
                setItems((prev) => {
                  if (!prev[activeIndex]) return prev;
                  const next = [...prev];
                  const cur = next[activeIndex].stickers[selectedStickerIdx].rotation || 0;
                  next[activeIndex].stickers[selectedStickerIdx].rotation = (cur - 15) % 360;
                  return next;
                });
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
              title="Rotate Left (-15°)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Rotate Right */}
            <button
              onClick={() => {
                triggerHaptic("light");
                setItems((prev) => {
                  if (!prev[activeIndex]) return prev;
                  const next = [...prev];
                  const cur = next[activeIndex].stickers[selectedStickerIdx].rotation || 0;
                  next[activeIndex].stickers[selectedStickerIdx].rotation = (cur + 15) % 360;
                  return next;
                });
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
              title="Rotate Right (+15°)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-white/20 mx-0.5" />

            {/* Delete Sticker */}
            <button
              onClick={() => {
                triggerHaptic("medium");
                microAudio.playPop();
                setItems((prev) => {
                  if (!prev[activeIndex]) return prev;
                  const next = [...prev];
                  next[activeIndex].stickers = next[activeIndex].stickers.filter((_, i) => i !== selectedStickerIdx);
                  return next;
                });
                setSelectedStickerIdx(null);
                snackbar.success("Sticker removed");
              }}
              className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition active:scale-90"
              title="Delete Sticker"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Done */}
            <button
              onClick={() => {
                triggerHaptic("light");
                setSelectedStickerIdx(null);
              }}
              className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition active:scale-90"
              title="Done"
            >
              <Check className="w-3.5 h-3.5" />
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

      {/* BOTTOM AUDIENCE SELECTION & PUBLISHING DOCK */}
      <div className="h-20 shrink-0 px-3 sm:px-6 bg-black/95 backdrop-blur-xl border-t border-zinc-900 flex items-center justify-between z-50 gap-2">
        {/* Left: Your Story 1-Tap Publish */}
        <button
          type="button"
          onClick={() => handlePublishStory("public")}
          disabled={isLoading || (items.length === 0 && mode === "media" && !useCamera)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-white font-bold text-xs transition cursor-pointer active:scale-95 disabled:opacity-40 shadow-lg"
          title="Share to Your Story"
        >
          <div className="relative shrink-0 p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600">
            <img
              src={userData?.user?.profileImage?.url || dp}
              className="w-5 h-5 rounded-full object-cover"
              alt=""
            />
          </div>
          <span className="truncate">Your story</span>
        </button>

        {/* Middle: Close Friends 1-Tap Publish */}
        <div className="flex-1 flex items-center rounded-full bg-zinc-900/90 border border-emerald-500/30 p-0.5 shadow-lg">
          <button
            type="button"
            onClick={() => handlePublishStory("closeFriends")}
            disabled={isLoading || (items.length === 0 && mode === "media" && !useCamera)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full text-emerald-400 hover:text-emerald-300 font-bold text-xs transition cursor-pointer active:scale-95 disabled:opacity-40"
            title="Share to Close Friends Only"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-black shrink-0 shadow">
              <Star className="w-3 h-3 fill-black text-black" />
            </div>
            <span className="truncate">Close Friends</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              setShowCloseFriendsModal(true);
            }}
            className="p-2 text-emerald-400 hover:text-white rounded-full hover:bg-emerald-900/40 transition cursor-pointer"
            title="Edit Close Friends List"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Next / Direct Arrow */}
        <button
          type="button"
          onClick={() => handlePublishStory(visibleTo || "public")}
          disabled={isLoading || (items.length === 0 && mode === "media" && !useCamera)}
          className="w-10 h-10 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-xl transition active:scale-90 disabled:opacity-40 shrink-0 cursor-pointer"
          title="Share Story"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-black" />
          ) : (
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          )}
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
            snackbar.success(`Music Selected: ${song.title}`);
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

      {/* Exit & Save Draft Confirmation Prompt */}
      {showExitPrompt && (
        <div 
          className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowExitPrompt(false)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Save Story Draft?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                If you save as draft, you can finish and publish your story anytime later.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleSaveStoryDraft}
                className="w-full py-3 bg-gradient-to-tr from-pink-500 to-rose-600 text-white rounded-2xl text-xs font-bold shadow-lg hover:opacity-95 transition cursor-pointer"
              >
                Save Draft 📝
              </button>
              <button
                onClick={() => {
                  setShowExitPrompt(false);
                  stopCamera();
                  if (onClose) onClose();
                  else navigate(-1);
                }}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-red-400 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                Discard Story 🗑️
              </button>
              <button
                onClick={() => setShowExitPrompt(false)}
                className="w-full py-2.5 text-zinc-400 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Friends Management Modal */}
      {showCloseFriendsModal && (
        <CloseFriendsModal
          isOpen={showCloseFriendsModal}
          onClose={() => setShowCloseFriendsModal(false)}
        />
      )}
    </div>
  );
};

export default StoryCreator;

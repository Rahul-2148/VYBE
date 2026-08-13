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
  Check
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import api from "../lib/axios";
import { setStoryFeed } from "../redux/features/storySlice";
import StoryMusicPickerModal from "./StoryMusicPickerModal";
import StoryStickersDrawer from "./StoryStickersDrawer";

const FONTS = [
  { id: "classic", name: "Classic", className: "font-sans" },
  { id: "modern", name: "Modern", className: "font-mono uppercase tracking-widest" },
  { id: "neon", name: "Neon", className: "font-serif italic font-black" },
  { id: "bold", name: "Bold", className: "font-extrabold tracking-tight" },
];

const GRADIENTS = [
  "from-purple-600 via-pink-600 to-rose-500",
  "from-blue-600 via-indigo-600 to-purple-700",
  "from-emerald-500 via-teal-600 to-cyan-700",
  "from-amber-500 via-orange-600 to-red-600",
  "from-card via-background-secondary to-background",
];

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

  // Story Mode: 'media' | 'text'
  const [mode, setMode] = useState("media");
  
  // Multiple Story Queue state
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sharedEntityData, setSharedEntityData] = useState(initialState?.sharedEntity || null);

  useEffect(() => {
    if (initialState?.initialMediaUrl) {
      const isVid = initialState.initialMediaUrl.endsWith(".mp4") || initialState.initialMediaUrl.includes("/video/");
      setItems([{
        preview: initialState.initialMediaUrl,
        mediaType: isVid ? "video" : "image",
        file: null,
        stickers: [],
        filter: "none",
        isShared: true,
      }]);
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

  // Text Story State
  const [textContent, setTextContent] = useState("");
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [gradientIdx, setGradientIdx] = useState(0);
  const [textColor, setTextColor] = useState("#ffffff");

  // Privacy Target
  const [visibleTo, setVisibleTo] = useState("public");

  // Modals & Panels
  const [showStickersDrawer, setShowStickersDrawer] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);

  // Music Data (Applies globally to the post/stories batch)
  const [selectedMusic, setSelectedMusic] = useState(null);

  // Dragging state
  const [activeDragIdx, setActiveDragIdx] = useState(null);
  const [selectedStickerIdx, setSelectedStickerIdx] = useState(null);
  const startDragPosition = useRef(null);
  const touchStartRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
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
        filter: "none"
      };
      setItems([newItem]);
      setActiveIndex(0);
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

  // 2. Drag & Drop Sticker Repositioning with boundary limits & Trash deletion
  const handleStartDrag = (e, index) => {
    e.preventDefault();
    setActiveDragIdx(index);
    setSelectedStickerIdx(index);
    
    // Save starting position to determine if release is a quick tap vs a drag
    const targetItem = items[activeIndex];
    const sticker = targetItem?.stickers?.[index];
    if (sticker) {
      startDragPosition.current = {
        x: sticker.position?.x || 50,
        y: sticker.position?.y || 50
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
          position: { x, y }
        };
        next[activeIndex] = {
          ...next[activeIndex],
          stickers: activeStickers
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
            // Delete if dropped in the bottom trash bin area (y > 82%)
            if (sticker.position?.y > 82) {
              toast.success("Sticker removed");
              const next = [...prev];
              next[activeIndex] = {
                ...next[activeIndex],
                stickers: next[activeIndex].stickers.filter((_, i) => i !== activeDragIdx)
              };
              setSelectedStickerIdx(null);
              return next;
            }

            // Check if it was a quick click release (drag distance < 1.5%)
            const dragX = Math.abs((sticker.position?.x || 50) - (startDragPosition.current?.x || 50));
            const dragY = Math.abs((sticker.position?.y || 50) - (startDragPosition.current?.y || 50));
            
            if (dragX < 1.5 && dragY < 1.5) {
              const next = [...prev];
              const updatedSticker = { ...next[activeIndex].stickers[activeDragIdx] };
              updatedSticker.styleIndex = ((updatedSticker.styleIndex || 0) + 1) % (updatedSticker.type === "music_sticker" ? 4 : 3);
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

  const handleViewportTouchStart = (e) => {
    if (activeDragIdx !== null) return;
    // Don't gesture swipe if typing inside textarea
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") {
      return;
    }
    const touch = e.touches ? e.touches[0] : e;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleViewportTouchEnd = (e) => {
    if (!touchStartRef.current || activeDragIdx !== null) return;
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") {
      return;
    }
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const elapsedTime = Date.now() - touchStartRef.current.time;

    // Swipe left/right gesture (diffX > 60px, vertical shift < 50px, under 300ms)
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 50 && elapsedTime < 300) {
      const currentIdx = FILTERS.findIndex((f) => f.id === filter);
      if (diffX > 0) {
        // Swipe Right: Previous filter
        const prevIdx = (currentIdx - 1 + FILTERS.length) % FILTERS.length;
        handleSetFilter(FILTERS[prevIdx].id);
        toast(`Filter: ${FILTERS[prevIdx].name}`, { icon: "✨", duration: 1000 });
      } else {
        // Swipe Left: Next filter
        const nextIdx = (currentIdx + 1) % FILTERS.length;
        handleSetFilter(FILTERS[nextIdx].id);
        toast(`Filter: ${FILTERS[nextIdx].name}`, { icon: "✨", duration: 1000 });
      }
    }
    touchStartRef.current = null;
  };

  // 3. File Input Select
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

    setItems(newItems);
    setActiveIndex(0);
    setMode("media");
    stopCamera();
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
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
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

  // 5. Merge canvas drawings and photo filters on client before upload
  const getCombinedMediaBlob = (idx) => {
    return new Promise((resolve) => {
      const targetItem = items[idx];
      if (!targetItem) {
        resolve(null);
        return;
      }

      if (targetItem.mediaType === "video" || !targetItem.preview) {
        resolve(targetItem.file);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = targetItem.preview;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1080;
        canvas.height = img.naturalHeight || 1920;
        const ctx = canvas.getContext("2d");

        // Map CSS filter classes to canvas context filters
        const filterMapCtx = {
          none: "none",
          clarendon: "contrast(120%) saturate(125%) hue-rotate(-5deg)",
          juno: "sepia(20%) contrast(115%) saturate(130%) hue-rotate(10deg)",
          lark: "brightness(110%) contrast(90%) saturate(95%)",
          gingham: "brightness(105%) contrast(85%) sepia(30%) saturate(85%)",
          crema: "sepia(45%) contrast(95%) brightness(105%) saturate(90%)",
          aden: "hue-rotate(-10deg) saturate(85%) contrast(90%) brightness(115%) sepia(20%)",
          ludwig: "contrast(105%) saturate(95%) sepia(10%)",
          slumber: "saturate(60%) sepia(40%) contrast(80%) brightness(100%)",
          reyes: "sepia(35%) brightness(110%) contrast(85%) saturate(75%)",
          moon: "grayscale(100%) contrast(110%) brightness(110%)",
        };
        ctx.filter = filterMapCtx[targetItem.filter || "none"] || "none";

        // Draw image with active filter
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Reset filter so drawing layer is not affected
        ctx.filter = "none";

        // Scale and draw hand-drawn annotations from canvas (only if currently edited canvas match)
        if (idx === activeIndex && canvasRef.current) {
          ctx.drawImage(canvasRef.current, 0, 0, canvas.width, canvas.height);
        }

        canvas.toBlob((blob) => {
          resolve(new File([blob], `combined_${Date.now()}.png`, { type: "image/png" }));
        }, "image/png");
      };
      img.onerror = () => {
        resolve(targetItem.file);
      };
    });
  };

  const generateTextStoryBlob = () => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");

      // Set canvas background color or gradient
      const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      const gradsConfig = [
        ["#9333ea", "#db2777", "#e11d48"],
        ["#2563eb", "#4f46e5", "#7c3aed"],
        ["#10b981", "#0d9488", "#0891b2"],
        ["#f59e0b", "#ea580c", "#dc2626"],
        ["#18181b", "#09090b", "#18181b"]
      ];
      const colors = gradsConfig[gradientIdx] || gradsConfig[0];
      
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.5, colors[1]);
      grad.addColorStop(1, colors[2] || colors[1]);
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Draw Text
      ctx.fillStyle = textColor;
      ctx.font = "bold 65px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const lines = (textContent || "VYBE Story").split("\n");
      const startY = 960 - ((lines.length - 1) * 45);
      lines.forEach((line, index) => {
        ctx.fillText(line, 540, startY + (index * 90));
      });

      canvas.toBlob((blob) => {
        resolve(new File([blob], "text_story.png", { type: "image/png" }));
      });
    });
  };

  const handlePublishStory = async () => {
    try {
      setIsLoading(true);

      if (mode === "text") {
        setUploadProgressText("Sharing text story...");
        const fileToUpload = await generateTextStoryBlob();
        if (!fileToUpload) {
          toast.error("Failed to generate text story media.");
          setIsLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append("mediaType", "text");
        formData.append("media", fileToUpload);
        formData.append("visibleTo", visibleTo);
        formData.append("filter", GRADIENTS[gradientIdx] || "from-purple-600 via-pink-600 to-rose-500");
        formData.append("location", selectedFont.className || "font-sans");

        if (textContent) formData.append("caption", textContent);
        if (selectedMusic) formData.append("music", JSON.stringify(selectedMusic));
        if (stickers.length > 0) formData.append("stickers", JSON.stringify(stickers));

        await api.post("/story/upload", formData);
      } else {
        if (items.length === 0) {
          toast.error("Please select photos/videos or take a snapshot!");
          setIsLoading(false);
          return;
        }

        // Upload sequentially
        for (let i = 0; i < items.length; i++) {
          setUploadProgressText(`Uploading story ${i + 1} of ${items.length}...`);
          const targetItem = items[i];

          const formData = new FormData();
          formData.append("mediaType", targetItem.mediaType);
          formData.append("visibleTo", visibleTo);
          formData.append("filter", targetItem.filter || "none");

          if (targetItem.isShared || !targetItem.file) {
            formData.append("mediaUrl", targetItem.preview);
          } else {
            const fileToUpload = await getCombinedMediaBlob(i);
            formData.append("media", fileToUpload);
          }

          if (sharedEntityData) {
            formData.append("sharedEntity", JSON.stringify(sharedEntityData));
          }

          if (selectedMusic) formData.append("music", JSON.stringify(selectedMusic));
          if (targetItem.stickers && targetItem.stickers.length > 0) {
            formData.append("stickers", JSON.stringify(targetItem.stickers));
          }

          await api.post("/story/upload", formData);
        }
      }

      // Fetch refreshed story feed
      const feedRes = await api.get("/story/feed");
      dispatch(setStoryFeed(feedRes.data.stories));

      toast.success("Stories shared to feed successfully! ✨");
      setIsLoading(false);
      if (onClose) onClose();
      else navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Story upload failed");
      setIsLoading(false);
    }
  };

  const handleAddSticker = (newSticker) => {
    setItems((prev) => {
      if (mode === "text") {
        // Text mode stores stickers on the root level (single item)
        // Wait! Let's make text mode act like a single item queue or just update items[0]
        // Since we render text mode, we can just put a dummy item in items if empty:
        const next = [...prev];
        if (next.length === 0) {
          next.push({ preview: null, mediaType: "image", stickers: [], filter: "none" });
        }
        next[0].stickers = [...(next[0].stickers || []), { ...newSticker, position: { x: 50, y: 50 } }];
        return next;
      } else {
        if (!prev[activeIndex]) return prev;
        const next = [...prev];
        next[activeIndex] = {
          ...next[activeIndex],
          stickers: [...(next[activeIndex].stickers || []), { ...newSticker, position: { x: 50, y: 50 } }]
        };
        return next;
      }
    });
    setShowStickersDrawer(false);
  };

  const renderStickersInEditor = () => {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {stickers.map((s, idx) => {
          const isSelected = selectedStickerIdx === idx;
          const styleIdx = s.styleIndex || 0;
          const scaleVal = s.scale || 1;

          // Time Analog Hour/Min Degrees
          const timeDate = new Date();
          const hourDeg = (timeDate.getHours() % 12) * 30 + timeDate.getMinutes() * 0.5;
          const minDeg = timeDate.getMinutes() * 6;

          return (
            <div
              key={idx}
              onMouseDown={(e) => handleStartDrag(e, idx)}
              onTouchStart={(e) => handleStartDrag(e, idx)}
              style={{ 
                left: `${s.position?.x || 50}%`, 
                top: `${s.position?.y || 50}%`,
                transform: `translate(-50%, -50%) scale(${scaleVal})`,
                touchAction: "none"
              }}
              className={`absolute pointer-events-auto z-30 cursor-grab active:cursor-grabbing select-none w-64 max-w-[80%] transition-transform duration-75 ${
                isSelected ? "ring-2 ring-rose-500 rounded-2xl shadow-rose-500/10 shadow-2xl" : ""
              }`}
            >
              {/* 1. POLL STICKER */}
              {s.type === "poll" && (
                <div className={`rounded-2xl p-3.5 shadow-2xl text-center space-y-1.5 pointer-events-none border transition-all duration-300 ${
                  styleIdx === 1
                    ? "bg-surface-inset text-text border-border"
                    : styleIdx === 2
                    ? "bg-white/20 backdrop-blur-md text-text border-white/20"
                    : "bg-white/95 text-text border-white/40"
                }`}>
                  <p className="text-xs font-bold leading-snug">{s.poll?.question || "Poll"}</p>
                  <div className="flex gap-2">
                    {s.poll?.options?.map((opt, i) => (
                      <div key={i} className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition ${
                        styleIdx === 1
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : styleIdx === 2
                          ? "bg-white/10 border-white/20 text-text"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                      }`}>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. MENTION STICKER */}
              {s.type === "mention" && (
                <span className={`inline-flex items-center gap-1 px-4 py-2 font-black text-xs rounded-2xl shadow-2xl transition border ${
                  styleIdx === 1
                    ? "bg-card text-text-inverse border-white"
                    : styleIdx === 2
                    ? "bg-black/35 border-white/30 text-text backdrop-blur"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 text-text border-white/10"
                }`}>
                  @{s.mention?.username}
                </span>
              )}

              {/* 3. HASHTAG STICKER */}
              {s.type === "hashtag" && (
                <span className={`inline-flex items-center gap-1 px-4 py-2 font-black text-xs rounded-2xl shadow-2xl transition border ${
                  styleIdx === 1
                    ? "bg-card text-text-inverse border-white"
                    : styleIdx === 2
                    ? "bg-black/35 border-white/30 text-text backdrop-blur"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 text-text border-white/10"
                }`}>
                  #{s.hashtag?.tag}
                </span>
              )}

              {/* 4. QUESTION BOX STICKER */}
              {s.type === "question" && (
                <div className={`rounded-2xl p-4 shadow-2xl text-center w-full pointer-events-none border transition-all duration-300 ${
                  styleIdx === 1
                    ? "bg-surface-inset text-text border-border"
                    : styleIdx === 2
                    ? "bg-white/20 backdrop-blur text-text border-white/20"
                    : "bg-white/95 text-text border-white/40"
                }`}>
                  <p className="font-bold text-[11px] mb-2">{s.question?.prompt || "Ask me a question"}</p>
                  <div className={`w-full h-8 rounded-lg border transition ${
                    styleIdx === 1 ? "bg-surface border-border" : styleIdx === 2 ? "bg-white/10 border-white/15" : "bg-background-secondary border-border"
                  }`} />
                </div>
              )}

              {/* 5. SLIDER STICKER */}
              {s.type === "slider" && (
                <div className={`rounded-2xl p-3 shadow-2xl text-center w-full pointer-events-none flex items-center gap-2 border transition ${
                  styleIdx === 1
                    ? "bg-surface-inset text-text border-border"
                    : styleIdx === 2
                    ? "bg-white/20 backdrop-blur text-text border-white/20"
                    : "bg-white/95 text-text border-white/40"
                }`}>
                  <span className="text-xl">{s.slider?.emoji || "🔥"}</span>
                  <div className="flex-1 h-1.5 bg-card-active/40 rounded-full relative">
                    <div className="w-4.5 h-4.5 bg-orange-500 rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 shadow" />
                  </div>
                </div>
              )}

              {/* 6. COUNTDOWN STICKER */}
              {s.type === "countdown" && (
                <div className={`rounded-2xl p-3 shadow-2xl text-center space-y-1.5 w-full border transition ${
                  styleIdx === 1
                    ? "bg-surface-inset text-text border-border"
                    : styleIdx === 2
                    ? "bg-white/25 backdrop-blur text-text border-white/20"
                    : "bg-gradient-to-r from-cyan-600 to-blue-700 text-text border-white/20"
                }`}>
                  <span className="font-bold text-[10px] uppercase tracking-wider">{s.countdown?.title || "Countdown"}</span>
                  <div className={`flex justify-center gap-2 text-sm font-black font-mono py-1 rounded-lg ${
                    styleIdx === 2 ? "bg-white/10" : "bg-bg/20"
                  }`}>
                    <div>23h</div>
                    <div>59m</div>
                    <div>45s</div>
                  </div>
                </div>
              )}

              {/* 7. LINK STICKER */}
              {s.type === "link" && (
                <span className={`inline-flex items-center gap-1 px-4 py-2.5 font-extrabold text-[11px] rounded-full shadow-2xl border transition ${
                  styleIdx === 1
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-text border-white/10"
                    : styleIdx === 2
                    ? "bg-black/45 border-white/30 text-text backdrop-blur-md"
                    : "bg-card text-text border-border"
                }`}>
                  🔗 {s.link?.title || s.link?.url}
                </span>
              )}

              {/* 8. TIME STICKER */}
              {s.type === "time" && (
                <div className="flex justify-center">
                  {styleIdx === 2 ? (
                    /* Analog Clock style configuration */
                    <div className="w-16 h-16 rounded-full border-4 border-white bg-bg/40 backdrop-blur-sm relative flex items-center justify-center shadow-2xl">
                      <div className="absolute w-[3px] h-5 bg-card origin-bottom bottom-1/2 rounded" style={{ transform: `rotate(${hourDeg}deg)` }} />
                      <div className="absolute w-[2px] h-7 bg-white/90 origin-bottom bottom-1/2 rounded" style={{ transform: `rotate(${minDeg}deg)` }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 z-10" />
                    </div>
                  ) : (
                    /* Digital & Minimal Styles */
                    <div className={`text-center font-mono transition-all duration-300 ${
                      styleIdx === 1 
                        ? "font-sans text-2xl tracking-widest bg-bg/40 text-text px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10" 
                        : "text-3xl font-black bg-card text-text-inverse px-4 py-2.5 rounded-2xl shadow-2xl border border-white/40"
                    }`}>
                      {s.time?.timeString}
                    </div>
                  )}
                </div>
              )}

              {/* 9. DAY STICKER */}
              {s.type === "day" && (
                <div className="flex justify-center">
                  {styleIdx === 2 ? (
                    /* Comic Bold Yellow badge configuration */
                    <div className="font-sans font-black uppercase text-base bg-yellow-300 text-text-inverse px-3.5 py-1.5 rounded-xl border-3 border-bg shadow-lg transform rotate-2">
                      {s.day?.dayString}
                    </div>
                  ) : (
                    <div className={`text-center transition-all duration-300 ${
                      styleIdx === 1
                        ? "font-mono text-xs font-bold tracking-widest bg-bg/50 text-text px-4 py-2 rounded-xl border border-white/20 uppercase"
                        : "font-serif italic text-2xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent transform rotate-1"
                    }`}>
                      {s.day?.dayString}
                    </div>
                  )}
                </div>
              )}

              {/* 10. EMOJI STICKER */}
              {s.type === "emoji" && (
                <div className={`text-5xl text-center select-none ${
                  styleIdx === 1 ? "animate-pulse drop-shadow-2xl" : styleIdx === 2 ? "transform rotate-12 scale-110" : ""
                }`}>
                  {s.emoji?.val}
                </div>
              )}

              {/* 11. OVERLAY BADGE STICKER */}
              {s.type === "overlay" && (
                <div className={`font-black text-xs p-3 px-5 rounded-2xl shadow-2xl border flex flex-col items-center justify-center gap-1 text-center transition ${
                  styleIdx === 1
                    ? "bg-card text-text-inverse border-white"
                    : styleIdx === 2
                    ? "bg-black/45 text-text border-white/20 backdrop-blur-sm"
                    : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-text border-white/30"
                }`}>
                  <span className="text-2xl">{s.overlay?.icon}</span>
                  <span className="tracking-wider uppercase font-black">{s.overlay?.text}</span>
                </div>
              )}

              {/* 12. MUSIC STICKER */}
              {s.type === "music_sticker" && s.music_sticker && (
                <div className="select-none">
                  {styleIdx === 0 && (
                    <div className="bg-black/55 border border-white/10 backdrop-blur-md rounded-full p-2.5 flex items-center gap-3 text-left w-56 shadow-2xl transition hover:scale-[1.02]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 via-purple-600 to-cyan-500 flex items-center justify-center shrink-0 shadow animate-spin-slow">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-white truncate leading-tight">{s.music_sticker.title}</p>
                        <p className="text-[8px] text-white/70 font-bold truncate mt-0.5">{s.music_sticker.artist || "Unknown"}</p>
                      </div>
                      <div className="eq-container shrink-0 pr-1 flex items-end gap-[1.5px] h-3">
                        <div className="w-[1.5px] bg-white rounded-full h-1.5 animate-bounce" />
                        <div className="w-[1.5px] bg-white rounded-full h-2.5 animate-bounce [animation-delay:0.15s]" />
                        <div className="w-[1.5px] bg-white rounded-full h-1 animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </div>
                  )}

                  {styleIdx === 1 && (
                    <div className="bg-white text-black border border-white/20 rounded-full py-1.5 px-3 flex items-center gap-2 shadow-2xl text-left w-auto max-w-[210px] hover:scale-[1.02] transition">
                      <div className="eq-container shrink-0 flex items-end gap-[1.5px] h-2.5">
                        <div className="w-[1.5px] bg-black rounded-full h-1.5 animate-bounce" />
                        <div className="w-[1.5px] bg-black rounded-full h-2.5 animate-bounce [animation-delay:0.15s]" />
                        <div className="w-[1.5px] bg-black rounded-full h-1 animate-bounce [animation-delay:0.3s]" />
                      </div>
                      <span className="text-[9px] font-black truncate tracking-tight">{s.music_sticker.title}</span>
                    </div>
                  )}

                  {styleIdx === 2 && (
                    <div className="bg-gradient-to-br from-zinc-900/95 to-black border border-white/10 rounded-2xl p-2.5 flex items-center gap-3 shadow-2xl text-left w-52 hover:scale-[1.02] transition relative overflow-hidden">
                      <div className="relative w-10 h-10 shrink-0">
                        <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center animate-spin-slow z-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-black border border-zinc-600" />
                        </div>
                        <div className="relative w-10 h-10 rounded-lg bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg z-10 border border-white/15">
                          <Music className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 z-10">
                        <p className="text-[10px] font-black text-white truncate leading-tight">{s.music_sticker.title}</p>
                        <p className="text-[8px] text-white/70 font-semibold truncate mt-0.5">{s.music_sticker.artist || "Unknown"}</p>
                      </div>
                    </div>
                  )}

                  {styleIdx === 3 && (
                    <div className="bg-black/55 backdrop-blur-md rounded-2xl border border-white/10 p-2 shadow-2xl w-60 hover:scale-[1.02] transition text-center text-white">
                      <p className="text-[11px] font-black text-rose-500 animate-pulse tracking-wide select-none">
                        🎵 Lyrics styling preview...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const resolvedFilterClass = FILTERS.find((f) => f.id === filter)?.class || "";

  return (
    <div className="fixed inset-0 z-[400] bg-bg text-text flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {/* TOP HEADER CONTROLS */}
      <div className="h-16 shrink-0 px-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => {
            stopCamera();
            if (onClose) onClose();
            else navigate(-1);
          }}
          className="p-2 rounded-full bg-surface/80 hover:bg-surface-hover text-text transition cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* MODE TOGGLE */}
        <div className="flex items-center gap-1 bg-surface/90 border border-border p-1 rounded-full text-xs font-bold shadow-lg">
          <button
            onClick={() => {
              setMode("media");
              stopCamera();
            }}
            className={`px-4 py-1.5 rounded-full transition ${mode === "media" ? "bg-rose-600 text-text" : "text-text-secondary hover:text-text"}`}
          >
            Media
          </button>
          <button
            onClick={() => {
              setMode("text");
              stopCamera();
            }}
            className={`px-4 py-1.5 rounded-full transition ${mode === "text" ? "bg-rose-600 text-text" : "text-text-secondary hover:text-text"}`}
          >
            Text Story
          </button>
        </div>

        {/* TOOL PANEL */}
        <div className="flex items-center gap-2">
          {(mediaPreview || mode === "text") && (
            <>
              <button
                onClick={() => setShowStickersDrawer(true)}
                className="p-2 rounded-full bg-surface/80 hover:bg-surface-hover text-rose-400 transition cursor-pointer hover:scale-105"
                title="Add Sticker"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowMusicPicker(true)}
                className="p-2 rounded-full bg-surface/80 hover:bg-surface-hover text-purple-400 transition cursor-pointer hover:scale-105"
                title="Select Music"
              >
                <Music className="w-5 h-5" />
              </button>

              {mediaPreview && (
                <button
                  onClick={() => setShowDrawCanvas(!showDrawCanvas)}
                  className={`p-2 rounded-full transition cursor-pointer hover:scale-105 ${
                    showDrawCanvas ? "bg-rose-600 text-text" : "bg-surface/80 hover:bg-surface-hover text-amber-400"
                  }`}
                  title="Doodle Draw"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* CENTER CREATIVE VIEWPORT */}
      <div 
        onClick={() => setSelectedStickerIdx(null)}
        onMouseDown={handleViewportTouchStart}
        onMouseUp={handleViewportTouchEnd}
        onTouchStart={handleViewportTouchStart}
        onTouchEnd={handleViewportTouchEnd}
        className="flex-1 min-h-0 relative flex items-center justify-center p-2 cursor-default select-none touch-none"
      >
        {mode === "text" ? (
          /* TEXT STORY EDITOR */
          <div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className={`w-auto h-full max-h-[55vh] sm:max-h-[60vh] aspect-[9/16] rounded-3xl bg-gradient-to-tr ${GRADIENTS[gradientIdx]} flex flex-col items-center justify-center p-6 shadow-2xl relative border border-white/10 overflow-hidden`}
          >
            <textarea
              rows={4}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Type your story..."
              className={`w-full bg-transparent text-center text-3xl font-extrabold outline-none resize-none placeholder-white/55 ${selectedFont.className}`}
              style={{ color: textColor }}
            />

            {renderStickersInEditor()}

            {/* Background Color Preview Dots Tray */}
            <div className="absolute bottom-6 flex items-center justify-center gap-3 bg-surface-overlay backdrop-blur-md p-2.5 px-4 rounded-full border border-white/10 z-40 max-w-[90%] overflow-x-auto">
              {GRADIENTS.map((g, idx) => (
                <button
                  key={idx}
                  onClick={() => setGradientIdx(idx)}
                  className={`w-7 h-7 rounded-full bg-gradient-to-tr ${g} border-2 transition-all transform hover:scale-115 active:scale-90 cursor-pointer ${
                    gradientIdx === idx ? "border-white scale-110 shadow-lg shadow-white/30" : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          /* MEDIA EDITOR & LIVE CAMERA VIEWPORT */
          <div 
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="relative w-auto h-full max-h-[55vh] sm:max-h-[60vh] aspect-[9/16] rounded-3xl bg-surface-inset border border-border/80 shadow-2xl overflow-hidden flex items-center justify-center"
          >
            {useCamera ? (
              /* Live Camera View */
              <div className="relative w-full h-full">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className={`w-full h-full object-cover rounded-3xl transform ${facingMode === "user" ? "scale-x-[-1]" : ""}`} 
                />
                
                {/* Camera Overlay HUD */}
                <div className="absolute inset-x-0 bottom-6 z-40 flex items-center justify-around px-8">
                  <button
                    onClick={flipCamera}
                    className="p-3 bg-bg/40 backdrop-blur border border-white/20 text-text rounded-full hover:bg-surface-overlay transition active:scale-90 cursor-pointer"
                    title="Flip Camera"
                  >
                    <RotateCw className="w-6 h-6" />
                  </button>

                  <button
                    onClick={capturePhoto}
                    className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer bg-white/10 hover:bg-white/20 active:scale-90 transition"
                    title="Take Snapshot"
                  >
                    <div className="w-full h-full bg-card rounded-full shadow" />
                  </button>

                  <button
                    onClick={stopCamera}
                    className="p-3 bg-bg/40 backdrop-blur border border-white/20 text-text rounded-full hover:bg-surface-overlay transition active:scale-90 cursor-pointer"
                    title="Close Camera"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : mediaPreview ? (
              /* Media File Preview with Filters */
              mediaType === "image" ? (
                <img
                  src={mediaPreview}
                  alt=""
                  className={`w-full h-full object-cover pointer-events-none transition-all duration-300 ${resolvedFilterClass}`}
                />
              ) : (
                <video src={mediaPreview} controls autoPlay loop className="w-full h-full object-cover" />
              )
            ) : (
              /* Drag & Drop Import Picker Box */
              <div className="flex flex-col items-center justify-center gap-6 text-center p-6 w-full h-full select-none">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-4 text-center p-6 border border-dashed border-border rounded-2xl cursor-pointer group hover:bg-surface/50 hover:border-border-strong transition w-4/5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-rose-500 group-hover:scale-110 transition shadow-xl">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-text">Import from Device</p>
                    <p className="text-[10px] text-text-muted">Tap to upload photo or video</p>
                  </div>
                </div>

                <div 
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center gap-4 text-center p-6 border border-dashed border-border rounded-2xl cursor-pointer group hover:bg-surface/50 hover:border-border-strong transition w-4/5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-purple-400 group-hover:scale-110 transition shadow-xl">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-text">Open Live Camera</p>
                    <p className="text-[10px] text-text-muted">Capture using your webcam</p>
                  </div>
                </div>
              </div>
            )}

            {/* SHARED REEL / POST OVERLAY BADGES - Clean Top Left Author & Bottom Watch Link */}
            {sharedEntityData && (
              <>
                <div className="absolute top-4 left-4 z-35 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-lg pointer-events-none select-none">
                  <img
                    src={sharedEntityData.authorAvatar || dp}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-white/40"
                  />
                  <span className="text-xs font-bold text-white tracking-tight">
                    @{sharedEntityData.authorName || "user"}
                  </span>
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-35 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1 rounded-full shadow-lg text-[11px] font-bold text-white pointer-events-none select-none">
                  <span>Watch Reel</span>
                  <span className="text-rose-400 font-extrabold">&rarr;</span>
                </div>
              </>
            )}

            {/* DOODLE CANVAS DRAWING OVERLAY */}
            {showDrawCanvas && mediaPreview && (
              <div className="absolute inset-0 z-30">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={640}
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
                
                {/* Clear canvas helper */}
                <button
                  onClick={clearCanvas}
                  className="absolute top-4 left-4 z-40 bg-surface-overlay hover:bg-bg border border-white/20 text-text rounded-full px-3 py-1 text-[10px] font-bold cursor-pointer transition active:scale-95"
                >
                  Clear Sketch
                </button>
              </div>
            )}

            {/* STICKERS LIVE CREATOR PREVIEW OVERLAY */}
            {mediaPreview && renderStickersInEditor()}

            {/* DRAG DELETION TRASH BIN NOTIFIER */}
            {activeDragIdx !== null && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-red-600/90 border border-red-500 text-text rounded-full p-3.5 shadow-2xl flex items-center justify-center animate-pulse scale-110">
                <Trash2 className="w-5 h-5 text-text" />
              </div>
            )}

            {/* File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              onChange={handleFileSelect}
              multiple
              hidden
            />
          </div>
        )}

        {/* FLOAT SCALE SLIDER */}
        {selectedStickerIdx !== null && stickers[selectedStickerIdx] && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 z-50 bg-bg/85 backdrop-blur-md p-3.5 py-5 rounded-2xl border border-white/10 flex flex-col items-center gap-3.5 shadow-2xl min-h-[220px]"
          >
            <span className="text-[9px] uppercase font-black tracking-widest text-text-secondary">Scale</span>
            <input 
              type="range"
              min="0.4"
              max="3"
              step="0.05"
              value={stickers[selectedStickerIdx]?.scale || 1}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setItems((prev) => {
                  if (mode === "text") {
                    const next = [...prev];
                    if (next[0] && next[0].stickers[selectedStickerIdx]) {
                      next[0].stickers[selectedStickerIdx].scale = val;
                    }
                    return next;
                  } else {
                    if (!prev[activeIndex]) return prev;
                    const next = [...prev];
                    next[activeIndex].stickers[selectedStickerIdx].scale = val;
                    return next;
                  }
                });
              }}
              className="w-32 cursor-pointer accent-rose-500 appearance-none bg-surface-hover rounded-full h-1"
              style={{ writingMode: "bt-lr" }}
            />
            <span className="text-[10px] font-bold text-text font-mono">
              {Math.round((stickers[selectedStickerIdx]?.scale || 1) * 100)}%
            </span>
            <button
              onClick={() => setSelectedStickerIdx(null)}
              className="p-1.5 bg-surface-hover hover:bg-surface-active rounded-full border border-white/10 text-text transition cursor-pointer"
              title="Close editor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Selected Items Thumbnail Queue Row */}
      {items.length > 1 && (
        <div className="w-full shrink-0 flex items-center justify-center gap-3 px-6 py-2 bg-black/45 border-t border-border overflow-x-auto hide-scrollbar">
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`relative w-12 h-16 rounded-lg border-2 cursor-pointer transition transform hover:scale-105 active:scale-95 shrink-0 overflow-hidden ${
                activeIndex === index ? "border-rose-500 scale-105" : "border-border opacity-60"
              }`}
            >
              {item.mediaType === "image" ? (
                <img src={item.preview} className="w-full h-full object-cover" alt="" />
              ) : (
                <video src={item.preview} className="w-full h-full object-cover" muted />
              )}
              <span className="absolute bottom-0.5 right-0.5 bg-surface-overlay text-text text-[8px] font-black px-1.5 py-0.5 rounded-full">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* COLOR PICKER DRAWER OR FILTERS ROW DISPLAY */}
      {mediaPreview && mode === "media" && (
        <div className="w-full shrink-0 flex items-center justify-start overflow-x-auto gap-4 px-6 bg-surface-inset border-t border-border/60 hide-scrollbar py-4 z-40 relative">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => handleSetFilter(f.id)}
              className="flex flex-col items-center gap-2 shrink-0 transition group cursor-pointer p-1"
            >
              {/* Live Preview Thumbnail Circle with Ring Wrapper */}
              <div className={`relative p-0.5 rounded-full transition-all duration-200 ${
                filter === f.id ? "bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 scale-105 shadow-xl shadow-rose-500/20" : "bg-transparent group-hover:bg-surface-hover"
              }`}>
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-bg">
                  {mediaType === "image" ? (
                    <img
                      src={mediaPreview}
                      className={`w-full h-full object-cover ${f.class}`}
                      alt=""
                    />
                  ) : (
                    <div className="relative w-full h-full bg-surface-inset flex items-center justify-center">
                      <video src={mediaPreview} className={`w-full h-full object-cover pointer-events-none ${f.class}`} muted />
                      <div className="absolute inset-0 bg-black/10" />
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-[10px] font-extrabold tracking-tight transition ${
                filter === f.id ? "text-text font-black" : "text-text-secondary group-hover:text-text"
              }`}>
                {f.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* BOTTOM PUBLISH HUD BAR */}
      <div className="h-20 shrink-0 px-6 bg-surface-inset border-t border-border/60 flex items-center justify-between z-50">
        
        {/* Privacy Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisibleTo("public")}
            className={`px-3.5 py-2 rounded-full text-xs font-extrabold transition cursor-pointer ${
              visibleTo === "public" ? "bg-rose-600 text-text shadow-lg" : "bg-surface text-text-secondary hover:text-text"
            }`}
          >
            Your Story
          </button>
          <button
            onClick={() => setVisibleTo("closeFriends")}
            className={`px-3.5 py-2 rounded-full text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
              visibleTo === "closeFriends" ? "bg-emerald-600 text-text shadow-lg border border-emerald-500/20" : "bg-surface text-text-secondary hover:text-text"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current text-emerald-400" />
            <span>Close Friends</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          disabled={isLoading || (items.length === 0 && mode === "media" && !useCamera)}
          onClick={handlePublishStory}
          className="px-6 py-3.5 bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 hover:scale-105 active:scale-95 text-text text-xs font-extrabold rounded-full shadow-2xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50 min-w-[140px] justify-center"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-text" />
              <span className="text-[10px] uppercase font-bold tracking-tight">{uploadProgressText || "Sharing..."}</span>
            </div>
          ) : (
            <>
              <span>Share Story</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* STORY STICKERS DRAWER MODAL */}
      {showStickersDrawer && (
        <StoryStickersDrawer
          open={showStickersDrawer}
          onClose={() => setShowStickersDrawer(false)}
          onAddSticker={handleAddSticker}
        />
      )}

      {/* STORY MUSIC PICKER MODAL */}
      {showMusicPicker && (
        <StoryMusicPickerModal
          open={showMusicPicker}
          onClose={() => setShowMusicPicker(false)}
          selectedMusic={selectedMusic}
          onSelectMusic={(song) => {
            setSelectedMusic(song);
            toast.success(`Music Selected: ${song.title}`);
            // Add a draggable music sticker to the story canvas
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
    </div>
  );
};

export default StoryCreator;

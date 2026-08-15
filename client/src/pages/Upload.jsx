import { useRef, useState } from "react";
import { toast } from "sonner";
import { FiPlusSquare } from "react-icons/fi";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { 
  Sparkles, 
  Eye, 
  Music, 
  MapPin, 
  UserPlus, 
  Clock, 
  Settings, 
  Trash2, 
  Plus,
  ChevronDown, 
  ChevronUp,
  FolderOpen,
  Crop
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import VideoPlayer from "../components/VideoPlayer";
import AICreationModal from "../components/AICreationModal";
import StoryCreator from "../components/StoryCreator";
import StoryMusicPickerModal from "../components/StoryMusicPickerModal";
import { setLoopData } from "../redux/features/loopSlice";
import { setPostData } from "../redux/features/postSlice";
// removed unused setStoryFeed import
import api from "../lib/axios";
import dp from "../assets/dp3.png";

export const Upload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const queryType = new URLSearchParams(location.search).get("type") || location.state?.type || "post";
  const [uploadType, setUploadType] = useState(queryType);

  // Post Carousel Queue State
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Form Fields
  const [caption, setCaption] = useState("");
  const [locationText, setLocationText] = useState("");
  const [tagUsernames, setTagUsernames] = useState("");
  const [selectedMusic, setSelectedMusic] = useState(() => location.state?.preselectedMusic || null);

  // Autocomplete Suggestions
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);

  const POPULAR_LOCATIONS = [
    "New York, USA",
    "Los Angeles, California",
    "London, United Kingdom",
    "Paris, France",
    "Tokyo, Japan",
    "Mumbai, India",
    "New Delhi, India",
    "Berlin, Germany",
    "Sydney, Australia",
    "Dubai, United Arab Emirates"
  ];

  const handleLocationChange = async (val) => {
    setLocationText(val);
    if (!val.trim() || val.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    const filtered = POPULAR_LOCATIONS.filter((loc) =>
      loc.toLowerCase().includes(val.toLowerCase())
    );

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        const apiLocs = data.map((d) => d.display_name.split(",").slice(0, 3).join(","));
        const combined = Array.from(new Set([...filtered, ...apiLocs])).slice(0, 7);
        setLocationSuggestions(combined);
        return;
      }
    } catch (e) {
      console.warn("Upload: handleLocationChange reverse geocode failed", e);
    }

    setLocationSuggestions(filtered);
  };

  const handleUserTagChange = async (val) => {
    setTagUsernames(val);
    if (!val.trim()) {
      setUserSuggestions([]);
      return;
    }

    const parts = val.split(",");
    const activePart = parts[parts.length - 1].trim().replace("@", "");

    if (activePart.length < 2) {
      setUserSuggestions([]);
      return;
    }

    try {
      const res = await api.get(`/search/query?q=${activePart}`);
      if (res.data.success) {
        setUserSuggestions(res.data.users || []);
      }
    } catch (e) {
      console.warn("Upload: handleUserTagChange search failed", e);
      setUserSuggestions([]);
    }
  };

  const selectLocation = (loc) => {
    setLocationText(loc);
    setLocationSuggestions([]);
  };

  const selectUserTag = (user) => {
    const parts = tagUsernames.split(",");
    parts[parts.length - 1] = ` @${user.userName}`;
    setTagUsernames(parts.join(",") + ", ");
    setUserSuggestions([]);
  };

  // Coordinate Image Tagging States
  const [tempTagCoord, setTempTagCoord] = useState(null);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagSearchResults, setTagSearchResults] = useState([]);

  const handleImageCanvasClick = (e) => {
    if (uploadType !== "post" || !activeItem || activeItem.type !== "image") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const percentageX = (clickX / rect.width) * 100;
    const percentageY = (clickY / rect.height) * 100;

    setTempTagCoord({ x: Math.round(percentageX), y: Math.round(percentageY) });
    setTagSearchQuery("");
    setTagSearchResults([]);
  };

  const handleTagSearch = async (val) => {
    setTagSearchQuery(val);
    if (val.trim().length < 2) {
      setTagSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/search/query?q=${val}`);
      if (res.data.success) {
        setTagSearchResults(res.data.users || []);
      }
    } catch {
      setTagSearchResults([]);
    }
  };

  const addTagToActiveItem = (user) => {
    if (!tempTagCoord) return;
    setItems((prev) => {
      const next = [...prev];
      if (!next[activeIndex]) return prev;
      const currentTags = next[activeIndex].tags || [];
      if (currentTags.some((t) => t.user._id === user._id)) {
        toast.error("User already tagged on this slide");
        return prev;
      }
      next[activeIndex].tags = [
        ...currentTags,
        {
          user,
          userName: user.userName,
          x: tempTagCoord.x,
          y: tempTagCoord.y
        }
      ];
      return next;
    });
    setTempTagCoord(null);
    setTagSearchQuery("");
    setTagSearchResults([]);
  };

  const removePlacedTag = (userId, e) => {
    e.stopPropagation();
    setItems((prev) => {
      const next = [...prev];
      if (!next[activeIndex]) return prev;
      next[activeIndex].tags = (next[activeIndex].tags || []).filter(
        (t) => t.user._id !== userId
      );
      return next;
    });
  };

  // Advanced Options Accordion
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [likesHidden, setLikesHidden] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [scheduledPublishTime, setScheduledPublishTime] = useState("");

  // Modals & Loaders
  const [showAIModal, setShowAIModal] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");

  const mediaInput = useRef(null);
  const { postData } = useSelector((state) => state.post);
  const { loopData } = useSelector((state) => state.loop);

  // Handle Multi-file or single file select
  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (uploadType === "loop") {
      // Loop only accepts 1 video under 10 minutes
      const file = files[0];
      if (!file.type.includes("video")) {
        toast.error("Reels (Loops) must be video files");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Reels must be under 100MB");
        return;
      }
      setItems([{
        file,
        preview: URL.createObjectURL(file),
        type: "video",
        altText: "",
        aspectRatio: "aspect-square",
        tags: []
      }]);
      setActiveIndex(0);
      return;
    }

    // For posts, map multiple files to the item queue
    const mapped = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.includes("video") ? "video" : "image",
      altText: "",
      aspectRatio: "aspect-square",
      tags: []
    }));

    setItems((prev) => {
      const next = [...prev, ...mapped];
      // Limit to max 10 files
      if (next.length > 10) {
        toast.error("You can select up to 10 media items");
        return next.slice(0, 10);
      }
      return next;
    });
    
    // Set active item if first time
    if (items.length === 0) {
      setActiveIndex(0);
    }
  };

  const removeMediaItem = (idx, e) => {
    e.stopPropagation();
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeIndex >= next.length && next.length > 0) {
        setActiveIndex(next.length - 1);
      }
      return next;
    });
  };

  const updateAltText = (text) => {
    setItems((prev) => {
      if (!prev[activeIndex]) return prev;
      const next = [...prev];
      next[activeIndex] = { ...next[activeIndex], altText: text };
      return next;
    });
  };

  // Pre-upload Safety Moderation
  const checkSafetyFirst = async () => {
    if (!caption.trim()) return true;
    try {
      const res = await api.post("/ai/check-safety", { text: caption, contentType: uploadType });
      if (res.data.isFlagged) {
        toast.error(`Blocked by Safety AI: ${res.data.reason}`);
        return false;
      }
      return true;
    } catch {
      return true; // Fallback in case AI moderation fails
    }
  };

  // 1. Upload Carousel or Single Post Controller Trigger
  const uploadPostFlow = async () => {
    if (items.length === 0) {
      toast.error("Please select at least 1 image or video");
      return;
    }

    const isSafe = await checkSafetyFirst();
    if (!isSafe) return;

    setIsLoading(true);
    setUploadProgressText("Uploading media to cloud...");

    try {
      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("location", locationText);
      formData.append("likesHidden", likesHidden ? "true" : "false");
      formData.append("allowComments", commentsDisabled ? "false" : "true");
      if (scheduledPublishTime) {
        formData.append("scheduledPublishTime", new Date(scheduledPublishTime).toISOString());
      }

      // Format Tagged Users from visual coordinates
      const allTags = [];
      items.forEach((item) => {
        if (item.tags) {
          item.tags.forEach((t) => {
            allTags.push({ user: t.user._id, x: t.x, y: t.y });
          });
        }
      });
      if (allTags.length > 0) {
        formData.append("taggedUsers", JSON.stringify(allTags));
      }

      if (selectedMusic) {
        formData.append("music", JSON.stringify(selectedMusic));
      }

      let result;
      if (items.length === 1) {
        // Single file upload
        formData.append("media", items[0].file);
        formData.append("mediaType", items[0].type);
        formData.append("altText", items[0].altText || "");
        
        result = await api.post("/post/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Carousel file upload
        items.forEach((item) => {
          formData.append("media", item.file);
        });
        const altTexts = items.map((i) => i.altText || "");
        formData.append("altText", altTexts.join("||")); // Join indicator for parser

        result = await api.post("/post/upload-carousel", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success(result.data.message || "Post published successfully!");
      if (result.data.post) {
        dispatch(setPostData([result.data.post, ...(postData || [])]));
      }
      setIsLoading(false);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
      setIsLoading(false);
    }
  };

  // 2. Upload Loops / Reels
  const uploadLoopFlow = async () => {
    if (items.length === 0) {
      toast.error("Please select a video file for Reels");
      return;
    }

    const isSafe = await checkSafetyFirst();
    if (!isSafe) return;

    setIsLoading(true);
    setUploadProgressText("Processing loop video...");

    try {
      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("media", items[0].file);
      
      if (selectedMusic) {
        formData.append("audioTrack", JSON.stringify(selectedMusic));
        formData.append("music", selectedMusic.title);
      }

      const result = await api.post("/loop/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (result.data.loop) {
        dispatch(setLoopData([result.data.loop, ...(loopData || [])]));
      }
      toast.success("Reel published successfully!");
      setIsLoading(false);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Reel upload failed");
      setIsLoading(false);
    }
  };

  // 3. Save Post as Draft
  const savePostAsDraft = async () => {
    if (items.length === 0) {
      toast.error("Draft needs at least one media selected");
      return;
    }
    setIsLoading(true);
    try {
      const hashtagsList = caption.match(/#[a-zA-Z0-9_]+/g) || [];
      const cleanHashtags = hashtagsList.map((h) => h.replace("#", ""));
      
      await api.post("/post/drafts", {
        caption,
        location: locationText,
        hashtags: cleanHashtags,
        mediaPreview: items[0].preview,
      });

      toast.success("Saved to Drafts! 📝");
      setIsLoading(false);
      navigate("/");
    } catch (err) {
        console.warn("Failed to save draft:", err);
        toast.error("Failed to save draft");
        setIsLoading(false);
      }
  };

  const handleUploadClick = () => {
    if (uploadType === "post") uploadPostFlow();
    else if (uploadType === "loop") uploadLoopFlow();
  };

  if (uploadType === "story") {
    return <StoryCreator onClose={() => navigate("/")} initialState={location.state} />;
  }

  const activeItem = items[activeIndex];

  return (
    <div className="w-full min-h-screen bg-bg text-text flex flex-col font-sans select-none overflow-y-auto pb-8">
      {/* HEADER */}
      <div className="w-full h-16 shrink-0 flex items-center justify-between px-6 border-b border-border bg-surface-inset/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-surface text-text-secondary hover:text-text transition cursor-pointer"
          >
            <MdOutlineKeyboardBackspace className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-black tracking-tight uppercase">Create Post</h1>
        </div>

        {items.length > 0 && uploadType === "post" && (
          <button
            onClick={savePostAsDraft}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-border text-xs font-extrabold hover:text-rose-400 rounded-full transition cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
        )}
      </div>

      {/* MODE SELECTOR */}
      <div className="w-[90%] max-w-[500px] mx-auto mt-6 p-1 bg-surface/60 border border-border/80 rounded-full flex justify-around items-center shrink-0">
        {["post", "story", "loop"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setUploadType(t);
              setItems([]);
              setActiveIndex(0);
            }}
            className={`w-[32%] py-2 text-xs font-extrabold rounded-full transition capitalize cursor-pointer ${
              uploadType === t ? "bg-rose-600 text-text shadow-lg shadow-rose-600/10" : "text-text-muted hover:text-text"
            }`}
          >
            {t === "loop" ? "Reels" : t}
          </button>
        ))}
      </div>

      {/* CORE WORKSPACE GRID */}
      <div className="w-full max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: VIEWPORT PREVIEW & QUEUE CAROUSEL */}
        <div className="w-full flex flex-col gap-4">
          {items.length === 0 ? (
            /* Media Selector Placeholder Dropzone */
            <div
              className="w-full aspect-[4/5] max-h-[500px] bg-surface/40 border-2 border-dashed border-border hover:border-rose-500/40 transition rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer shadow-2xl"
              onClick={() => mediaInput.current.click()}
            >
              <input 
                type="file" 
                multiple={uploadType === "post"} 
                accept={uploadType === "loop" ? "video/*" : "image/*,video/*"} 
                hidden 
                ref={mediaInput} 
                onChange={handleMediaSelect} 
              />
              <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-rose-500 shadow-md">
                <FiPlusSquare className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-text">Select Media files</p>
              <p className="text-[10px] text-text-muted font-semibold px-6 text-center">
                {uploadType === "post" ? "Upload up to 10 images or videos as a carousel" : "Upload a video file for Reels (Loops)"}
              </p>
            </div>
          ) : (
            /* Active Media Box Previews */
            <div className="w-full flex flex-col gap-4 bg-surface/35 border border-border p-4 rounded-3xl">
              <div 
                onClick={handleImageCanvasClick}
                className={`relative w-full overflow-hidden bg-surface-inset rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 ${activeItem.aspectRatio || "aspect-square"} cursor-crosshair`}
              >
                {activeItem.type === "image" ? (
                  <img src={activeItem.preview} alt="" className="w-full h-full object-cover pointer-events-none select-none" />
                ) : (
                  <VideoPlayer media={activeItem.preview} />
                )}

                {/* Placed tags on the image */}
                {activeItem.type === "image" && (activeItem.tags || []).map((tag, tIdx) => (
                  <div
                    key={tIdx}
                    style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -translate-x-1/2 -translate-y-1/2 bg-bg/85 backdrop-blur border border-border-strong/60 px-2.5 py-1 rounded-xl text-text text-[10px] font-bold shadow-2xl z-40 flex items-center gap-1.5 animate-in fade-in zoom-in"
                  >
                    <span>@{tag.userName}</span>
                    <button
                      type="button"
                      onClick={(e) => removePlacedTag(tag.user._id, e)}
                      className="p-0.5 hover:bg-surface-hover rounded-full text-text-secondary hover:text-text transition cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}

                {/* Inline Coordinate Tag Search Tooltip */}
                {tempTagCoord && activeItem.type === "image" && (
                  <div
                    style={{ left: `${tempTagCoord.x}%`, top: `${tempTagCoord.y}%` }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -translate-x-1/2 -translate-y-1/2 bg-surface-inset border border-border p-2.5 rounded-2xl shadow-2xl z-50 flex flex-col gap-2 w-48 animate-in fade-in zoom-in"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-1">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Tag Person</span>
                      <button
                        type="button"
                        onClick={() => setTempTagCoord(null)}
                        className="text-[9px] font-bold text-rose-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      autoFocus
                      value={tagSearchQuery}
                      onChange={(e) => handleTagSearch(e.target.value)}
                      placeholder="Type username..."
                      className="w-full bg-surface border border-border rounded-xl px-2.5 py-1 text-[10px] text-text outline-none focus:border-rose-500"
                    />

                    {tagSearchResults.length > 0 && (
                      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto mt-1 border-t border-border pt-1">
                        {tagSearchResults.map((u) => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => addTagToActiveItem(u)}
                            className="w-full text-left px-2 py-1 hover:bg-surface rounded-lg text-[9px] text-text transition flex items-center gap-1.5"
                          >
                            <div className="w-4.5 h-4.5 rounded-full overflow-hidden border border-border bg-surface-inset">
                              <img src={u.profileImage?.url || dp} className="w-full h-full object-cover" alt="" />
                            </div>
                            <span className="font-bold text-[9px]">@{u.userName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Aspect Ratio Crop button bottom left */}
                {uploadType === "post" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItems((prev) => {
                        if (!prev[activeIndex]) return prev;
                        const next = [...prev];
                        const current = next[activeIndex].aspectRatio || "aspect-square";
                        const nextAspect = current === "aspect-square"
                          ? "aspect-[4/5]"
                          : current === "aspect-[4/5]"
                          ? "aspect-video"
                          : "aspect-square";
                        next[activeIndex].aspectRatio = nextAspect;
                        return next;
                      });
                    }}
                    className="absolute bottom-4 left-4 p-2 bg-surface-overlay hover:bg-surface border border-white/15 text-text rounded-full transition cursor-pointer shadow-lg z-40 hover:scale-105"
                    title="Change Aspect Ratio"
                  >
                    <Crop className="w-4 h-4 text-rose-400" />
                  </button>
                )}
                
                {/* Delete button from canvas */}
                <button
                  onClick={(e) => removeMediaItem(activeIndex, e)}
                  className="absolute top-4 right-4 p-2 bg-surface-overlay hover:bg-rose-600/90 text-text rounded-full transition cursor-pointer shadow border border-white/15 z-40"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Slider Alt-Text Input per Media slide */}
              {uploadType === "post" && (
                <div className="flex items-center gap-2 px-1">
                  <Eye className="w-4 h-4 text-text-muted shrink-0" />
                  <input
                    type="text"
                    value={activeItem.altText || ""}
                    onChange={(e) => updateAltText(e.target.value)}
                    placeholder="Describe this image/video for accessibility (alt text)..."
                    className="w-full bg-transparent border-b border-border focus:border-rose-500 py-1.5 text-xs text-text outline-none"
                  />
                </div>
              )}

              {/* Horizontal Thumbnail Queue Row */}
              {items.length > 0 && (
                <div className="w-full border-t border-border/60 pt-3 mt-1 flex items-center gap-3 overflow-x-auto hide-scrollbar">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl border-2 cursor-pointer transition transform hover:scale-105 active:scale-95 shrink-0 overflow-hidden ${
                        activeIndex === idx ? "border-rose-500 scale-105 shadow-lg shadow-rose-500/10" : "border-border opacity-60"
                      }`}
                    >
                      {item.type === "image" ? (
                        <img src={item.preview} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <video src={item.preview} className="w-full h-full object-cover" muted />
                      )}
                      
                      <button
                        onClick={(e) => removeMediaItem(idx, e)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-surface-overlay hover:bg-rose-600 text-text rounded-full transition cursor-pointer"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add more to carousel button */}
                  {items.length < 10 && uploadType === "post" && (
                    <button
                      onClick={() => mediaInput.current.click()}
                      className="w-14 h-14 rounded-xl bg-surface border border-dashed border-border flex items-center justify-center text-text-muted hover:text-text transition shrink-0 cursor-pointer"
                      title="Add more slides"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: POST METADATA & CONFIG OPTIONS */}
        <div className="w-full flex flex-col gap-6">
          {/* Caption Input with AI trigger */}
          <div className="bg-surface/35 border border-border p-5 rounded-3xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-text-muted uppercase tracking-widest">Caption</label>
              <button
                type="button"
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-tr from-purple-600 via-rose-500 to-amber-500 text-text rounded-full text-[10px] font-black shadow hover:opacity-95 transition cursor-pointer hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>AI Assist</span>
              </button>
            </div>

            <textarea
              rows={4}
              className="w-full bg-surface-inset border border-border/80 focus:border-rose-500/60 rounded-2xl p-4 text-xs text-text outline-none resize-none leading-relaxed"
              placeholder="Write an engaging caption... add #hashtags or tag @friends"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {/* Location & Tags Details card */}
          {uploadType !== "story" && (
            <div className="bg-surface/35 border border-border p-5 rounded-3xl flex flex-col gap-4">
              {/* Location Picker */}
              <div className="flex items-center gap-3 relative">
                <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-text-secondary">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 relative">
                  <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider">Location</label>
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    placeholder="Add location details..."
                    className="w-full bg-transparent text-xs text-text outline-none border-b border-transparent focus:border-rose-500/40 py-0.5"
                  />
                  {locationSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-surface-inset border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                      {locationSuggestions.map((loc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectLocation(loc)}
                          className="w-full text-left px-3 py-2 hover:bg-surface text-xs text-text transition cursor-pointer"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tag Users Input */}
              <div className="flex items-center gap-3 border-t border-border/60 pt-4 relative">
                <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-text-secondary">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="flex-1 relative">
                  <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider">Tag Friends</label>
                  <input
                    type="text"
                    value={tagUsernames}
                    onChange={(e) => handleUserTagChange(e.target.value)}
                    placeholder="Type handles (e.g. john, sarah, modi)..."
                    className="w-full bg-transparent text-xs text-text outline-none border-b border-transparent focus:border-rose-500/40 py-0.5"
                  />
                  {userSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-surface-inset border border-border rounded-xl shadow-2xl max-h-40 overflow-y-auto z-50 p-1 flex flex-col gap-0.5">
                      {userSuggestions.map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => selectUserTag(u)}
                          className="w-full text-left px-3 py-1.5 hover:bg-surface rounded-lg text-xs text-text transition cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-border bg-surface-inset">
                            <img src={u.profileImage?.url || dp} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[10px]">@{u.userName}</span>
                            <span className="text-[8px] text-text-muted">{u.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Background Music Card */}
              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-rose-500 flex items-center justify-center text-text font-bold shadow shadow-purple-500/20">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">Post Soundtrack</p>
                    <p className="text-xs font-bold text-text truncate max-w-[200px]">
                      {selectedMusic ? `${selectedMusic.title} - ${selectedMusic.artist}` : "Add Music track"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedMusic && (
                    <button
                      type="button"
                      onClick={() => setSelectedMusic(null)}
                      className="p-1.5 text-text-muted hover:text-rose-500 rounded-full hover:bg-surface transition cursor-pointer"
                      title="Remove soundtrack"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMusicPicker(true)}
                    className="px-3.5 py-1.5 bg-surface hover:bg-surface-hover border border-border text-text text-[10px] font-extrabold rounded-full transition cursor-pointer"
                  >
                    {selectedMusic ? "Change" : "Add Soundtrack"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADVANCED SETTINGS ACCORDION */}
          {uploadType === "post" && (
            <div className="bg-surface/35 border border-border rounded-3xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-5 text-left outline-none cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-text-secondary" />
                  <span className="text-xs font-black text-text uppercase tracking-wider">Advanced Settings</span>
                </div>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
              </button>

              {showAdvanced && (
                <div className="p-5 pt-0 border-t border-border/50 flex flex-col gap-4 bg-surface-inset/20">
                  {/* Hide Like Count */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text">Hide Like & View Counts</p>
                      <p className="text-[10px] text-text-muted font-semibold max-w-[220px] mt-0.5">
                        Only you will see the total number of likes and views on this post.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={likesHidden} 
                        onChange={(e) => setLikesHidden(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-active after:border-border-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-card peer-checked:after:border-transparent"></div>
                    </label>
                  </div>

                  {/* Disable Comments */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <div>
                      <p className="text-xs font-bold text-text">Turn Off Commenting</p>
                      <p className="text-[10px] text-text-muted font-semibold max-w-[220px] mt-0.5">
                        You can change this later by going to the options menu at the top of your post.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={commentsDisabled} 
                        onChange={(e) => setCommentsDisabled(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-active after:border-border-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-card peer-checked:after:border-transparent"></div>
                    </label>
                  </div>

                  {/* Schedule Post Option */}
                  <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-xs font-bold text-text">Schedule this Post</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={!!scheduledPublishTime} 
                          onChange={(e) => setScheduledPublishTime(e.target.checked ? new Date(Date.now() + 3600000).toISOString().slice(0, 16) : "")} 
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-active after:border-border-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-card peer-checked:after:border-transparent"></div>
                      </label>
                    </div>

                    {scheduledPublishTime !== "" && (
                      <input
                        type="datetime-local"
                        value={scheduledPublishTime}
                        onChange={(e) => setScheduledPublishTime(e.target.value)}
                        className="w-full bg-surface-inset border border-border text-text text-xs rounded-xl px-3.5 py-2.5 mt-1.5 focus:border-rose-500 outline-none"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPLOAD SUBMIT HUD ACTION */}
          <button
            disabled={isLoading || items.length === 0}
            onClick={handleUploadClick}
            className="w-full py-4 bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-text font-extrabold text-sm rounded-3xl hover:opacity-95 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-40"
          >
            {isLoading ? (
              <div className="flex items-center gap-2.5">
                <ClipLoader size={18} color="white" />
                <span className="text-xs uppercase font-black tracking-widest">{uploadProgressText || "Publishing..."}</span>
              </div>
            ) : (
              <span>Publish {uploadType === "loop" ? "Reel" : uploadType}</span>
            )}
          </button>
        </div>

      </div>

      {/* AI Assistant Modal */}
      {showAIModal && (
        <AICreationModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          mode="caption"
          onSelectResult={(resultText) => {
            setCaption(resultText);
          }}
        />
      )}

      {/* Background Music Picker */}
      {showMusicPicker && (
        <StoryMusicPickerModal
          open={showMusicPicker}
          onClose={() => setShowMusicPicker(false)}
          selectedMusic={selectedMusic}
          contentContext={{
            caption,
            mediaName: activeItem?.file?.name || activeItem?.preview || "",
            mediaType: activeItem?.type || "image",
            tags: tagUsernames ? tagUsernames.split(" ") : [],
          }}
          onSelectMusic={(track) => {
            setSelectedMusic(track);
            toast.success(`Attached Soundtrack: "${track.title}" 🎵`);
          }}
        />
      )}
    </div>
  );
};

export default Upload;

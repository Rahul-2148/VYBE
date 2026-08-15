import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Music,
  Play,
  Pause,
  Check,
  Crown,
  Scissors,
  Upload,
  Sparkles,
  Bookmark,
  Volume2,
  VolumeX,
  Flame,
  Heart,
  Dumbbell,
  Coffee,
  Film,
  Globe,
  Loader2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "../lib/axios";

// Fallback direct iTunes search helper if server route is unreachable
const fetchItunesDirect = async (query, limit = 25) => {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}&media=music`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter((item) => Boolean(item.previewUrl))
      .map((item) => ({
        id: String(item.trackId || item.collectionId),
        title: item.trackName || item.collectionName || "Unknown Track",
        artist: item.artistName || "Unknown Artist",
        album: item.collectionName || "",
        audioUrl: item.previewUrl,
        coverUrl: item.artworkUrl100
          ? item.artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg")
          : item.artworkUrl60 || "",
        duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
        genre: item.primaryGenreName || "Music",
      }));
  } catch {
    return [];
  }
};

// All Real Category Tabs
const CATEGORIES = [
  { id: "For You", name: "For You ✨", query: "Top Hits Trending 2024" },
  { id: "Devotional", name: "Devotional 🕉️", query: "Shree Ram Siya Ram Shiv Tandav Hanuman Chalisa Krishna Bhajan" },
  { id: "Party & Punjabi", name: "Party & Punjabi 🔥", query: "Brown Munde 295 Tauba Tauba Sub Urban Punjabi Party Hits" },
  { id: "Romantic", name: "Romantic 💖", query: "Arijit Singh Kesariya Tum Hi Ho Golden Hour Romantic Songs" },
  { id: "Gym & Phonk", name: "Gym & Phonk ⚡", query: "Gigachad Phonk Tokyo Drift Hardstyle Gym Workout Motivation" },
  { id: "Lofi & Chill", name: "Lofi & Chill ☕", query: "Lofi Rain Midnight City Aesthetic Chill Beats" },
  { id: "Bollywood", name: "Bollywood 🎬", query: "Chaleya Jawan Animal Satranga Bollywood Hits" },
  { id: "Pop & Global", name: "Pop & Global 🌍", query: "The Weeknd Blinding Lights Levitating Dua Lipa Pop Hits" },
  { id: "Sad & Acoustic", name: "Sad & Acoustic 💔", query: "Channa Mereya Arcade Let Me Down Slowly Sad Songs" },
  { id: "Travel & Nature", name: "Travel & Nature ✈️", query: "Wanderlust Electric Feel Acoustic Travel Chill" },
  { id: "Saved", name: "Saved Tracks 🔖", query: "" },
];

export const StoryMusicPickerModal = ({
  open,
  onClose,
  onSelectMusic,
  selectedMusic,
  contentContext = {}, // e.g. { caption: "", mediaName: "", tags: [], theme: "" }
}) => {
  const { userData } = useSelector((state) => state.user);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("For You");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [audioObj, setAudioObj] = useState(null);
  const [aiInfo, setAiInfo] = useState(null);

  // Saved Tracks (Local Storage persistence)
  const [savedTracks, setSavedTracks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vybe_saved_real_music") || "[]");
    } catch {
      return [];
    }
  });

  // Local Device Audio State
  const [deviceTracks, setDeviceTracks] = useState([]);
  const fileInputRef = useRef(null);

  // Trimming State
  const [trimmingTrack, setTrimmingTrack] = useState(selectedMusic || null);
  const [snippetDuration, setSnippetDuration] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(30);

  // Toggle Save Track
  const toggleSaveTrack = (track, e) => {
    e?.stopPropagation();
    const exists = savedTracks.some((t) => t.id === track.id);
    let updated;
    if (exists) {
      updated = savedTracks.filter((t) => t.id !== track.id);
      toast("Removed from Saved");
    } else {
      updated = [track, ...savedTracks];
      toast.success("Saved to your music library! 🔖");
    }
    setSavedTracks(updated);
    try {
      localStorage.setItem("vybe_saved_real_music", JSON.stringify(updated));
    } catch {}
  };

  // Fetch Music Function (from Backend with Direct iTunes Fallback)
  const fetchMusicData = useCallback(async (query, isAI = false, categoryName = "") => {
    setLoading(true);
    try {
      if (isAI) {
        // AI Content-Aware Recommendation
        const params = new URLSearchParams({
          caption: contentContext.caption || "",
          mediaName: contentContext.mediaName || "",
          theme: contentContext.theme || "",
          tags: (contentContext.tags || []).join(" "),
        });

        try {
          const res = await api.get(`/music/recommend?${params.toString()}`);
          if (res.data?.success && res.data.tracks?.length > 0) {
            setTracks(res.data.tracks);
            setAiInfo(res.data.aiInfo);
            setLoading(false);
            return;
          }
        } catch {}

        // Fallback direct
        const fallbackTracks = await fetchItunesDirect(query || "Trending Hits 2024", 30);
        setTracks(fallbackTracks);
        setLoading(false);
        return;
      }

      if (categoryName) {
        try {
          const res = await api.get(`/music/category/${encodeURIComponent(categoryName)}`);
          if (res.data?.success && res.data.tracks?.length > 0) {
            setTracks(res.data.tracks);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // Live search query
      try {
        const res = await api.get(`/music/search?q=${encodeURIComponent(query)}&limit=30`);
        if (res.data?.success && res.data.tracks?.length > 0) {
          setTracks(res.data.tracks);
          setLoading(false);
          return;
        }
      } catch {}

      // Direct Apple API Fallback
      const direct = await fetchItunesDirect(query, 30);
      setTracks(direct);
    } catch (err) {
      console.warn("Music fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [contentContext]);

  // Initial Load & Tab Switching Effect
  useEffect(() => {
    if (!open) return;

    if (search.trim()) {
      const timer = setTimeout(() => {
        fetchMusicData(search.trim());
      }, 350);
      return () => clearTimeout(timer);
    }

    if (activeTab === "Saved") {
      setTracks(savedTracks);
      return;
    }

    if (activeTab === "For You") {
      fetchMusicData("", true);
      return;
    }

    const catObj = CATEGORIES.find((c) => c.id === activeTab);
    if (catObj) {
      fetchMusicData(catObj.query, false, catObj.id.toLowerCase().replace(/[^a-z]/g, ""));
    }
  }, [open, activeTab, search, savedTracks, fetchMusicData]);

  // Cleanup Audio on unmount
  useEffect(() => {
    return () => {
      if (audioObj) {
        audioObj.pause();
      }
    };
  }, [audioObj]);

  if (!open) return null;

  // Toggle Live Audio Preview
  const togglePreview = (track, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (playingId === track.id) {
      if (audioObj) {
        audioObj.pause();
      }
      setPlayingId(null);
      setAudioObj(null);
    } else {
      if (audioObj) {
        audioObj.pause();
      }
      const audio = new Audio(track.audioUrl);
      audio.currentTime = trimmingTrack?.id === track.id ? startTime : 0;
      audio.play().catch(() => null);

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        if (trimmingTrack?.id === track.id && snippetDuration !== "full") {
          if (audio.currentTime >= startTime + Number(snippetDuration)) {
            audio.currentTime = startTime;
          }
        }
      };

      audio.onloadedmetadata = () => {
        setTotalDuration(audio.duration || 30);
      };

      audio.onended = () => {
        setPlayingId(null);
        setAudioObj(null);
      };

      setAudioObj(audio);
      setPlayingId(track.id);
      setTrimmingTrack(track);
    }
  };

  // Select Track into Trimmer
  const handleSelectTrack = (track) => {
    setTrimmingTrack(track);
    setStartTime(0);

    if (audioObj) audioObj.pause();
    const audio = new Audio(track.audioUrl);
    audio.play().catch(() => null);

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (snippetDuration !== "full" && audio.currentTime >= Number(snippetDuration)) {
        audio.currentTime = 0;
      }
    };

    audio.onloadedmetadata = () => {
      setTotalDuration(audio.duration || 30);
    };

    audio.onended = () => {
      setPlayingId(null);
      setAudioObj(null);
    };

    setAudioObj(audio);
    setPlayingId(track.id);
  };

  // Device Audio Upload Handler
  const handleDeviceAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("audio")) {
      toast.error("Please select a valid audio file (MP3, WAV, AAC, M4A).");
      return;
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    const blobUrl = URL.createObjectURL(file);

    const newTrack = {
      id: "device_" + Date.now(),
      title: cleanTitle,
      artist: "Device Audio",
      album: "My Audio Files",
      category: "Device Audio",
      audioUrl: blobUrl,
      coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
      isDeviceAudio: true,
      file,
    };

    setDeviceTracks((prev) => [newTrack, ...prev]);
    setTracks((prev) => [newTrack, ...prev]);
    handleSelectTrack(newTrack);
    toast.success(`Loaded "${cleanTitle}" from your device! 📁`);
  };

  // Trimmer Seek
  const handleTrimChange = (e) => {
    const val = parseFloat(e.target.value);
    setStartTime(val);
    if (audioObj) {
      audioObj.currentTime = val;
      if (audioObj.paused && playingId === trimmingTrack?.id) {
        audioObj.play().catch(() => null);
      }
    }
  };

  // Confirm Selection
  const handleConfirmSelection = () => {
    if (!trimmingTrack) return;
    if (audioObj) audioObj.pause();

    onSelectMusic({
      id: trimmingTrack.id,
      title: trimmingTrack.title,
      artist: trimmingTrack.artist,
      audioUrl: trimmingTrack.audioUrl,
      coverUrl: trimmingTrack.coverUrl || "",
      duration: snippetDuration === "full" ? totalDuration : Number(snippetDuration),
      startTime,
    });

    onClose();
  };

  const displayedTracks = useMemo(() => {
    if (activeTab === "Saved") return savedTracks;
    return [...deviceTracks, ...tracks];
  }, [activeTab, savedTracks, deviceTracks, tracks]);

  return (
    <div
      className="fixed inset-0 z-[700] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 via-purple-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Music Soundtrack Studio</h2>
              <p className="text-[10px] text-zinc-400">Real songs, live Apple Music engine & device audio</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Device Audio Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-full text-xs font-bold transition cursor-pointer"
              title="Upload MP3 / Audio from your device"
            >
              <Upload className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">From Device</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              onChange={handleDeviceAudioUpload}
              hidden
            />

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="p-3 px-4 shrink-0 bg-zinc-900/30">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any real song, artist (Arijit, Taylor Swift, Shree Ram, Sidhu)..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* CATEGORY TABS HORIZONTAL STRIP */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 overflow-x-auto hide-scrollbar shrink-0 bg-black/40">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id);
                setSearch("");
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                activeTab === cat.id
                  ? "bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/20"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* AI RECOMMENDED BANNER (When Content Matched) */}
        {aiInfo && activeTab === "For You" && !search && (
          <div className="mx-4 mt-2 p-2.5 bg-gradient-to-r from-purple-950/70 via-rose-950/60 to-zinc-900 border border-purple-500/30 rounded-2xl flex items-center justify-between shadow-lg shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-lg">{aiInfo.icon}</span>
              <div>
                <p className="text-[11px] font-black text-rose-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                  AI Recommended for your Content
                </p>
                <p className="text-[9px] text-zinc-300">
                  Matched mood: <span className="font-bold text-white">{aiInfo.label}</span>
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-full text-[9px] font-bold">
              Smart Pick
            </span>
          </div>
        )}

        {/* TRACKS LIST SCROLLABLE VIEWPORT */}
        <div className="flex-1 min-h-[240px] max-h-[380px] overflow-y-auto px-4 py-2 space-y-1.5 hide-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <p className="text-xs font-bold">Searching live music catalog...</p>
            </div>
          ) : displayedTracks.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <Music className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs font-bold">No songs found</p>
              <p className="text-[10px] text-zinc-500">Try searching another artist or upload an MP3 from your device.</p>
            </div>
          ) : (
            displayedTracks.map((track) => {
              const isSelected = trimmingTrack?.id === track.id;
              const isPlaying = playingId === track.id;
              const isSaved = savedTracks.some((t) => t.id === track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => handleSelectTrack(track)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl transition cursor-pointer border ${
                    isSelected
                      ? "bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-500/10"
                      : "bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/60"
                  }`}
                >
                  {/* Left: Play Icon & Cover */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700 shadow">
                      <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={(e) => togglePreview(track, e)}
                        className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center transition cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 text-white fill-white" />
                        ) : (
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Middle: Title & Artist & Category Badge */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold truncate ${isSelected ? "text-rose-400 font-black" : "text-white"}`}>
                          {track.title}
                        </p>
                        {track.isDeviceAudio && (
                          <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 text-[8px] font-black rounded">
                            Device
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                      {track.album && (
                        <span className="text-[8px] text-zinc-500 font-semibold truncate block">
                          {track.album}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Bookmark & Action Check */}
                  <div className="flex items-center gap-2">
                    {/* Animated Equalizer Bars when playing */}
                    {isPlaying && (
                      <div className="flex items-end gap-0.5 h-4 px-1">
                        <span className="w-0.5 bg-rose-500 h-full animate-pulse" />
                        <span className="w-0.5 bg-rose-400 h-2/3 animate-bounce" />
                        <span className="w-0.5 bg-rose-500 h-4/5 animate-pulse" />
                      </div>
                    )}

                    {/* Bookmark Save Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleSaveTrack(track, e)}
                      className={`p-1.5 rounded-full transition cursor-pointer ${
                        isSaved ? "text-amber-400 bg-amber-500/10" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      title={isSaved ? "Saved" : "Save Track"}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-400" : ""}`} />
                    </button>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-white shadow">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM TRIMMING & WAVEFORM HUD (When Track Selected) */}
        {trimmingTrack && (
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 space-y-3">
            {/* Track Info & Duration Pills */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 max-w-[200px]">
                <p className="text-xs font-black text-white truncate">{trimmingTrack.title}</p>
                <p className="text-[9px] text-zinc-400 truncate">{trimmingTrack.artist}</p>
              </div>

              {/* Snippet Duration Pills */}
              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-full border border-zinc-800 text-[10px] font-bold">
                {[15, 30, "full"].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setSnippetDuration(dur)}
                    className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                      snippetDuration === dur ? "bg-rose-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {dur === "full" ? "Full" : `${dur}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Waveform Scrubber Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                <span>Start: {Math.floor(startTime)}s</span>
                <span>
                  Snippet: {snippetDuration === "full" ? "Full Track" : `${snippetDuration}s`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(5, totalDuration - (snippetDuration === "full" ? 0 : Number(snippetDuration)))}
                step="1"
                value={startTime}
                onChange={handleTrimChange}
                className="w-full accent-rose-500 bg-zinc-800 h-1.5 rounded-full cursor-pointer"
              />
            </div>

            {/* Apply Button */}
            <button
              onClick={handleConfirmSelection}
              className="w-full py-2.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:opacity-95 active:scale-98 rounded-2xl text-xs font-black text-white shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Use This Soundtrack</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryMusicPickerModal;

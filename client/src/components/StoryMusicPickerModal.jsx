import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X,
  Search,
  Music,
  Play,
  Pause,
  Check,
  Sparkles,
  Bookmark,
  Loader2,
} from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

// Fallback direct iTunes search helper if server route is unreachable
const fetchItunesDirect = async (query, limit = 30) => {
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
          ? item.artworkUrl100.replace("100x100bb.jpg", "1000x1000bb.jpg")
          : item.artworkUrl60 || "",
        duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
        genre: item.primaryGenreName || "Music",
      }));
  } catch {
    return [];
  }
};

// All Real Category Tabs (Dynamically updated for any year)
const getCurrentYear = () => new Date().getFullYear();

const getCategories = () => [
  { id: "For You", name: "For You ✨", query: `Top Hits Trending ${getCurrentYear()}` },
  { id: "Devotional", name: "Devotional 🕉️", query: "Shree Ram Siya Ram Shiv Tandav Hanuman Chalisa Krishna Bhajan" },
  { id: "Party & Punjabi", name: "Party & Punjabi 🔥", query: "Brown Munde 295 Tauba Tauba Sub Urban Punjabi Party Hits" },
  { id: "Romantic", name: "Romantic 💖", query: "Arijit Singh Kesariya Tum Hi Ho Golden Hour Romantic Songs" },
  { id: "Gym & Phonk", name: "Gym & Phonk ⚡", query: "Gigachad Phonk Tokyo Drift Hardstyle Gym Workout Motivation" },
  { id: "Lofi & Chill", name: "Lofi & Chill ☕", query: "Lofi Rain Midnight City Aesthetic Chill Beats" },
  { id: "Bollywood", name: "Bollywood 🎬", query: `Bollywood Hits ${getCurrentYear()} Chaleya Jawan Animal` },
  { id: "Pop & Global", name: "Pop & Global 🌍", query: "The Weeknd Blinding Lights Levitating Dua Lipa Pop Hits" },
  { id: "Sad & Acoustic", name: "Sad & Acoustic 💔", query: "Channa Mereya Arcade Let Me Down Slowly Sad Songs" },
  { id: "Travel & Nature", name: "Travel & Nature ✈️", query: "Wanderlust Electric Feel Acoustic Travel Chill" },
  { id: "Saved", name: "Saved Tracks 🔖", query: "" },
];

const CATEGORIES = getCategories();

export const StoryMusicPickerModal = ({
  open,
  onClose,
  onSelectMusic,
  selectedMusic,
  contentContext = {}, // e.g. { caption: "", mediaName: "", tags: [], theme: "" }
}) => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("For You");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [aiInfo, setAiInfo] = useState(null);

  const audioRef = useRef(null);

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
  const [totalDuration, setTotalDuration] = useState(30);

  // Stable Content Context Ref
  const contentContextRef = useRef(contentContext);
  useEffect(() => {
    contentContextRef.current = contentContext;
  }, [contentContext]);

  // Toggle Save Track
  const toggleSaveTrack = (track, e) => {
    e?.stopPropagation();
    const exists = savedTracks.some((t) => t.id === track.id);
    let updated;
    if (exists) {
      updated = savedTracks.filter((t) => t.id !== track.id);
      snackbar("Removed from Saved");
    } else {
      updated = [track, ...savedTracks];
      snackbar.success("Saved to your music library! 🔖");
    }
    setSavedTracks(updated);
    try {
      localStorage.setItem("vybe_saved_real_music", JSON.stringify(updated));
    } catch {
      // LocalStorage write error fallback
    }
  };

  // Stable Load Music Function
  const loadMusic = useCallback(async (tabName, queryText) => {
    setLoading(true);
    try {
      // 1. If Searching
      if (queryText && queryText.trim()) {
        try {
          const res = await api.get(`/music/search?q=${encodeURIComponent(queryText.trim())}&limit=30`);
          if (res.data?.success && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
            setTracks(res.data.tracks);
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to direct iTunes API
        }

        const fallback = await fetchItunesDirect(queryText.trim(), 30);
        setTracks(fallback);
        setLoading(false);
        return;
      }

      // 2. Saved Tab
      if (tabName === "Saved") {
        try {
          const saved = JSON.parse(localStorage.getItem("vybe_saved_real_music") || "[]");
          setTracks(saved);
        } catch {
          setTracks([]);
        }
        setLoading(false);
        return;
      }

      // 3. For You Tab (AI Content-Aware)
      if (tabName === "For You") {
        const ctx = contentContextRef.current || {};
        const params = new URLSearchParams({
          caption: ctx.caption || "",
          mediaName: ctx.mediaName || "",
          theme: ctx.theme || "",
          tags: (ctx.tags || []).join(" "),
        });

        try {
          const res = await api.get(`/music/recommend?${params.toString()}`);
          if (res.data?.success && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
            setTracks(res.data.tracks);
            if (res.data.aiInfo) {
              setAiInfo(res.data.aiInfo);
            }
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to popular trending
        }

        const fallback = await fetchItunesDirect(`Top Hits Trending ${getCurrentYear()}`, 30);
        setTracks(fallback);
        setLoading(false);
        return;
      }

      // 4. Specific Category Tab
      const catObj = CATEGORIES.find((c) => c.id === tabName);
      const query = catObj ? catObj.query : `${tabName} Hits`;
      const catKey = tabName.toLowerCase().replace(/[^a-z]/g, "");

      try {
        const res = await api.get(`/music/category/${encodeURIComponent(catKey)}`);
        if (res.data?.success && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
          setTracks(res.data.tracks);
          setLoading(false);
          return;
        }
      } catch {
        // Fallback to query
      }

      const direct = await fetchItunesDirect(query, 30);
      setTracks(direct);
    } catch (err) {
      console.warn("Music load failed:", err);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Safe Single-Trigger Load Effect
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const executeLoad = async () => {
      if (isMounted) {
        await loadMusic(activeTab, search.trim());
      }
    };

    if (search.trim()) {
      const timer = setTimeout(() => {
        executeLoad();
      }, 300);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    executeLoad();
    return () => {
      isMounted = false;
    };
  }, [open, activeTab, search, loadMusic]);

  // Cleanup Audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Toggle Live Audio Preview
  const togglePreview = (track, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (playingId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(track.audioUrl);
      audio.volume = 1.0;
      audio.preload = "auto";
      audio.currentTime = trimmingTrack?.id === track.id ? startTime : 0;
      audio.play().catch(() => null);

      audio.ontimeupdate = () => {
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
        audioRef.current = null;
      };

      audioRef.current = audio;
      setPlayingId(track.id);
      setTrimmingTrack(track);
    }
  };

  // Select Track into Trimmer
  const handleSelectTrack = (track) => {
    setTrimmingTrack(track);
    setStartTime(0);

    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(track.audioUrl);
    audio.play().catch(() => null);

    audio.ontimeupdate = () => {
      if (snippetDuration !== "full" && audio.currentTime >= Number(snippetDuration)) {
        audio.currentTime = 0;
      }
    };

    audio.onloadedmetadata = () => {
      setTotalDuration(audio.duration || 30);
    };

    audio.onended = () => {
      setPlayingId(null);
      audioRef.current = null;
    };

    audioRef.current = audio;
    setPlayingId(track.id);
  };

  // Device Audio Upload Handler
  const handleDeviceAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("audio")) {
      snackbar.error("Please select a valid audio file (MP3, WAV, AAC, M4A).");
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
    snackbar.success(`Loaded "${cleanTitle}" from your device! 📁`);
  };

  // Trimmer Seek
  const handleTrimChange = (e) => {
    const val = parseFloat(e.target.value);
    setStartTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      if (audioRef.current.paused && playingId === trimmingTrack?.id) {
        audioRef.current.play().catch(() => null);
      }
    }
  };

  // Confirm Selection
  const handleConfirmSelection = () => {
    if (!trimmingTrack) return;
    if (audioRef.current) audioRef.current.pause();

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[700] bg-black/85 backdrop-blur-md flex items-center justify-center p-1 sm:p-1.5 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg h-[98.5vh] max-h-[98vh] sm:max-h-[960px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 via-purple-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Music Soundtrack Studio</h2>
              <p className="text-[10px] text-zinc-400">Real songs, live Apple Music engine & device audio</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH & UPLOAD ACTION ROW */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 shrink-0 flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search songs, artists, Punjabi, Arijit, EDM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Upload Device Audio Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 active:scale-95 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0 shadow-lg shadow-purple-500/20 transition cursor-pointer"
            title="Import an MP3/Audio file from your phone or PC"
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Audio</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleDeviceAudioUpload}
            accept="audio/*"
            className="hidden"
          />
        </div>

        {/* CATEGORY TABS (Scrollable) */}
        <div className="px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/20 shrink-0 overflow-x-auto flex gap-1.5 hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id);
                setSearch("");
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === cat.id
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* AI SMART RECOMMENDATION BADGE (If active on For You) */}
        {activeTab === "For You" && aiInfo && (
          <div className="mx-3 mt-2 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
            <p className="text-[11px] text-rose-200 truncate">
              {aiInfo.vibeDescription || "AI matched songs based on your content context & mood"}
            </p>
          </div>
        )}

        {/* TRACK LISTING */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs text-zinc-400 font-semibold">Loading real music stream...</p>
            </div>
          ) : displayedTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-zinc-400 text-center">
              <Music className="w-8 h-8 text-zinc-600" />
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
                    {/* Animated Equalizer 3 Wave Lines on Left of Bookmark when playing */}
                    {isPlaying && (
                      <div className="flex items-end gap-[2px] h-4 px-1 shrink-0">
                        <span className="w-[2px] bg-rose-500 rounded-full block animate-sound-wave-1" />
                        <span className="w-[2px] bg-rose-400 rounded-full block animate-sound-wave-2" />
                        <span className="w-[2px] bg-rose-500 rounded-full block animate-sound-wave-3" />
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

        {/* BOTTOM TRIMMING & WAVEFORM HUD */}
        {trimmingTrack && (
          <div className="p-3.5 sm:p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 space-y-2.5 shadow-2xl">
            {/* Track Info & Duration Pills */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 max-w-[200px]">
                <p className="text-xs font-black text-white truncate">{trimmingTrack.title}</p>
                <p className="text-[10px] text-zinc-400 truncate">{trimmingTrack.artist}</p>
              </div>

              {/* Snippet Duration Pills */}
              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-full border border-zinc-800 text-[10px] font-bold">
                {[15, 30, "full"].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSnippetDuration(dur)}
                    className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
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
              type="button"
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

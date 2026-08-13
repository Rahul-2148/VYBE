import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Music, Play, Pause, Check, Crown, Scissors } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SAMPLE_TRACKS = [
  { id: "1", title: "Golden Hour", artist: "JVKE", category: "Trending", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", premiumOnly: false },
  { id: "2", title: "Midnight City", artist: "M83", category: "Trending", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", premiumOnly: false },
  { id: "3", title: "Electric Feel", artist: "MGMT", category: "Browse", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", premiumOnly: true }, // VIP
  { id: "4", title: "Blinding Lights", artist: "The Weeknd", category: "Trending", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", premiumOnly: false },
  { id: "5", title: "Levitating", artist: "Dua Lipa", category: "Trending", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", premiumOnly: true }, // VIP
  { id: "6", title: "Lofi Rain", artist: "Chillhop", category: "Lofi & Chill", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", premiumOnly: false },
  { id: "7", title: "Sunset Boulevard", artist: "Retro", category: "Browse", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", premiumOnly: false },
  { id: "8", title: "Hyperlight", artist: "Cyberpunk", category: "Browse", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", premiumOnly: true }, // VIP
  { id: "9", title: "Acoustic Breeze", artist: "Folk", category: "Lofi & Chill", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", premiumOnly: false },
  { id: "10", title: "Night Drive", artist: "Synthwave", category: "Lofi & Chill", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", premiumOnly: true }, // VIP
  { id: "11", title: "Summer High", artist: "AP Dhillon", category: "Trending", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", premiumOnly: true }, // VIP
  { id: "12", title: "Starboy", artist: "The Weeknd", category: "Trending", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", premiumOnly: false },
  { id: "13", title: "Chill Vibes", artist: "Lofi Beats", category: "Lofi & Chill", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", premiumOnly: false },
  { id: "14", title: "Tokyo Drift", artist: "Phonk", category: "Browse", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", premiumOnly: true }, // VIP
];

export const StoryMusicPickerModal = ({ open, onClose, onSelectMusic, selectedMusic }) => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const isPremiumUser = Boolean(userData?.user?.isVerified || userData?.isVerified);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("For You");
  const [playingId, setPlayingId] = useState(null);
  const [audioObj, setAudioObj] = useState(null);

  // Trimming State
  const [trimmingTrack, setTrimmingTrack] = useState(null);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    return () => {
      if (audioObj) {
        audioObj.pause();
      }
    };
  }, [audioObj]);

  if (!open) return null;

  const togglePreview = (track, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Check VIP Lock
    if (track.premiumOnly && !isPremiumUser) {
      toast((t) => (
        <div className="flex flex-col gap-2.5 p-1 text-text text-xs">
          <p className="font-bold flex items-center gap-1.5 text-amber-400">
            <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
            VIP Soundtrack Only
          </p>
          <p className="text-[11px] text-text-secondary leading-normal">
            This high-quality track is reserved for VIP Premium members. Upgrade to unlock verified badges and full music library access.
          </p>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                onClose();
                navigate("/monetization");
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-bg text-[10px] font-black rounded-lg cursor-pointer transition transform hover:scale-105 active:scale-95"
            >
              Get Premium ✨
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 bg-surface text-text-secondary text-[10px] font-bold rounded-lg cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      ), { duration: 5500, style: { background: "#18181b", border: "1px solid rgba(251, 191, 36, 0.2)" } });
      return;
    }

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
      
      audio.onended = () => {
        setPlayingId(null);
        setAudioObj(null);
      };

      setAudioObj(audio);
      setPlayingId(track.id);
      setTrimmingTrack(track);
    }
  };

  const handleSelectTrack = (track) => {
    // Check VIP Lock
    if (track.premiumOnly && !isPremiumUser) {
      togglePreview(track, null);
      return;
    }

    setTrimmingTrack(track);
    setStartTime(0);

    // Auto-play the track when selected
    if (audioObj) audioObj.pause();
    const audio = new Audio(track.audioUrl);
    audio.play().catch(() => null);
    audio.onended = () => {
      setPlayingId(null);
      setAudioObj(null);
    };
    setAudioObj(audio);
    setPlayingId(track.id);
  };

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

  const handleConfirmSelection = () => {
    if (!trimmingTrack) return;
    if (audioObj) audioObj.pause();

    // Pass the track data with chosen start time back
    onSelectMusic({
      ...trimmingTrack,
      startTime: startTime,
    });
    onClose();
  };

  // Filter logic based on tab and search query
  const filtered = SAMPLE_TRACKS.filter((track) => {
    const matchesSearch = 
      track.title.toLowerCase().includes(search.toLowerCase()) ||
      track.artist.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === "For You") return matchesSearch;
    return track.category === activeTab && matchesSearch;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] bg-bg/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* CSS for Equalizer bars */}
        <style>{`
          @keyframes eq-bar {
            0%, 100% { height: 4px; }
            50% { height: 16px; }
          }
          .eq-container {
            display: flex;
            align-items: flex-end;
            gap: 2px;
            height: 16px;
          }
          .eq-bar {
            width: 2.5px;
            background-color: #f43f5e;
            border-radius: 99px;
          }
          .eq-bar-1 { animation: eq-bar 0.7s ease-in-out infinite; }
          .eq-bar-2 { animation: eq-bar 0.5s ease-in-out infinite 0.15s; }
          .eq-bar-3 { animation: eq-bar 0.8s ease-in-out infinite 0.3s; }
        `}</style>

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="w-full max-w-md bg-surface-inset border border-border/80 rounded-t-3xl sm:rounded-3xl p-5 text-text shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-rose-500 animate-pulse" />
              <h3 className="text-base font-bold tracking-tight">Add Music</h3>
            </div>
            <button 
              onClick={() => {
                if (audioObj) audioObj.pause();
                onClose();
              }} 
              className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface cursor-pointer transition hover:scale-105"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search music library..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border-strong pl-10 pr-4 py-2.5 rounded-2xl text-xs text-text outline-none focus:border-rose-500/80"
            />
          </div>

          {/* Tabs switcher */}
          <div className="flex gap-2 border-b border-border pb-1.5 overflow-x-auto select-none hide-scrollbar">
            {["For You", "Trending", "Lofi & Chill", "Browse"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition shrink-0 ${
                  activeTab === tab 
                    ? "bg-rose-600/10 text-rose-500 border border-rose-500/20" 
                    : "text-text-secondary hover:text-text"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Songs list */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
            {filtered.length === 0 ? (
              <div className="text-center text-text-muted text-xs py-8">No tracks found.</div>
            ) : (
              filtered.map((track) => {
                const isSelected = selectedMusic?.id === track.id || trimmingTrack?.id === track.id;
                const isPlaying = playingId === track.id;
                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                      isSelected 
                        ? "bg-rose-500/10 border-rose-500/40" 
                        : "bg-surface/40 border-border hover:bg-surface hover:border-border-strong"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 overflow-hidden" onClick={() => handleSelectTrack(track)}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-rose-500 to-amber-500 flex items-center justify-center text-text font-bold shadow shrink-0 relative">
                        <Music className="w-5 h-5 text-text" />
                        {track.premiumOnly && (
                          <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-bg p-0.5 rounded-full shadow border border-bg">
                            <Crown className="w-2.5 h-2.5 fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-text truncate">{track.title}</p>
                          {track.premiumOnly && (
                            <span className="text-[7px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-500 text-bg px-1 rounded-sm tracking-wider shrink-0 flex items-center gap-0.5">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isPlaying && (
                        <div className="eq-container">
                          <div className="eq-bar eq-bar-1" />
                          <div className="eq-bar eq-bar-2" />
                          <div className="eq-bar eq-bar-3" />
                        </div>
                      )}
                      
                      <button
                        onClick={(e) => togglePreview(track, e)}
                        className={`p-2 rounded-full transition hover:scale-105 active:scale-95 ${
                          isPlaying ? "bg-rose-600 text-text" : "bg-surface-hover hover:bg-surface-active text-text"
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ACTIVE SONG TRIMMER SECTION */}
          {trimmingTrack && (
            <div className="pt-3 border-t border-border space-y-3.5 text-left bg-surface/30 p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-purple-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-300">
                    Trim Soundtrack Preview
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                  Starts at {Math.floor(startTime)}s
                </span>
              </div>

              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={startTime}
                  onChange={handleTrimChange}
                  className="w-full h-1 bg-surface-hover hover:bg-surface-active rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[9px] text-text-secondary font-mono">
                  <span>0:00</span>
                  <span>0:30</span>
                  <span>1:00</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="truncate flex-1">
                  <p className="text-[11px] font-bold text-text truncate">Trim: {trimmingTrack.title}</p>
                  <p className="text-[9px] text-text-secondary truncate">{trimmingTrack.artist}</p>
                </div>

                <button
                  onClick={handleConfirmSelection}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-purple-600 hover:opacity-95 text-text font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95"
                >
                  Apply Sound
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StoryMusicPickerModal;

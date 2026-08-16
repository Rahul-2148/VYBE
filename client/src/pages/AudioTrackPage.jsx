import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  Play,
  Pause,
  ArrowLeft,
  Disc,
  Video,
  Bookmark,
  Share2,
  Image as ImageIcon,
  Heart,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import ShareSheet from "../components/ShareSheet";

export const AudioTrackPage = () => {
  const { audioId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Audio metadata (from router state or fetched from music catalog)
  const initialMusic = location.state?.music || null;
  const [audioTrack, setAudioTrack] = useState(initialMusic);
  const [audioName, setAudioName] = useState(initialMusic?.title || decodeURIComponent(audioId || "Original Audio"));
  const [artistName, setArtistName] = useState(initialMusic?.artist || "Official Soundtrack");
  const [coverUrl, setCoverUrl] = useState(initialMusic?.coverUrl || "");
  const [audioUrl, setAudioUrl] = useState(initialMusic?.audioUrl || "");

  // Content Tabs (Reels vs Posts)
  const [activeTab, setActiveTab] = useState("reels");
  const [reels, setReels] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const audioRef = useRef(null);

  // Bookmarking
  const [isSaved, setIsSaved] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vybe_saved_real_music") || "[]");
      return saved.some((t) => t.id === audioId || t.title === audioName);
    } catch {
      return false;
    }
  });

  const [showShare, setShowShare] = useState(false);

  // 1. Fetch Real Music Info if missing cover/audioUrl
  useEffect(() => {
    const fetchMusicDetails = async () => {
      if (audioUrl && coverUrl) return;

      try {
        const decoded = decodeURIComponent(audioId || "");
        const res = await api.get(`/music/search?q=${encodeURIComponent(decoded)}&limit=1`);
        if (res.data?.success && res.data.tracks?.[0]) {
          const track = res.data.tracks[0];
          setAudioTrack(track);
          setAudioName(track.title);
          setArtistName(track.artist);
          setCoverUrl(track.coverUrl);
          setAudioUrl(track.audioUrl);
        }
      } catch (e) {
        console.warn("Could not fetch song metadata:", e);
      }
    };

    fetchMusicDetails();
  }, [audioId, audioUrl, coverUrl]);

  // 2. Fetch Reels & Posts using this Audio
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const decoded = decodeURIComponent(audioId || "");

        // Fetch Reels
        try {
          const res = await api.get(`/reel/audio/${encodeURIComponent(decoded)}`);
          const reels = res.data?.reels;
          if (res.data?.success && Array.isArray(reels)) {
            setReels(reels);
            if (res.data.audioTrackName) setAudioName(res.data.audioTrackName);
          }
        } catch {}

        // Fetch Feed Posts
        try {
          const res = await api.get(`/post/audio/${encodeURIComponent(decoded)}`);
          if (res.data?.success && Array.isArray(res.data.posts)) {
            setPosts(res.data.posts);
          }
        } catch {}
      } catch (err) {
        console.warn("Failed to load audio track details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [audioId]);

  // Handle Play/Pause Audio Preview
  const togglePlayAudio = () => {
    if (!audioUrl) {
      snackbar.error("Audio stream preview not available for this track.");
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setDuration(audio.duration || 30);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => null);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Toggle Save Track
  const handleToggleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      const savedList = JSON.parse(localStorage.getItem("vybe_saved_real_music") || "[]");
      let updated;
      if (nextSaved) {
        updated = [
          {
            id: audioId,
            title: audioName,
            artist: artistName,
            coverUrl,
            audioUrl,
          },
          ...savedList.filter((t) => t.id !== audioId),
        ];
        snackbar.success("Saved to your Audio Collection! 🔖");
      } else {
        updated = savedList.filter((t) => t.id !== audioId && t.title !== audioName);
        snackbar("Removed from saved audio");
      }
      localStorage.setItem("vybe_saved_real_music", JSON.stringify(updated));
    } catch {}
  };

  // Use Audio in Creator
  const handleUseAudio = () => {
    const trackPayload = {
      id: audioId,
      title: audioName,
      artist: artistName,
      audioUrl,
      coverUrl,
      duration: 30,
      startTime: 0,
    };

    navigate("/upload", {
      state: {
        preselectedMusic: trackPayload,
      },
    });
  };

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-6 select-none font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black tracking-tight">Audio</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShare(true)}
            className="p-2.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition cursor-pointer"
            title="Share Audio"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleToggleSave}
            className={`p-2.5 rounded-full transition cursor-pointer ${
              isSaved ? "text-amber-400 bg-amber-500/10" : "text-text-secondary hover:text-text hover:bg-surface-hover"
            }`}
            title={isSaved ? "Saved" : "Save Audio"}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? "fill-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* HERO BANNER */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-2xl flex flex-col sm:flex-row items-center gap-6">
        {/* Album Artwork with Vinyl Spinner */}
        <div className="relative group shrink-0">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 relative">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 flex items-center justify-center">
                <Music className="w-12 h-12 text-white" />
              </div>
            )}

            {/* Play / Pause Floating Overlay */}
            {audioUrl && (
              <button
                onClick={togglePlayAudio}
                className="absolute inset-0 bg-black/40 hover:bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition cursor-pointer"
              >
                {isPlaying ? (
                  <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-xl animate-scale-pulse">
                    <Pause className="w-6 h-6 fill-white" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-black shadow-xl">
                    <Play className="w-6 h-6 fill-black ml-0.5" />
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Equalizer Wave Badge when playing */}
          {isPlaying && (
            <div className="absolute -bottom-2 -right-2 px-2 py-1 rounded-full bg-rose-600 text-white flex items-center gap-0.5 shadow-lg border border-white/20">
              <span className="w-1 bg-white h-3 animate-pulse" />
              <span className="w-1 bg-white h-2 animate-bounce" />
              <span className="w-1 bg-white h-3.5 animate-pulse" />
            </div>
          )}
        </div>

        {/* Audio Meta & Primary CTA */}
        <div className="text-center sm:text-left space-y-3 flex-1 min-w-0">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-text tracking-tight truncate">{audioName}</h2>
            </div>
            <p className="text-sm font-semibold text-rose-400 mt-0.5 truncate">{artistName}</p>
          </div>

          <p className="text-xs text-text-secondary">
            {reels.length + posts.length} {reels.length + posts.length === 1 ? "creation" : "creations"} with this soundtrack.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            <button
              onClick={handleUseAudio}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-black rounded-full text-xs shadow-lg shadow-rose-500/20 transition flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Video className="w-4 h-4" />
              <span>Use Audio</span>
            </button>

            <button
              onClick={handleToggleSave}
              className={`px-4 py-2.5 rounded-full border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isSaved
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-surface border-border hover:bg-surface-hover text-text"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-400" : ""}`} />
              <span>{isSaved ? "Saved" : "Save Audio"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT TABS: REELS VS POSTS */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("reels")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition cursor-pointer ${
            activeTab === "reels"
              ? "bg-text text-bg shadow"
              : "text-text-secondary hover:text-text hover:bg-surface"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Reels ({reels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition cursor-pointer ${
            activeTab === "posts"
              ? "bg-text text-bg shadow"
              : "text-text-secondary hover:text-text hover:bg-surface"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Posts ({posts.length})</span>
        </button>
      </div>

      {/* CONTENT GRID */}
      <div>
        {loading ? (
          <div className="text-center py-20 text-text-muted">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold">Loading creations...</p>
          </div>
        ) : activeTab === "reels" ? (
          reels.length === 0 ? (
            <div className="text-center py-16 text-text-muted space-y-2">
              <Video className="w-8 h-8 mx-auto text-text-muted" />
              <p className="text-sm font-bold">No reels with this audio yet</p>
              <p className="text-xs text-text-secondary">Be the first creator to make a reel with {audioName}!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {reels.map((reel) => (
                <div
                  key={reel._id}
                  onClick={() => navigate("/reels", { state: { initialReelId: reel._id } })}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group shadow-lg"
                >
                  <video src={reel.media?.url} className="w-full h-full object-cover" />

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play className="w-10 h-10 text-white fill-white shadow-xl" />
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white font-bold flex items-center justify-between">
                    <span className="truncate">@{reel.author?.userName}</span>
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-3 h-3" /> {reel.views || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-text-muted space-y-2">
            <ImageIcon className="w-8 h-8 mx-auto text-text-muted" />
            <p className="text-sm font-bold">No posts with this audio yet</p>
            <p className="text-xs text-text-secondary">Upload a photo post with {audioName}!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {posts.map((post) => (
              <div
                key={post._id}
                onClick={() => navigate(`/profile/${post.author?.userName}`)}
                className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group shadow-lg"
              >
                <img
                  src={post.media?.[0]?.url || post.media?.url || post.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 text-white font-bold text-xs">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4 fill-white" /> {post.likes?.length || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Sheet */}
      {showShare && (
        <ShareSheet
          open={showShare}
          onClose={() => setShowShare(false)}
          shareData={{
            title: audioName,
            url: window.location.href,
            text: `Listen to ${audioName} on VYBE!`,
          }}
        />
      )}
    </div>
  );
};

export default AudioTrackPage;

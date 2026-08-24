import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowLeft,
  BarChart2,
  AtSign,
  Hash,
  HelpCircle,
  Flame,
  Clock,
  Calendar,
  Smile,
  Sparkles,
  MapPin,
  Link2,
  Music,
  Image as ImageIcon,
  Layers,
  Search,
  ChevronRight,
  PlusCircle,
  Check,
  Globe,
  Navigation,
  Loader2,
  Play,
  Pause,
  Thermometer,
  Shuffle,
  Sun,
  Radio,
  Sliders,
  Disc3,
  Heart,
  Volume2
} from "lucide-react";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import { searchPlaces, reverseGeocode, getCurrentGPSLocation } from "../lib/locationService";
import api from "../lib/axios";
import dp from "../assets/dp3.png";

// ─── Popular Curated Hashtags ──────────────────────
const POPULAR_HASHTAGS = [
  { tag: "vybe", count: "1.2M" },
  { tag: "aesthetic", count: "890K" },
  { tag: "reels", count: "4.5M" },
  { tag: "photography", count: "2.1M" },
  { tag: "ootd", count: "980K" },
  { tag: "travel", count: "3.4M" },
  { tag: "love", count: "5.8M" },
  { tag: "sunset", count: "740K" },
  { tag: "fitness", count: "1.1M" },
  { tag: "lifestyle", count: "1.6M" },
];

// ─── Popular Curated Music Hits by Genres ──────────
const MUSIC_GENRES = ["🔥 Trending", "✨ For You", "⚡ Pop & Beats", "💖 Chill & Love", "🎧 Lo-Fi"];

const POPULAR_MUSIC_DATA = {
  "🔥 Trending": [
    {
      title: "Golden Hour",
      artist: "JVKE",
      genre: "Pop",
      artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=golden-hour-ambient-112199.mp3",
    },
    {
      title: "Blinding Lights",
      artist: "The Weeknd",
      genre: "Synthwave",
      artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-future-beats-117997.mp3",
    },
    {
      title: "Starboy",
      artist: "The Weeknd ft. Daft Punk",
      genre: "Pop",
      artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=powerful-beat-121791.mp3",
    },
    {
      title: "Calm Down",
      artist: "Rema & Selena Gomez",
      genre: "Afrobeats",
      artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=tropical-summer-vibes-124014.mp3",
    },
  ],
  "✨ For You": [
    {
      title: "As It Was",
      artist: "Harry Styles",
      genre: "Indie Pop",
      artwork: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/26/audio_d0c6ff1e01.mp3?filename=summer-uplifting-pop-119106.mp3",
    },
    {
      title: "Levitating",
      artist: "Dua Lipa",
      genre: "Disco Pop",
      artwork: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c3523a4216.mp3?filename=action-rock-121589.mp3",
    },
  ],
  "⚡ Pop & Beats": [
    {
      title: "Shape of You",
      artist: "Ed Sheeran",
      genre: "Pop",
      artwork: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=golden-hour-ambient-112199.mp3",
    },
    {
      title: "Bad Guy",
      artist: "Billie Eilish",
      genre: "Electropop",
      artwork: "https://images.unsplash.com/photo-1445985543470-41fba5c3144a?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-future-beats-117997.mp3",
    },
  ],
  "💖 Chill & Love": [
    {
      title: "Stay With Me",
      artist: "Sam Smith",
      genre: "Soul",
      artwork: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=tropical-summer-vibes-124014.mp3",
    },
    {
      title: "Until I Found You",
      artist: "Stephen Sanchez",
      genre: "Retro Love",
      artwork: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/26/audio_d0c6ff1e01.mp3?filename=summer-uplifting-pop-119106.mp3",
    },
  ],
  "🎧 Lo-Fi": [
    {
      title: "Midnight City Lights",
      artist: "ChillHop Beats",
      genre: "Lo-Fi Study",
      artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=golden-hour-ambient-112199.mp3",
    },
  ],
};

// ─── Extensive Animated GIF Stickers with Categories ─
const GIF_CATEGORIES = ["Trending", "Hearts ❤️", "Vibes ✨", "Reactions 😂", "Party 🎉", "Cute 🐱"];

const GIF_STICKERS_DATA = {
  "Trending": [
    { url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", alt: "Party" },
    { url: "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif", alt: "Hearts" },
    { url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", alt: "Stars" },
    { url: "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif", alt: "Sparkles" },
    { url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif", alt: "Fire" },
    { url: "https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif", alt: "Cool" },
    { url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", alt: "Wow" },
    { url: "https://media.giphy.com/media/3oz8xIsloV320wXWWA/giphy.gif", alt: "Yay" },
  ],
  "Hearts ❤️": [
    { url: "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif", alt: "Heart Beat" },
    { url: "https://media.giphy.com/media/26FLdm964upIslUZ2/giphy.gif", alt: "Love Sparkle" },
    { url: "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif", alt: "Floating Hearts" },
    { url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif", alt: "Kiss" },
  ],
  "Vibes ✨": [
    { url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", alt: "Stars Glow" },
    { url: "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif", alt: "Gleam" },
    { url: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif", alt: "Disco Vibes" },
    { url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif", alt: "Fire Flame" },
  ],
  "Reactions 😂": [
    { url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", alt: "OMG" },
    { url: "https://media.giphy.com/media/3oz8xIsloV320wXWWA/giphy.gif", alt: "Cheering" },
    { url: "https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif", alt: "Awesome" },
    { url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", alt: "Dance Move" },
  ],
  "Party 🎉": [
    { url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", alt: "Confetti" },
    { url: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif", alt: "Celebration" },
    { url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif", alt: "Lit Party" },
    { url: "https://media.giphy.com/media/3oz8xIsloV320wXWWA/giphy.gif", alt: "Cheers" },
  ],
  "Cute 🐱": [
    { url: "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif", alt: "Cute Animal" },
    { url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif", alt: "Teddy Hug" },
    { url: "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif", alt: "Sweet Vibes" },
  ],
};

// ─── Emoji Grid (extended) ────────────────────────
const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😂", "🤣", "😊", "😇", "🥰", "😍", "🤩", "😘", "😋", "😜", "🤪", "🤗", "🫡", "🤭", "🫢", "😏", "🥲", "😢", "😭", "😤", "🤯", "🥶", "🥵"],
  "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💞", "💓", "💗", "💖", "💝", "❣️", "💔", "🫶", "💘"],
  "Hands": ["👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "🫰", "👌", "🤌", "👋", "💪", "🫵", "☝️", "👆"],
  "Animals": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐝", "🦋", "🐙"],
  "Food": ["🍕", "🍔", "🌮", "🍟", "🍩", "🧁", "🎂", "🍰", "🍪", "🍫", "🍿", "☕", "🍺", "🧃", "🍷", "🥤", "🍭", "🍉"],
  "Travel": ["✈️", "🚗", "🏖️", "🏔️", "🌍", "🗺️", "🧳", "⛺", "🏕️", "🌅", "🌄", "🎢", "🏟️", "🚀", "🛸", "🚁", "⛵", "🚂"],
  "Objects": ["💯", "✨", "🔥", "⭐", "🎯", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🎵", "🎶", "📸", "💡", "💎", "⚡", "🌟"],
};

// ─── Overlay Badges ──────────────────────────────
const OVERLAYS = [
  { text: "VYBE ONLY", icon: "👑", gradient: "from-amber-400 via-yellow-500 to-orange-500" },
  { text: "GOOD VIBES", icon: "☀️", gradient: "from-emerald-400 via-teal-500 to-cyan-500" },
  { text: "QUEEN", icon: "💅", gradient: "from-pink-400 via-rose-500 to-red-500" },
  { text: "KING", icon: "🎩", gradient: "from-indigo-400 via-purple-500 to-violet-500" },
  { text: "WEEKEND", icon: "🍹", gradient: "from-cyan-400 via-sky-500 to-blue-500" },
  { text: "LIT", icon: "🔥", gradient: "from-orange-400 via-red-500 to-rose-600" },
  { text: "SELFIE", icon: "🤳", gradient: "from-fuchsia-400 via-pink-500 to-rose-500" },
  { text: "MOOD", icon: "🌙", gradient: "from-violet-400 via-purple-500 to-indigo-600" },
  { text: "BFF", icon: "👯", gradient: "from-yellow-400 via-amber-500 to-orange-500" },
  { text: "BLESSED", icon: "🙏", gradient: "from-sky-400 via-blue-500 to-indigo-500" },
  { text: "SUNDAY FUNDAY", icon: "🎈", gradient: "from-rose-400 via-pink-500 to-fuchsia-500" },
  { text: "LOVE", icon: "💕", gradient: "from-red-400 via-rose-500 to-pink-500" },
];

// ─── Add Yours Prompts ───────────────────────────
const ADD_YOURS_PROMPTS = [
  "Show your outfit today 👗",
  "Your morning coffee ☕",
  "What's on your desk? 🖥️",
  "Sunset vibes 🌅",
  "Your pet 🐾",
  "What are you listening to? 🎧",
  "Current mood right now ✨",
  "Show your workspace 💻",
  "Favorite place in town 📍",
  "Weekend dump 📸",
];

// ─── 4-COLUMN REFINED STICKER CATEGORIES ─────────
const STICKER_CATEGORIES = [
  { id: "location", icon: MapPin, label: "LOCATION", color: "text-red-400", hoverBorder: "hover:border-red-500/50" },
  { id: "mention", icon: AtSign, label: "MENTION", color: "text-emerald-400", hoverBorder: "hover:border-emerald-500/50" },
  { id: "hashtag", icon: Hash, label: "HASHTAG", color: "text-amber-400", hoverBorder: "hover:border-amber-500/50" },
  { id: "poll", icon: BarChart2, label: "POLL", color: "text-rose-400", hoverBorder: "hover:border-rose-500/50" },
  { id: "question", icon: HelpCircle, label: "QUESTIONS", color: "text-purple-400", hoverBorder: "hover:border-purple-500/50" },
  { id: "slider", icon: Flame, label: "SLIDER", color: "text-orange-400", hoverBorder: "hover:border-orange-500/50" },
  { id: "countdown", icon: Clock, label: "COUNTDOWN", color: "text-cyan-400", hoverBorder: "hover:border-cyan-500/50" },
  { id: "temperature", icon: Thermometer, label: "WEATHER", color: "text-yellow-400", hoverBorder: "hover:border-yellow-500/50" },
  { id: "link", icon: Link2, label: "LINK", color: "text-blue-400", hoverBorder: "hover:border-blue-500/50" },
  { id: "music_sticker", icon: Music, label: "MUSIC", color: "text-pink-400", hoverBorder: "hover:border-pink-500/50" },
  { id: "gif", icon: ImageIcon, label: "GIFS", color: "text-teal-400", hoverBorder: "hover:border-teal-500/50" },
  { id: "addYours", icon: PlusCircle, label: "ADD YOURS", color: "text-violet-400", hoverBorder: "hover:border-violet-500/50" },
  { id: "time", icon: Clock, label: "TIME", color: "text-blue-400", hoverBorder: "hover:border-blue-500/50" },
  { id: "day", icon: Calendar, label: "DAY", color: "text-indigo-400", hoverBorder: "hover:border-indigo-500/50" },
  { id: "emoji", icon: Smile, label: "EMOJI", color: "text-pink-400", hoverBorder: "hover:border-pink-500/50" },
  { id: "overlay", icon: Sparkles, label: "BADGES", color: "text-yellow-400", hoverBorder: "hover:border-yellow-500/50" },
];

export const StoryStickersDrawer = ({ open, onClose, onAddSticker }) => {
  const [activeView, setActiveView] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  // Form & Live API states
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locLoading, setLocLoading] = useState(false);

  const [mentionQuery, setMentionQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  // Music state
  const [selectedMusicGenre, setSelectedMusicGenre] = useState("🔥 Trending");
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState(POPULAR_MUSIC_DATA["🔥 Trending"]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState(null);
  const previewAudioRef = useRef(null);

  // GIF category & search
  const [selectedGifCategory, setSelectedGifCategory] = useState("Trending");
  const [gifSearchQuery, setGifSearchQuery] = useState("");

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["Yes", "No"]);

  const [questionPrompt, setQuestionPrompt] = useState("Ask me a question");
  const [sliderQuestion, setSliderQuestion] = useState("Rate this!");
  const [sliderEmoji, setSliderEmoji] = useState("🔥");

  const [countdownTitle, setCountdownTitle] = useState("My Special Day");
  const [countdownDate, setCountdownDate] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });

  const [temperatureVal, setTemperatureVal] = useState("28°C");
  const [weatherCondition, setWeatherCondition] = useState("Sunny ☀️");
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

  const [addYoursPrompt, setAddYoursPrompt] = useState("");
  const [emojiCategory, setEmojiCategory] = useState("Smileys");

  // Cleanup audio preview on close or change
  useEffect(() => {
    if (!open && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingPreviewUrl(null);
    }
  }, [open]);

  // Geolocation Real Search with high-accuracy searchPlaces
  const [locationCategory, setLocationCategory] = useState("all");

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLocLoading(true);
      try {
        const results = await searchPlaces(locationQuery, {
          category: locationCategory !== "all" ? locationCategory : undefined,
          limit: 10,
        });
        setLocationResults(
          results.map((item) => ({
            name: item.title ? `${item.title}${item.subtitle ? ", " + item.subtitle : ""}` : item.name,
            title: item.title || item.name,
            desc: item.subtitle || item.category || "",
            category: item.category || "Place",
            lat: item.latitude,
            lon: item.longitude,
          }))
        );
      } catch {
        setLocationResults([{ name: locationQuery || "Custom Location", title: locationQuery || "Custom Location", desc: "Custom Location" }]);
      } finally {
        setLocLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [locationQuery, locationCategory]);

  // Real User Mention Search
  useEffect(() => {
    if (activeView !== "mention") return;
    const timer = setTimeout(async () => {
      setUserLoading(true);
      try {
        const res = await api.get(`/user/search?query=${encodeURIComponent(mentionQuery)}`);
        if (res.data?.success && res.data.users) {
          setUserResults(res.data.users);
        } else {
          setUserResults([]);
        }
      } catch {
        setUserResults([]);
      } finally {
        setUserLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [mentionQuery, activeView]);

  // Real iTunes Music Search & Genre Switch
  useEffect(() => {
    if (activeView !== "music_sticker") return;
    if (!musicQuery.trim()) {
      const timer = setTimeout(() => {
        setMusicResults(POPULAR_MUSIC_DATA[selectedMusicGenre] || POPULAR_MUSIC_DATA["🔥 Trending"]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setMusicLoading(true);
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(musicQuery)}&media=music&entity=song&limit=15`
        );
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setMusicResults(
            data.results.map((r) => ({
              title: r.trackName,
              artist: r.artistName,
              artwork: r.artworkUrl100?.replace("100x100bb", "300x300bb") || r.artworkUrl60,
              audioUrl: r.previewUrl,
            }))
          );
        } else {
          setMusicResults(POPULAR_MUSIC_DATA["🔥 Trending"]);
        }
      } catch {
        setMusicResults(POPULAR_MUSIC_DATA["🔥 Trending"]);
      } finally {
        setMusicLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [musicQuery, activeView, selectedMusicGenre]);

  // Real Weather / Geolocation detector
  const handleDetectWeatherAndLocation = () => {
    if (!navigator.geolocation) {
      setTemperatureVal("28°C");
      setWeatherCondition("Sunny ☀️");
      return;
    }
    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
          );
          const data = await res.json();
          if (data.current) {
            const temp = Math.round(data.current.temperature_2m);
            setTemperatureVal(`${temp}°C`);
            const code = data.current.weather_code;
            if (code <= 1) setWeatherCondition("Sunny ☀️");
            else if (code <= 3) setWeatherCondition("Partly Cloudy ⛅");
            else if (code <= 67) setWeatherCondition("Rainy 🌧️");
            else setWeatherCondition("Clear ✨");
          }
        } catch {
          setTemperatureVal("27°C");
          setWeatherCondition("Warm & Sunny ☀️");
        } finally {
          setWeatherLoading(false);
        }
      },
      () => {
        setWeatherLoading(false);
        setTemperatureVal("28°C");
        setWeatherCondition("Sunny ☀️");
      }
    );
  };

  const handleGetCurrentLocation = async () => {
    setLocLoading(true);
    triggerHaptic("selection");
    try {
      const coords = await getCurrentGPSLocation();
      const rev = await reverseGeocode(coords.latitude, coords.longitude);
      if (rev) {
        addAndClose({
          type: "location",
          location: {
            name: rev.name || rev.title,
            title: rev.title,
            lat: coords.latitude,
            lng: coords.longitude,
          },
          position: { x: 50, y: 30 },
        });
      }
    } catch {
      addAndClose({
        type: "location",
        location: { name: "Current Location" },
        position: { x: 50, y: 30 },
      });
    } finally {
      setLocLoading(false);
    }
  };

  const togglePlayPreview = (audioUrl) => {
    if (playingPreviewUrl === audioUrl) {
      previewAudioRef.current?.pause();
      setPlayingPreviewUrl(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
      setPlayingPreviewUrl(audioUrl);
      audio.onended = () => setPlayingPreviewUrl(null);
    }
  };

  if (!open) return null;

  const goBack = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingPreviewUrl(null);
    }
    setActiveView(null);
    setSearchQuery("");
  };

  const addAndClose = (stickerData) => {
    triggerHaptic("medium");
    microAudio.playPop();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingPreviewUrl(null);
    }
    onAddSticker({
      ...stickerData,
      scale: 1,
      rotation: 0,
      styleIndex: 0,
      position: stickerData.position || { x: 50, y: 50 },
    });
    setActiveView(null);
    onClose();
  };

  // Filtered categories for search
  const filteredCategories = searchQuery.trim()
    ? STICKER_CATEGORIES.filter((c) => c.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : STICKER_CATEGORIES;

  // ─── 1. MAIN GRID (4 COLUMNS) ───────────────────
  const renderMainGrid = () => (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search stickers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/10 pl-10 pr-4 py-2 rounded-2xl text-xs text-white outline-none focus:border-rose-500 transition placeholder:text-zinc-500 shadow-inner"
        />
      </div>

      {/* 4-Columns Grid */}
      <div className="grid grid-cols-4 gap-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-3">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => {
                triggerHaptic("light");
                setActiveView(cat.id);
                if (cat.id === "temperature") handleDetectWeatherAndLocation();
              }}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 bg-zinc-900/80 border border-white/10 ${cat.hoverBorder} rounded-2xl transition-all duration-200 cursor-pointer hover:bg-zinc-800/90 active:scale-95 shadow-md`}
            >
              <div className="p-2 rounded-xl bg-white/5 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${cat.color}`} />
              </div>
              <span className="text-[9px] font-black tracking-tight text-zinc-300 uppercase truncate max-w-full">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ─── 2. LOCATION VIEW ───────────────────────────
  const renderLocation = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search places, cities, cafes, landmarks..."
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-red-500 transition"
          autoFocus
        />
      </div>

      {/* Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
        {[
          { id: "all", label: "🔥 All" },
          { id: "city", label: "🏙️ Cities" },
          { id: "cafe", label: "☕ Cafes" },
          { id: "landmark", label: "🏛️ Landmarks" },
          { id: "beach", label: "🏖️ Beaches" },
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setLocationCategory(c.id);
            }}
            className={`px-3 py-1 rounded-full text-[10px] font-bold border transition shrink-0 ${
              locationCategory === c.id
                ? "bg-red-600 text-white border-red-500 shadow-md"
                : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Real Current GPS Location Trigger */}
      <button
        onClick={handleGetCurrentLocation}
        disabled={locLoading}
        className="w-full flex items-center justify-center gap-2 p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/25 transition active:scale-[0.98] cursor-pointer"
      >
        {locLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        <span>Use Current GPS Location</span>
      </button>

      {/* Results List */}
      <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {locationResults.map((loc, idx) => (
          <button
            key={idx}
            onClick={() =>
              addAndClose({
                type: "location",
                location: {
                  name: loc.title || loc.name,
                  fullAddress: loc.name,
                  lat: loc.lat,
                  lng: loc.lon,
                },
              })
            }
            className="w-full flex items-center justify-between p-3 bg-zinc-900/60 border border-white/5 rounded-xl text-xs text-white hover:bg-zinc-800/80 transition cursor-pointer active:scale-[0.98] text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 rounded-full bg-red-500/20 text-red-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold truncate text-white">{loc.title || loc.name}</p>
                {loc.desc && <p className="text-[10px] text-zinc-400 truncate">{loc.desc}</p>}
              </div>
            </div>
            {loc.category && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10 shrink-0 ml-2">
                {loc.category}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── 3. MENTION VIEW ────────────────────────────
  const renderMention = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col">
      <div className="relative">
        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search people to mention..."
          value={mentionQuery}
          onChange={(e) => setMentionQuery(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition"
          autoFocus
        />
      </div>

      {mentionQuery.trim() && (
        <button
          onClick={() => addAndClose({ type: "mention", mention: { username: mentionQuery.trim().replace("@", "") } })}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98]"
        >
          Add @{mentionQuery.trim().replace("@", "")}
        </button>
      )}

      {/* Real User Results */}
      <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {userLoading && (
          <div className="flex items-center justify-center p-6 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          </div>
        )}
        {!userLoading && userResults.length === 0 && mentionQuery.trim() && (
          <p className="text-center text-xs text-zinc-500 py-4">No users found. Tap button above to mention directly.</p>
        )}
        {userResults.map((u) => (
          <button
            key={u._id}
            onClick={() => addAndClose({ type: "mention", mention: { username: u.userName, avatar: u.profileImage?.url } })}
            className="w-full flex items-center gap-3 p-2.5 bg-zinc-900/60 border border-white/5 rounded-xl text-xs text-white hover:bg-zinc-800/80 transition cursor-pointer active:scale-[0.98] text-left"
          >
            <img src={u.profileImage?.url || dp} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white truncate">@{u.userName}</p>
              <p className="text-[10px] text-zinc-400 truncate">{u.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ─── 4. HASHTAG VIEW ────────────────────────────
  const renderHashtag = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col">
      <div className="relative">
        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Type a hashtag (e.g. vybe)..."
          value={mentionQuery}
          onChange={(e) => setMentionQuery(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition"
          autoFocus
        />
      </div>

      {mentionQuery.trim() && (
        <button
          onClick={() => addAndClose({ type: "hashtag", hashtag: { tag: mentionQuery.trim().replace("#", "") } })}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98]"
        >
          Add #{mentionQuery.trim().replace("#", "")}
        </button>
      )}

      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1 pt-1">Trending Hashtags</p>
      <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {POPULAR_HASHTAGS.map((item) => (
          <button
            key={item.tag}
            onClick={() => addAndClose({ type: "hashtag", hashtag: { tag: item.tag } })}
            className="w-full flex items-center justify-between p-3 bg-zinc-900/60 border border-white/5 rounded-xl text-xs text-white hover:bg-zinc-800/80 transition cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                #
              </div>
              <span className="font-extrabold text-white">#{item.tag}</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">{item.count} posts</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ─── 5. ADVANCED MUSIC STUDIO ───────────────────
  const renderMusicSticker = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search songs, artists, soundtracks..."
          value={musicQuery}
          onChange={(e) => setMusicQuery(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-pink-500 transition"
          autoFocus
        />
      </div>

      {/* Genre Filter Tabs */}
      {!musicQuery.trim() && (
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {MUSIC_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedMusicGenre(genre)}
              className={`px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap transition ${
                selectedMusicGenre === genre
                  ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                  : "bg-zinc-900 text-zinc-400 border border-white/10 hover:bg-zinc-800"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Music Tracks List */}
      <div className="space-y-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {musicLoading && (
          <div className="flex items-center justify-center p-6 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
          </div>
        )}
        {musicResults.map((track, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2.5 bg-zinc-900/70 border border-white/5 rounded-2xl hover:bg-zinc-800/80 transition"
          >
            <div
              onClick={() =>
                addAndClose({
                  type: "music_sticker",
                  music_sticker: {
                    title: track.title,
                    artist: track.artist,
                    artwork: track.artwork,
                    audioUrl: track.audioUrl,
                  },
                })
              }
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            >
              <div className="relative w-11 h-11 shrink-0">
                <img src={track.artwork} alt="" className="w-11 h-11 rounded-xl object-cover shadow-md" />
                <div className="absolute inset-0 rounded-xl bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                  <PlusCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-xs text-white truncate">{track.title}</p>
                <p className="text-[10px] text-zinc-400 font-semibold truncate">{track.artist}</p>
              </div>
            </div>

            {/* Play Preview Button */}
            {track.audioUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPreview(track.audioUrl);
                }}
                className={`p-2 rounded-full transition active:scale-90 ${
                  playingPreviewUrl === track.audioUrl
                    ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30"
                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                }`}
                title="Preview"
              >
                {playingPreviewUrl === track.audioUrl ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ─── 6. EXTENSIVE GIF STICKERS VIEW ─────────────
  const renderGif = () => {
    const activeGifs = GIF_STICKERS_DATA[selectedGifCategory] || GIF_STICKERS_DATA["Trending"];
    const filteredGifs = gifSearchQuery.trim()
      ? Object.values(GIF_STICKERS_DATA).flat().filter(g => g.alt.toLowerCase().includes(gifSearchQuery.toLowerCase()))
      : activeGifs;

    return (
      <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
        {/* Search GIF */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search animated GIFs..."
            value={gifSearchQuery}
            onChange={(e) => setGifSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-white/10 pl-10 pr-4 py-2 rounded-xl text-xs text-white outline-none focus:border-teal-500 transition"
          />
        </div>

        {/* Category Filter Tabs */}
        {!gifSearchQuery.trim() && (
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {GIF_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedGifCategory(cat)}
                className={`px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap transition ${
                  selectedGifCategory === cat
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                    : "bg-zinc-900 text-zinc-400 border border-white/10 hover:bg-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* GIF Grid */}
        <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
          {filteredGifs.map((gif, idx) => (
            <button
              key={idx}
              onClick={() => addAndClose({ type: "gif", gif: { url: gif.url, altText: gif.alt } })}
              className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900/60 border border-white/10 hover:border-teal-500/50 transition cursor-pointer active:scale-95 flex items-center justify-center p-1.5"
            >
              <img src={gif.url} alt={gif.alt} className="w-full h-full object-contain" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ─── 7. TEMPERATURE / WEATHER VIEW ──────────────
  const renderTemperature = () => (
    <div className="space-y-4 flex-1 min-h-0 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="p-4 bg-gradient-to-tr from-amber-500/20 via-yellow-500/10 to-orange-500/20 border border-yellow-500/30 rounded-2xl text-center space-y-1">
          <div className="text-4xl font-black text-yellow-400 drop-shadow">{temperatureVal}</div>
          <p className="text-xs font-bold text-zinc-300">{weatherCondition}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {["22°C", "28°C", "32°C", "18°C", "75°F", "85°F"].map((t) => (
            <button
              key={t}
              onClick={() => setTemperatureVal(t)}
              className={`py-2 rounded-xl text-xs font-bold border transition ${
                temperatureVal === t
                  ? "bg-yellow-500 text-black border-yellow-400 font-black"
                  : "bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={handleDetectWeatherAndLocation}
          disabled={weatherLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold text-white transition"
        >
          {weatherLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          <span>Detect Live Weather via GPS</span>
        </button>
      </div>

      <button
        onClick={() =>
          addAndClose({
            type: "overlay",
            overlay: { text: `${temperatureVal} ${weatherCondition}`, icon: "🌡️" },
          })
        }
        className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-xs rounded-xl shadow-lg transition active:scale-[0.98]"
      >
        Add Temperature Sticker
      </button>
    </div>
  );

  // ─── 8. POLL VIEW ───────────────────────────────
  const renderPoll = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Live Poll Card Preview */}
        <div className="bg-white text-zinc-950 rounded-2xl p-4 shadow-2xl text-center space-y-2 border border-white/40">
          <input
            type="text"
            placeholder="Ask a question..."
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            className="w-full text-center font-extrabold text-sm text-zinc-950 placeholder:text-zinc-400 outline-none bg-transparent"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Yes"
              value={pollOptions[0]}
              onChange={(e) => setPollOptions([e.target.value, pollOptions[1]])}
              className="flex-1 py-2 px-3 bg-zinc-100 rounded-xl font-bold text-xs text-center border border-zinc-200 outline-none focus:border-rose-500"
            />
            <input
              type="text"
              placeholder="No"
              value={pollOptions[1]}
              onChange={(e) => setPollOptions([pollOptions[0], e.target.value])}
              className="flex-1 py-2 px-3 bg-zinc-100 rounded-xl font-bold text-xs text-center border border-zinc-200 outline-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          if (!pollQuestion.trim()) return;
          addAndClose({
            type: "poll",
            poll: {
              question: pollQuestion.trim(),
              options: [pollOptions[0].trim() || "Yes", pollOptions[1].trim() || "No"],
            },
          });
        }}
        disabled={!pollQuestion.trim()}
        className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-40"
      >
        Done
      </button>
    </div>
  );

  // ─── 9. QUESTIONS VIEW ──────────────────────────
  const renderQuestion = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Questions Card Preview */}
        <div className="bg-white text-zinc-950 rounded-2xl p-4 shadow-2xl text-center space-y-2 border border-white/40">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 -mx-4 -mt-4 p-2.5 rounded-t-2xl text-white font-extrabold text-[10px] uppercase tracking-wider">
            Ask me a question
          </div>
          <input
            type="text"
            placeholder="Type your question..."
            value={questionPrompt}
            onChange={(e) => setQuestionPrompt(e.target.value)}
            className="w-full text-center font-extrabold text-sm text-zinc-950 placeholder:text-zinc-400 outline-none bg-transparent"
            autoFocus
          />
          <div className="w-full h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] text-zinc-400 font-medium">
            Type an answer...
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          addAndClose({
            type: "question",
            question: { prompt: questionPrompt.trim() || "Ask me a question" },
          });
        }}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98]"
      >
        Done
      </button>
    </div>
  );

  // ─── 10. EMOJI SLIDER VIEW ──────────────────────
  const renderSlider = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="bg-white text-zinc-950 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2 border border-white/40 text-center">
          <input
            type="text"
            placeholder="Rate this!"
            value={sliderQuestion}
            onChange={(e) => setSliderQuestion(e.target.value)}
            className="w-full text-center font-extrabold text-xs text-zinc-950 placeholder:text-zinc-400 outline-none bg-transparent"
            autoFocus
          />
          <div className="flex items-center gap-2 px-1">
            <span className="text-2xl drop-shadow">{sliderEmoji}</span>
            <div className="flex-1 h-2 bg-zinc-200 rounded-full relative">
              <div className="w-5 h-5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 shadow-md border-2 border-white" />
            </div>
          </div>
        </div>

        <p className="text-[10px] font-bold text-zinc-400 text-center">Choose slider emoji</p>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {["🔥", "😍", "❤️", "😂", "🚀", "💯", "🥺", "👀", "🤩", "💀"].map((e) => (
            <button
              key={e}
              onClick={() => setSliderEmoji(e)}
              className={`text-xl p-2 rounded-xl border transition active:scale-90 ${
                sliderEmoji === e
                  ? "bg-orange-500/20 border-orange-500 shadow-md shadow-orange-500/20"
                  : "bg-zinc-900 border-white/10 hover:bg-zinc-800"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          addAndClose({
            type: "slider",
            slider: { question: sliderQuestion.trim() || "Rate this!", emoji: sliderEmoji },
          });
        }}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98]"
      >
        Done
      </button>
    </div>
  );

  // ─── 11. COUNTDOWN VIEW ─────────────────────────
  const renderCountdown = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Countdown Card Preview */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl p-4 shadow-2xl text-center space-y-2 border border-white/30">
          <input
            type="text"
            placeholder="Name your event (e.g. Birthday)"
            value={countdownTitle}
            onChange={(e) => setCountdownTitle(e.target.value)}
            className="w-full text-center font-black text-xs uppercase tracking-widest text-cyan-200 placeholder:text-cyan-200/50 outline-none bg-transparent"
            autoFocus
          />
          <div className="flex justify-center gap-3 text-base font-black font-mono py-1">
            <div>23<span className="text-[9px] font-sans font-normal opacity-80 block">HRS</span></div>
            <div>59<span className="text-[9px] font-sans font-normal opacity-80 block">MIN</span></div>
            <div>00<span className="text-[9px] font-sans font-normal opacity-80 block">SEC</span></div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Date & Time</label>
          <input
            type="datetime-local"
            value={countdownDate}
            onChange={(e) => setCountdownDate(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 p-2.5 rounded-xl text-xs text-white outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      <button
        onClick={() => {
          addAndClose({
            type: "countdown",
            countdown: {
              title: countdownTitle.trim() || "Countdown",
              targetDate: new Date(countdownDate).toISOString(),
            },
          });
        }}
        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98]"
      >
        Done
      </button>
    </div>
  );

  // ─── 12. LINK VIEW ──────────────────────────────
  const renderLink = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col justify-between">
      <div className="space-y-3">
        <input
          type="url"
          placeholder="Enter website URL (e.g. https://google.com)"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition"
          autoFocus
        />
        <input
          type="text"
          placeholder="Custom sticker text (optional)"
          value={linkTitle}
          onChange={(e) => setLinkTitle(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 p-3 rounded-xl text-xs text-white outline-none focus:border-blue-500/40 transition"
        />

        {/* Live Preview */}
        {linkUrl && (
          <div className="flex justify-center pt-2">
            <div className="inline-flex items-center gap-1.5 px-4 py-2 font-extrabold text-xs rounded-full shadow-2xl bg-white text-zinc-950 border border-white/50">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="truncate max-w-[160px]">{linkTitle.trim() || linkUrl.replace(/^https?:\/\//, "")}</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          if (!linkUrl.trim()) return;
          addAndClose({
            type: "link",
            link: {
              url: linkUrl.trim(),
              title: linkTitle.trim() || linkUrl.trim().replace(/^https?:\/\//, ""),
            },
          });
        }}
        disabled={!linkUrl.trim()}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-40"
      >
        Done
      </button>
    </div>
  );

  // ─── 13. ADD YOURS VIEW ─────────────────────────
  const renderAddYours = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col justify-between">
      <div className="space-y-3 flex-1 min-h-0 flex flex-col">
        {/* Custom Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Create your own Add Yours prompt..."
            value={addYoursPrompt}
            onChange={(e) => setAddYoursPrompt(e.target.value)}
            className="flex-1 bg-zinc-900 border border-white/10 p-2.5 rounded-xl text-xs text-white outline-none focus:border-violet-500 transition"
          />
          <button
            onClick={() => {
              const rand = ADD_YOURS_PROMPTS[Math.floor(Math.random() * ADD_YOURS_PROMPTS.length)];
              setAddYoursPrompt(rand);
            }}
            className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-white transition active:scale-90"
            title="Randomize"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {addYoursPrompt.trim() && (
          <button
            onClick={() => addAndClose({ type: "addYours", addYours: { prompt: addYoursPrompt.trim() } })}
            className="w-full py-2 bg-gradient-to-r from-pink-500 via-rose-600 to-purple-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98]"
          >
            Add Prompt
          </button>
        )}

        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">Popular Prompts</p>
        <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
          {ADD_YOURS_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => addAndClose({ type: "addYours", addYours: { prompt } })}
              className="w-full flex items-center gap-3 p-3 bg-zinc-900/60 border border-white/5 rounded-xl text-xs text-white hover:bg-violet-500/15 hover:border-violet-500/30 transition cursor-pointer active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-left font-bold">{prompt}</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 ml-auto shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── 14. TIME VIEW ──────────────────────────────
  const renderTime = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="space-y-3 flex-1">
        <p className="text-[10px] text-zinc-400 text-center font-bold">Select a clock format</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => addAndClose({ type: "time", time: { timeString: timeStr, style: "digital" } })}
            className="p-5 bg-zinc-900 border border-white/10 hover:border-blue-500/50 rounded-2xl font-mono text-2xl font-black transition active:scale-95 cursor-pointer text-white shadow-md text-center"
          >
            {timeStr}
          </button>
          <button
            onClick={() => addAndClose({ type: "time", time: { timeString: timeStr, style: "minimal" } })}
            className="p-5 bg-white text-zinc-950 border border-white/20 hover:border-blue-500/50 rounded-2xl font-sans text-xl font-extrabold tracking-widest transition active:scale-95 cursor-pointer shadow-md text-center"
          >
            {timeStr}
          </button>
        </div>
      </div>
    );
  };

  // ─── 15. DAY VIEW ───────────────────────────────
  const renderDay = () => {
    const dayStr = new Date().toLocaleDateString([], { weekday: "long" }).toUpperCase();
    return (
      <div className="space-y-3 flex-1">
        <p className="text-[10px] text-zinc-400 text-center font-bold">Select a typography style</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => addAndClose({ type: "day", day: { dayString: dayStr, style: "stylized" } })}
            className="p-5 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 rounded-2xl font-black text-sm text-white transition active:scale-95 cursor-pointer uppercase tracking-widest text-center shadow-lg"
          >
            {dayStr}
          </button>
          <button
            onClick={() => addAndClose({ type: "day", day: { dayString: dayStr, style: "modern" } })}
            className="p-5 bg-white text-zinc-950 rounded-2xl font-black text-sm uppercase tracking-widest transition active:scale-95 cursor-pointer text-center shadow-lg"
          >
            {dayStr}
          </button>
        </div>
      </div>
    );
  };

  // ─── 16. EMOJI VIEW ─────────────────────────────
  const renderEmoji = () => {
    const cats = Object.keys(EMOJI_CATEGORIES);
    return (
      <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {cats.map((cat) => (
            <button
              key={cat}
              onClick={() => setEmojiCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition ${
                emojiCategory === cat
                  ? "bg-pink-500 text-white font-black shadow-md shadow-pink-500/20"
                  : "bg-zinc-900 text-zinc-400 border border-white/10 hover:bg-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
          {(EMOJI_CATEGORIES[emojiCategory] || []).map((em) => (
            <button
              key={em}
              onClick={() => addAndClose({ type: "emoji", emoji: { val: em } })}
              className="text-2xl p-2.5 bg-zinc-900/60 border border-white/5 hover:bg-zinc-800 rounded-2xl transition active:scale-90 cursor-pointer flex items-center justify-center"
            >
              {em}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ─── 17. OVERLAYS / BADGES VIEW ─────────────────
  const renderOverlay = () => (
    <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
      <p className="text-[10px] text-zinc-400 text-center font-bold">Tap a badge to add</p>
      <div className="grid grid-cols-2 gap-2.5 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {OVERLAYS.map((badge, idx) => (
          <button
            key={idx}
            onClick={() => addAndClose({ type: "overlay", overlay: { text: badge.text, icon: badge.icon } })}
            className={`p-4 bg-gradient-to-br ${badge.gradient} rounded-2xl text-white text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-95 transition shadow-lg border border-white/20`}
          >
            <span className="text-3xl filter drop-shadow">{badge.icon}</span>
            <span className="text-[10px] font-black tracking-wider uppercase drop-shadow">{badge.text}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // View routing
  const viewRenderers = {
    location: renderLocation,
    mention: renderMention,
    hashtag: renderHashtag,
    poll: renderPoll,
    question: renderQuestion,
    slider: renderSlider,
    countdown: renderCountdown,
    temperature: renderTemperature,
    link: renderLink,
    music_sticker: renderMusicSticker,
    gif: renderGif,
    addYours: renderAddYours,
    time: renderTime,
    day: renderDay,
    emoji: renderEmoji,
    overlay: renderOverlay,
  };

  const activeLabel = STICKER_CATEGORIES.find((c) => c.id === activeView)?.label || "";

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[650] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="w-full max-w-md bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-t-3xl sm:rounded-3xl text-white shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "82vh", maxHeight: "700px" }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              {activeView && (
                <button
                  type="button"
                  onClick={goBack}
                  className="p-1.5 text-zinc-300 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className="text-sm font-black tracking-wide text-white uppercase">
                {activeView ? activeLabel : "Story Stickers"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 flex flex-col px-5 py-3.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView || "main"}
                initial={{ opacity: 0, x: activeView ? 25 : -25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: activeView ? -25 : 25 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-h-0 flex flex-col"
              >
                {!activeView ? renderMainGrid() : viewRenderers[activeView]?.()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StoryStickersDrawer;

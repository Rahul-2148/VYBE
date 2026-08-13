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
  PlusCircle
} from "lucide-react";

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

// ─── GIF Stickers (built-in animated stickers) ───
const GIF_STICKERS = [
  { url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", alt: "Party" },
  { url: "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif", alt: "Hearts" },
  { url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", alt: "Stars" },
  { url: "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif", alt: "Sparkles" },
  { url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif", alt: "Fire" },
  { url: "https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif", alt: "Cool" },
  { url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", alt: "Wow" },
  { url: "https://media.giphy.com/media/3oz8xIsloV320wXWWA/giphy.gif", alt: "Yay" },
];

// ─── Add Yours Prompts ───────────────────────────
const ADD_YOURS_PROMPTS = [
  "Show your outfit today 👗",
  "Your morning coffee ☕",
  "What's on your desk? 🖥️",
  "Sunset vibes 🌅",
  "Your pet 🐾",
  "What are you reading? 📚",
  "Your playlist right now 🎧",
  "Show your workspace ✨",
];

// ─── Main Sticker Categories (Instagram-style) ──
const STICKER_CATEGORIES = [
  { id: "location", icon: MapPin, label: "LOCATION", color: "text-red-400", hoverBorder: "hover:border-red-500/50" },
  { id: "mention", icon: AtSign, label: "MENTION", color: "text-emerald-400", hoverBorder: "hover:border-emerald-500/50" },
  { id: "hashtag", icon: Hash, label: "HASHTAG", color: "text-amber-400", hoverBorder: "hover:border-amber-500/50" },
  { id: "poll", icon: BarChart2, label: "POLL", color: "text-rose-400", hoverBorder: "hover:border-rose-500/50" },
  { id: "question", icon: HelpCircle, label: "QUESTIONS", color: "text-purple-400", hoverBorder: "hover:border-purple-500/50" },
  { id: "slider", icon: Flame, label: "EMOJI SLIDER", color: "text-orange-400", hoverBorder: "hover:border-orange-500/50" },
  { id: "countdown", icon: Clock, label: "COUNTDOWN", color: "text-cyan-400", hoverBorder: "hover:border-cyan-500/50" },
  { id: "link", icon: Link2, label: "LINK", color: "text-blue-400", hoverBorder: "hover:border-blue-500/50" },
  { id: "music_sticker", icon: Music, label: "MUSIC", color: "text-pink-400", hoverBorder: "hover:border-pink-500/50" },
  { id: "gif", icon: ImageIcon, label: "GIF", color: "text-teal-400", hoverBorder: "hover:border-teal-500/50" },
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

  // Form states
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOpt1, setPollOpt1] = useState("Yes");
  const [pollOpt2, setPollOpt2] = useState("No");
  const [mentionUser, setMentionUser] = useState("");
  const [hashtagVal, setHashtagVal] = useState("");
  const [questionPrompt, setQuestionPrompt] = useState("Ask me anything...");
  const [sliderQuestion, setSliderQuestion] = useState("How cool is this?");
  const [sliderEmoji, setSliderEmoji] = useState("🔥");
  const [countdownTitle, setCountdownTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [locationName, setLocationName] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [emojiCategory, setEmojiCategory] = useState("Smileys");

  // Reset when drawer opens/closes
  useEffect(() => {
    if (open) {
      setActiveView(null);
      setSearchQuery("");
    }
  }, [open]);

  if (!open) return null;

  const goBack = () => {
    setActiveView(null);
    setSearchQuery("");
  };

  const addAndClose = (stickerData) => {
    onAddSticker(stickerData);
    setActiveView(null);
    onClose();
  };

  // Filtered categories for search
  const filteredCategories = searchQuery.trim()
    ? STICKER_CATEGORIES.filter((c) => c.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : STICKER_CATEGORIES;

  // ─── Render Views ──────────────────────────────

  const renderMainGrid = () => (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search stickers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface/80 border border-border pl-9 pr-4 py-2.5 rounded-xl text-xs text-text outline-none focus:border-input-border transition placeholder:text-text-muted"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveView(cat.id)}
              className={`flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 bg-surface/60 border border-border/60 ${cat.hoverBorder} rounded-2xl transition-all duration-200 cursor-pointer hover:bg-surface-hover/60 active:scale-95`}
            >
              <Icon className={`w-5.5 h-5.5 ${cat.color}`} />
              <span className="text-[9px] font-bold tracking-wider text-text-secondary">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-3 flex-1">
      <input
        type="text"
        placeholder="Search locations..."
        value={locationName}
        onChange={(e) => setLocationName(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-red-500/60 transition"
      />
      {/* Quick location suggestions */}
      <div className="space-y-1.5 overflow-y-auto max-h-[40vh] hide-scrollbar">
        {["New York, USA", "London, UK", "Paris, France", "Tokyo, Japan", "Mumbai, India", "Dubai, UAE", "Sydney, Australia", "Berlin, Germany"].filter(
          (l) => !locationName.trim() || l.toLowerCase().includes(locationName.toLowerCase())
        ).map((loc) => (
          <button
            key={loc}
            onClick={() => addAndClose({ type: "location", location: { name: loc }, position: { x: 50, y: 20 } })}
            className="w-full flex items-center gap-2.5 p-2.5 bg-surface/50 border border-border/40 rounded-xl text-xs text-text hover:bg-surface-hover/60 transition cursor-pointer active:scale-[0.98]"
          >
            <MapPin className="w-4 h-4 text-red-400 shrink-0" />
            <span>{loc}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderMention = () => (
    <div className="space-y-3 flex-1">
      <input
        type="text"
        placeholder="Enter username (e.g. rahul)"
        value={mentionUser}
        onChange={(e) => setMentionUser(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-emerald-500/60 transition"
        autoFocus
      />
      <button
        onClick={() => {
          if (!mentionUser.trim()) return;
          addAndClose({ type: "mention", mention: { username: mentionUser.trim().replace("@", "") } });
        }}
        disabled={!mentionUser.trim()}
        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-40"
      >
        Add @{mentionUser.trim().replace("@", "") || "mention"}
      </button>
    </div>
  );

  const renderHashtag = () => (
    <div className="space-y-3 flex-1">
      <input
        type="text"
        placeholder="Enter hashtag (e.g. vybe)"
        value={hashtagVal}
        onChange={(e) => setHashtagVal(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-amber-500/60 transition"
        autoFocus
      />
      <button
        onClick={() => {
          if (!hashtagVal.trim()) return;
          addAndClose({ type: "hashtag", hashtag: { tag: hashtagVal.trim().replace("#", "") } });
        }}
        disabled={!hashtagVal.trim()}
        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-40"
      >
        Add #{hashtagVal.trim().replace("#", "") || "hashtag"}
      </button>
    </div>
  );

  const renderPoll = () => (
    <div className="space-y-3 flex-1">
      <input
        type="text"
        placeholder="Ask a question..."
        value={pollQuestion}
        onChange={(e) => setPollQuestion(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-rose-500/60 transition"
        autoFocus
      />
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Yes"
          value={pollOpt1}
          onChange={(e) => setPollOpt1(e.target.value)}
          className="flex-1 bg-surface/80 border border-border p-2.5 rounded-xl text-xs text-text outline-none focus:border-rose-500/40"
        />
        <input
          type="text"
          placeholder="No"
          value={pollOpt2}
          onChange={(e) => setPollOpt2(e.target.value)}
          className="flex-1 bg-surface/80 border border-border p-2.5 rounded-xl text-xs text-text outline-none focus:border-rose-500/40"
        />
      </div>
      <button
        onClick={() => {
          if (!pollQuestion.trim()) return;
          addAndClose({
            type: "poll",
            poll: { question: pollQuestion.trim(), options: [pollOpt1.trim() || "Yes", pollOpt2.trim() || "No"] },
          });
        }}
        disabled={!pollQuestion.trim()}
        className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-40"
      >
        Add Poll
      </button>
    </div>
  );

  const renderQuestion = () => (
    <div className="space-y-3 flex-1">
      {/* Live Preview Card */}
      <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-4 text-center">
        <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider mb-2">Question Sticker Preview</p>
        <p className="text-sm font-bold text-text">{questionPrompt || "Ask me a question"}</p>
      </div>
      <input
        type="text"
        placeholder="Your question prompt..."
        value={questionPrompt}
        onChange={(e) => setQuestionPrompt(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-purple-500/60 transition"
        autoFocus
      />
      <button
        onClick={() => {
          addAndClose({ type: "question", question: { prompt: questionPrompt.trim() || "Ask me a question" } });
        }}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-violet-600 font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer"
      >
        Add Question Box
      </button>
    </div>
  );

  const renderSlider = () => (
    <div className="space-y-3 flex-1">
      <input
        type="text"
        placeholder="Ask a question..."
        value={sliderQuestion}
        onChange={(e) => setSliderQuestion(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-orange-500/60 transition"
        autoFocus
      />
      <div className="flex gap-1.5 justify-center flex-wrap py-1">
        {["🔥", "😍", "❤️", "😂", "🚀", "💯", "🥺", "👀", "🤩", "💀"].map((e) => (
          <button
            key={e}
            onClick={() => setSliderEmoji(e)}
            className={`text-xl p-2 rounded-xl border transition active:scale-90 ${
              sliderEmoji === e ? "bg-orange-500/20 border-orange-500 shadow-md shadow-orange-500/10" : "bg-surface/60 border-border/60"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          addAndClose({
            type: "slider",
            slider: { question: sliderQuestion.trim() || "Rate this!", emoji: sliderEmoji },
          });
        }}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer"
      >
        Add Emoji Slider
      </button>
    </div>
  );

  const renderCountdown = () => (
    <div className="space-y-3 flex-1">
      {/* Live Preview */}
      <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-2xl p-4 text-center">
        <p className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider mb-1">⏳ {countdownTitle || "Countdown"}</p>
        <div className="flex justify-center gap-3 font-mono text-lg font-black text-text">
          <div>23<span className="text-[8px] block font-normal text-cyan-300">HRS</span></div>
          <div>59<span className="text-[8px] block font-normal text-cyan-300">MIN</span></div>
          <div>45<span className="text-[8px] block font-normal text-cyan-300">SEC</span></div>
        </div>
      </div>
      <input
        type="text"
        placeholder="Countdown title (e.g. New Album Drop)"
        value={countdownTitle}
        onChange={(e) => setCountdownTitle(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-cyan-500/60 transition"
        autoFocus
      />
      <button
        onClick={() => {
          addAndClose({
            type: "countdown",
            countdown: { title: countdownTitle.trim() || "Countdown", targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          });
        }}
        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer"
      >
        Add Countdown
      </button>
    </div>
  );

  const renderLink = () => (
    <div className="space-y-3 flex-1">
      <input
        type="url"
        placeholder="Enter URL (https://...)"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-blue-500/60 transition"
        autoFocus
      />
      <input
        type="text"
        placeholder="Link label (optional)"
        value={linkTitle}
        onChange={(e) => setLinkTitle(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-blue-500/40 transition"
      />
      <button
        onClick={() => {
          if (!linkUrl.trim()) return;
          addAndClose({ type: "link", link: { url: linkUrl.trim(), title: linkTitle.trim() || linkUrl.trim() } });
        }}
        disabled={!linkUrl.trim()}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-40"
      >
        Add Link Sticker
      </button>
    </div>
  );

  const renderMusicSticker = () => (
    <div className="space-y-3 flex-1">
      <input
        type="text"
        placeholder="Song title..."
        value={musicTitle}
        onChange={(e) => setMusicTitle(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-pink-500/60 transition"
        autoFocus
      />
      <input
        type="text"
        placeholder="Artist name..."
        value={musicArtist}
        onChange={(e) => setMusicArtist(e.target.value)}
        className="w-full bg-surface/80 border border-border p-3 rounded-xl text-xs text-text outline-none focus:border-pink-500/40 transition"
      />
      {/* Preview */}
      {musicTitle && (
        <div className="bg-surface/60 border border-border/40 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-text" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-text truncate">{musicTitle}</p>
            <p className="text-[10px] text-text-secondary truncate">{musicArtist || "Unknown Artist"}</p>
          </div>
        </div>
      )}
      <button
        onClick={() => {
          if (!musicTitle.trim()) return;
          addAndClose({ type: "music_sticker", music_sticker: { title: musicTitle.trim(), artist: musicArtist.trim() } });
        }}
        disabled={!musicTitle.trim()}
        className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-40"
      >
        Add Music Sticker
      </button>
    </div>
  );

  const renderGif = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col">
      <p className="text-[10px] text-text-muted text-center">Tap a GIF sticker to add</p>
      <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {GIF_STICKERS.map((gif, idx) => (
          <button
            key={idx}
            onClick={() => addAndClose({ type: "gif", gif: { url: gif.url, altText: gif.alt } })}
            className="relative aspect-square rounded-xl overflow-hidden border border-border/40 hover:border-teal-500/50 transition cursor-pointer active:scale-95"
          >
            <img src={gif.url} alt={gif.alt} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
              <p className="text-[9px] font-bold text-text text-center">{gif.alt}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderAddYours = () => (
    <div className="space-y-3 flex-1 min-h-0 flex flex-col">
      <p className="text-[10px] text-text-muted text-center">Pick a prompt or create your own</p>
      <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {ADD_YOURS_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => addAndClose({ type: "addYours", addYours: { prompt } })}
            className="w-full flex items-center gap-3 p-3 bg-surface/50 border border-border/40 rounded-xl text-xs text-text hover:bg-violet-500/10 hover:border-violet-500/30 transition cursor-pointer active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-left">{prompt}</span>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted ml-auto shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderTime = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="space-y-3 flex-1">
        <p className="text-[10px] text-text-muted text-center">Select a clock style</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => addAndClose({ type: "time", time: { timeString: timeStr, style: "digital" } })}
            className="p-5 bg-surface/60 border border-border/40 hover:border-blue-500/50 rounded-2xl font-mono text-xl font-bold transition active:scale-95 cursor-pointer text-text"
          >
            {timeStr}
          </button>
          <button
            onClick={() => addAndClose({ type: "time", time: { timeString: timeStr, style: "minimal" } })}
            className="p-5 bg-surface/60 border border-border/40 hover:border-blue-500/50 rounded-2xl font-sans text-lg tracking-widest transition active:scale-95 cursor-pointer text-text"
          >
            {timeStr}
          </button>
        </div>
      </div>
    );
  };

  const renderDay = () => {
    const dayStr = new Date().toLocaleDateString([], { weekday: "long" }).toUpperCase();
    return (
      <div className="space-y-3 flex-1">
        <p className="text-[10px] text-text-muted text-center">Select a day tag style</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => addAndClose({ type: "day", day: { dayString: dayStr, style: "stylized" } })}
            className="p-5 bg-surface/60 border border-border/40 hover:border-indigo-500/50 rounded-2xl font-serif italic text-lg font-black text-indigo-400 transition active:scale-95 cursor-pointer"
          >
            {dayStr}
          </button>
          <button
            onClick={() => addAndClose({ type: "day", day: { dayString: dayStr, style: "modern" } })}
            className="p-5 bg-surface/60 border border-border/40 hover:border-indigo-500/50 rounded-2xl font-mono text-xs font-bold uppercase tracking-widest text-text transition active:scale-95 cursor-pointer"
          >
            {dayStr}
          </button>
        </div>
      </div>
    );
  };

  const renderEmoji = () => {
    const cats = Object.keys(EMOJI_CATEGORIES);
    return (
      <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {cats.map((cat) => (
            <button
              key={cat}
              onClick={() => setEmojiCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition ${
                emojiCategory === cat
                  ? "bg-pink-500/20 text-pink-400 border border-pink-500/40"
                  : "bg-surface/60 text-text-secondary border border-border/40 hover:bg-surface-hover/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Emoji grid */}
        <div className="grid grid-cols-6 gap-1.5 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
          {(EMOJI_CATEGORIES[emojiCategory] || []).map((em) => (
            <button
              key={em}
              onClick={() => addAndClose({ type: "emoji", emoji: { val: em } })}
              className="text-2xl p-2 bg-surface/40 border border-border/30 hover:bg-surface-hover/60 rounded-xl transition active:scale-90 cursor-pointer"
            >
              {em}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderOverlay = () => (
    <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
      <p className="text-[10px] text-text-muted text-center">Tap a badge to add</p>
      <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar pb-2">
        {OVERLAYS.map((badge, idx) => (
          <button
            key={idx}
            onClick={() => addAndClose({ type: "overlay", overlay: { text: badge.text, icon: badge.icon } })}
            className={`p-3.5 bg-gradient-to-br ${badge.gradient} rounded-2xl text-text text-center flex flex-col items-center justify-center gap-1 cursor-pointer hover:scale-[1.03] active:scale-95 transition shadow-lg`}
          >
            <span className="text-2xl drop-shadow">{badge.icon}</span>
            <span className="text-[9px] font-black tracking-wider uppercase">{badge.text}</span>
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
        className="fixed inset-0 z-[650] bg-surface-overlay backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="w-full max-w-md bg-surface-inset/95 backdrop-blur-xl border border-border/70 rounded-t-3xl sm:rounded-3xl text-text shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "82vh" }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-9 h-1 rounded-full bg-surface-active" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              {activeView && (
                <button
                  type="button"
                  onClick={goBack}
                  className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                >
                  <ArrowLeft className="w-4.5 h-4.5" />
                </button>
              )}
              <h3 className="text-sm font-bold tracking-wide">
                {activeView ? activeLabel : "Stickers"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 flex flex-col px-5 py-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView || "main"}
                initial={{ opacity: 0, x: activeView ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: activeView ? -30 : 30 }}
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

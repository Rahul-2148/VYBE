import React, { useState, useEffect } from "react";
import { Vote, CheckCircle2, XCircle, Send, ExternalLink, Clock, HelpCircle, AtSign, Hash, Flame, MapPin, Music, PlusCircle, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/axios";

const LyricPlayer = ({ title }) => {
  const lyricsMap = {
    "Golden Hour": [
      "It's your golden hour...",
      "You slow down time...",
      "In your golden hour...",
      "We shine together...",
      "Just like gold..."
    ],
    "Midnight City": [
      "Waiting in a car...",
      "Waiting for a start in the dark...",
      "Midnight city lights...",
      "The city is my church...",
      "Midnight city..."
    ],
    "Electric Feel": [
      "All along the eastern shore...",
      "Put your hands in the water...",
      "Electric feel now...",
      "Shock me like an electric eel...",
      "Turn me on with your electric feel..."
    ],
    "Blinding Lights": [
      "I've been on my own for long enough...",
      "Maybe you can show me how to love...",
      "I'm blinded by the lights...",
      "No, I can't sleep until I feel your touch...",
      "Blinding lights..."
    ],
  };

  const lines = lyricsMap[title] || [
    "🎵 Humming the melody...",
    "✨ Singing my heart out...",
    "🎶 Feel the vibe of Vybe...",
    "🌟 Writing our own story...",
    "🔥 Living in the moment..."
  ];
  
  const [currentLineIdx, setCurrentLineIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLineIdx((prev) => (prev + 1) % lines.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [lines.length]);

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center space-y-1">
      <p className="text-sm font-black text-rose-500 animate-pulse tracking-wide select-none drop-shadow">
        {lines[currentLineIdx]}
      </p>
      <p className="text-[8px] opacity-75 font-medium tracking-tight text-white">
        Next: {lines[(currentLineIdx + 1) % lines.length]}
      </p>
    </div>
  );
};

export const StoryStickers = ({ stickers = [], storyId, currentUserId, pollVotes = [] }) => {
  const navigate = useNavigate();
  const userIdStr = (u) => (u?._id ? u._id.toString() : u?.toString());

  const [userPollVote, setUserPollVote] = useState(() => {
    const existing = pollVotes.find((v) => userIdStr(v.user) === currentUserId?.toString());
    return existing ? existing.optionIndex : null;
  });

  const [localPollVotes, setLocalPollVotes] = useState(pollVotes);
  // quiz state removed (unused)

  const [questionText, setQuestionText] = useState("");
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [sliderVal, setSliderVal] = useState(50);

  // Live countdown timer: update `countdownNow` every second without calling setState synchronously
  const [countdownNow, setCountdownNow] = useState(0);
  useEffect(() => {
    const hasCountdown = stickers.some((s) => s.type === "countdown");
    if (!hasCountdown) return undefined;
    const tick = () => setCountdownNow(Date.now());
    const id = setInterval(tick, 1000);
    // defer initial update so setState isn't called synchronously in the effect body
    const t0 = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(t0);
    };
  }, [stickers]);

  if (!stickers || stickers.length === 0) return null;

  const handlePollVote = async (optionIndex) => {
    if (userPollVote !== null && userPollVote === optionIndex) return;
    setUserPollVote(optionIndex);

    try {
      const res = await api.post(`/story/poll/${storyId}/vote`, { optionIndex });
      if (res.data.success && res.data.pollVotes) {
        setLocalPollVotes(res.data.pollVotes);
      }
    } catch {
      toast.error("Failed to submit poll vote.");
    }
  };

  // quiz handler removed (not used)

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    try {
      const res = await api.post(`/story/question/${storyId}/submit`, { responseText: questionText.trim() });
      if (res.data.success) {
        toast.success("Question response sent!");
        setQuestionSubmitted(true);
        setQuestionText("");
      }
    } catch {
      toast.error("Failed to send response.");
    }
  };

  // Countdown helper
  const getCountdownParts = (targetDate) => {
    if (!countdownNow) return { hrs: "00", min: "00", sec: "00", expired: false };
    const now = countdownNow;
    const diff = Math.max(0, new Date(targetDate).getTime() - now);
    const hrs = Math.floor(diff / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return { hrs: String(hrs).padStart(2, "0"), min: String(min).padStart(2, "0"), sec: String(sec).padStart(2, "0"), expired: diff <= 0 };
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {stickers.map((sticker, idx) => {
        const posX = sticker.position?.x ?? 50;
        const posY = sticker.position?.y ?? 50;
        const scaleVal = sticker.scale || 1;
        const styleIdx = sticker.styleIndex || 0;

        // Time Analog Hour/Min Degrees
        const timeDate = new Date();
        const hourDeg = (timeDate.getHours() % 12) * 30 + timeDate.getMinutes() * 0.5;
        const minDeg = timeDate.getMinutes() * 6;

        // Precompute countdown parts when needed to avoid IIFE in JSX
        const cd = sticker.type === "countdown" ? getCountdownParts(sticker.countdown?.targetDate) : null;

        return (
          <div
            key={idx}
            style={{ 
              top: `${posY}%`, 
              left: `${posX}%`, 
              transform: `translate(-50%, -50%) scale(${scaleVal})` 
            }}
            className="absolute pointer-events-auto max-w-[85%] w-72 transition-transform duration-300 z-30"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. POLL STICKER */}
            {sticker.type === "poll" && sticker.poll && (
              <div className={`rounded-2xl p-3.5 shadow-2xl text-center space-y-1.5 border transition-all duration-300 ${
                styleIdx === 1
                  ? "bg-surface-inset text-text border-border"
                  : styleIdx === 2
                  ? "bg-white/20 backdrop-blur-md text-text border-white/20"
                  : "bg-white/95 text-text border-white/40"
              }`}>
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Vote className={`w-4 h-4 ${styleIdx === 1 ? "text-emerald-400" : "text-rose-500"}`} />
                  <h4 className="font-bold text-[11px] leading-snug">{sticker.poll.question || "Poll"}</h4>
                </div>

                <div className="space-y-1.5">
                  {sticker.poll.options?.map((opt, optIdx) => {
                    const totalVotes = localPollVotes.length || 1;
                    const optVotes = localPollVotes.filter((v) => v.optionIndex === optIdx).length;
                    const percent = Math.round((optVotes / totalVotes) * 100);
                    const isSelected = userPollVote === optIdx;

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handlePollVote(optIdx)}
                        className={`relative w-full py-2 px-3 rounded-xl text-[10px] font-semibold overflow-hidden transition border ${
                          isSelected
                            ? "border-rose-500 bg-rose-50/20 font-bold text-rose-400"
                            : styleIdx === 1
                            ? "border-border-strong bg-surface text-text hover:bg-surface-hover"
                            : styleIdx === 2
                            ? "border-white/10 bg-white/10 text-text hover:bg-white/20"
                            : "border-border bg-background-secondary hover:bg-card-hover text-text-secondary"
                        }`}
                      >
                        {userPollVote !== null && (
                          <div
                            className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${
                              styleIdx === 1 ? "bg-emerald-500/20" : "bg-rose-500/20"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        )}

                        <div className="relative z-10 flex items-center justify-between">
                          <span>{opt.optionText}</span>
                          {userPollVote !== null && <span className="font-mono text-[9px]">{percent}%</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. MENTION STICKER */}
            {sticker.type === "mention" && sticker.mention && (
              <button
                onClick={() => navigate(`/profile/${sticker.mention.username}`)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 font-black text-xs rounded-2xl shadow-2xl transition border transform hover:scale-105 active:scale-95 ${
                  styleIdx === 1
                    ? "bg-card text-text-inverse border-white"
                    : styleIdx === 2
                    ? "bg-black/35 border-white/30 text-text backdrop-blur"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 text-text border-white/10"
                }`}
              >
                <AtSign className="w-3.5 h-3.5" />
                <span>{sticker.mention.username}</span>
              </button>
            )}

            {/* 3. HASHTAG STICKER */}
            {sticker.type === "hashtag" && sticker.hashtag && (
              <button
                onClick={() => navigate(`/explore/tag/${sticker.hashtag.tag}`)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 font-black text-xs rounded-2xl shadow-2xl transition border transform hover:scale-105 active:scale-95 ${
                  styleIdx === 1
                    ? "bg-card text-text-inverse border-white"
                    : styleIdx === 2
                    ? "bg-black/35 border-white/30 text-text backdrop-blur"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 text-text border-white/10"
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>#{sticker.hashtag.tag}</span>
              </button>
            )}

            {/* 4. EMOJI SLIDER STICKER */}
            {sticker.type === "slider" && (
              <div className={`rounded-2xl p-3.5 shadow-2xl text-center space-y-2 border transition-all duration-300 ${
                styleIdx === 1
                  ? "bg-surface-inset text-text border-border"
                  : styleIdx === 2
                  ? "bg-white/20 backdrop-blur text-text border-white/20"
                  : "bg-white/95 text-text border-white/40"
              }`}>
                <h4 className="font-bold text-[10px] mb-1">{sticker.slider?.question || "Rate this!"}</h4>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{sticker.slider?.emoji || "🔥"}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderVal}
                    onChange={(e) => setSliderVal(e.target.value)}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 5. COUNTDOWN STICKER (LIVE) */}
            {sticker.type === "countdown" && sticker.countdown && (
              <div className={`rounded-2xl p-3.5 shadow-2xl text-center space-y-2 border transition ${
                styleIdx === 1
                  ? "bg-surface-inset text-text border-border"
                  : styleIdx === 2
                  ? "bg-white/25 backdrop-blur text-text border-white/20"
                  : "bg-gradient-to-r from-cyan-600 to-blue-700 text-text border-white/30"
              }`}>
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-200" />
                  <span className="font-bold text-[10px] uppercase tracking-wider">{sticker.countdown?.title || "Countdown"}</span>
                </div>
                <div className={`flex justify-center gap-2.5 text-base font-black font-mono py-1.5 rounded-xl border ${
                  styleIdx === 2 ? "bg-white/10 border-white/10" : "bg-bg/30 border-white/5"
                }`}>
                  {cd?.expired ? (
                    <span className="text-xs font-bold text-yellow-300 animate-pulse">🎉 Time's Up!</span>
                  ) : (
                    <>
                      <div>{cd?.hrs}<span className="text-[8px] block font-normal text-cyan-200">HRS</span></div>
                      <div>{cd?.min}<span className="text-[8px] block font-normal text-cyan-200">MIN</span></div>
                      <div>{cd?.sec}<span className="text-[8px] block font-normal text-cyan-200">SEC</span></div>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* 6. QUESTION BOX STICKER */}
            {sticker.type === "question" && sticker.question && (
              <div className={`rounded-2xl p-4 shadow-2xl text-center border transition-all duration-300 ${
                styleIdx === 1
                  ? "bg-surface-inset text-text border-border"
                  : styleIdx === 2
                  ? "bg-white/20 backdrop-blur text-text border-white/20"
                  : "bg-white/95 text-text border-white/50"
              }`}>
                <div className="flex justify-center mb-1">
                  <HelpCircle className={`w-5 h-5 ${styleIdx === 1 ? "text-emerald-400" : "text-purple-600"}`} />
                </div>
                <h4 className="font-bold text-[10px] mb-2">{sticker.question.prompt || "Ask me a question"}</h4>

                {!questionSubmitted ? (
                  <form onSubmit={handleQuestionSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Type response..."
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      className={`w-full px-2.5 py-1 rounded-xl text-[10px] outline-none transition ${
                        styleIdx === 1 
                          ? "bg-surface border border-border text-text focus:border-emerald-500" 
                          : styleIdx === 2
                          ? "bg-white/10 border border-white/10 text-text focus:border-white/30"
                          : "bg-background-secondary border border-border-strong text-text focus:border-purple-500"
                      }`}
                    />
                    <button type="submit" className={`p-1.5 rounded-xl cursor-pointer text-text transition ${
                      styleIdx === 1 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-600 hover:bg-purple-700"
                    }`}>
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <p className="text-[10px] text-emerald-500 font-bold mt-1">Response Sent! ✨</p>
                )}
              </div>
            )}

            {/* 7. LINK STICKER */}
            {sticker.type === "link" && sticker.link && (
              <a
                href={sticker.link.url?.startsWith("http") ? sticker.link.url : `https://${sticker.link.url}`}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1.5 px-4 py-2 font-extrabold text-[11px] rounded-full shadow-2xl border transition ${
                  styleIdx === 1
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-text border-white/10"
                    : styleIdx === 2
                    ? "bg-black/45 border-white/30 text-text backdrop-blur-md"
                    : "bg-card text-text border-border"
                }`}
              >
                <Link2 className={`w-3.5 h-3.5 ${styleIdx === 1 ? "text-text" : "text-rose-500"}`} />
                <span>{sticker.link.title || sticker.link.url}</span>
              </a>
            )}

            {/* 8. TIME STICKER */}
            {sticker.type === "time" && sticker.time && (
              <div className="flex justify-center">
                {styleIdx === 2 ? (
                  <div className="w-16 h-16 rounded-full border-4 border-white bg-bg/40 backdrop-blur-sm relative flex items-center justify-center shadow-2xl">
                    <div className="absolute w-[3px] h-5 bg-card origin-bottom bottom-1/2 rounded" style={{ transform: `rotate(${hourDeg}deg)` }} />
                    <div className="absolute w-[2px] h-7 bg-white/90 origin-bottom bottom-1/2 rounded" style={{ transform: `rotate(${minDeg}deg)` }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 z-10" />
                  </div>
                ) : (
                  <div className={`text-center font-mono select-none drop-shadow-lg transition-all duration-300 ${
                    styleIdx === 1 
                      ? "font-sans text-2xl tracking-widest bg-bg/40 text-text px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10" 
                      : "text-3xl font-black bg-card text-text-inverse px-4 py-2.5 rounded-2xl shadow-2xl border border-white/40"
                  }`}>
                    {sticker.time.timeString}
                  </div>
                )}
              </div>
            )}

            {/* 9. DAY STICKER */}
            {sticker.type === "day" && sticker.day && (
              <div className="flex justify-center">
                {styleIdx === 2 ? (
                  <div className="font-sans font-black uppercase text-base bg-yellow-300 text-text-inverse px-3.5 py-1.5 rounded-xl border-3 border-bg shadow-lg transform rotate-2">
                    {sticker.day.dayString}
                  </div>
                ) : (
                  <div className={`text-center select-none drop-shadow-lg transition-all duration-300 ${
                    styleIdx === 1
                      ? "font-mono text-sm font-bold tracking-widest bg-bg/50 text-text px-5 py-2.5 rounded-xl border border-white/20 uppercase"
                      : "font-serif italic text-2xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent transform rotate-1"
                  }`}>
                    {sticker.day.dayString}
                  </div>
                )}
              </div>
            )}

            {/* 10. EMOJI STICKER */}
            {sticker.type === "emoji" && sticker.emoji && (
              <div className={`text-6xl text-center select-none ${
                styleIdx === 1 ? "animate-pulse drop-shadow-2xl" : styleIdx === 2 ? "transform rotate-12 scale-110" : ""
              }`}>
                {sticker.emoji.val}
              </div>
            )}

            {/* 11. OVERLAY BADGE STICKER */}
            {sticker.type === "overlay" && sticker.overlay && (
              <div className={`font-black text-xs p-3 px-5 rounded-2xl shadow-2xl border flex flex-col items-center justify-center gap-1 text-center transition ${
                styleIdx === 1
                  ? "bg-card text-text-inverse border-border"
                  : styleIdx === 2
                  ? "bg-black/45 text-text border-white/20 backdrop-blur-sm"
                  : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-text border-white/30"
              }`}>
                <span className="text-3xl filter drop-shadow">{sticker.overlay.icon}</span>
                <span className="tracking-wider uppercase font-black">{sticker.overlay.text}</span>
              </div>
            )}

            {/* 12. LOCATION STICKER */}
            {sticker.type === "location" && sticker.location && (
              <button
                onClick={() => navigate(`/explore/location/${encodeURIComponent(sticker.location.name)}`)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 font-black text-xs rounded-full shadow-2xl transition border cursor-pointer hover:scale-105 active:scale-95 transform ${
                  styleIdx === 1
                    ? "bg-white text-rose-500 border-rose-200"
                    : styleIdx === 2
                    ? "bg-black/45 border-white/30 text-text backdrop-blur-md"
                    : "bg-gradient-to-r from-red-500 to-rose-600 text-text border-white/10"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{sticker.location.name || "Location"}</span>
              </button>
            )}

            {/* 13. GIF STICKER */}
            {sticker.type === "gif" && sticker.gif && (
              <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 max-w-[180px]">
                <img src={sticker.gif.url} alt={sticker.gif.altText || "GIF"} className="w-full h-auto" />
              </div>
            )}

            {/* 14. ADD YOURS STICKER */}
            {sticker.type === "addYours" && sticker.addYours && (
              <div className={`rounded-2xl p-3.5 shadow-2xl text-center border transition ${
                styleIdx === 1
                  ? "bg-surface-inset text-text border-border"
                  : styleIdx === 2
                  ? "bg-white/20 backdrop-blur text-text border-white/20"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 text-text border-white/20"
              }`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Add Yours</span>
                </div>
                <p className="text-xs font-medium">{sticker.addYours.prompt}</p>
              </div>
            )}

            {/* 15. MUSIC STICKER */}
            {sticker.type === "music_sticker" && sticker.music_sticker && (
              <button
                onClick={() => navigate(`/audio/${encodeURIComponent(sticker.music_sticker.id || sticker.music_sticker.title)}`)}
                className="select-none text-left cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 transform block w-full focus:outline-none"
              >
                {styleIdx === 0 && (
                  <div className="bg-black/55 border border-white/10 backdrop-blur-md rounded-full p-2.5 flex items-center gap-3 text-left w-56 shadow-2xl">
                    <style>{`
                      @keyframes spin-slow {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                      .animate-spin-slow {
                        animation: spin-slow 10s linear infinite;
                      }
                    `}</style>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 via-purple-600 to-cyan-500 flex items-center justify-center shrink-0 shadow animate-spin-slow">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-white truncate leading-tight">{sticker.music_sticker.title}</p>
                      <p className="text-[8px] text-white/70 font-bold truncate mt-0.5">{sticker.music_sticker.artist || "Unknown"}</p>
                    </div>
                    <div className="eq-container shrink-0 pr-1 flex items-end gap-[1.5px] h-3">
                      <div className="w-[1.5px] bg-white rounded-full h-1.5 animate-bounce" />
                      <div className="w-[1.5px] bg-white rounded-full h-2.5 animate-bounce [animation-delay:0.15s]" />
                      <div className="w-[1.5px] bg-white rounded-full h-1 animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                )}

                {styleIdx === 1 && (
                  <div className="bg-white text-black border border-white/20 rounded-full py-1.5 px-3 flex items-center gap-2 shadow-2xl text-left w-auto max-w-[210px]">
                    <div className="eq-container shrink-0 flex items-end gap-[1.5px] h-2.5">
                      <div className="w-[1.5px] bg-black rounded-full h-1.5 animate-bounce" />
                      <div className="w-[1.5px] bg-black rounded-full h-2.5 animate-bounce [animation-delay:0.15s]" />
                      <div className="w-[1.5px] bg-black rounded-full h-1 animate-bounce [animation-delay:0.3s]" />
                    </div>
                    <span className="text-[9px] font-black truncate tracking-tight">{sticker.music_sticker.title}</span>
                  </div>
                )}

                {styleIdx === 2 && (
                  <div className="bg-gradient-to-br from-zinc-900/95 to-black border border-white/10 rounded-2xl p-2.5 flex items-center gap-3 shadow-2xl text-left w-52 relative overflow-hidden text-white">
                    <div className="relative w-10 h-10 shrink-0">
                      <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center animate-spin-slow z-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-black border border-zinc-600" />
                      </div>
                      <div className="relative w-10 h-10 rounded-lg bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg z-10 border border-white/15">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 z-10">
                      <p className="text-[10px] font-black text-white truncate leading-tight">{sticker.music_sticker.title}</p>
                      <p className="text-[8px] text-white/70 font-semibold truncate mt-0.5">{sticker.music_sticker.artist || "Unknown"}</p>
                    </div>
                  </div>
                )}

                {styleIdx === 3 && (
                  <div className="bg-black/55 backdrop-blur-md rounded-2xl border border-white/10 p-2 shadow-2xl w-60 text-center text-white">
                    <LyricPlayer title={sticker.music_sticker.title} />
                  </div>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StoryStickers;

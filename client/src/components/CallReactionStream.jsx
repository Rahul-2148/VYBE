// client/src/components/CallReactionStream.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NOTO_ANIMATED_MAP } from "../constants/notoEmojiMap";

/**
 * Authentic Google Meet / Noto Color Static Emoji (SVG / PNG with text fallback)
 */
export const StaticNotoEmoji = ({ emoji, className = "w-6 h-6" }) => {
  const rawCode = NOTO_ANIMATED_MAP[emoji] || "";
  const svgCode = rawCode.replace(/_fe0f/g, "");

  if (!rawCode) {
    return <span className="text-xl select-none leading-none">{emoji}</span>;
  }

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src={`https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u${svgCode}.svg`}
        alt={emoji}
        className="w-full h-full object-contain pointer-events-none"
        loading="eager"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          const fallback = e.currentTarget.parentElement?.querySelector(".emoji-fallback");
          if (fallback) fallback.style.display = "inline-block";
        }}
      />
      <span className="emoji-fallback hidden text-xl select-none leading-none">{emoji}</span>
    </div>
  );
};

/**
 * Animated Emoji Component with Google Noto Animated WebP / GIF and fallback
 * Accepts instanceId to reset browser WebP timeline to frame 0 immediately upon spawn
 */
export const AnimatedEmoji = ({ emoji, className = "w-11 h-11", instanceId }) => {
  const code = NOTO_ANIMATED_MAP[emoji];

  if (!code) {
    return <span className="text-3xl select-none">{emoji}</span>;
  }

  const query = instanceId ? `?inst=${instanceId}` : "";

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <picture className="w-full h-full flex items-center justify-center pointer-events-none">
        <source
          srcSet={`https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.webp${query}`}
          type="image/webp"
        />
        <img
          src={`https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.gif${query}`}
          alt={emoji}
          className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          loading="eager"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.parentElement?.querySelector(".emoji-fallback");
            if (fallback) fallback.style.display = "inline-block";
          }}
        />
        <span className="emoji-fallback hidden text-3xl">{emoji}</span>
      </picture>
    </div>
  );
};

/**
 * GMeet-Exact Live Floating Reaction Stream
 * 2.0s duration with Google Meet organic cubic-bezier acceleration and authentic Noto animations
 */
export const CallReactionStream = ({ reactions = [] }) => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[999]">
      <AnimatePresence>
        {reactions.map((r) => {
          const startX = typeof r.leftPercent === "number" ? r.leftPercent : 50;

          return (
            <motion.div
              key={r.id}
              initial={{
                opacity: 0,
                y: 0,
                x: "-50%",
                scale: 0.65,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -300,
                scale: [0.65, 1.12, 1.0, 0.85],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.0,
                ease: [0.25, 0.46, 0.45, 0.94],
                times: [0, 0.12, 0.75, 1],
              }}
              className="fixed bottom-24 flex flex-col items-center gap-1 select-none pointer-events-none z-[999]"
              style={{
                left: `${startX}%`,
              }}
            >
              {/* Google Meet Authentic Animated Reaction */}
              <AnimatedEmoji emoji={r.emoji} className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5" instanceId={r.id} />

              {/* Sender Label Badge */}
              {r.userName && (
                <span className="px-2 py-0.5 rounded-full bg-[#181a1d]/90 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white shadow-lg whitespace-nowrap mt-0.5">
                  {r.userName}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default CallReactionStream;


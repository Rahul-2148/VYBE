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
 * Spawns immediately from bottom toolbar area with organic drift, wave motion, and cubic-bezier acceleration
 */
export const CallReactionStream = ({ reactions = [] }) => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
      <AnimatePresence>
        {reactions.map((r) => {
          const startX = typeof r.leftPercent === "number" ? r.leftPercent : 50;
          const driftX = typeof r.driftX === "number" ? r.driftX : 0;
          const displayName = r.senderName || r.userName || "";

          return (
            <motion.div
              key={r.id}
              initial={{
                opacity: 0,
                y: 15,
                x: "-50%",
                scale: 0.45,
                rotate: 0,
              }}
              animate={{
                opacity: [0, 1, 1, 1, 0],
                y: [15, -60, -200, -360, -480],
                x: [
                  "-50%",
                  `calc(-50% + ${driftX * 0.35}px)`,
                  `calc(-50% + ${driftX * 0.75}px)`,
                  `calc(-50% + ${driftX}px)`,
                  `calc(-50% + ${driftX * 1.25}px)`,
                ],
                scale: [0.45, 1.28, 1.15, 1.0, 0.75],
                rotate: [0, -7, 7, -4, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.2,
                ease: [0.16, 1, 0.3, 1], // Google Meet smooth organic physics
                times: [0, 0.12, 0.45, 0.78, 1],
              }}
              className="fixed bottom-16 flex flex-col items-center gap-1 select-none pointer-events-none z-[9999]"
              style={{
                left: `${startX}%`,
              }}
            >
              {/* Google Meet Authentic Animated Reaction */}
              <AnimatedEmoji emoji={r.emoji} className="w-9 h-9 sm:w-10 sm:h-10" instanceId={r.id} />

              {/* Sender Label Badge */}
              {displayName && (
                <span className="px-2 py-0.5 rounded-full bg-[#181a1d]/90 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white shadow-lg whitespace-nowrap mt-0.5 animate-in fade-in zoom-in-75">
                  {displayName}
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

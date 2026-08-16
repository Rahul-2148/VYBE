import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoHeartFill } from "react-icons/go";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

export const HeartExplosion = ({ show, onComplete }) => {
  useEffect(() => {
    if (show) {
      triggerHaptic("like");
      microAudio.playLikeBurst();
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  // Generate 8 particles with fixed polar positions
  const particles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * 45 * Math.PI) / 180;
      const distance = 80 + (i % 2) * 40;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance - 20; // slight upward drift
      const scale = 0.4 + (i % 3) * 0.2;
      const rotation = (i % 2 === 0 ? 1 : -1) * (15 + i * 5);
      return { id: i, x, y, scale, rotation };
    });
  }, []);

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden select-none">
      {/* Background Radial Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1.4, 1.8] }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-rose-500/60 via-pink-500/40 to-amber-400/30 blur-2xl pointer-events-none"
      />

      {/* Main Central Popping Heart */}
      <motion.div
        initial={{ scale: 0, rotate: -12, opacity: 0 }}
        animate={{
          scale: [0, 1.35, 0.95, 1.1, 1, 0.8],
          rotate: [-12, 0, 4, -2, 0, 0],
          opacity: [0, 1, 1, 1, 1, 0],
        }}
        transition={{ duration: 0.8, times: [0, 0.25, 0.45, 0.65, 0.8, 1], ease: "easeOut" }}
        className="relative flex items-center justify-center"
      >
        <GoHeartFill
          className="text-white text-8xl md:text-9xl filter drop-shadow-[0_12px_24px_rgba(244,63,94,0.7)]"
          style={{
            fill: "url(#vybe-heart-gradient)",
          }}
        />
        <svg width="0" height="0">
          <linearGradient id="vybe-heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff007a" />
            <stop offset="50%" stopColor="#ff4d6d" />
            <stop offset="100%" stopColor="#ff758c" />
          </linearGradient>
        </svg>
      </motion.div>

      {/* Micro Floating Sparkling Hearts */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: [0, p.scale, p.scale * 0.7, 0],
            opacity: [0, 1, 1, 0],
            rotate: p.rotation,
          }}
          transition={{ duration: 0.75, delay: 0.05, ease: "easeOut" }}
          className="absolute"
        >
          <GoHeartFill className="text-pink-400 text-2xl drop-shadow-[0_4px_10px_rgba(244,63,94,0.8)]" />
        </motion.div>
      ))}
    </div>
  );
};

export default HeartExplosion;

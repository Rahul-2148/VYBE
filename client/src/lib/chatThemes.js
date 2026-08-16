/**
 * VYBE Chat Themes & Wallpaper System
 * Dynamic Printed Wallpapers, Textures, and Ambient Mesh Gradients
 * Highly distinct atmospheric lighting, base tones, and bubble styling in both Light & Dark modes.
 */

export const CHAT_THEMES = [
  // --- PRINTED WALLPAPERS ---
  {
    id: "classic_doodle",
    name: "Classic Doodle",
    category: "printed",
    description: "Classic micro-doodle pattern with coffee, music & ambient icons",
    previewBg: "bg-[#EFEAE2] dark:bg-[#0b141a]",
    previewBadge: "Doodle Print",
    senderBubble: "bg-emerald-600 dark:bg-[#005c4b] dark:border dark:border-[#02735e]/60 text-white shadow-md shadow-emerald-950/30",
    receiverBubble: "bg-white/95 dark:bg-[#202c33]/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-[#2a3942] shadow-sm backdrop-blur-md",
    accentColor: "#10b981",
    getBackground: (isDark) => {
      const stroke = isDark ? "%238696a0" : "%23202c33";
      const opacity = isDark ? "0.16" : "0.08";
      const svg = `data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20h12v8H20zm40 10a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm40-5l6 10H94zm-80 50c3 0 6 3 6 6s-3 6-6 6-6-3-6-6 3-6 6-6zm45 5h14l-7-12zm35-15a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM30 100l5 10H25zm50-5c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9zM10 60h8v8h-8zm100 40h10v10h-10z' fill='none' stroke='${stroke}' stroke-opacity='${opacity}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='85' cy='25' r='3' fill='${stroke}' fill-opacity='${opacity}'/%3E%3Ccircle cx='40' cy='80' r='2' fill='${stroke}' fill-opacity='${opacity}'/%3E%3Cpath d='M65 45q5-8 10 0t10 0' fill='none' stroke='${stroke}' stroke-opacity='${opacity}' stroke-width='1.5'/%3E%3C/svg%3E`;
      return {
        backgroundColor: isDark ? "#0b141a" : "#efeae2",
        backgroundImage: `url("${svg}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "120px 120px",
      };
    },
  },
  {
    id: "cyber_grid",
    name: "Cyber Neon Matrix",
    category: "printed",
    description: "Futuristic neon synthwave grid lines with radiant cyan glow",
    previewBg: "bg-slate-950 text-cyan-400 border border-cyan-500/30",
    previewBadge: "Cyber Grid",
    senderBubble: "bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/40",
    receiverBubble: "bg-white/95 dark:bg-[#0a1128]/95 text-zinc-900 dark:text-cyan-100 border border-cyan-200/80 dark:border-cyan-500/40 shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.12)] backdrop-blur-md",
    accentColor: "#06b6d4",
    getBackground: (isDark) => {
      const line = isDark ? "rgba(6,182,212,0.22)" : "rgba(99,102,241,0.12)";
      const bg = isDark ? "#030718" : "#f0f4ff";
      return {
        backgroundColor: bg,
        backgroundImage: isDark
          ? `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px), radial-gradient(circle at center, rgba(6,182,212,0.15) 0%, transparent 70%)`
          : `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        backgroundSize: "32px 32px, 32px 32px, 100% 100%",
      };
    },
  },
  {
    id: "floral_bloom",
    name: "Sakura Blossom",
    category: "printed",
    description: "Delicate Japanese cherry blossom & glowing floral petals",
    previewBg: "bg-pink-100 dark:bg-[#200b19] text-pink-400",
    previewBadge: "Sakura",
    senderBubble: "bg-gradient-to-r from-rose-500 via-pink-500 to-red-400 text-white shadow-md shadow-pink-500/25 border border-pink-400/30",
    receiverBubble: "bg-white/95 dark:bg-[#260c1e]/95 text-zinc-900 dark:text-pink-100 border border-pink-200/80 dark:border-rose-500/30 shadow-sm backdrop-blur-md",
    accentColor: "#ec4899",
    getBackground: (isDark) => {
      const stroke = isDark ? "%23f472b6" : "%23db2777";
      const opacity = isDark ? "0.22" : "0.09";
      const bg = isDark ? "#160511" : "#fdf2f8";
      const svg = `data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 25c-5-10-15-5-10 5 5 10 10 5 10-10zm0 30c5 10 15 5 10-5-5-10-10-5-10 10zm-15-15c-10-5-5-15 5-10 10 5 5 10-10 10zm30 0c10 5 5 15-5 10-10-5-5-10 10-10z' fill='none' stroke='${stroke}' stroke-opacity='${opacity}' stroke-width='1.5'/%3E%3Ccircle cx='40' cy='40' r='3' fill='${stroke}' fill-opacity='${opacity}'/%3E%3C/svg%3E`;
      return {
        backgroundColor: bg,
        backgroundImage: isDark
          ? `url("${svg}"), radial-gradient(circle at 50% 30%, rgba(244,63,94,0.18) 0%, transparent 65%)`
          : `url("${svg}")`,
        backgroundRepeat: isDark ? "repeat, no-repeat" : "repeat",
        backgroundSize: isDark ? "80px 80px, 100% 100%" : "80px 80px",
      };
    },
  },
  {
    id: "cosmic_stars",
    name: "Cosmic Nebula & Stars",
    category: "printed",
    description: "Starry celestial constellations with luminous astral nebula",
    previewBg: "bg-[#090826] text-amber-300 border border-violet-500/30",
    previewBadge: "Cosmic Stars",
    senderBubble: "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/40 border border-purple-400/30",
    receiverBubble: "bg-white/95 dark:bg-[#12102e]/95 text-zinc-900 dark:text-violet-100 border border-indigo-200/80 dark:border-violet-500/40 shadow-sm backdrop-blur-md",
    accentColor: "#8b5cf6",
    getBackground: (isDark) => {
      const dot = isDark ? "rgba(255,255,255,0.35)" : "rgba(79,70,229,0.15)";
      const bg = isDark ? "#060516" : "#f5f3ff";
      return {
        backgroundColor: bg,
        backgroundImage: isDark
          ? `radial-gradient(ellipse at 30% 20%, rgba(147,51,234,0.32), transparent 60%), radial-gradient(ellipse at 75% 80%, rgba(59,130,246,0.26), transparent 60%), radial-gradient(${dot} 1.5px, transparent 1.5px), radial-gradient(${dot} 1px, transparent 1px)`
          : `radial-gradient(${dot} 1.5px, transparent 1.5px), radial-gradient(${dot} 1px, transparent 1px)`,
        backgroundSize: isDark ? "100% 100%, 100% 100%, 48px 48px, 24px 24px" : "48px 48px, 24px 24px",
        backgroundPosition: isDark ? "0 0, 0 0, 0 0, 12px 12px" : "0 0, 12px 12px",
      };
    },
  },
  {
    id: "carbon_stealth",
    name: "Carbon Stealth Matrix",
    category: "printed",
    description: "Tactical carbon fiber weave for luxury stealth OLED feel",
    previewBg: "bg-zinc-950 text-zinc-400 border border-zinc-700",
    previewBadge: "Carbon Stealth",
    senderBubble: "bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-500/60 shadow-md",
    receiverBubble: "bg-white/95 dark:bg-[#18181b]/95 text-zinc-900 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-700/80 shadow-md backdrop-blur-md",
    accentColor: "#71717a",
    getBackground: (isDark) => {
      const bg = isDark ? "#000000" : "#f4f4f5";
      const line = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
      return {
        backgroundColor: bg,
        backgroundImage: `repeating-linear-gradient(45deg, ${line} 0, ${line} 1px, transparent 0, transparent 8px), repeating-linear-gradient(-45deg, ${line} 0, ${line} 1px, transparent 0, transparent 8px)`,
      };
    },
  },
  {
    id: "comic_dots",
    name: "Pop Art Comic Halftone",
    category: "printed",
    description: "Retro comic book halftone pattern with dynamic amber energy",
    previewBg: "bg-amber-100 dark:bg-[#201306] text-amber-500",
    previewBadge: "Comic Dots",
    senderBubble: "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-md shadow-orange-500/30 border border-amber-300/30 font-medium",
    receiverBubble: "bg-white/95 dark:bg-[#241708]/95 text-zinc-900 dark:text-amber-100 border border-amber-200/80 dark:border-amber-600/40 shadow-sm backdrop-blur-md",
    accentColor: "#f59e0b",
    getBackground: (isDark) => {
      const dot = isDark ? "rgba(245,158,11,0.22)" : "rgba(217,119,6,0.07)";
      const bg = isDark ? "#140c03" : "#fffbeb";
      return {
        backgroundColor: bg,
        backgroundImage: isDark
          ? `radial-gradient(circle at top right, rgba(245,158,11,0.18), transparent 60%), radial-gradient(${dot} 2px, transparent 2px)`
          : `radial-gradient(${dot} 2px, transparent 2px)`,
        backgroundSize: isDark ? "100% 100%, 20px 20px" : "20px 20px",
      };
    },
  },

  // --- GRADIENT & AMBIENT MESH THEMES ---
  {
    id: "default",
    name: "Vybe Signature",
    category: "gradient",
    description: "Signature radiant purple, pink and rose ambient glow",
    previewBg: "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white",
    previewBadge: "Signature",
    senderBubble: "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-md shadow-pink-500/20 border border-purple-400/30",
    receiverBubble: "bg-white/95 dark:bg-[#180e2b]/95 text-zinc-900 dark:text-purple-100 border border-purple-200/80 dark:border-purple-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#ec4899",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#0c0618" : "#ffffff",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 20% 20%, rgba(168,85,247,0.28), transparent 65%), radial-gradient(ellipse at 80% 80%, rgba(244,63,94,0.22), transparent 65%), linear-gradient(180deg, #0c0618 0%, #150928 100%)"
        : "linear-gradient(180deg, rgba(243,232,255,0.4) 0%, rgba(254,226,226,0.25) 50%, rgba(255,255,255,0) 100%)",
    }),
  },
  {
    id: "aurora_glow",
    name: "Aurora Borealis Glow",
    category: "gradient",
    description: "Ethereal northern lights with vivid neon emerald, violet & teal waves",
    previewBg: "bg-gradient-to-r from-emerald-400 via-teal-500 to-violet-600 text-white",
    previewBadge: "Aurora Glow",
    senderBubble: "bg-gradient-to-r from-emerald-400 via-teal-500 to-violet-600 text-white shadow-lg shadow-emerald-500/30 border border-emerald-300/40",
    receiverBubble: "bg-white/95 dark:bg-[#032320]/95 text-zinc-900 dark:text-emerald-100 border border-emerald-200/80 dark:border-emerald-500/40 shadow-xs backdrop-blur-md",
    accentColor: "#10b981",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#011413" : "#f0fdf9",
      backgroundImage: isDark
        ? "radial-gradient(ellipse 90% 60% at 15% 15%, rgba(16,185,129,0.38), transparent 70%), radial-gradient(ellipse 80% 60% at 85% 85%, rgba(139,92,246,0.35), transparent 70%), radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,182,212,0.25), transparent 60%)"
        : "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(167,243,208,0.6), transparent 70%), radial-gradient(ellipse 70% 50% at 80% 90%, rgba(233,213,255,0.5), transparent 70%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(252,231,243,0.45), transparent 60%)",
    }),
  },
  {
    id: "sunset",
    name: "Sunset Flame",
    category: "gradient",
    description: "Warm sunset magma hues from amber glow to golden yellow",
    previewBg: "bg-gradient-to-r from-rose-500 via-amber-500 to-yellow-500 text-white",
    previewBadge: "Sunset",
    senderBubble: "bg-gradient-to-r from-rose-500 via-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/25 border border-amber-300/30",
    receiverBubble: "bg-white/95 dark:bg-[#250d08]/95 text-zinc-900 dark:text-orange-100 border border-orange-200/80 dark:border-orange-500/40 shadow-xs backdrop-blur-md",
    accentColor: "#f59e0b",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#160603" : "#fffaf5",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 50% 15%, rgba(239,68,68,0.28), transparent 65%), radial-gradient(ellipse at 50% 85%, rgba(245,158,11,0.24), transparent 65%), linear-gradient(180deg, #160603 0%, #200a05 100%)"
        : "linear-gradient(180deg, rgba(254,226,226,0.4) 0%, rgba(254,243,199,0.3) 50%, rgba(255,255,255,0) 100%)",
    }),
  },
  {
    id: "ocean",
    name: "Oceanic Blue",
    category: "gradient",
    description: "Deep cobalt royal blue and electric navy abyssal stream",
    previewBg: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 text-white",
    previewBadge: "Oceanic Blue",
    senderBubble: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 text-white shadow-md shadow-blue-600/30 border border-blue-400/30",
    receiverBubble: "bg-white/95 dark:bg-[#071738]/95 text-zinc-900 dark:text-blue-100 border border-blue-200/80 dark:border-blue-500/40 shadow-xs backdrop-blur-md",
    accentColor: "#2563eb",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#020b1e" : "#f0f7ff",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.35), transparent 65%), radial-gradient(ellipse at 20% 80%, rgba(6,182,212,0.26), transparent 65%), linear-gradient(180deg, #020b1e 0%, #061435 100%)"
        : "linear-gradient(180deg, rgba(219,234,254,0.45) 0%, rgba(191,219,254,0.3) 50%, rgba(255,255,255,0) 100%)",
    }),
  },
  {
    id: "forest",
    name: "Emerald Forest",
    category: "gradient",
    description: "Lush botanical rainforest with vibrant jade & mint glow",
    previewBg: "bg-gradient-to-r from-emerald-500 via-teal-600 to-green-600 text-white",
    previewBadge: "Emerald",
    senderBubble: "bg-gradient-to-r from-emerald-500 via-teal-600 to-green-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-300/30",
    receiverBubble: "bg-white/95 dark:bg-[#072414]/95 text-zinc-900 dark:text-emerald-100 border border-emerald-200/80 dark:border-emerald-500/40 shadow-xs backdrop-blur-md",
    accentColor: "#10b981",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#02160a" : "#f0fdf4",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 50% 20%, rgba(16,185,129,0.32), transparent 65%), radial-gradient(ellipse at 50% 80%, rgba(13,148,136,0.25), transparent 65%), linear-gradient(180deg, #02160a 0%, #052414 100%)"
        : "linear-gradient(180deg, rgba(209,250,229,0.4) 0%, rgba(204,251,241,0.3) 50%, rgba(255,255,255,0) 100%)",
    }),
  },
  {
    id: "lavender",
    name: "Cyber Lavender",
    category: "gradient",
    description: "Galactic ultraviolet and electric neon violet aura",
    previewBg: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white",
    previewBadge: "Lavender",
    senderBubble: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/25 border border-purple-400/30",
    receiverBubble: "bg-white/95 dark:bg-[#210933]/95 text-zinc-900 dark:text-purple-100 border border-purple-200/80 dark:border-purple-500/40 shadow-xs backdrop-blur-md",
    accentColor: "#a855f7",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#12041e" : "#faf5ff",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 20% 20%, rgba(168,85,247,0.36), transparent 65%), radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.28), transparent 65%), linear-gradient(180deg, #12041e 0%, #200735 100%)"
        : "linear-gradient(180deg, rgba(243,232,255,0.35) 0%, rgba(252,231,243,0.2) 50%, rgba(255,255,255,0) 100%)",
    }),
  },
  {
    id: "midnight",
    name: "Midnight Stealth",
    category: "minimal",
    description: "Clean minimalist high-contrast pitch OLED black & crisp slate",
    previewBg: "bg-zinc-950 text-white border border-zinc-800",
    previewBadge: "Minimal",
    senderBubble: "bg-zinc-900 dark:bg-zinc-800 text-white border border-zinc-700/80 shadow-md",
    receiverBubble: "bg-white/95 dark:bg-[#121214]/95 text-zinc-900 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 shadow-xs backdrop-blur-md",
    accentColor: "#71717a",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#000000" : "#ffffff",
    }),
  },
];

export const getChatThemeById = (themeId) => {
  if (themeId === "whatsapp_doodle") {
    return CHAT_THEMES.find((t) => t.id === "classic_doodle") || CHAT_THEMES[0];
  }
  return CHAT_THEMES.find((t) => t.id === themeId) || CHAT_THEMES[0];
};

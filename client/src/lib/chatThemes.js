/**
 * VYBE Chat Themes & Wallpaper System
 * Dynamic Printed Wallpapers, Textures, and Ambient Mesh Gradients
 * Highly distinct atmospheric lighting, base tones, and bubble styling in both Light & Dark modes.
 */

export const CHAT_THEMES = [
  // --- SIGNATURE DEFAULT THEME ---
  {
    id: "default",
    name: "Vybe Classic",
    category: "minimal",
    description: "Clean aesthetic theme with signature gradient accents",
    previewBg: "bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 text-white",
    previewBadge: "Default",
    senderBubble: "bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 text-white shadow-md shadow-pink-500/20 border border-purple-400/20",
    receiverBubble: "bg-surface text-text border border-border/80 shadow-xs backdrop-blur-md",
    accentColor: "#ec4899",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#000000" : "#ffffff",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.08) 0%, transparent 60%)"
        : "radial-gradient(ellipse at 50% 0%, rgba(243,232,255,0.4) 0%, transparent 60%)",
    }),
  },

  // --- PRINTED WALLPAPERS ---
  {
    id: "classic_doodle",
    name: "Classic Doodle",
    category: "printed",
    description: "Retro micro-doodle sketch with distinct dark & light contrast",
    previewBg: "bg-[#EFEAE2] dark:bg-[#0b141a]",
    previewBadge: "Popular",
    senderBubble: "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] border border-[#c4eec0] dark:border-[#02735e]/60 shadow-xs",
    receiverBubble: "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] border border-[#e2e8f0] dark:border-[#2a3942] shadow-xs backdrop-blur-md",
    accentColor: "#10b981",
    getBackground: (isDark) => {
      const stroke = isDark ? "%238bb2c9" : "%23202c33";
      const opacity = isDark ? "0.38" : "0.10";
      // High-detail authentic doodle: coffee, headphones, gamepad, camera, chat bubbles, music, star, heart, sun, planet
      const svg = `data:image/svg+xml,%3Csvg width='160' height='160' viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='${stroke}' stroke-opacity='${opacity}' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 20h14v10H20zm14 3h4a3 3 0 0 1 0 6h-4M55 18a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-3 8h6m-3-3v6'/%3E%3Cpath d='M95 20l8 14H87zm40 5c3 0 6 3 6 6s-3 6-6 6-6-3-6-6 3-6 6-6z'/%3E%3Cpath d='M25 65q6-10 12 0t12 0M80 60h16v10H80zm-2 5h-4v8h24v-8h-4'/%3E%3Cpath d='M130 55a7 7 0 1 1-14 0 7 7 0 0 1 14 0zm0 7v10h-6'/%3E%3Cpath d='M20 110a10 10 0 0 0 20 0c0-6-10-14-10-14s-10 8-10 14zM75 105l6 12-10 4zm45-5c0 6-5 11-11 11s-11-5-11-11 5-11 11-11 11 5 11 11z'/%3E%3Cpath d='M20 145h16v8H20zm70 0l7-10 7 10zm40 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z'/%3E%3C/g%3E%3Ccircle cx='105' cy='75' r='2.5' fill='${stroke}' fill-opacity='${opacity}'/%3E%3Ccircle cx='45' cy='135' r='3' fill='${stroke}' fill-opacity='${opacity}'/%3E%3Ccircle cx='140' cy='130' r='2' fill='${stroke}' fill-opacity='${opacity}'/%3E%3C/svg%3E`;
      return {
        backgroundColor: isDark ? "#0c151c" : "#efeae2",
        backgroundImage: `url("${svg}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "160px 160px",
      };
    },
  },
  {
    id: "carbon_stealth",
    name: "Carbon Stealth Matrix",
    category: "printed",
    description: "Tactical carbon fiber 3D twill weave for luxury OLED stealth feel",
    previewBg: "bg-zinc-950 text-zinc-400 border border-zinc-700",
    previewBadge: "Carbon Stealth",
    senderBubble: "bg-gradient-to-r from-zinc-800 to-zinc-750 text-white border border-zinc-500/70 shadow-lg shadow-black/40",
    receiverBubble: "bg-white dark:bg-[#181920] text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700/80 shadow-md backdrop-blur-md",
    accentColor: "#71717a",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#090a0f" : "#f4f4f6",
      backgroundImage: isDark
        ? `repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 2px, transparent 0, transparent 10px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.7) 0, rgba(0,0,0,0.7) 2px, transparent 0, transparent 10px), radial-gradient(circle at 50% 20%, rgba(59,130,246,0.18), transparent 70%)`
        : `repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 2px, transparent 0, transparent 8px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 2px, transparent 0, transparent 8px)`,
      backgroundSize: isDark ? "10px 10px, 10px 10px, 100% 100%" : "auto",
    }),
  },
  {
    id: "midnight",
    name: "Midnight Stealth",
    category: "minimal",
    description: "Pitch OLED black with luminous geometric grid & silver accents",
    previewBg: "bg-zinc-950 text-white border border-zinc-800",
    previewBadge: "OLED Luxe",
    senderBubble: "bg-gradient-to-r from-zinc-800 to-zinc-900 text-white border border-zinc-600/70 shadow-lg shadow-black/50",
    receiverBubble: "bg-zinc-100 dark:bg-[#16161a] text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700/70 shadow-md backdrop-blur-md",
    accentColor: "#a1a1aa",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#05060b" : "#ffffff",
      backgroundImage: isDark
        ? `linear-gradient(to right, rgba(99, 102, 241, 0.22) 1px, transparent 1px),
           linear-gradient(to bottom, rgba(99, 102, 241, 0.22) 1px, transparent 1px),
           radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.25) 0%, transparent 60%)`
        : `linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%)`,
      backgroundSize: isDark ? "36px 36px, 36px 36px, 100% 100%" : "100% 100%",
    }),
  },
  {
    id: "cyber_grid",
    name: "Cyber Neon Matrix",
    category: "printed",
    description: "Futuristic neon synthwave grid lines with radiant cyan glow",
    previewBg: "bg-slate-950 text-cyan-400 border border-cyan-500/30",
    previewBadge: "Cyber Grid",
    senderBubble: "bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-cyan-950/40 border border-cyan-400/40",
    receiverBubble: "bg-white dark:bg-[#0d1b2a] text-zinc-900 dark:text-cyan-100 border border-cyan-200 dark:border-cyan-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#06b6d4",
    getBackground: (isDark) => {
      const line = isDark ? "rgba(6,182,212,0.24)" : "rgba(99,102,241,0.12)";
      const bg = isDark ? "#040915" : "#f0f7ff";
      return {
        backgroundColor: bg,
        backgroundImage: isDark
          ? `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px), radial-gradient(circle at center, rgba(6,182,212,0.2) 0%, transparent 70%)`
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
    receiverBubble: "bg-white dark:bg-[#240a1b] text-zinc-900 dark:text-pink-100 border border-pink-200 dark:border-rose-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#ec4899",
    getBackground: (isDark) => {
      const stroke = isDark ? "%23f472b6" : "%23db2777";
      const opacity = isDark ? "0.26" : "0.09";
      const bg = isDark ? "#150510" : "#fff5f7";
      const svg = `data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 25c-5-10-15-5-10 5 5 10 10 5 10-10zm0 30c5 10 15 5 10-5-5-10-10-5-10 10zm-15-15c-10-5-5-15 5-10 10 5 5 10-10 10zm30 0c10 5 5 15-5 10-10-5-5-10 10-10z' fill='none' stroke='${stroke}' stroke-opacity='${opacity}' stroke-width='1.5'/%3E%3Ccircle cx='40' cy='40' r='3' fill='${stroke}' fill-opacity='${opacity}'/%3E%3C/svg%3E`;
      return {
        backgroundColor: bg,
        backgroundImage: isDark
          ? `url("${svg}"), radial-gradient(circle at 50% 30%, rgba(244,63,94,0.22) 0%, transparent 65%)`
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
    receiverBubble: "bg-white dark:bg-[#13102d] text-zinc-900 dark:text-violet-100 border border-purple-200 dark:border-violet-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#8b5cf6",
    getBackground: (isDark) => {
      const dot = isDark ? "rgba(255,255,255,0.45)" : "rgba(79,70,229,0.15)";
      const bg = isDark ? "#07061a" : "#f5f3ff";
      return {
        backgroundColor: bg,
        backgroundImage: isDark
          ? `radial-gradient(ellipse at 30% 20%, rgba(147,51,234,0.38), transparent 60%), radial-gradient(ellipse at 75% 80%, rgba(59,130,246,0.3), transparent 60%), radial-gradient(${dot} 1.5px, transparent 1.5px), radial-gradient(${dot} 1px, transparent 1px)`
          : `radial-gradient(${dot} 1.5px, transparent 1.5px), radial-gradient(${dot} 1px, transparent 1px)`,
        backgroundSize: isDark ? "100% 100%, 100% 100%, 48px 48px, 24px 24px" : "48px 48px, 24px 24px",
        backgroundPosition: isDark ? "0 0, 0 0, 0 0, 12px 12px" : "0 0, 12px 12px",
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
    receiverBubble: "bg-white dark:bg-[#241708] text-zinc-900 dark:text-amber-100 border border-amber-200 dark:border-amber-600/40 shadow-xs backdrop-blur-md",
    accentColor: "#f59e0b",
    getBackground: (isDark) => {
      const dot = isDark ? "rgba(245,158,11,0.28)" : "rgba(217,119,6,0.08)";
      const bg = isDark ? "#140c03" : "#fffbeb";
      return {
        backgroundColor: bg,
        backgroundImage: isDark
          ? `radial-gradient(circle at top right, rgba(245,158,11,0.24), transparent 60%), radial-gradient(${dot} 2px, transparent 2px)`
          : `radial-gradient(${dot} 2px, transparent 2px)`,
        backgroundSize: isDark ? "100% 100%, 20px 20px" : "20px 20px",
      };
    },
  },

  // --- GRADIENT & AMBIENT MESH THEMES (INSTAGRAM STYLE) ---
  {
    id: "aurora_glow",
    name: "Aurora Borealis Glow",
    category: "gradient",
    description: "Northern lights with vivid emerald, violet & teal waves",
    previewBg: "bg-gradient-to-r from-emerald-400 via-teal-500 to-violet-600 text-white",
    previewBadge: "Aurora Glow",
    senderBubble: "bg-gradient-to-r from-emerald-400 via-teal-500 to-violet-600 text-white shadow-lg shadow-emerald-500/30 border border-emerald-300/40",
    receiverBubble: "bg-white dark:bg-[#062420] text-zinc-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#10b981",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#011413" : "#f0fdf9",
      backgroundImage: isDark
        ? "radial-gradient(ellipse 90% 60% at 15% 15%, rgba(16,185,129,0.36), transparent 70%), radial-gradient(ellipse 80% 60% at 85% 85%, rgba(139,92,246,0.32), transparent 70%)"
        : "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(167,243,208,0.6), transparent 70%), radial-gradient(ellipse 70% 50% at 80% 90%, rgba(233,213,255,0.5), transparent 70%)",
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
    receiverBubble: "bg-white dark:bg-[#240e07] text-zinc-900 dark:text-orange-100 border border-orange-200 dark:border-orange-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#f59e0b",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#160703" : "#fffaf5",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 50% 15%, rgba(239,68,68,0.3), transparent 65%), radial-gradient(ellipse at 50% 85%, rgba(245,158,11,0.25), transparent 65%)"
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
    receiverBubble: "bg-white dark:bg-[#0a1936] text-zinc-900 dark:text-blue-100 border border-blue-200 dark:border-blue-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#2563eb",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#030d22" : "#f0f7ff",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.35), transparent 65%), radial-gradient(ellipse at 20% 80%, rgba(6,182,212,0.26), transparent 65%)"
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
    receiverBubble: "bg-white dark:bg-[#072414] text-zinc-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#10b981",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#02140a" : "#f0fdf4",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 50% 20%, rgba(16,185,129,0.35), transparent 65%), radial-gradient(ellipse at 50% 80%, rgba(13,148,136,0.26), transparent 65%)"
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
    receiverBubble: "bg-white dark:bg-[#210933] text-zinc-900 dark:text-purple-100 border border-purple-200 dark:border-purple-500/30 shadow-xs backdrop-blur-md",
    accentColor: "#a855f7",
    getBackground: (isDark) => ({
      backgroundColor: isDark ? "#12041e" : "#faf5ff",
      backgroundImage: isDark
        ? "radial-gradient(ellipse at 20% 20%, rgba(168,85,247,0.36), transparent 65%), radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.28), transparent 65%)"
        : "linear-gradient(180deg, rgba(243,232,255,0.35) 0%, rgba(252,231,243,0.2) 50%, rgba(255,255,255,0) 100%)",
    }),
  },
];

/**
 * Resolves the active theme ID with WhatsApp/Instagram precision:
 * 1. Dedicated custom theme set specifically for this chat: `chat_theme_${userId}_${conversationId}`
 * 2. Conversation-level database theme (if not "default")
 * 3. User's Global Default Chat Wallpaper: `vybe_global_chat_theme`
 * 4. App Default: "default" (Vybe Classic)
 */
export const getResolvedThemeId = (userId, conversationId, convTheme) => {
  if (typeof window !== "undefined") {
    // 1. Dedicated custom theme set specifically by this user for this chat
    if (userId && conversationId) {
      const customOverride = localStorage.getItem(`chat_theme_${userId}_${conversationId}`);
      if (customOverride) {
        return customOverride;
      }
    }
    // 2. User's personal Global Default Chat Wallpaper
    if (userId) {
      const userGlobal = localStorage.getItem(`vybe_global_chat_theme_${userId}`);
      if (userGlobal) {
        return userGlobal;
      }
    }
    const legacyGlobal = localStorage.getItem("vybe_global_chat_theme");
    if (legacyGlobal) {
      return legacyGlobal;
    }
  }

  // 3. Fallback conversation-level theme
  if (convTheme && convTheme !== "default") {
    return convTheme;
  }

  return "default";
};

/**
 * Returns theme object by ID with fallback to Global Theme Preference or Default
 */
export const getChatThemeById = (themeId) => {
  // If no explicit themeId or "default" requested, check if user has set a Global Chat Wallpaper preference
  if (!themeId || themeId === "default") {
    const globalDefaultThemeId = typeof window !== "undefined" ? localStorage.getItem("vybe_global_chat_theme") : null;
    if (globalDefaultThemeId && globalDefaultThemeId !== "default") {
      const foundGlobal = CHAT_THEMES.find((t) => t.id === globalDefaultThemeId);
      if (foundGlobal) return foundGlobal;
    }
    return CHAT_THEMES[0]; // "default" Vybe Classic
  }
  if (themeId === "whatsapp_doodle") {
    return CHAT_THEMES.find((t) => t.id === "classic_doodle") || CHAT_THEMES[0];
  }
  return CHAT_THEMES.find((t) => t.id === themeId) || CHAT_THEMES[0];
};

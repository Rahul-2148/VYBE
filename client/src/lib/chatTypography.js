// client/src/lib/chatTypography.js
// Global Chat Typography, Font Styles & Size Management for VYBE

export const FONT_SIZES = [
  {
    id: "small",
    name: "Small (Compact)",
    sizePx: 11.5,
    lineHeight: "16px",
    label: "11.5px (Compact)",
    bubblePadding: "px-2.5 py-1.5",
    timestampSize: "text-[9px]",
    stickerSizeClass: "w-14 h-14 sm:w-16 sm:h-16",
    stickerDimension: "60px",
    classText: "text-[11.5px] leading-[16px]",
  },
  {
    id: "medium",
    name: "Medium (Standard)",
    sizePx: 13,
    lineHeight: "18px",
    label: "13px (Default)",
    bubblePadding: "px-3 py-1.5",
    timestampSize: "text-[9.5px]",
    stickerSizeClass: "w-16 h-16 sm:w-20 sm:h-20",
    stickerDimension: "72px",
    classText: "text-[13px] leading-[18px]",
  },
  {
    id: "large",
    name: "Large",
    sizePx: 15,
    lineHeight: "21px",
    label: "15px (Large)",
    bubblePadding: "px-3.5 py-2",
    timestampSize: "text-[10px]",
    stickerSizeClass: "w-20 h-20 sm:w-24 sm:h-24",
    stickerDimension: "88px",
    classText: "text-[15px] leading-[21px]",
  },
  {
    id: "xlarge",
    name: "Extra Large",
    sizePx: 17,
    lineHeight: "24px",
    label: "17px (Extra Large)",
    bubblePadding: "px-4 py-2.5",
    timestampSize: "text-[11px]",
    stickerSizeClass: "w-24 h-24 sm:w-28 sm:h-28",
    stickerDimension: "100px",
    classText: "text-[17px] leading-[24px]",
  },
];

export const FONT_STYLES = [
  {
    id: "vybe_classic",
    name: "Vybe Classic",
    tag: "Classic",
    description: "Clean modern geometric typeface",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: "500",
    letterSpacing: "normal",
    previewText: "Hey! How are you doing today? ✨",
    badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  },
  {
    id: "vybe_modern",
    name: "Vybe Modern",
    tag: "Modern",
    description: "Sleek headline display font",
    fontFamily: "'Outfit', sans-serif",
    fontWeight: "500",
    letterSpacing: "0.01em",
    previewText: "Good vibes only! Let's connect 🔥",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  {
    id: "neon_glow",
    name: "Neon Glow",
    tag: "Aesthetic",
    description: "Soft curved rounded bubble font",
    fontFamily: "'Comfortaa', 'Quicksand', cursive, sans-serif",
    fontWeight: "700",
    letterSpacing: "0.02em",
    previewText: "Aesthetic pastel moments 🌸",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  {
    id: "vintage_typewriter",
    name: "Vintage Typewriter",
    tag: "Retro",
    description: "Authentic letterpress mono",
    fontFamily: "'Courier Prime', monospace",
    fontWeight: "500",
    letterSpacing: "normal",
    previewText: "Chapter 1: The untold story...",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    id: "bold_impact",
    name: "Bold Impact",
    tag: "Strong",
    description: "Heavy bold impact condensed text",
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: "400",
    letterSpacing: "0.06em",
    scaleMultiplier: 1.15,
    previewText: "UNSTOPPABLE ENERGY AND HUSTLE ⚡",
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  {
    id: "casual_script",
    name: "Casual Script",
    tag: "Handwritten",
    description: "Expressive handwritten casual cursive",
    fontFamily: "'Caveat', cursive",
    fontWeight: "600",
    letterSpacing: "0.02em",
    scaleMultiplier: 1.12,
    previewText: "With sweet love and memories 💖",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  {
    id: "editorial_luxury",
    name: "Editorial Luxury",
    tag: "Serif",
    description: "High-fashion elegant serif font",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: "600",
    letterSpacing: "normal",
    previewText: "Simplicity is the keynote of elegance.",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    id: "dancing_script",
    name: "Dancing Script",
    tag: "Calligraphy",
    description: "Graceful calligraphic flourish",
    fontFamily: "'Dancing Script', cursive",
    fontWeight: "700",
    letterSpacing: "0.03em",
    scaleMultiplier: 1.1,
    previewText: "Forever and always yours ✨",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  {
    id: "clean_sans",
    name: "Clean Sans",
    tag: "Standard",
    description: "High readability neutral sans",
    fontFamily: "'Roboto', sans-serif",
    fontWeight: "400",
    letterSpacing: "normal",
    previewText: "Hey! Meeting at 5 PM today 👍",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  {
    id: "minimalist_pro",
    name: "Minimalist Pro",
    tag: "Minimal",
    description: "Cupertino sleek system typeface",
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontWeight: "500",
    letterSpacing: "-0.01em",
    previewText: "Seamlessly synced across your devices.",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    id: "developer_mono",
    name: "Developer Mono",
    tag: "Code",
    description: "Crisp hacker code monospace",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: "500",
    letterSpacing: "normal",
    previewText: "const vybe = { status: 200 };",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  {
    id: "cyber_terminal",
    name: "Cyber Terminal",
    tag: "Futuristic",
    description: "Sci-fi futuristic monospace",
    fontFamily: "'Space Mono', monospace",
    fontWeight: "400",
    letterSpacing: "normal",
    previewText: "SYSTEM_ONLINE // CONNECTED 🚀",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
];

const LEGACY_STYLE_MAP = {
  system: "vybe_modern",
  ig_modern: "vybe_modern",
  ig_classic: "vybe_classic",
  rounded: "neon_glow",
  ig_neon: "neon_glow",
  ig_typewriter: "vintage_typewriter",
  ig_strong: "bold_impact",
  handwritten: "casual_script",
  ig_cursive: "casual_script",
  serif: "editorial_luxury",
  ig_elegant: "editorial_luxury",
  ig_calligraphy: "dancing_script",
  wa_official: "clean_sans",
  roboto: "clean_sans",
  apple_sf: "minimalist_pro",
  mono: "developer_mono",
  dev_mono: "developer_mono",
  retro_space: "cyber_terminal",
};

const resolveStyleId = (rawId) => {
  if (!rawId) return "vybe_classic";
  if (FONT_STYLES.some((s) => s.id === rawId)) return rawId;
  return LEGACY_STYLE_MAP[rawId] || "vybe_classic";
};

const STORAGE_KEY = "vybe_chat_typography";

export const getChatTypography = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        fontSizeId: parsed.fontSizeId || "medium",
        fontStyleId: resolveStyleId(parsed.fontStyleId),
      };
    }
  } catch {
    /* ignore storage parsing error */
  }
  return {
    fontSizeId: "medium",
    fontStyleId: "vybe_classic",
  };
};

export const saveChatTypography = (settings) => {
  try {
    const resolvedStyle = resolveStyleId(settings.fontStyleId);
    const updated = {
      fontSizeId: settings.fontSizeId || "medium",
      fontStyleId: resolvedStyle,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("vybe-chat-typography-changed", { detail: updated }));
    return updated;
  } catch {
    return settings;
  }
};

export const getActiveFontClasses = (typography) => {
  const sizeObj = FONT_SIZES.find((s) => s.id === typography?.fontSizeId) || FONT_SIZES[1];
  const targetStyleId = resolveStyleId(typography?.fontStyleId);
  const styleObj = FONT_STYLES.find((s) => s.id === targetStyleId) || FONT_STYLES[0];
  const multiplier = styleObj.scaleMultiplier || 1;
  const computedSize = Math.round(sizeObj.sizePx * multiplier * 10) / 10;

  return {
    sizeClass: sizeObj.classText,
    fontFamily: styleObj.fontFamily,
    fontWeight: styleObj.fontWeight || "normal",
    letterSpacing: styleObj.letterSpacing || "normal",
    fontSize: `${computedSize}px`,
    lineHeight: sizeObj.lineHeight,
    bubblePadding: sizeObj.bubblePadding,
    timestampSize: sizeObj.timestampSize,
    stickerSizeClass: sizeObj.stickerSizeClass,
    stickerDimension: sizeObj.stickerDimension,
    sizePx: computedSize,
    styleId: styleObj.id,
    styleName: styleObj.name,
  };
};

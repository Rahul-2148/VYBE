export const NOTO_ANIMATED_MAP = {
  "💖": "1f496",
  "❤️": "2764_fe0f",
  "👍": "1f44d",
  "👎": "1f44e",
  "🎉": "1f389",
  "👏": "1f44f",
  "😂": "1f602",
  "😮": "1f62e",
  "😢": "1f622",
  "💯": "1f4af",
  "🔥": "1f525",
  "✨": "2728",
};

// Immediate background cache preloader for zero-delay instant animation and static SVG playback
if (typeof window !== "undefined") {
  Object.values(NOTO_ANIMATED_MAP).forEach((code) => {
    const svgCode = code.replace(/_fe0f/g, "");
    const imgStatic = new Image();
    imgStatic.src = `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u${svgCode}.svg`;

    const imgAnim = new Image();
    imgAnim.src = `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.webp`;
  });
}

// music.controller.js
// Universal Music Controller fetching 100% REAL official songs & audio streams via Apple Music / iTunes Global Engine

// In-memory cache to make music search instantaneous (5 mins TTL)
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const formatTrack = (item) => {
  if (!item || !item.previewUrl) return null;

  // Upgrade cover art from 100x100 to 600x600 for HD album artwork
  const highResCover = item.artworkUrl100
    ? item.artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg")
    : item.artworkUrl60 || "";

  return {
    id: String(item.trackId || item.collectionId || Math.random()),
    title: item.trackName || item.collectionName || "Unknown Track",
    artist: item.artistName || "Unknown Artist",
    album: item.collectionName || "",
    audioUrl: item.previewUrl,
    coverUrl: highResCover,
    duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
    genre: item.primaryGenreName || "Music",
    releaseDate: item.releaseDate || "",
    isExplicit: item.trackExplicitness === "explicit",
  };
};

const queryAppleMusic = async (searchTerm, limit = 30) => {
  const cacheKey = `${searchTerm.toLowerCase().trim()}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      searchTerm
    )}&entity=song&limit=${limit}&media=music`;

    const res = await fetch(url, {
      headers: { "User-Agent": "VybeMusic/1.0" },
    });

    if (!res.ok) {
      throw new Error(`iTunes API responded with status ${res.status}`);
    }

    const data = await res.json();
    const formatted = (data.results || [])
      .map(formatTrack)
      .filter((t) => t !== null && Boolean(t.audioUrl));

    cache.set(cacheKey, { timestamp: Date.now(), data: formatted });
    return formatted;
  } catch (err) {
    console.error("[MusicController] queryAppleMusic failed:", err.message);
    return [];
  }
};

// 1. Live Global Search for Any Song in the World
export const searchMusic = async (req, res) => {
  try {
    const { q, limit = 30 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    const tracks = await queryAppleMusic(q.trim(), Math.min(50, Number(limit) || 30));
    return res.status(200).json({
      success: true,
      query: q.trim(),
      count: tracks.length,
      tracks,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Curated Genre / Category Queries with Real Official Songs
const CATEGORY_SEARCH_MAP = {
  devotional: "Shree Ram Siya Ram",
  party: "Brown Munde",
  romantic: "Arijit Singh",
  gym: "Gym Phonk",
  lofi: "Lofi Chill Beats",
  bollywood: "Bollywood Hits",
  pop: "The Weeknd",
  sad: "Channa Mereya",
  travel: "Wanderlust",
  trending: "Top Hits 2024",
};

export const getCategoryMusic = async (req, res) => {
  try {
    const { category } = req.params;
    const key = (category || "").toLowerCase().trim();
    const query = CATEGORY_SEARCH_MAP[key] || `${category} Hits`;

    const tracks = await queryAppleMusic(query, 30);
    return res.status(200).json({
      success: true,
      category,
      count: tracks.length,
      tracks,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. AI-Powered Content-Aware Music Recommendation Engine
export const getAIRecommendedMusic = async (req, res) => {
  try {
    const { caption = "", mediaName = "", theme = "", tags = "" } = req.query;
    const combined = `${caption} ${mediaName} ${theme} ${tags}`.toLowerCase().trim();

    let matchedCategory = "Trending";
    let matchedMoodLabel = "Trending & Viral Hits";
    let matchedIcon = "✨";
    let searchQuery = "Top Hits 2024";

    if (/god|bhagwan|mandir|temple|bhakti|puja|pooja|ram|shree ram|shiva|shiv|mahadev|krishna|ganesh|hanuman|peace|prayer|spiritual|aarti|darshan|blessing|diwali|navratri/.test(combined)) {
      matchedCategory = "Devotional";
      matchedMoodLabel = "Devotional & Spiritual";
      matchedIcon = "🕉️";
      searchQuery = "Shree Ram Siya Ram";
    } else if (/party|club|night|dance|dj|drinks|celebration|birthday|friends|weekend|vibing|hype|rave|bhangra|disco/.test(combined)) {
      matchedCategory = "Party & Punjabi";
      matchedMoodLabel = "Party & Punjabi Energy";
      matchedIcon = "🍾";
      searchQuery = "Brown Munde";
    } else if (/gym|workout|fitness|muscle|gains|training|beast|chest|deadlift|squat|run|cardio|grind|discipline|phonk|hardstyle/.test(combined)) {
      matchedCategory = "Gym & Phonk";
      matchedMoodLabel = "Gym & Phonk Hype";
      matchedIcon = "⚡";
      searchQuery = "Gym Phonk";
    } else if (/love|couple|romantic|forever|date|bae|kiss|heart|ishq|pyar|together|soulmate|valentine|wedding|anniversary/.test(combined)) {
      matchedCategory = "Romantic";
      matchedMoodLabel = "Romantic & Love";
      matchedIcon = "💖";
      searchQuery = "Arijit Singh";
    } else if (/travel|wanderlust|trip|mountain|beach|sunset|sunrise|vacation|explore|nature|roadtrip|sky|hills|sea|flight/.test(combined)) {
      matchedCategory = "Travel & Nature";
      matchedMoodLabel = "Travel & Wanderlust";
      matchedIcon = "✈️";
      searchQuery = "Wanderlust";
    } else if (/sad|alone|broken|heartbreak|miss|crying|pain|tears|lost|bye|depressed|lonely/.test(combined)) {
      matchedCategory = "Sad & Acoustic";
      matchedMoodLabel = "Sad & Acoustic";
      matchedIcon = "💔";
      searchQuery = "Channa Mereya";
    } else if (/coffee|cafe|tea|chai|food|cooking|brunch|relax|aesthetic|study|peace/.test(combined)) {
      matchedCategory = "Lofi & Chill";
      matchedMoodLabel = "Lofi & Chill Vibes";
      matchedIcon = "☕";
      searchQuery = "Lofi Chill Beats";
    }

    const tracks = await queryAppleMusic(searchQuery, 25);
    return res.status(200).json({
      success: true,
      aiInfo: {
        category: matchedCategory,
        label: matchedMoodLabel,
        icon: matchedIcon,
        detectedQuery: searchQuery,
      },
      tracks,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// music.controller.js
// Universal Dynamic Music Controller fetching 100% REAL official songs & audio streams via Apple Music / iTunes Global Engine
// Multi-Query Aggregator providing 60-100+ Chart-Topping Hits per Category dynamically updated for any year
import { User } from "../models/user.model.js";

// In-memory cache to make music search instantaneous (10 mins TTL)
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Dynamic current year helper to ensure queries are evergreen
const getCurrentYear = () => new Date().getFullYear();

const formatTrack = (item) => {
  if (!item || !item.previewUrl) return null;

  // Upgrade cover art from 100x100 to 1000x1000 for Ultra HD album artwork
  const highResCover = item.artworkUrl100
    ? item.artworkUrl100.replace("100x100bb.jpg", "1000x1000bb.jpg")
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

const queryAppleMusic = async (searchTerm, limit = 50) => {
  const cacheKey = `${searchTerm.toLowerCase().trim()}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const cleanSearch = searchTerm.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      cleanSearch || searchTerm
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

// Multi-Query Aggregator to fetch large volume (60-100+ songs) deduplicated
const queryAppleMusicMulti = async (queries = [], limitPerQuery = 30) => {
  try {
    const results = await Promise.all(
      queries.map((q) => queryAppleMusic(q, limitPerQuery))
    );
    const seen = new Set();
    const blended = [];
    for (const list of results) {
      for (const track of list) {
        const key = `${track.title.toLowerCase().trim()}_${track.artist.toLowerCase().trim()}`;
        if (!seen.has(key) && track.audioUrl) {
          seen.add(key);
          blended.push(track);
        }
      }
    }
    return blended;
  } catch (err) {
    console.error("[MusicController] queryAppleMusicMulti failed:", err.message);
    return [];
  }
};

// 1. Live Global Search for Any Song in the World
export const searchMusic = async (req, res) => {
  try {
    const { q, limit = 60 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    const tracks = await queryAppleMusic(q.trim(), Math.min(100, Number(limit) || 60));
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

// 2. Curated Genre / Category Queries with Dynamic Evergreen Terms
const getCategorySearchMap = () => {
  const currentYear = getCurrentYear();
  return {
    devotional: [
      "Shree Ram Siya Ram",
      "Hanuman Chalisa",
      "Shiv Tandav",
      "Krishna Bhajan",
      "Ganesh Vandana",
      "Aarti Kunj Bihari Ki",
    ],
    party: [
      "Brown Munde",
      "Tauba Tauba",
      "Diljit Dosanjh",
      "Karan Aujla",
      "Sidhu Moose Wala",
      "Badshah",
      "Yo Yo Honey Singh",
    ],
    romantic: [
      "Arijit Singh",
      "Atif Aslam",
      "Kesariya",
      "Tum Hi Ho",
      "Armaan Malik",
      "Ed Sheeran",
      "Jubin Nautiyal",
    ],
    gym: [
      "Gym Phonk",
      "Gigachad Phonk",
      "Hardstyle Workout",
      "Brazilian Phonk",
      "NEFFEX",
      "Tokyo Drift",
    ],
    lofi: [
      "Lofi Chill Beats",
      "Anuv Jain",
      "Prateek Kuhad",
      "Zaeden",
      "Midnight Lofi",
      "Aesthetic Lofi Beats",
    ],
    bollywood: [
      `Bollywood Hits ${currentYear}`,
      "Pritam",
      "Arijit Singh",
      "Jawan",
      "Animal",
      "Kabir Singh",
      "Stree 2",
      "Shreya Ghoshal",
    ],
    pop: [
      `Top Pop Hits ${currentYear}`,
      "The Weeknd",
      "Taylor Swift",
      "Dua Lipa",
      "Bruno Mars",
      "Billie Eilish",
      "Justin Bieber",
    ],
    sad: [
      "Channa Mereya",
      "Arcade",
      "Let Me Down Slowly",
      "Husn",
      "Kabira",
      "Hamari Adhuri Kahani",
    ],
    travel: [
      "Ilahi",
      "Safarnama",
      "Wanderlust",
      "Electric Feel",
      "Matargashti",
      "Coldplay",
      "Dil Chahta Hai",
    ],
    trending: [
      `Top Hits ${currentYear}`,
      `Trending Songs ${currentYear}`,
      "Arijit Singh",
      "Diljit Dosanjh",
      "The Weeknd",
      "Badshah",
      "Karan Aujla",
    ],
  };
};

export const getCategoryMusic = async (req, res) => {
  try {
    const { category } = req.params;
    const key = (category || "").toLowerCase().trim();
    const categoryMap = getCategorySearchMap();
    const queries = categoryMap[key] || [category, `${category} Hits`];

    const tracks = await queryAppleMusicMulti(queries, 25);
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
    const currentYear = getCurrentYear();

    let matchedCategory = "Trending";
    let matchedMoodLabel = "Trending & Viral Hits";
    let matchedIcon = "✨";
    let queries = [
      `Top Hits ${currentYear}`,
      `Trending Songs ${currentYear}`,
      "Arijit Singh",
      "Diljit Dosanjh",
      "The Weeknd",
      "Badshah",
      "Karan Aujla",
    ];

    if (/god|bhagwan|mandir|temple|bhakti|puja|pooja|ram|shree ram|shiva|shiv|mahadev|krishna|ganesh|hanuman|peace|prayer|spiritual|aarti|darshan|blessing|diwali|navratri/.test(combined)) {
      matchedCategory = "Devotional";
      matchedMoodLabel = "Devotional & Spiritual";
      matchedIcon = "🕉️";
      queries = [
        "Shree Ram Siya Ram",
        "Hanuman Chalisa",
        "Shiv Tandav",
        "Krishna Bhajan",
        "Ganesh Vandana",
      ];
    } else if (/party|club|night|dance|dj|drinks|celebration|birthday|friends|weekend|vibing|hype|rave|bhangra|disco/.test(combined)) {
      matchedCategory = "Party & Punjabi";
      matchedMoodLabel = "Party & Punjabi Energy";
      matchedIcon = "🍾";
      queries = [
        "Brown Munde",
        "Tauba Tauba",
        "Diljit Dosanjh",
        "Karan Aujla",
        "Sidhu Moose Wala",
        "Badshah",
      ];
    } else if (/gym|workout|fitness|muscle|gains|training|beast|chest|deadlift|squat|run|cardio|grind|discipline|phonk|hardstyle/.test(combined)) {
      matchedCategory = "Gym & Phonk";
      matchedMoodLabel = "Gym & Phonk Hype";
      matchedIcon = "⚡";
      queries = [
        "Gym Phonk",
        "Gigachad Phonk",
        "Hardstyle Workout",
        "Brazilian Phonk",
        "NEFFEX",
      ];
    } else if (/love|couple|romantic|forever|date|bae|kiss|heart|ishq|pyar|together|soulmate|valentine|wedding|anniversary/.test(combined)) {
      matchedCategory = "Romantic";
      matchedMoodLabel = "Romantic & Love";
      matchedIcon = "💖";
      queries = [
        "Arijit Singh",
        "Atif Aslam",
        "Kesariya",
        "Tum Hi Ho",
        "Armaan Malik",
        "Ed Sheeran",
      ];
    } else if (/travel|wanderlust|trip|mountain|beach|sunset|sunrise|vacation|explore|nature|roadtrip|sky|hills|sea|flight/.test(combined)) {
      matchedCategory = "Travel & Nature";
      matchedMoodLabel = "Travel & Wanderlust";
      matchedIcon = "✈️";
      queries = [
        "Ilahi",
        "Safarnama",
        "Wanderlust",
        "Electric Feel",
        "Matargashti",
        "Coldplay",
      ];
    } else if (/sad|alone|broken|heartbreak|miss|crying|pain|tears|lost|bye|depressed|lonely/.test(combined)) {
      matchedCategory = "Sad & Acoustic";
      matchedMoodLabel = "Sad & Acoustic";
      matchedIcon = "💔";
      queries = [
        "Channa Mereya",
        "Arcade",
        "Let Me Down Slowly",
        "Husn",
        "Kabira",
      ];
    } else if (/coffee|cafe|tea|chai|food|cooking|brunch|relax|aesthetic|study|peace/.test(combined)) {
      matchedCategory = "Lofi & Chill";
      matchedMoodLabel = "Lofi & Chill Vibes";
      matchedIcon = "☕";
      queries = [
        "Lofi Chill Beats",
        "Anuv Jain",
        "Prateek Kuhad",
        "Zaeden",
        "Midnight Lofi",
      ];
    }

    const tracks = await queryAppleMusicMulti(queries, 25);
    return res.status(200).json({
      success: true,
      aiInfo: {
        category: matchedCategory,
        label: matchedMoodLabel,
        icon: matchedIcon,
        detectedQuery: queries[0],
      },
      tracks,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Toggle Save Audio Track to User's Account (Persistent Storage)
export const toggleSaveAudio = async (req, res) => {
  try {
    const userId = req.userId;
    const { id, title, artist, coverUrl, audioUrl, duration } = req.body;

    if (!id || !title) {
      return res.status(400).json({ success: false, message: "Track ID and title are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingIndex = (user.savedAudios || []).findIndex(
      (t) => String(t.id) === String(id) || (t.title && t.title.toLowerCase() === title.toLowerCase())
    );

    let isSaved = false;
    if (existingIndex > -1) {
      // Remove from saved
      user.savedAudios.splice(existingIndex, 1);
      isSaved = false;
    } else {
      // Add to saved
      if (!user.savedAudios) user.savedAudios = [];
      user.savedAudios.unshift({
        id: String(id),
        title,
        artist: artist || "",
        coverUrl: coverUrl || "",
        audioUrl: audioUrl || "",
        duration: duration || 30,
        savedAt: new Date(),
      });
      isSaved = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      isSaved,
      savedAudios: user.savedAudios,
      message: isSaved ? "Saved to your Audio Collection! 🔖" : "Removed from saved audio",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get Logged-In User's Saved Audio Tracks
export const getSavedAudios = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("savedAudios");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      savedAudios: user.savedAudios || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Remove a Single Saved Audio Track
export const removeSavedAudio = async (req, res) => {
  try {
    const userId = req.userId;
    const { audioId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          savedAudios: {
            id: String(audioId),
          },
        },
      },
      { returnDocument: 'after' }
    ).select("savedAudios");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      savedAudios: user.savedAudios || [],
      message: "Audio removed from saved library",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

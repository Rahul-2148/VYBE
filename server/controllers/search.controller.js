import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Reel } from "../models/reel.model.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";
import { getExcludedAuthorIdsForFeed } from "../utils/feedPrivacyHelper.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1. Universal Search (Users & Hashtags)
export const searchAll = async (req, res) => {
  try {
    const q = req.query.q || req.query.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, users: [], hashtags: [], locations: [] });
    }

    const query = q.trim().replace(/^#/, "");
    const safeRegex = escapeRegex(query);
    const blockedUserIds = await getBlockedUserIds(req.userId);

    // Search Users (excluding blocked/blocking users)
    const users = await User.find({
      _id: { $nin: blockedUserIds },
      $or: [
        { userName: { $regex: safeRegex, $options: "i" } },
        { name: { $regex: safeRegex, $options: "i" } },
      ],
    })
      .select("name userName profileImage followers isVerified")
      .limit(10);

    // Search Hashtags in Posts (excluding blocked/blocking authors)
    const hashtagPosts = await Post.find({
      author: { $nin: blockedUserIds },
      hashtags: { $regex: safeRegex, $options: "i" },
      isArchived: { $ne: true },
    }).select("hashtags");

    const tagCounts = {};
    hashtagPosts.forEach((post) => {
      post.hashtags?.forEach((tag) => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          const clean = tag.replace("#", "");
          tagCounts[clean] = (tagCounts[clean] || 0) + 1;
        }
      });
    });

    const hashtags = Object.keys(tagCounts).map((tag) => ({
      name: tag,
      count: tagCounts[tag],
    }));

    // Search Locations in Posts & Reels
    const locationPosts = await Post.find({
      author: { $nin: blockedUserIds },
      location: { $regex: safeRegex, $options: "i" },
      isArchived: { $ne: true },
    }).select("location");

    const locationCounts = {};
    locationPosts.forEach((post) => {
      if (post.location && post.location.toLowerCase().includes(query.toLowerCase())) {
        const clean = post.location.trim();
        locationCounts[clean] = (locationCounts[clean] || 0) + 1;
      }
    });

    const places = Object.keys(locationCounts).map((loc) => ({
      name: loc,
      count: locationCounts[loc],
    }));

    return res.status(200).json({
      success: true,
      users,
      hashtags,
      places,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `searchAll error: ${error.message}` });
  }
};

// 2. Algorithmic Explore Feed (Posts & Reels combined)
export const CATEGORY_KEYWORDS = {
  style: ["style", "fashion", "clothing", "dress", "outfit", "makeup", "lookbook", "wear", "shoes", "designer", "apparel", "wardrobe"],
  tech: ["tech", "technology", "coding", "programmer", "computer", "phone", "developer", "software", "app", "gadget", "ai", "artificial intelligence", "science", "robot", "web", "react", "node"],
  travel: ["travel", "trip", "adventure", "wanderlust", "nature", "tourist", "destination", "explore", "vacation", "flight", "hotel", "beach", "journey"],
  fitness: ["fitness", "gym", "workout", "exercise", "health", "runner", "bodybuilding", "athlete", "training", "yoga", "muscle", "healthy"],
  food: ["food", "recipe", "cooking", "delicious", "eating", "yum", "restaurant", "chef", "bake", "breakfast", "dinner", "dish", "cuisine", "tasty"],
  art: ["art", "painting", "sketch", "drawing", "craft", "artist", "creative", "design", "illustrator", "museum", "gallery", "sculpture", "canvas"],
  music: ["music", "song", "singer", "dance", "instrument", "album", "concert", "lyrics", "guitar", "piano", "beats", "melody", "tune"],
  nature: ["nature", "garden", "forest", "river", "sunset", "landscape", "flower", "sky", "outdoors", "mountain", "lake", "tree", "sea"],
  beauty: ["beauty", "makeup", "cosmetics", "skincare", "hair", "lips", "glow", "aesthetic", "salon", "eyeliner", "lipstick"],
  comedy: ["comedy", "funny", "joke", "meme", "humor", "laugh", "prank", "hilarious", "lol", "fun", "comedian", "sarcastic"],
};

export const getExploreFeed = async (req, res) => {
  try {
    const { category } = req.query;
    const excludedAuthorIds = await getExcludedAuthorIdsForFeed(req.userId);

    let filter = { isArchived: { $ne: true }, author: { $nin: excludedAuthorIds } };
    let reelsFilter = { author: { $nin: excludedAuthorIds } };

    if (category && category !== "all") {
      const keywords = CATEGORY_KEYWORDS[category.toLowerCase()];
      if (keywords && keywords.length > 0) {
        const keywordRegex = new RegExp(keywords.join("|"), "i");

        // Find matching creators (excluding blocked & private un-followed)
        const matchingUserIds = await User.find({
          _id: { $nin: excludedAuthorIds },
          $or: [
            { category: { $regex: keywordRegex } },
            { profession: { $regex: keywordRegex } },
            { bio: { $regex: keywordRegex } },
            { name: { $regex: keywordRegex } }
          ]
        }).distinct("_id");

        filter.$or = [
          { hashtags: { $in: keywords.map(kw => new RegExp(kw, "i")) } },
          { caption: { $regex: keywordRegex } },
          { author: { $in: matchingUserIds } }
        ];

        reelsFilter.$or = [
          { hashtags: { $in: keywords.map(kw => new RegExp(kw, "i")) } },
          { caption: { $regex: keywordRegex } },
          { author: { $in: matchingUserIds } }
        ];
      }
    }

    const rawPosts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified accountType professionalType")
      .limit(30)
      .lean();

    const rawReels = await Reel.find(reelsFilter)
      .sort({ score: -1, createdAt: -1 })
      .populate("author", "name userName profileImage isVerified accountType professionalType")
      .limit(20)
      .lean();

    const posts = rawPosts.filter(p => p && p.author);
    const reels = rawReels.filter(r => r && r.author);

    return res.status(200).json({
      success: true,
      posts,
      reels,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getExploreFeed error: ${error.message}` });
  }
};

// 3. Hashtag Aggregation Page Details
export const getHashtagDetails = async (req, res) => {
  try {
    const { hashtag } = req.params;
    const cleanTag = decodeURIComponent(hashtag).replace(/^#/, "").trim().toLowerCase();
    const blockedUserIds = await getBlockedUserIds(req.userId);
    const tagRegex = new RegExp(`(^|\\s|#)${cleanTag}(\\b|\\s|$)`, "i");

    const posts = await Post.find({
      author: { $nin: blockedUserIds },
      $or: [
        { hashtags: { $regex: cleanTag, $options: "i" } },
        { caption: { $regex: tagRegex } }
      ],
      isArchived: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified");

    const reels = await Reel.find({
      author: { $nin: blockedUserIds },
      $or: [
        { hashtags: { $regex: cleanTag, $options: "i" } },
        { caption: { $regex: tagRegex } }
      ],
    })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified");

    const combinedContent = [
      ...posts.map(p => ({ ...p.toObject(), contentType: "post" })),
      ...reels.map(r => ({ ...r.toObject(), contentType: "reel", mediaType: "video" }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const user = await User.findById(req.userId);
    const isFollowing = user?.followedHashtags?.includes(cleanTag) || false;

    return res.status(200).json({
      success: true,
      hashtag: cleanTag,
      postCount: combinedContent.length,
      isFollowing,
      posts: combinedContent,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getHashtagDetails error: ${error.message}` });
  }
};

// 4. Toggle Follow Hashtag
export const toggleFollowHashtag = async (req, res) => {
  try {
    const { hashtag } = req.params;
    const cleanTag = hashtag.replace("#", "").toLowerCase();
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const isFollowing = user.followedHashtags.includes(cleanTag);
    if (isFollowing) {
      await User.findByIdAndUpdate(req.userId, { $pull: { followedHashtags: cleanTag } });
    } else {
      await User.findByIdAndUpdate(req.userId, { $addToSet: { followedHashtags: cleanTag } });
    }

    return res.status(200).json({
      success: true,
      isFollowing: !isFollowing,
      message: !isFollowing ? `Following #${cleanTag}` : `Unfollowed #${cleanTag}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `toggleFollowHashtag error: ${error.message}` });
  }
};

// 5. Manage Search History
export const addSearchHistory = async (req, res) => {
  try {
    const { targetUserId, targetTag } = req.body;
    
    // First, pull the existing item matching the criteria to avoid duplication
    const pullFilter = targetUserId
      ? { targetUser: targetUserId }
      : { targetTag: { $regex: new RegExp("^" + escapeRegex(targetTag) + "$", "i") } };
      
    await User.findByIdAndUpdate(req.userId, {
      $pull: { searchHistory: pullFilter }
    });

    const freshItem = {
      targetUser: targetUserId || null,
      targetTag: targetTag || null,
      searchedAt: new Date()
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        $push: {
          searchHistory: {
            $each: [freshItem],
            $position: 0,
            $slice: 20
          }
        }
      },
      { returnDocument: 'after' }
    ).populate("searchHistory.targetUser", "name userName profileImage isVerified");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ success: true, searchHistory: updatedUser.searchHistory });
  } catch (error) {
    return res.status(500).json({ success: false, message: `addSearchHistory error: ${error.message}` });
  }
};

export const clearSearchHistory = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $set: { searchHistory: [] } });
    return res.status(200).json({ success: true, message: "Search history cleared" });
  } catch (error) {
    return res.status(500).json({ success: false, message: `clearSearchHistory error: ${error.message}` });
  }
};

export const getSearchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate("searchHistory.targetUser", "name userName profileImage isVerified");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ success: true, searchHistory: user.searchHistory });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getSearchHistory error: ${error.message}` });
  }
};

export const removeSearchHistoryItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    await User.findByIdAndUpdate(req.userId, {
      $pull: { searchHistory: { _id: itemId } }
    });
    return res.status(200).json({ success: true, message: "History item removed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: `removeSearchHistoryItem error: ${error.message}` });
  }
};

// 7. Search Places / Locations Endpoint
export const searchPlaces = async (req, res) => {
  try {
    const { q } = req.query;
    const query = (q || "").trim();
    const blockedUserIds = await getBlockedUserIds(req.userId);

    let filter = {
      author: { $nin: blockedUserIds },
      location: { $exists: true, $ne: "" },
      isArchived: { $ne: true },
    };

    if (query) {
      filter.location = { $regex: escapeRegex(query), $options: "i" };
    }

    const posts = await Post.find(filter).select("location media createdAt").limit(100);
    const reels = await Reel.find({
      author: { $nin: blockedUserIds },
      location: query ? { $regex: escapeRegex(query), $options: "i" } : { $exists: true, $ne: "" },
    }).select("location media").limit(100);

    const placeMap = {};
    [...posts, ...reels].forEach((item) => {
      if (item.location) {
        const loc = item.location.trim();
        if (!placeMap[loc]) {
          placeMap[loc] = {
            name: loc,
            title: loc.split(",")[0] || loc,
            subtitle: loc.split(",").slice(1).join(", ").trim(),
            count: 0,
            thumbnail: item.media?.url || (Array.isArray(item.media) ? item.media[0]?.url : null) || "",
          };
        }
        placeMap[loc].count += 1;
      }
    });

    const places = Object.values(placeMap).sort((a, b) => b.count - a.count);

    return res.status(200).json({
      success: true,
      places,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `searchPlaces error: ${error.message}` });
  }
};

// 8. Get location posts/reels details
export const getLocationDetails = async (req, res) => {
  try {
    const { locationName } = req.params;
    if (!locationName) {
      return res.status(400).json({ success: false, message: "Location name is required" });
    }

    const cleanLocation = decodeURIComponent(locationName).trim();
    const regex = new RegExp(escapeRegex(cleanLocation), "i");
    const blockedUserIds = await getBlockedUserIds(req.userId);

    const posts = await Post.find({
      author: { $nin: blockedUserIds },
      location: regex,
      isArchived: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified");

    const reels = await Reel.find({
      author: { $nin: blockedUserIds },
      location: regex,
    })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage isVerified");

    // Top posts sorted by likes count
    const topPosts = [...posts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).slice(0, 9);

    // Extract unique creator avatars
    const creatorMap = new Map();
    [...posts, ...reels].forEach((item) => {
      if (item.author?._id && !creatorMap.has(item.author._id.toString())) {
        creatorMap.set(item.author._id.toString(), {
          _id: item.author._id,
          userName: item.author.userName,
          name: item.author.name,
          profileImage: item.author.profileImage,
        });
      }
    });

    const creators = Array.from(creatorMap.values()).slice(0, 8);

    return res.status(200).json({
      success: true,
      location: cleanLocation,
      postCount: posts.length,
      reelCount: reels.length,
      creatorsCount: creators.length,
      creators,
      topPosts,
      posts,
      reels,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getLocationDetails error: ${error.message}` });
  }
};

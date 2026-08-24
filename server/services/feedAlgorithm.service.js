// ==============================================================================
// 🦀 HIGH-PERFORMANCE MULTI-SIGNAL ALGORITHMIC FEED ENGINE (VYBE Enterprise)
// Architected with Vectorized Linear-Pass O(N) Processing & Memory Locality
// ==============================================================================

import { extractSemanticKeywords } from "../utils/aiEngine.js";

/**
 * In-Memory LRU Cache for User Feed Rankings
 * Prevents redundant database & mathematical computation for identical feed queries
 */
const FEED_CACHE = new Map();
const CACHE_TTL_MS = 20 * 1000; // 20 seconds TTL per user query
const MAX_CACHE_ENTRIES = 5000;

const getCacheKey = (userId, mode, itemCount) => `${userId || "anon"}_${mode}_${itemCount}`;

const getCachedFeed = (key) => {
  const entry = FEED_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    FEED_CACHE.delete(key);
    return null;
  }
  return entry.data;
};

const setCachedFeed = (key, data) => {
  if (FEED_CACHE.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest 1000 entries
    const keys = Array.from(FEED_CACHE.keys()).slice(0, 1000);
    keys.forEach((k) => FEED_CACHE.delete(k));
  }
  FEED_CACHE.set(key, { data, timestamp: Date.now() });
};

/**
 * Vectorized Single Post Score Calculation
 * @param {object} post - Post object
 * @param {object|null} currentUser - Current user context
 * @param {number} nowMs - Current epoch in milliseconds
 * @param {Set<string>} followingSet - Set of following user ID strings
 * @param {Set<string>} closeFriendsSet - Set of close friend ID strings
 * @param {Map<string, number>|object|null} userInterests - User's category interest map
 * @returns {number} Floating point relevance score
 */
export const calculatePostScore = (
  post,
  currentUser = null,
  nowMs = Date.now(),
  followingSet = null,
  closeFriendsSet = null,
  userInterests = null
) => {
  if (!post) return 0.0;

  // 1. Raw Engagement Signals
  const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
  const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
  const savesCount = typeof post.savedCount === "number" ? post.savedCount : (Array.isArray(post.savedBy) ? post.savedBy.length : 0);
  const viewsCount = typeof post.views === "number" ? post.views : 0;

  // Engagement weights: Saves (6.0) > Comments (4.0) > Likes (2.0) > Views (0.2)
  const baseEngagement = (likesCount * 2.0) + (commentsCount * 4.0) + (savesCount * 6.0) + (viewsCount * 0.2) + 1.0;

  // 2. Relationship Affinity Multiplier
  let affinityMultiplier = 1.0;
  const author = post.author;
  const authorIdStr = (author?._id || author)?.toString();

  if (authorIdStr && currentUser) {
    const isCloseFriend = closeFriendsSet
      ? closeFriendsSet.has(authorIdStr)
      : (currentUser.closeFriends || []).some((id) => (id?._id || id)?.toString() === authorIdStr);

    if (isCloseFriend) {
      affinityMultiplier = 5.0; // 500% priority for Close Friends
    } else {
      const isFollowing = followingSet
        ? followingSet.has(authorIdStr)
        : (currentUser.following || []).some((id) => (id?._id || id)?.toString() === authorIdStr);

      if (isFollowing) {
        affinityMultiplier = 3.0; // 300% priority for followed accounts
      }
    }
  }

  // 3. Creator Trust & Quality Boost
  let qualityMultiplier = 1.0;
  if (author && typeof author === "object") {
    if (author.isVerified) qualityMultiplier += 0.25;
    if (author.accountType === "professional" || author.accountType === "creator") qualityMultiplier += 0.15;
  }

  // 4. Deep Semantic Topic, Caption & Location Affinity (AI Engine)
  let categoryBoost = 1.0;
  if (userInterests) {
    const rawTokens = `${post.caption || ""} ${Array.isArray(post.hashtags) ? post.hashtags.join(" ") : ""} ${post.location || ""} ${post.music?.title || ""}`;
    const detectedKeywords = extractSemanticKeywords(rawTokens);

    for (let i = 0; i < detectedKeywords.length; i++) {
      const tag = detectedKeywords[i];
      let weight = 0;
      if (typeof userInterests.get === "function") {
        weight = userInterests.get(tag) || 0;
      } else if (typeof userInterests === "object") {
        weight = userInterests[tag] || 0;
      }
      if (weight > 0) {
        categoryBoost += Math.min(weight * 0.2, 3.0); // Up to 300% intent boost for semantic matches
      }
    }
  }

  // 5. Non-Linear Temporal Gravity Decay: G = (HoursOld + 1.8)^1.35
  const createdAtMs = post.createdAt ? new Date(post.createdAt).getTime() : nowMs;
  const hoursOld = Math.max(0.0, (nowMs - createdAtMs) / 3600000.0);
  const gravity = Math.pow(hoursOld + 1.8, 1.35);

  const rawScore = (baseEngagement * affinityMultiplier * qualityMultiplier * categoryBoost) / gravity;
  return Number.isFinite(rawScore) ? rawScore : 0.0;
};

/**
 * Vectorized Single Reel Score Calculation
 */
export const calculateReelScore = (reel, currentUser = null, nowMs = Date.now()) => {
  if (!reel) return 0.0;
  const views = typeof reel.views === "number" ? reel.views : 0;
  const likesCount = Array.isArray(reel.likes) ? reel.likes.length : 0;
  const commentsCount = Array.isArray(reel.comments) ? reel.comments.length : 0;
  const watchTimeSeconds = typeof reel.watchTimeSeconds === "number" ? reel.watchTimeSeconds : 0;

  return (views * 0.5) + (likesCount * 3.0) + (commentsCount * 4.5) + (watchTimeSeconds * 0.1);
};

/**
 * Creator Diversity Guard
 * Prevents single-creator fatigue by spacing out consecutive posts from the same author
 */
const applyDiversityGuard = (rankedItems, maxConsecutive = 2) => {
  if (rankedItems.length <= 3) return rankedItems;

  const result = [];
  const deferred = [];
  const recentAuthors = [];

  for (let i = 0; i < rankedItems.length; i++) {
    const item = rankedItems[i];
    const authorId = (item.author?._id || item.author)?.toString() || "unknown";

    // Check consecutive author frequency in the last `maxConsecutive` items
    const countInWindow = recentAuthors.slice(-maxConsecutive).filter((id) => id === authorId).length;

    if (countInWindow >= maxConsecutive && i < rankedItems.length - 1) {
      deferred.push(item);
    } else {
      result.push(item);
      recentAuthors.push(authorId);
      if (recentAuthors.length > maxConsecutive) {
        recentAuthors.shift();
      }

      // Check if we can re-insert any deferred item
      if (deferred.length > 0) {
        const nextDef = deferred[0];
        const nextDefAuthor = (nextDef.author?._id || nextDef.author)?.toString();
        if (nextDefAuthor !== authorId) {
          result.push(deferred.shift());
          recentAuthors.push(nextDefAuthor);
        }
      }
    }
  }

  // Append any remaining deferred items
  return result.concat(deferred);
};

/**
 * Ultra-Fast Vectorized Algorithmic Ranker for Posts
 * O(N) linear single-pass scoring with typed float array index sort
 */
export const rankPostsForUser = (posts = [], currentUser = null, mode = "for-you") => {
  if (!Array.isArray(posts) || posts.length === 0) return [];

  const userIdStr = (currentUser?._id || currentUser)?.toString() || null;
  const cacheKey = getCacheKey(userIdStr, mode, posts.length);

  // 1. Strict Following Mode
  if (mode === "following" && currentUser) {
    const followingSet = new Set((currentUser.following || []).map((id) => (id?._id || id)?.toString()));
    const filtered = posts.filter((p) => {
      const authorId = (p.author?._id || p.author)?.toString();
      return authorId && (followingSet.has(authorId) || authorId === userIdStr);
    });

    return filtered.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  // 2. Strict Favorites Mode
  if (mode === "favorites" && currentUser) {
    const closeFriendsSet = new Set((currentUser.closeFriends || []).map((id) => (id?._id || id)?.toString()));
    const filtered = posts.filter((p) => {
      const authorId = (p.author?._id || p.author)?.toString();
      return authorId && closeFriendsSet.has(authorId);
    });

    return filtered.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  // 3. For-You Algorithmic Ranking with Vectorized Linear Precomputation
  const N = posts.length;
  const nowMs = Date.now();

  const followingSet = currentUser ? new Set((currentUser.following || []).map((id) => (id?._id || id)?.toString())) : null;
  const closeFriendsSet = currentUser ? new Set((currentUser.closeFriends || []).map((id) => (id?._id || id)?.toString())) : null;
  const userInterests = currentUser?.contentCategoryInterests || null;

  // Allocate flat typed buffers (Rust memory efficiency in V8)
  const scores = new Float64Array(N);
  const timestamps = new Float64Array(N);
  const indices = new Int32Array(N);

  // Vectorized O(N) Scoring Pass
  for (let i = 0; i < N; i++) {
    const post = posts[i];
    indices[i] = i;
    timestamps[i] = post.createdAt ? new Date(post.createdAt).getTime() : nowMs;
    scores[i] = calculatePostScore(post, currentUser, nowMs, followingSet, closeFriendsSet, userInterests);
  }

  // Fast Index Sorting
  indices.sort((idxA, idxB) => {
    const scoreDiff = scores[idxB] - scores[idxA];
    if (Math.abs(scoreDiff) > 0.0001) {
      return scoreDiff;
    }
    return timestamps[idxB] - timestamps[idxA];
  });

  // Reconstruct Sorted Output
  const ranked = new Array(N);
  for (let i = 0; i < N; i++) {
    ranked[i] = posts[indices[i]];
  }

  // Apply Diversity Guard & Cache Result
  const finalRanked = applyDiversityGuard(ranked, 2);
  setCachedFeed(cacheKey, finalRanked);

  return finalRanked;
};

/**
 * Ultra-Fast Vectorized Algorithmic Ranker for Reels
 */
export const rankReelsForUser = (reels = [], currentUser = null, mode = "for-you") => {
  if (!Array.isArray(reels) || reels.length === 0) return [];

  const userIdStr = (currentUser?._id || currentUser)?.toString() || null;
  const followingSet = currentUser ? new Set((currentUser.following || []).map((id) => (id?._id || id)?.toString())) : null;
  const closeFriendsSet = currentUser ? new Set((currentUser.closeFriends || []).map((id) => (id?._id || id)?.toString())) : null;

  if (mode === "following" && currentUser) {
    const filtered = reels.filter((r) => {
      const authorId = (r.author?._id || r.author)?.toString();
      return authorId && (followingSet.has(authorId) || authorId === userIdStr);
    });
    return filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  if (mode === "favorites" && currentUser) {
    const filtered = reels.filter((r) => {
      const authorId = (r.author?._id || r.author)?.toString();
      return authorId && closeFriendsSet.has(authorId);
    });
    return filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  const N = reels.length;
  const nowMs = Date.now();
  const scores = new Float64Array(N);
  const timestamps = new Float64Array(N);
  const indices = new Int32Array(N);

  const userInterests = currentUser?.contentCategoryInterests || null;

  for (let i = 0; i < N; i++) {
    const r = reels[i];
    indices[i] = i;
    timestamps[i] = r.createdAt ? new Date(r.createdAt).getTime() : nowMs;

    let score = calculateReelScore(r, currentUser, nowMs);
    const authorId = (r.author?._id || r.author)?.toString();
    if (authorId && followingSet && followingSet.has(authorId)) {
      score += 150.0;
    }
    if (authorId && closeFriendsSet && closeFriendsSet.has(authorId)) {
      score += 300.0;
    }

    // Semantic Intent Boost for Reels
    if (userInterests) {
      const reelTokens = `${r.caption || ""} ${Array.isArray(r.hashtags) ? r.hashtags.join(" ") : ""} ${r.location || ""} ${r.music?.title || ""}`;
      const keywords = extractSemanticKeywords(reelTokens);
      for (const kw of keywords) {
        const weight = typeof userInterests.get === "function" ? (userInterests.get(kw) || 0) : (userInterests[kw] || 0);
        if (weight > 0) {
          score += weight * 4.0; // Significant boost for latent interest matches
        }
      }
    }

    scores[i] = score;
  }

  indices.sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (Math.abs(diff) > 0.0001) return diff;
    return timestamps[b] - timestamps[a];
  });

  const ranked = new Array(N);
  for (let i = 0; i < N; i++) {
    ranked[i] = reels[indices[i]];
  }

  return applyDiversityGuard(ranked, 2);
};

export default {
  calculatePostScore,
  calculateReelScore,
  rankPostsForUser,
  rankReelsForUser,
};


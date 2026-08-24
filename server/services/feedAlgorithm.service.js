// Multi-Signal Algorithmic Feed Ranking Engine for VYBE
// Computes engagement score, relationship affinity, and time decay

export const calculatePostScore = (post, currentUser) => {
  if (!post) return 0;

  const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
  const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
  const savesCount = typeof post.savedCount === "number" ? post.savedCount : 0;

  // Base Engagement Score
  const baseScore = likesCount * 2.0 + commentsCount * 3.5 + savesCount * 5.0 + 1.0;

  // Relationship Affinity Multiplier
  let affinityMultiplier = 1.0;
  const authorId = (post.author?._id || post.author)?.toString();

  if (currentUser && authorId) {
    const followingIds = (currentUser.following || []).map((id) => (id?._id || id)?.toString());
    const closeFriendIds = (currentUser.closeFriends || []).map((id) => (id?._id || id)?.toString());

    if (closeFriendIds.includes(authorId)) {
      affinityMultiplier = 5.0; // High priority boost for Close Friends
    } else if (followingIds.includes(authorId)) {
      affinityMultiplier = 3.0; // Boost for Followed accounts
    }
  }

  // Time Decay Formula: Gravity = (HoursOld + 2)^1.5
  const createdAt = new Date(post.createdAt || Date.now()).getTime();
  const hoursOld = Math.max(0, (Date.now() - createdAt) / (1000 * 60 * 60));
  const gravity = Math.pow(hoursOld + 2, 1.5);

  const finalScore = (baseScore * affinityMultiplier) / gravity;
  return Number(finalScore.toFixed(4));
};

export const rankPostsForUser = (posts = [], currentUser = null, mode = "for-you") => {
  let filteredPosts = [...posts];

  if (mode === "following" && currentUser) {
    const followingIds = new Set((currentUser.following || []).map((id) => (id?._id || id)?.toString()));
    const currentUserIdStr = (currentUser._id || currentUser)?.toString();
    filteredPosts = filteredPosts.filter((p) => {
      const authorId = (p.author?._id || p.author)?.toString();
      return authorId && (followingIds.has(authorId) || authorId === currentUserIdStr);
    });
    // Reverse-chronological for Following
    return filteredPosts.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }

  if (mode === "favorites" && currentUser) {
    const closeFriendIds = new Set((currentUser.closeFriends || []).map((id) => (id?._id || id)?.toString()));
    filteredPosts = filteredPosts.filter((p) => {
      const authorId = (p.author?._id || p.author)?.toString();
      return authorId && closeFriendIds.has(authorId);
    });
    // Reverse-chronological for Favorites
    return filteredPosts.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }

  // Default "for-you": Rank by multi-signal calculated score and break ties with recency
  return filteredPosts.sort((a, b) => {
    const scoreA = calculatePostScore(a, currentUser);
    const scoreB = calculatePostScore(b, currentUser);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
};

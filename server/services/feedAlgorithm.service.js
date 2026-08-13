// Multi-Signal Algorithmic Feed Ranking Engine for VYBE
// Computes engagement score, relationship affinity, and time decay

export const calculatePostScore = (post, currentUser) => {
  const likesCount = post.likes?.length || 0;
  const commentsCount = post.comments?.length || 0;
  const savesCount = post.savedCount || 0;

  // Base Engagement Score
  const baseScore = likesCount * 2.0 + commentsCount * 3.5 + savesCount * 5.0 + 1.0;

  // Relationship Affinity Multiplier
  let affinityMultiplier = 1.0;
  const authorId = post.author?._id?.toString() || post.author?.toString();

  if (currentUser) {
    const followingIds = currentUser.following?.map((id) => id.toString()) || [];
    const closeFriendIds = currentUser.closeFriends?.map((id) => id.toString()) || [];

    if (closeFriendIds.includes(authorId)) {
      affinityMultiplier = 5.0; // High priority boost for Close Friends
    } else if (followingIds.includes(authorId)) {
      affinityMultiplier = 3.0; // Boost for Followed accounts
    }
  }

  // Time Decay Formula: Gravity = (HoursOld + 2)^1.5
  const createdAt = new Date(post.createdAt || Date.now()).getTime();
  const hoursOld = (Date.now() - createdAt) / (1000 * 60 * 60);
  const gravity = Math.pow(hoursOld + 2, 1.5);

  const finalScore = (baseScore * affinityMultiplier) / gravity;
  return Number(finalScore.toFixed(4));
};

export const rankPostsForUser = (posts = [], currentUser = null, mode = "for-you") => {
  let filteredPosts = [...posts];

  if (mode === "following" && currentUser) {
    const followingIds = currentUser.following?.map((id) => id.toString()) || [];
    filteredPosts = filteredPosts.filter((p) => {
      const authorId = p.author?._id?.toString() || p.author?.toString();
      return followingIds.includes(authorId) || authorId === currentUser._id?.toString();
    });
  } else if (mode === "favorites" && currentUser) {
    const closeFriendIds = currentUser.closeFriends?.map((id) => id.toString()) || [];
    filteredPosts = filteredPosts.filter((p) => {
      const authorId = p.author?._id?.toString() || p.author?.toString();
      return closeFriendIds.includes(authorId);
    });
  }

  // Rank by calculated score
  return filteredPosts.sort((a, b) => {
    const scoreA = calculatePostScore(a, currentUser);
    const scoreB = calculatePostScore(b, currentUser);
    return scoreB - scoreA;
  });
};

const calculateReelScore = (reel) => {
  const views = reel.views || 0;
  const likesCount = Array.isArray(reel.likes) ? reel.likes.length : 0;
  const commentsCount = Array.isArray(reel.comments) ? reel.comments.length : 0;
  return views * 1 + likesCount * 3 + commentsCount * 4;
};

export default calculateReelScore;

import { Story } from "../models/story.model.js";

/**
 * Service to aggregate story analytics metrics: unique viewers, reach, completion rate, and reaction breakdown.
 */
export const getStoryAnalytics = async (storyId, authorId) => {
  const story = await Story.findOne({ _id: storyId, author: authorId })
    .populate("viewers", "userName profileImage name createdAt")
    .populate("likes", "userName profileImage name")
    .populate("reactions.user", "userName profileImage name");

  if (!story) {
    throw new Error("Story not found or unauthorized");
  }

  const totalViews = story.viewers.length;
  const totalLikes = story.likes.length;
  const totalReactions = story.reactions.length;

  // Breakdown of reactions by emoji
  const reactionBreakdown = story.reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  // Interactive sticker metrics
  const stickerAnalytics = story.stickers.map((s) => {
    if (s.type === "poll") {
      const votes = story.pollVotes || [];
      const optionCounts = (s.poll?.options || []).map((opt, idx) => ({
        optionText: opt.optionText,
        votes: votes.filter((v) => v.optionIndex === idx).length,
      }));
      return { type: "poll", question: s.poll?.question, options: optionCounts, totalVotes: votes.length };
    }
    if (s.type === "quiz") {
      const answers = story.quizAnswers || [];
      return {
        type: "quiz",
        question: s.quiz?.question,
        totalAnswers: answers.length,
        correctAnswers: answers.filter((a) => a.isCorrect).length,
      };
    }
    if (s.type === "slider") {
      const responses = story.sliderResponses || [];
      const avg = responses.length > 0
        ? Math.round(responses.reduce((sum, r) => sum + (r.value || 0), 0) / responses.length)
        : 0;
      return {
        type: "slider",
        question: s.slider?.question,
        emoji: s.slider?.emoji,
        totalResponses: responses.length,
        averageValue: avg,
      };
    }
    return { type: s.type };
  });

  return {
    storyId: story._id,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    isArchived: story.isArchived,
    metrics: {
      uniqueViewers: totalViews,
      totalLikes,
      totalReactions,
      engagementRate: totalViews > 0 ? (((totalLikes + totalReactions) / totalViews) * 100).toFixed(1) + "%" : "0%",
    },
    reactionBreakdown,
    stickerAnalytics,
    viewersList: story.viewers,
    likesList: story.likes,
  };
};

/**
 * Story Socket Service - Manages real-time Socket.IO events for story updates.
 */

export const emitStoryCreated = (io, story, followers = []) => {
  if (!io || !story) return;
  
  followers.forEach((followerId) => {
    io.to(`user_${followerId}`).emit("story-created", {
      storyId: story._id,
      author: story.author,
    });
  });
};

export const emitStoryViewed = (io, storyId, viewerId, authorId) => {
  if (!io) return;
  io.to(`user_${authorId}`).emit("story-viewed", {
    storyId,
    viewerId,
    timestamp: new Date(),
  });
};

export const emitStoryLiked = (io, storyId, userId, authorId, isLiked) => {
  if (!io) return;
  io.to(`user_${authorId}`).emit("story-liked", {
    storyId,
    userId,
    isLiked,
    timestamp: new Date(),
  });
};

export const emitStoryReacted = (io, storyId, userId, authorId, emoji) => {
  if (!io) return;
  io.to(`user_${authorId}`).emit("story-reacted", {
    storyId,
    userId,
    emoji,
    timestamp: new Date(),
  });
};

export const emitStoryPollVoted = (io, storyId, userId, authorId, optionIndex, pollVotes) => {
  if (!io) return;
  io.to(`user_${authorId}`).emit("story-poll-voted", {
    storyId,
    userId,
    optionIndex,
    pollVotes,
    timestamp: new Date(),
  });
};

export const emitStoryQuestionSubmitted = (io, storyId, userId, authorId, responseText, questionResponses) => {
  if (!io) return;
  io.to(`user_${authorId}`).emit("story-question-submitted", {
    storyId,
    userId,
    responseText,
    questionResponses,
    timestamp: new Date(),
  });
};

export const emitStoryQuizAnswered = (io, storyId, userId, authorId, optionIndex, isCorrect, quizAnswers) => {
  if (!io) return;
  io.to(`user_${authorId}`).emit("story-quiz-answered", {
    storyId,
    userId,
    optionIndex,
    isCorrect,
    quizAnswers,
    timestamp: new Date(),
  });
};

export const emitStorySliderResponded = (io, storyId, userId, authorId, value, sliderResponses) => {
  if (!io) return;
  io.to(`user_${authorId}`).emit("story-slider-responded", {
    storyId,
    userId,
    value,
    sliderResponses,
    timestamp: new Date(),
  });
};

export const emitStoryDeleted = (io, storyId, authorId) => {
  if (!io) return;
  io.emit("story-deleted", {
    storyId,
    authorId,
  });
};

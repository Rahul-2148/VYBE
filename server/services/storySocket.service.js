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

export const emitStoryDeleted = (io, storyId, authorId) => {
  if (!io) return;
  io.emit("story-deleted", {
    storyId,
    authorId,
  });
};

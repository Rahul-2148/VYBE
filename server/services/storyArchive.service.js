import { Story } from "../models/story.model.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";

/**
 * Story Archive & Cleanup Service
 * Automatically archives stories past their 24-hour expiration date.
 */

export const archiveExpiredStories = async () => {
  try {
    const now = new Date();
    
    // Find all expired stories that are not yet archived
    const expiredStories = await Story.find({
      expiresAt: { $lte: now },
      isArchived: false,
    });

    if (expiredStories.length === 0) return { archivedCount: 0 };

    const storyIdsToArchive = expiredStories.map((s) => s._id);

    // Mark as archived
    const result = await Story.updateMany(
      { _id: { $in: storyIdsToArchive } },
      { $set: { isArchived: true } }
    );

    console.log(`[StoryArchive] Successfully archived ${result.modifiedCount} expired stories.`);
    return { archivedCount: result.modifiedCount };
  } catch (error) {
    console.error("[StoryArchive] Error archiving expired stories:", error.message);
    throw error;
  }
};

/**
 * Permanently delete story and remove media asset from Cloudinary
 */
export const deleteStoryWithMedia = async (storyId, authorId) => {
  const story = await Story.findOne({ _id: storyId, author: authorId });
  if (!story) {
    throw new Error("Story not found or unauthorized");
  }

  // Delete media asset from Cloudinary if public_id exists
  if (story.media?.public_id) {
    try {
      await deleteFromCloudinary(story.media.public_id);
    } catch (e) {
      console.warn("[StoryArchive] Cloudinary media deletion warning:", e.message);
    }
  }

  await User.findByIdAndUpdate(authorId, {
    $pull: { stories: storyId }
  });
  await Story.findByIdAndDelete(storyId);
  return { success: true, message: "Story permanently deleted" };
};

/**
 * Restore an archived story back to active 24-hour feed
 */
export const restoreArchivedStory = async (storyId, authorId) => {
  const story = await Story.findOne({ _id: storyId, author: authorId });
  if (!story) {
    throw new Error("Story not found or unauthorized");
  }

  // Renew expiration date to 24 hours from now and mark as unarchived
  story.isArchived = false;
  story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await story.save();

  return story;
};

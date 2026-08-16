import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";
import { Highlight } from "../models/highlight.model.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";

// Archive Retention Period (30 Days before permanent Cloudinary & DB purge for stories not in highlights)
export const ARCHIVE_RETENTION_DAYS = 30;

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

    // Mark as archived in database with archivedAt timestamp
    const result = await Story.updateMany(
      { _id: { $in: storyIdsToArchive } },
      { $set: { isArchived: true, archivedAt: now } }
    );

    // Pull expired stories from active User.stories so profile ring indicators disappear
    const pullPromises = expiredStories.map((story) =>
      User.findByIdAndUpdate(story.author, {
        $pull: { stories: story._id },
      }).catch(() => null)
    );
    await Promise.all(pullPromises);

    console.log(`[StoryArchive] Successfully auto-archived ${result.modifiedCount} expired stories.`);
    return { archivedCount: result.modifiedCount };
  } catch (error) {
    console.error("[StoryArchive] Error archiving expired stories:", error.message);
    throw error;
  }
};

/**
 * Purge Expired Archived Stories (30 Days Limit)
 * Automatically deletes stories older than 30 days from Archive + purges Cloudinary media.
 * PROTECTED: Stories that are in user Profile Highlights are preserved.
 */
export const purgeExpiredArchivedStories = async () => {
  try {
    const retentionThreshold = new Date(
      Date.now() - ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    // 1. Fetch all story IDs currently used in Highlights to protect them
    const allHighlights = await Highlight.find({}, "stories");
    const protectedStoryIds = new Set();
    allHighlights.forEach((h) => {
      if (Array.isArray(h.stories)) {
        h.stories.forEach((sid) => protectedStoryIds.add(sid.toString()));
      }
    });

    // 2. Find auto-archived stories older than 30 days
    const candidateStories = await Story.find({
      isArchived: true,
      $or: [
        { archivedAt: { $lte: retentionThreshold } },
        { archivedAt: null, createdAt: { $lte: retentionThreshold } },
        { archivedAt: { $exists: false }, createdAt: { $lte: retentionThreshold } },
      ],
    });

    const storiesToPurge = candidateStories.filter(
      (s) => !protectedStoryIds.has(s._id.toString())
    );

    if (storiesToPurge.length === 0) return { purgedCount: 0 };

    let deletedMediaCount = 0;

    for (const story of storiesToPurge) {
      // Delete media from Cloudinary
      if (story.media?.public_id) {
        await deleteFromCloudinary(story.media.public_id).catch(() => null);
        deletedMediaCount++;
      }

      // Remove from user stories list
      await User.findByIdAndUpdate(story.author, {
        $pull: { stories: story._id },
      }).catch(() => null);

      // Permanently remove from database
      await Story.findByIdAndDelete(story._id);
    }

    console.log(
      `[StoryArchive] Purged ${storiesToPurge.length} archived stories (>30 days) and cleaned ${deletedMediaCount} Cloudinary assets.`
    );
    return { purgedCount: storiesToPurge.length, deletedMediaCount };
  } catch (error) {
    console.error("[StoryArchive] Error purging expired archive stories:", error.message);
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
    $pull: { stories: storyId },
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
  story.archivedAt = null;
  story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await story.save();

  await User.findByIdAndUpdate(authorId, {
    $addToSet: { stories: story._id },
  });

  return story;
};

// /utils/cronJob/storyCleanup.js
import mongoose from "mongoose";
import deleteFromCloudinary from "../../config/deleteFromCloudinary.js";
import { Story } from "../../models/story.model.js";

export const cleanupExpiredStories = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const expiredStories = await Story.find({ expiresAt: { $lt: new Date() } });

    for (const story of expiredStories) {
      if (story.media?.public_id) {
        try {
          await deleteFromCloudinary(story.media.public_id);
        } catch (err) {
          console.error(`Failed to delete media: ${story.media.public_id}`, err.message);
        }
      }

      await Story.findByIdAndDelete(story._id);
    }
  } catch (err) {
    // Suppress cron buffer logs if db is reconnecting
  }
};

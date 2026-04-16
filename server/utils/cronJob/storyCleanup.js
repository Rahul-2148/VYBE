// /utils/cronJob/storyCleanup.js

import deleteFromCloudinary from "../../config/deleteFromCloudinary.js";
import { Story } from "../../models/story.model.js";

export const cleanupExpiredStories = async () => {
  try {
    const expiredStories = await Story.find({ expiresAt: { $lt: new Date() } });

    for (const story of expiredStories) {
      if (story.media?.public_id) {
        try {
          await deleteFromCloudinary(story.media.public_id);
          console.log(`Deleted media from Cloudinary: ${story.media.public_id}`);
        } catch (err) {
          console.error(`Failed to delete media: ${story.media.public_id}`, err.message);
        }
      }

      await Story.findByIdAndDelete(story._id);
      console.log(`Deleted story: ${story._id}`);
    }
  } catch (err) {
    console.error("Story cleanup error:", err.message);
  }
};

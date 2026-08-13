import mongoose from "mongoose";
import dotenv from "dotenv";
import { Story } from "../models/story.model.js";

dotenv.config();

const refreshStories = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vybe";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for story refresh...");

    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const recentCreated = new Date(Date.now() - 60 * 60 * 1000);

    const result = await Story.updateMany(
      {},
      {
        $set: {
          expiresAt: futureExpiry,
          createdAt: recentCreated,
        },
      }
    );

    console.log(`Successfully refreshed ${result.modifiedCount} stories with active 24-hour expiration!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Failed to refresh story dates:", error);
    process.exit(1);
  }
};

refreshStories();

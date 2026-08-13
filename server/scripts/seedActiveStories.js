import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";

dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const sampleStoryMedia = [
  {
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
    caption: "Sunset vibes by the beach! 🌅 #nature #vibes",
    music: { title: "Ocean Waves", artist: "Chill Beats", audioUrl: "" },
  },
  {
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1080&q=80",
    caption: "New portrait session 📸✨ @savi123",
    music: { title: "Golden Hour", artist: "JVKE", audioUrl: "" },
  },
  {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1080&q=80",
    caption: "Starry nights in the mountains 🌌 #travel #adventure",
    music: { title: "Midnight City", artist: "M83", audioUrl: "" },
  },
  {
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1080&q=80",
    caption: "Concert energy! 🎉🔥 #live #music",
    music: { title: "Electric Feel", artist: "MGMT", audioUrl: "" },
  },
];

const seedActiveStories = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/vybe";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for story seeding...");

    const users = await User.find({}).limit(10);
    console.log(`Found ${users.length} users in database.`);

    if (!users || users.length === 0) {
      process.exit(0);
    }

    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let createdCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const sample = sampleStoryMedia[i % sampleStoryMedia.length];

      const story = await Story.create({
        author: user._id,
        mediaType: "image",
        media: { url: sample.url, public_id: `sample_story_${user._id}_${Date.now()}` },
        caption: sample.caption,
        music: sample.music,
        visibleTo: i % 3 === 0 ? "closeFriends" : "public",
        expiresAt: futureExpiry,
        stickers: [
          {
            type: "poll",
            position: { x: 50, y: 70 },
            poll: {
              question: "Do you love this VYBE?",
              options: [{ optionText: "Yes 🔥", votesCount: 5 }, { optionText: "Absolutely ❤️", votesCount: 8 }],
            },
          },
        ],
      });

      await User.findByIdAndUpdate(user._id, { $push: { stories: story._id } });
      createdCount++;
    }

    console.log(`Successfully seeded ${createdCount} active stories for creators!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed active stories:", error);
    process.exit(1);
  }
};

seedActiveStories();

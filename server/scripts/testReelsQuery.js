import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Reel } from "../models/reel.model.js";

dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function checkReels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const reels = await Reel.find({}).populate("author", "name userName profileImage");
    console.log(`Querying Reel model: Found ${reels.length} reels in database.`);
    reels.forEach((r, i) => {
      console.log(`[Reel ${i + 1}] ID: ${r._id}, Author: @${r.author?.userName || "Unknown"}, Media: ${r.media?.url?.slice(0, 40)}...`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Reel query test error:", err);
    process.exit(1);
  }
}

checkReels();

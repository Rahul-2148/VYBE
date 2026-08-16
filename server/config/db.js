import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Reset presence state for all users on startup to prevent stale online status
    try {
      await User.updateMany({}, { $set: { isOnline: false } });
      console.log("♻️ Reset all user online statuses to offline.");
    } catch (presenceErr) {
      console.error("Presence reset error:", presenceErr);
    }

    // Auto-sync legacy loops collection to reels if any unmigrated documents exist
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      if (collections.some((c) => c.name === "loops")) {
        const loopsColl = db.collection("loops");
        const reelsColl = db.collection("reels");
        const loops = await loopsColl.find({}).toArray();
        for (const loopDoc of loops) {
          const exists = await reelsColl.findOne({ _id: loopDoc._id });
          if (!exists) {
            await reelsColl.insertOne({
              ...loopDoc,
              reports: loopDoc.reports || [],
              hiddenBy: loopDoc.hiddenBy || [],
              commentsDisabled: Boolean(loopDoc.commentsDisabled),
            });
          }
        }
      }
    } catch (migErr) {
      console.warn("Legacy loop-to-reel startup sync notice:", migErr.message);
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;

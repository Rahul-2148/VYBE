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
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;

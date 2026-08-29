import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment");
    }

    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Ultra-fast IPv4 DNS resolution
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);

    // Asynchronous non-blocking background cleanup tasks (doesn't block server listening)
    setImmediate(async () => {
      try {
        await User.updateMany({ isOnline: true }, { $set: { isOnline: false } });
        console.log("♻️ Online presence states synchronized.");
      } catch (presenceErr) {
        console.warn("Presence sync notice:", presenceErr.message);
      }
    });

    return conn;
  } catch (error) {
    console.error("💥 Error connecting to MongoDB:", error.message);
    throw error;
  }
};

export default connectDB;

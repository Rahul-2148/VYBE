// /utils/cronJob/cleanupDisappearingMessages.js
import mongoose from "mongoose";
import { Message } from "../../models/message.model.js";

export const cleanupExpiredMessages = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await Message.deleteMany({
      "disappear.enabled": true,
      "disappear.expireAt": { $lte: new Date() },
    });
  } catch (err) {
    // Suppress cron buffer logs if db is reconnecting
  }
};

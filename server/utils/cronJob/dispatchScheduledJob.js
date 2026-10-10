// /utils/cronJob/dispatchScheduledJob.js
import mongoose from "mongoose";
import { dispatchScheduledMessages } from "../../controllers/message.controller.js";

export const runScheduledMessagesDispatcher = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const ioInstance = global.io;
    await dispatchScheduledMessages(ioInstance);
  } catch (err) {
    // Suppress transient errors
  }
};

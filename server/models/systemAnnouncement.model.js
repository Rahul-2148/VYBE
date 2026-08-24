import mongoose from "mongoose";

const systemAnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["info", "warning", "critical", "update", "promo"],
      default: "info",
    },
    targetAudience: {
      type: String,
      enum: ["all", "verified", "creators", "admins"],
      default: "all",
    },
    actionUrl: {
      type: String,
      default: "",
    },
    actionLabel: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const SystemAnnouncement = mongoose.model("SystemAnnouncement", systemAnnouncementSchema);

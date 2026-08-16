import mongoose from "mongoose";

const moderationLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ["comment", "post", "reel", "message"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    toxicityScore: {
      type: Number,
      default: 0,
    },
    flagReason: {
      type: String,
      default: "Toxic or inappropriate language detected",
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    actionTaken: {
      type: String,
      enum: ["warned", "blocked", "flagged"],
      default: "blocked",
    },
  },
  { timestamps: true }
);

export const ModerationLog = mongoose.model("ModerationLog", moderationLogSchema);

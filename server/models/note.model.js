import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 60,
    },
    music: {
      title: String,
      artist: String,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  { timestamps: true }
);

noteSchema.index({ user: 1, createdAt: -1 });
noteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Note = mongoose.model("Note", noteSchema);

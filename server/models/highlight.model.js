import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coverImage: {
      url: String,
      public_id: String,
    },
    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
        required: true,
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      default: "General",
    },
  },
  { timestamps: true }
);

highlightSchema.index({ author: 1, order: 1 });

export const Highlight = mongoose.model("Highlight", highlightSchema);

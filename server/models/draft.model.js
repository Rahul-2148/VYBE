import mongoose from "mongoose";

const draftSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    caption: {
      type: String,
      default: "",
    },
    altText: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    hashtags: [
      {
        type: String,
      },
    ],
    mediaPreview: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const Draft = mongoose.model("Draft", draftSchema);

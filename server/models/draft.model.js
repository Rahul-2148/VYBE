import mongoose from "mongoose";

const draftSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    draftType: {
      type: String,
      enum: ["post", "reel", "story"],
      default: "post",
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
    mediaItems: [
      {
        url: { type: String, default: "" },
        preview: { type: String, default: "" },
        mediaType: { type: String, default: "image" },
      },
    ],
    aspectRatio: {
      type: String,
      default: "4:5",
    },
    filter: {
      type: String,
      default: "normal",
    },
    audioTrack: {
      type: Object,
      default: null,
    },
    aiLabel: {
      type: Object,
      default: null,
    },
    isVybeTv: {
      type: Boolean,
      default: false,
    },
    videoDuration: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Draft = mongoose.model("Draft", draftSchema);

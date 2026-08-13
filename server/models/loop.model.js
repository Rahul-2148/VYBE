import mongoose from "mongoose";

const loopSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    media: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: true,
      },
    },
    caption: {
      type: String,
      default: "",
    },
    // Remix Reel reference
    isRemix: {
      type: Boolean,
      default: false,
    },
    originalLoop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loop",
      default: null,
    },
    // Audio Track details
    audioTrack: {
      id: { type: String, default: "original_audio" },
      title: { type: String, default: "Original Audio" },
      artist: { type: String, default: "" },
      coverUrl: { type: String, default: "" },
      audioUrl: { type: String, default: "" },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    location: {
      type: String,
      default: "",
    },
    hashtags: [
      {
        type: String,
      },
    ],
    music: {
      type: String,
      default: "",
    },
    captions: [
      {
        start: Number,
        end: Number,
        text: String,
      },
    ],
    score: {
      type: Number,
      default: 0,
      index: -1,
    },
    watchTime: {
      type: Number,
      default: 0,
    },
    taggedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    forwards: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

loopSchema.index({ score: -1, createdAt: -1 });

export const Loop = mongoose.model("Loop", loopSchema);

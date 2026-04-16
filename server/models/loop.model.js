import mongoose from "mongoose";

const loopSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    likes: [
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
    score: {
      type: Number,
      default: 0,
    },
    watchTime: {
      type: Number,
      default: 0,
    },
    forwards: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Loop = mongoose.model("Loop", loopSchema);

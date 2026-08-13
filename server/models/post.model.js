import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaType: {
      type: String,
      required: true,
      enum: ["image", "video", "carousel", "text", "audio"],
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
    carouselMedia: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        type: { type: String, default: "image" },
      },
    ],
    taggedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        x: { type: Number, default: 50 }, // percentage position
        y: { type: Number, default: 50 },
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    likesHidden: {
      type: Boolean,
      default: false,
    },
    scheduledPublishTime: {
      type: Date,
      default: null,
    },
    caption: {
      type: String,
      default: "",
    },
    altText: {
      type: String,
      default: "",
    },
    isFlagged: {
      type: Boolean,
      default: false,
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
        createdAt: {
          type: Date,
          default: Date.now,
        },
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
      id: { type: String },
      title: { type: String },
      artist: { type: String },
      audioUrl: { type: String },
      coverUrl: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ author: 1, isArchived: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });

export const Post = mongoose.model("Post", postSchema);

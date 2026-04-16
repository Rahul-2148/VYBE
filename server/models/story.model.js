import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video", "text", "audio"],
      required: true,
    },

    media: {
      url: String,
      public_id: String,
    },

    caption: String,
    location: String,
    hashtags: [String],
    music: String,

    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String, // ❤️ 😂 🤣 😭 🔥 💀 🫶 🥹 kuch bhi
          required: true,
        },
        reactedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    visibleTo: {
      type: String,
      enum: ["public", "closeFriends"],
      default: "public",
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      // index: { expires: 0 }, // 🔥 auto delete
    },
  },
  { timestamps: true }
);

export const Story = mongoose.model("Story", storySchema);

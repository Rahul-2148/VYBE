import mongoose from "mongoose";

const channelMessageSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text",
    },
    content: {
      text: String,
      media: [
        {
          url: String,
          public_id: String,
          type: String, // image / video / audio / document
          name: String,
          size: Number,
        },
      ],
    },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],
  },
  { timestamps: true }
);

channelMessageSchema.index({ channel: 1, createdAt: 1 });

export const ChannelMessage = mongoose.model("ChannelMessage", channelMessageSchema);

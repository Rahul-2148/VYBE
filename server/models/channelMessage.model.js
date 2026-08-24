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
      enum: ["text", "image", "video", "audio", "voice", "file", "sticker"],
      default: "text",
    },
    content: {
      text: { type: String, default: "" },
      media: [
        {
          url: String,
          public_id: String,
          type: String, // image / video / audio / voice / sticker / document / file
          name: String,
          size: Number,
        },
      ],
      voiceDuration: {
        type: Number,
        default: 0,
      },
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChannelMessage",
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    edited: {
      type: Boolean,
      default: false,
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

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      enum: [
        "like",
        "comment",
        "follow",
        "follow_request",
        "follow_accept",
        "mention",
        "story_reaction",
        "dm",
        "call",
        "contact_request",
      ],
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
    },

    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
    },
    commentText: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);

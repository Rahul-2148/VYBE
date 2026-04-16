import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "share"],
      required: true,
    },

    content: {
      text: String,

      media: [
        {
          url: String,
          public_id: String,
          type: String, // image / video / audio / document
          name: String, // original filename (for docs)
        },
      ],

      shared: {
        type: {
          type: String,
          enum: ["Loop", "Post", "Story"],
        },
        refId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "content.shared.type",
        },
      },
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    edited: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },

    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reactions: [
      {
        user: mongoose.Schema.Types.ObjectId,
        emoji: String,
      },
    ],

    deletedForEveryone: {
      type: Boolean,
      default: false,
    },

    // disappear message feature
    disappear: {
      enabled: {
        type: Boolean,
        default: false,
      },
      afterSeen: {
        type: Boolean,
        default: false,
      },
      expireAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ "disappear.expireAt": 1 }, { expireAfterSeconds: 0 });

export const Message = mongoose.model("Message", messageSchema);

import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    isGroup: {
      type: Boolean,
      default: false,
    },

    groupName: {
      type: String,
      default: "",
    },

    groupImage: {
      url: String,
      public_id: String,
    },

    admins: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["owner", "co-admin"],
          default: "co-admin",
        },
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },

    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    invite: {
      token: String,
      expiresAt: Date,
    },

    // Vanish Mode Settings for the conversation
    vanishMode: {
      type: Boolean,
      default: false,
    },

    vanishDuration: {
      type: Number, // seconds (eg: 10, 60, 3600)
      default: null,
    },
  },
  { timestamps: true }
);

// 🔥 PERFORMANCE INDEXES (VERY IMPORTANT)
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);

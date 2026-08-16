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

    description: {
      type: String,
      default: "",
      maxlength: 500,
    },

    admins: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["owner", "co-admin", "moderator"],
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

    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    blockedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    restrictedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    pinnedMessages: [
      {
        message: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
        pinnedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        pinnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Disappearing messages — per-conversation setting
    disappearingMessages: {
      enabled: {
        type: Boolean,
        default: false,
      },
      duration: {
        type: Number, // seconds: 86400 (24h), 604800 (7d), 2592000 (30d)
        default: null,
      },
      setBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      setAt: {
        type: Date,
      },
    },

    // Chat theme/wallpaper customization
    theme: {
      type: String,
      default: "default",
    },

    customThemeColor: {
      type: String, // hex color for custom theme
      default: null,
    },

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

    // Message request status for non-followers
    requestStatus: {
      type: String,
      enum: ["none", "pending", "accepted", "declined"],
      default: "none",
    },
  },
  { timestamps: true }
);

// PERFORMANCE INDEXES
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ "invite.token": 1 });
conversationSchema.index({ requestStatus: 1, participants: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);

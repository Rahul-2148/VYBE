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
      enum: [
        "text", "image", "video", "audio", "voice", "file", "gif",
        "location", "share", "shared_post", "shared_reel", "shared_loop", "shared_story",
        "shared_profile", "shared_user", "system", "poll", "contact",
      ],
      required: true,
    },

    content: {
      text: String,
      sharedData: mongoose.Schema.Types.Mixed,

      media: [
        {
          url: String,
          public_id: String,
          type: String, // image / video / audio / document
          name: String, // original filename
          size: Number, // bytes
          mimeType: String,
          thumbnail: String, // for video thumbnails
          width: Number,
          height: Number,
        },
      ],

      voiceDuration: Number, // Duration in seconds for voice notes

      locationData: {
        latitude: Number,
        longitude: Number,
        name: String,
        address: String,
      },

      shared: {
        type: {
          type: String,
          enum: ["Loop", "Post", "Story", "User", "post", "reel", "loop", "story", "profile"],
        },
        refId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
      },

      // Link preview data (auto-generated from URLs in text)
      linkPreview: {
        url: String,
        title: String,
        description: String,
        image: String,
        siteName: String,
      },

      // Contact card data
      contactData: {
        name: String,
        phone: String,
        email: String,
      },
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // Forwarding chain
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    isForwarded: {
      type: Boolean,
      default: false,
    },

    forwardCount: {
      type: Number,
      default: 0,
    },

    edited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "seen", "failed"],
      default: "sent",
    },

    seenBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    deliveredTo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
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
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
        reactedAt: { type: Date, default: Date.now },
      },
    ],

    deletedForEveryone: {
      type: Boolean,
      default: false,
    },

    // Pinned in conversation
    isPinned: {
      type: Boolean,
      default: false,
    },

    pinnedAt: {
      type: Date,
    },

    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

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

    // System message metadata (for "X added Y", "X left group", etc.)
    systemEvent: {
      type: String,
      enum: [
        "group_created", "member_added", "member_removed", "member_left",
        "admin_promoted", "admin_demoted", "group_renamed", "group_photo_changed",
        "disappearing_enabled", "disappearing_disabled", "vanish_enabled",
        "vanish_disabled", "call_started", "call_ended", "call_missed",
      ],
    },

    systemEventData: {
      targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      metadata: mongoose.Schema.Types.Mixed,
    },

    clientMessageId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

// PERFORMANCE INDEXES
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ "disappear.expireAt": 1 }, { expireAfterSeconds: 0 });
messageSchema.index({ conversation: 1, "content.text": "text" }); // text search

export const Message = mongoose.model("Message", messageSchema);

import mongoose from "mongoose";

const liveStreamSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "Live Video",
      trim: true,
      maxlength: 120,
    },

    // Audience restriction
    audience: {
      type: String,
      enum: ["everyone", "close_friends"],
      default: "everyone",
    },

    // Live state
    isLive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Co-Host (single guest for split-screen live)
    coHost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Comments toggle
    commentsDisabled: {
      type: Boolean,
      default: false,
    },

    // Viewers management
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    peakViewers: {
      type: Number,
      default: 1,
    },
    totalUniqueViewers: {
      type: Number,
      default: 1,
    },

    // Pinned comment
    pinnedComment: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      userName: String,
      text: String,
      pinnedAt: Date,
    },

    // Comments
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userName: String,
        userAvatar: String,
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Muted / Restricted viewers
    mutedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Recording (client-side MediaRecorder → Cloudinary upload)
    recording: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
      thumbnailUrl: { type: String, default: null },
      duration: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },

    // Share as Reel — reference to the Post created from the recording
    sharedAsReel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      default: null,
    },

    // Archive management
    isArchived: {
      type: Boolean,
      default: false,
    },
    archiveExpiresAt: {
      type: Date,
      default: null,
    },

    // Timestamps
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },

    // Aggregate stats (populated on stream end)
    stats: {
      durationSeconds: {
        type: Number,
        default: 0,
      },
      totalHearts: {
        type: Number,
        default: 0,
      },
      totalComments: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

// Performance indexes
liveStreamSchema.index({ host: 1, isLive: 1 });
liveStreamSchema.index({ isLive: 1, createdAt: -1 });
liveStreamSchema.index({ host: 1, isArchived: 1, createdAt: -1 });

// TTL index — auto-delete archived streams after archiveExpiresAt
liveStreamSchema.index({ archiveExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const LiveStream = mongoose.model("LiveStream", liveStreamSchema);

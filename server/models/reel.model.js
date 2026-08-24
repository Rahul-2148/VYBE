import mongoose from "mongoose";

const reelSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    caption: {
      type: String,
      default: "",
    },
    // Remix & Reshare Reel references
    isRemix: {
      type: Boolean,
      default: false,
    },
    isReshare: {
      type: Boolean,
      default: false,
    },
    resharedThoughts: {
      type: String,
      default: "",
    },
    originalReel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      default: null,
    },

    // Audio Track details
    audioTrack: {
      id: { type: String, default: "original_audio" },
      title: { type: String, default: "Original Audio" },
      artist: { type: String, default: "" },
      coverUrl: { type: String, default: "" },
      audioUrl: { type: String, default: "" },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    savedBy: [
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
        likes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        isPinned: {
          type: Boolean,
          default: false,
        },
        replies: [
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
            replyingTo: {
              type: String,
              default: "",
            },
            likes: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
              },
            ],
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    commentsDisabled: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
      type: String,
      default: "",
    },
    captions: [
      {
        start: Number,
        end: Number,
        text: String,
      },
    ],
    score: {
      type: Number,
      default: 0,
      index: -1,
    },
    watchTime: {
      type: Number,
      default: 0,
    },
    taggedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    forwards: {
      type: Number,
      default: 0,
    },
    commentsDisabled: {
      type: Boolean,
      default: false,
    },
    aiLabel: {
      isAIGenerated: { type: Boolean, default: false },
      tool: { type: String, default: "" },
      contentType: { type: String, default: "video" },
      disclosedAt: { type: Date, default: null },
    },
    // VYBE TV Long-form video support (> 3 minutes or tagged)
    isVybeTv: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      default: 0,
    },
    hiddenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: {
          type: String,
          default: "other",
        },
        details: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

reelSchema.index({ score: -1, createdAt: -1 });

export const Reel = mongoose.models.Reel || mongoose.model("Reel", reelSchema);


export default Reel;

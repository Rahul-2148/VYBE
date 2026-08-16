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
    filter: {
      type: String,
      default: "none",
    },
    music: {
      title: String,
      artist: String,
      audioUrl: String,
      startTime: { type: Number, default: 0 },
    },

    // Shared Reel / Post Metadata
    sharedEntity: {
      entityId: String,
      entityType: String,
      authorName: String,
      authorAvatar: String,
      mediaUrl: String,
      caption: String,
    },

    // Interactive Stickers Array
    stickers: [
      {
        type: {
          type: String,
          enum: ["poll", "quiz", "question", "countdown", "link", "mention", "hashtag", "slider", "location", "time", "day", "emoji", "overlay", "gif", "addYours", "music_sticker"],
          required: true,
        },
        position: {
          x: { type: Number, default: 50 }, // percentage 0-100
          y: { type: Number, default: 50 },
        },
        scale: { type: Number, default: 1 },
        styleIndex: { type: Number, default: 0 },
        // Poll Sticker Data
        poll: {
          question: String,
          options: [{ optionText: String, votesCount: { type: Number, default: 0 } }],
        },
        // Quiz Sticker Data
        quiz: {
          question: String,
          options: [String],
          correctOptionIndex: Number,
        },
        // Question Box Data
        question: {
          prompt: { type: String, default: "Ask me a question" },
        },
        // Countdown Data
        countdown: {
          title: String,
          targetDate: Date,
        },
        // Link Data
        link: {
          url: String,
          title: String,
        },
        // Mention Data
        mention: {
          username: String,
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
        // Time Sticker Data
        time: {
          timeString: String,
          style: { type: String, default: "digital" },
        },
        // Day Sticker Data
        day: {
          dayString: String,
          style: { type: String, default: "stylized" },
        },
        // Emoji Sticker Data
        emoji: {
          val: String,
        },
        // Overlay Sticker Data
        overlay: {
          text: String,
          icon: String,
        },
        // Hashtag Sticker Data
        hashtag: {
          tag: String,
        },
        // Slider Sticker Data
        slider: {
          question: String,
          emoji: String,
        },
        // GIF Sticker Data
        gif: {
          url: String,
          altText: String,
        },
        // Add Yours Template Sticker Data
        addYours: {
          prompt: { type: String, default: "Add Yours" },
        },
        // Music Sticker Data
        music_sticker: {
          title: String,
          artist: String,
        },
      },
    ],

    // Poll Votes Tracking
    pollVotes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        optionIndex: { type: Number, required: true },
        votedAt: { type: Date, default: Date.now },
      },
    ],

    // Quiz Answers Tracking
    quizAnswers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        optionIndex: { type: Number, required: true },
        isCorrect: Boolean,
        answeredAt: { type: Date, default: Date.now },
      },
    ],

    // Question Responses Submissions
    questionResponses: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        responseText: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

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
          type: String,
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

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    archivedAt: {
      type: Date,
      default: null,
      index: true,
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: true,
    },
  },
  { timestamps: true }
);

// Index for high performance story feed query by author and expiration
storySchema.index({ author: 1, expiresAt: -1, visibleTo: 1 });

export const Story = mongoose.model("Story", storySchema);

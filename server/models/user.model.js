import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // convert to lowercase
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 150,
    },
    profession: {
      type: String,
      default: "",
      maxlength: 50,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },
    age: {
      // in years (self created)
      type: Number,
      default: null,
    },
    location: {
      // self created
      type: String,
    },
    website: {
      type: String,
      default: "",
    },

    links: [
      {
        platform: { type: String, default: "custom" },
        url: { type: String, required: true },
        title: { type: String, default: "" },
      },
    ],
    category: {
      type: String,
      default: "Digital Creator",
    },
    professionalType: {
      type: String,
      enum: ["personal", "creator", "business"],
      default: "personal",
    },
    showCategory: {
      type: Boolean,
      default: true,
    },
    contactEmail: {
      type: String,
      default: "",
    },
    contactPhone: {
      type: String,
      default: "",
    },
    businessAddress: {
      type: String,
      default: "",
    },
    showContactInfo: {
      type: Boolean,
      default: true,
    },
    insights: {
      reachCount: { type: Number, default: 0 },
      impressionsCount: { type: Number, default: 0 },
      profileVisitsCount: { type: Number, default: 0 },
      websiteTapsCount: { type: Number, default: 0 },
      contactTapsCount: { type: Number, default: 0 },
      directionsTapsCount: { type: Number, default: 0 },
    },
    profileImage: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },
    accountType: {
      // self created
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    qrCode: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    reels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reel",
      },
    ],
    savedReels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reel",
      },
    ],

    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
    closeFriends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    highlights: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Highlight",
      },
    ],
    mutedStories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    hiddenStoriesFrom: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followedHashtags: [
      {
        type: String,
      },
    ],
    searchHistory: [
      {
        targetUser: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        targetTag: String,
        searchedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notificationSettings: {
      pauseAll: { type: Boolean, default: false },
      pauseUntil: { type: Date, default: null },
      likes: { type: String, default: "everyone" }, // everyone, following, off
      comments: { type: String, default: "everyone" },
      newFollowers: { type: Boolean, default: true },
      directMessages: { type: Boolean, default: true },
    },

    // OTP Authentication Fields
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },

    // Password Reset Token Fields
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },

    // Email Verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },

    // 2FA Fields
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
    },
    twoFactorRecoveryCodes: [
      {
        type: String,
      },
    ],
    pendingTwoFactorToken: {
      type: String,
    },
    pendingTwoFactorExpiresAt: {
      type: Date,
    },

    // Magic Link Login
    magicLinkToken: {
      type: String,
    },
    magicLinkExpiresAt: {
      type: Date,
    },

    // OAuth Identifiers
    googleId: {
      type: String,
      sparse: true,
    },
    githubId: {
      type: String,
      sparse: true,
    },

    // Messaging & Privacy Settings
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedPlan: {
      type: String,
      default: null,
    },
    verifiedUntil: {
      type: Date,
      default: null,
    },
    readReceipts: {
      type: Boolean,
      default: true, // user can turn OFF
    },
    privacySettings: {
      allowMessagesFrom: {
        type: String,
        enum: ["everyone", "followers", "following", "no_one"],
        default: "everyone",
      },
      allowStoryRepliesFrom: {
        type: String,
        enum: ["everyone", "following", "off"],
        default: "everyone",
      },
      allowPostSharingToDM: {
        type: String,
        enum: ["everyone", "followers", "following", "no_one"],
        default: "everyone",
      },
      messageRequestPermission: {
        type: String,
        enum: ["requests", "dont_receive"],
        default: "requests",
      },
    },
    lastSeen: Date,
    isOnline: { type: Boolean, default: false },
    sensitiveContentFilter: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    snoozeSuggestedPosts: {
      type: Boolean,
      default: false,
    },
    snoozeExpiresAt: {
      type: Date,
      default: null,
    },
    contentCategoryInterests: {
      type: Map,
      of: Number,
      default: {},
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    mutedConversations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);

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
    },
    profession: {
      type: String,
      default: "",
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
      },
    ],
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
    loops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Loop",
      },
    ],
    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],

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

    // Password Reset Token Fields (Newly Added)
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },

    // Messaging Settings
    readReceipts: {
      type: Boolean,
      default: true, // user can turn OFF
    },
    lastSeen: Date,
    isOnline: { type: Boolean, default: false },
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

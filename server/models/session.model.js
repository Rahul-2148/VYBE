import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    deviceGroupId: {
      type: String,
      index: true,
    },
    oldRefreshTokenHash: {
      type: String,
      index: true,
    },
    rotatedAt: {
      type: Date,
    },
    deviceInfo: {
      type: String,
      default: "Unknown Device",
    },
    browser: {
      type: String,
      default: "Unknown Browser",
    },
    os: {
      type: String,
      default: "Unknown OS",
    },
    ipAddress: {
      type: String,
      default: "0.0.0.0",
    },
    location: {
      type: String,
      default: "Unknown Location",
    },
    userAgent: {
      type: String,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatic TTL cleanup upon expiration
    },
  },
  {
    timestamps: true,
  }
);

// Composite index for fast session lookup by user & revocation status
sessionSchema.index({ user: 1, isRevoked: 1 });

export const Session = mongoose.model("Session", sessionSchema);

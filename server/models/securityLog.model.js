import mongoose from "mongoose";

const securityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "login_success",
        "login_failed",
        "2fa_prompt",
        "2fa_enabled",
        "2fa_disabled",
        "2fa_recovery_used",
        "password_changed",
        "magic_link_requested",
        "magic_link_used",
        "session_revoked",
        "all_sessions_revoked",
        "suspicious_login_detected",
      ],
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: "0.0.0.0",
    },
    location: {
      type: String,
      default: "Unknown Location",
    },
    deviceInfo: {
      type: String,
      default: "Unknown Device",
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient audit history fetching sorted by timestamp
securityLogSchema.index({ user: 1, createdAt: -1 });

export const SecurityLog = mongoose.model("SecurityLog", securityLogSchema);

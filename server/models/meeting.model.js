import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      default: "VYBE Meeting",
      trim: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
      index: true,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["host", "co-host", "participant"],
          default: "participant",
        },
        status: {
          type: String,
          enum: ["joined", "left", "kicked"],
          default: "joined",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: {
          type: Date,
          default: null,
        },
      },
    ],
    settings: {
      allowScreenShare: {
        type: Boolean,
        default: true,
      },
      allowChat: {
        type: Boolean,
        default: true,
      },
      allowReactions: {
        type: Boolean,
        default: true,
      },
      muteOnEntry: {
        type: Boolean,
        default: false,
      },
      isLocked: {
        type: Boolean,
        default: false,
      },
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    recordingUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

meetingSchema.index({ meetingId: 1, status: 1 });
meetingSchema.index({ host: 1, createdAt: -1 });

export const Meeting = mongoose.model("Meeting", meetingSchema);

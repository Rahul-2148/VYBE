import mongoose from "mongoose";

const callSessionSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
    },
    type: {
      type: String,
      enum: ["voice", "audio", "video", "group", "channel"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ringing", "active", "ended"],
      default: "ringing",
      index: true,
    },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["ringing", "joined", "declined", "left", "busy", "disconnected"],
          default: "ringing",
        },
        role: {
          type: String,
          enum: ["host", "speaker", "listener"],
          default: "listener",
        },
        muted: {
          type: Boolean,
          default: false,
        },
        videoOff: {
          type: Boolean,
          default: false,
        },
        screenSharing: {
          type: Boolean,
          default: false,
        },
        handRaised: {
          type: Boolean,
          default: false,
        },
        socketId: {
          type: String,
          default: null,
        },
        joinedAt: Date,
        leftAt: Date,
      },
    ],
    recordingUrl: {
      type: String,
      default: null,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

callSessionSchema.index({ room: 1, status: 1 });

export const CallSession = mongoose.model("CallSession", callSessionSchema);

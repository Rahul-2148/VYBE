import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["text", "voice", "video"],
      required: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 250,
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

channelSchema.index({ community: 1, position: 1 });

export const Channel = mongoose.model("Channel", channelSchema);

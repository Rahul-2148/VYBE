import mongoose from "mongoose";

const adCampaignSchema = new mongoose.Schema(
  {
    advertiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: "",
    },
    ctaType: {
      type: String,
      enum: ["Learn More", "Shop Now", "Sign Up", "Contact Us"],
      default: "Learn More",
    },
    targetUrl: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      default: 50,
    },
    spent: {
      type: Number,
      default: 0,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const AdCampaign = mongoose.model("AdCampaign", adCampaignSchema);

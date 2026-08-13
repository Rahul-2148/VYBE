import mongoose from "mongoose";

const monetizationSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    isEligible: {
      type: Boolean,
      default: true,
    },
    subscriptionPrice: {
      type: Number,
      default: 4.99,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    subscribers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    payoutHistory: [
      {
        amount: Number,
        date: { type: Date, default: Date.now },
        status: { type: String, default: "paid" },
      },
    ],
  },
  { timestamps: true }
);

export const Monetization = mongoose.model("Monetization", monetizationSchema);

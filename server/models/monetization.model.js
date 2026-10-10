import mongoose from "mongoose";

const payoutEntrySchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "pending_review", "processing", "paid", "rejected"],
      default: "pending_review",
    },
    utrNumber: {
      type: String,
      trim: true,
      default: "",
    },
    settlementNotes: {
      type: String,
      trim: true,
      default: "",
    },
    paymentMethod: {
      type: String,
      default: "manual_bank_transfer",
    },
    currency: {
      type: String,
      default: "INR",
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: true, timestamps: true }
);

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
    payoutHistory: [payoutEntrySchema],
  },
  { timestamps: true }
);

export const Monetization = mongoose.model("Monetization", monetizationSchema);

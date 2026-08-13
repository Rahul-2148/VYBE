import mongoose from "mongoose";

const premiumPurchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
      index: true,
    },
    planName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed", "expired"],
      default: "created",
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    receipt: {
      type: String,
      default: null,
    },
    paymentAttemptedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    pendingUntil: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    benefits: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

premiumPurchaseSchema.index({ user: 1, planId: 1, status: 1 });

export const PremiumPurchase = mongoose.model("PremiumPurchase", premiumPurchaseSchema);

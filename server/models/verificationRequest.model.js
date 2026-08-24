import mongoose from "mongoose";

const verificationRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    knownAs: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: [
        "News/Media",
        "Sports",
        "Government/Politics",
        "Music/Art",
        "Fashion/Beauty",
        "Entertainment/Creator",
        "Business/Brand/Organization",
        "Other",
      ],
      required: true,
    },
    documentType: {
      type: String,
      enum: ["passport", "national_id", "drivers_license", "tax_filing_utility_bill"],
      required: true,
    },
    documentImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: "" },
      },
    ],
    socialLinks: [
      {
        type: String,
      },
    ],
    newsArticles: [
      {
        type: String,
      },
    ],
    additionalInfo: {
      type: String,
      default: "",
      maxlength: 1500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const VerificationRequest = mongoose.model("VerificationRequest", verificationRequestSchema);

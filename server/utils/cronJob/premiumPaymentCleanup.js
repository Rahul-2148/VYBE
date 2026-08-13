import mongoose from "mongoose";
import { PremiumPurchase } from "../../models/premiumPurchase.model.js";
import { User } from "../../models/user.model.js";

export const cleanupExpiredPremiumPayments = async () => {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const now = new Date();

    await PremiumPurchase.updateMany(
      {
        status: { $in: ["created", "pending"] },
        pendingUntil: { $lte: now },
      },
      {
        $set: {
          status: "failed",
          failureReason: "Payment window expired",
        },
      }
    );

    await PremiumPurchase.updateMany(
      {
        status: "paid",
        expiresAt: { $lte: now },
      },
      {
        $set: {
          status: "expired",
        },
      }
    );

    await User.updateMany(
      {
        isVerified: true,
        verifiedUntil: { $lte: now },
      },
      {
        $set: {
          isVerified: false,
          verifiedPlan: null,
          verifiedUntil: null,
        },
      }
    );
  } catch {
    // Suppress cron noise during reconnects or transient database issues.
  }
};

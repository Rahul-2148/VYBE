import crypto from "crypto";
import mongoose from "mongoose";
import { AdCampaign } from "../models/adCampaign.model.js";
import { Monetization } from "../models/monetization.model.js";
import { User } from "../models/user.model.js";
import { PremiumPurchase } from "../models/premiumPurchase.model.js";

const PREMIUM_PLANS = {
  blue_tick: {
    id: "blue_tick",
    name: "Blue Tick",
    amount: 299,
    currency: "INR",
    durationDays: 30,
    verified: true,
    benefits: [
      "Verified badge",
      "Priority profile ranking",
      "Premium creator insights",
      "Early access to features",
      "Priority support",
    ],
  },
  creator_pro: {
    id: "creator_pro",
    name: "Creator Pro",
    amount: 499,
    currency: "INR",
    durationDays: 30,
    verified: false,
    benefits: [
      "Creator analytics dashboard",
      "AI tools access",
      "Advanced media controls",
      "Priority support",
    ],
  },
  business_boost: {
    id: "business_boost",
    name: "Business Boost",
    amount: 999,
    currency: "INR",
    durationDays: 30,
    verified: false,
    benefits: [
      "Ad performance insights",
      "Lead-friendly profile tools",
      "Priority campaign review",
      "Premium support",
    ],
  },
};

const getPremiumPlan = (planId) => PREMIUM_PLANS[planId] || null;

const buildPremiumExpiry = (plan, currentExpiry = null) => {
  const baseDate = currentExpiry && new Date(currentExpiry).getTime() > Date.now() ? new Date(currentExpiry) : new Date();
  baseDate.setDate(baseDate.getDate() + (plan?.durationDays || 30));
  return baseDate;
};

const buildPendingExpiry = () => {
  const pendingUntil = new Date();
  pendingUntil.setMinutes(pendingUntil.getMinutes() + 15);
  return pendingUntil;
};

const isUnsupportedTransactionError = (error) => {
  const message = `${error?.message || ""}`.toLowerCase();
  return (
    message.includes("transaction numbers are only allowed on a replica set") ||
    message.includes("transaction is not supported") ||
    message.includes("replica set")
  );
};

const runPremiumTransaction = async (operation) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {
      // ignore abort errors
    }

    if (isUnsupportedTransactionError(error)) {
      return operation(null);
    }

    throw error;
  } finally {
    session.endSession();
  }
};

const fetchRazorpayResource = async (resourcePath) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are missing");
  }

  const response = await fetch(`https://api.razorpay.com/v1/${resourcePath}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.description || `Failed to load Razorpay ${resourcePath}`);
  }

  return data;
};

const verifyGatewayPaymentState = async ({ orderId, paymentId, expectedAmount, expectedCurrency }) => {
  const payment = await fetchRazorpayResource(`payments/${paymentId}`);

  if (payment?.order_id !== orderId) {
    throw new Error("Payment order mismatch");
  }

  if (expectedAmount && Number(payment?.amount) !== Number(expectedAmount)) {
    throw new Error("Payment amount mismatch");
  }

  if (expectedCurrency && payment?.currency !== expectedCurrency) {
    throw new Error("Payment currency mismatch");
  }

  if (!["authorized", "captured"].includes(payment?.status)) {
    throw new Error("Payment is not captured yet");
  }

  return payment;
};

const createRazorpayOrderOnGateway = async ({ amount, currency, receipt, notes }) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are missing");
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.description || "Failed to create Razorpay order");
  }

  return data;
};

export const getPremiumPlans = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      plans: Object.values(PREMIUM_PLANS),
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getPremiumPlans error: ${error.message}` });
  }
};

export const createPremiumOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = getPremiumPlan(planId);

    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid premium plan" });
    }

    const receipt = `vybe_${plan.id}_${Date.now()}`;
    let order;
    let usingMock = false;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      usingMock = true;
    } else {
      try {
        order = await createRazorpayOrderOnGateway({
          amount: plan.amount * 100,
          currency: plan.currency,
          receipt,
          notes: {
            userId: req.userId,
            planId: plan.id,
            planName: plan.name,
          },
        });
      } catch (err) {
        console.warn("Razorpay order creation failed, falling back to mock mode:", err.message);
        usingMock = true;
      }
    }

    if (usingMock) {
      order = {
        id: `mock_order_${Date.now()}`,
        amount: plan.amount * 100,
        currency: plan.currency,
        status: "created",
      };
    }

    const purchase = await runPremiumTransaction(async (session) => {
      const [createdPurchase] = await PremiumPurchase.create(
        [
          {
            user: req.userId,
            planId: plan.id,
            planName: plan.name,
            amount: plan.amount,
            currency: plan.currency,
            status: "pending",
            razorpayOrderId: order.id,
            receipt,
            expiresAt: buildPremiumExpiry(plan),
            pendingUntil: buildPendingExpiry(),
            benefits: plan.benefits,
          },
        ],
        session ? { session } : undefined
      );

      return createdPurchase;
    });

    return res.status(201).json({
      success: true,
      keyId: usingMock ? "mock_key_id" : keyId,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      plan,
      purchase,
      isMock: usingMock,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `createPremiumOrder error: ${error.message}` });
  }
};

export const verifyPremiumPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Incomplete payment payload" });
    }

    const isMock = razorpay_order_id.startsWith("mock_order_");

    if (!isMock) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment verification failed" });
      }
    }

    const purchase = await PremiumPurchase.findOne({ razorpayOrderId: razorpay_order_id, user: req.userId });
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    const plan = getPremiumPlan(planId || purchase.planId);
    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid premium plan" });
    }

    if (!isMock) {
      await verifyGatewayPaymentState({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        expectedAmount: purchase.amount * 100,
        expectedCurrency: purchase.currency,
      });
    }

    const updatedResult = await runPremiumTransaction(async (session) => {
      const freshPurchase = session
        ? await PremiumPurchase.findOne({ razorpayOrderId: razorpay_order_id, user: req.userId }).session(session)
        : await PremiumPurchase.findOne({ razorpayOrderId: razorpay_order_id, user: req.userId });

      if (!freshPurchase) {
        throw new Error("Payment record not found during verification");
      }

      freshPurchase.status = "paid";
      freshPurchase.razorpayPaymentId = razorpay_payment_id;
      freshPurchase.razorpaySignature = razorpay_signature;
      freshPurchase.paymentAttemptedAt = new Date();
      freshPurchase.paidAt = new Date();
      freshPurchase.failureReason = null;
      freshPurchase.pendingUntil = null;
      await freshPurchase.save(session ? { session } : undefined);

      const user = session ? await User.findById(req.userId).session(session) : await User.findById(req.userId);
      if (!user) {
        throw new Error("User not found during verification");
      }

      user.verifiedPlan = plan.id;
      user.verifiedUntil = buildPremiumExpiry(plan, user.verifiedUntil);
      user.isVerified = Boolean(plan.verified);
      await user.save(session ? { session } : undefined);

      return { purchase: freshPurchase, user };
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      purchase: updatedResult.purchase,
      user: updatedResult.user,
      plan,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `verifyPremiumPayment error: ${error.message}` });
  }
};

// Create Sponsored Ad Campaign
export const createAdCampaign = async (req, res) => {
  try {
    const { title, mediaUrl, caption, ctaType, targetUrl, budget } = req.body;

    const campaign = await AdCampaign.create({
      advertiser: req.userId,
      title,
      mediaUrl,
      caption,
      ctaType: ctaType || "Learn More",
      targetUrl,
      budget: budget || 50,
      status: "active",
    });

    const populated = await campaign.populate("advertiser", "name userName profileImage");

    return res.status(201).json({
      success: true,
      campaign: populated,
      message: "Sponsored Ad Campaign Launched Successfully!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `createAdCampaign error: ${error.message}` });
  }
};

// Fetch Active Sponsored Ads for Feed
export const getFeedAds = async (req, res) => {
  try {
    const ads = await AdCampaign.find({ status: "active" })
      .sort({ createdAt: -1 })
      .populate("advertiser", "name userName profileImage")
      .limit(10);

    return res.status(200).json({
      success: true,
      ads,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getFeedAds error: ${error.message}` });
  }
};

// Record Ad Click & Impression
export const recordAdClick = async (req, res) => {
  try {
    const { adId } = req.params;
    const { type } = req.body; // 'impression' or 'click'

    const ad = await AdCampaign.findById(adId);
    if (!ad) return res.status(404).json({ message: "Ad not found" });

    if (type === "click") {
      ad.clicks += 1;
      ad.spent += 0.25;
    } else {
      ad.impressions += 1;
    }

    if (ad.spent >= ad.budget) {
      ad.status = "completed";
    }

    await ad.save();

    return res.status(200).json({ success: true, ad });
  } catch (error) {
    return res.status(500).json({ success: false, message: `recordAdClick error: ${error.message}` });
  }
};

// Get Creator Monetization Dashboard Details
export const getMonetizationDetails = async (req, res) => {
  try {
    let monetization = await Monetization.findOne({ creator: req.userId });
    if (!monetization) {
      monetization = await Monetization.create({
        creator: req.userId,
        isEligible: true,
        totalEarnings: 0,
        payoutHistory: [],
      });
    }

    const campaigns = await AdCampaign.find({ advertiser: req.userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      monetization,
      campaigns,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getMonetizationDetails error: ${error.message}` });
  }
};

// Send Creator Digital Tip / Gift
export const sendCreatorGift = async (req, res) => {
  try {
    const { creatorId, amount } = req.body;

    let monetization = await Monetization.findOne({ creator: creatorId });
    if (!monetization) {
      monetization = await Monetization.create({ creator: creatorId, totalEarnings: 0 });
    }

    monetization.totalEarnings += Number(amount);
    await monetization.save();

    return res.status(200).json({
      success: true,
      message: `Successfully sent $${amount} gift tip to creator!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `sendCreatorGift error: ${error.message}` });
  }
};

// Withdraw Creator Earnings Payout
export const withdrawEarnings = async (req, res) => {
  try {
    let monetization = await Monetization.findOne({ creator: req.userId });
    if (!monetization || monetization.totalEarnings <= 0) {
      return res.status(400).json({ success: false, message: "No earnings available for payout" });
    }

    const withdrawAmount = monetization.totalEarnings;
    monetization.totalEarnings = 0;
    monetization.payoutHistory.unshift({
      amount: withdrawAmount,
      date: new Date(),
      status: "paid",
    });

    await monetization.save();

    return res.status(200).json({
      success: true,
      message: `Successfully processed payout of ₹${withdrawAmount.toFixed(2)}`,
      monetization,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `withdrawEarnings error: ${error.message}` });
  }
};

// Simulate Sandbox Earning for testing
export const simulateEarning = async (req, res) => {
  try {
    const { type, amount } = req.body; // type is 'gift' or 'subscriber'
    const earningAmount = Number(amount) || 100;

    let monetization = await Monetization.findOne({ creator: req.userId });
    if (!monetization) {
      monetization = await Monetization.create({
        creator: req.userId,
        isEligible: true,
        totalEarnings: 0,
        payoutHistory: [],
      });
    }

    monetization.totalEarnings += earningAmount;
    
    if (type === "subscriber") {
      // Find a mock user to add as subscriber
      const mockUser = await User.findOne({ _id: { $ne: req.userId } });
      if (mockUser && !monetization.subscribers.includes(mockUser._id)) {
        monetization.subscribers.push(mockUser._id);
      }
    }

    await monetization.save();

    return res.status(200).json({
      success: true,
      message: `Successfully simulated ₹${earningAmount} earning from ${type}!`,
      monetization,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `simulateEarning error: ${error.message}` });
  }
};

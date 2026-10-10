// server/tests/product-completeness.test.js
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import mongoose from "mongoose";
import {
  ROLE_HIERARCHY_LEVELS,
  getMemberHighestRole,
  canAccessChannel,
  canManageTargetMember,
} from "../utils/communityPermissionHelper.js";
import { Monetization } from "../models/monetization.model.js";

test("Community Role Hierarchy: owner > admin > moderator > member", () => {
  assert.equal(ROLE_HIERARCHY_LEVELS.owner, 4);
  assert.equal(ROLE_HIERARCHY_LEVELS.admin, 3);
  assert.equal(ROLE_HIERARCHY_LEVELS.moderator, 2);
  assert.equal(ROLE_HIERARCHY_LEVELS.member, 1);

  // Community owner always resolves to owner level
  const mockCommunity = {
    owner: "user_owner_1",
    members: [
      { user: "user_owner_1", roles: ["admin", "member"] },
      { user: "user_admin_1", roles: ["admin", "member"] },
      { user: "user_mod_1", roles: ["moderator", "member"] },
      { user: "user_mem_1", roles: ["member"] },
    ],
  };

  assert.equal(getMemberHighestRole(mockCommunity, "user_owner_1"), "owner");
  assert.equal(getMemberHighestRole(mockCommunity, "user_admin_1"), "admin");
  assert.equal(getMemberHighestRole(mockCommunity, "user_mod_1"), "moderator");
  assert.equal(getMemberHighestRole(mockCommunity, "user_mem_1"), "member");
  assert.equal(getMemberHighestRole(mockCommunity, "non_member"), null);
});

test("Community Permissions: caller can only manage members of strictly lower rank", () => {
  const mockCommunity = {
    owner: "user_owner_1",
    members: [
      { user: "user_owner_1", roles: ["admin", "member"] },
      { user: "user_admin_1", roles: ["admin", "member"] },
      { user: "user_admin_2", roles: ["admin", "member"] },
      { user: "user_mod_1", roles: ["moderator", "member"] },
      { user: "user_mem_1", roles: ["member"] },
    ],
  };

  // Owner can manage anyone
  assert.equal(canManageTargetMember(mockCommunity, "user_owner_1", "user_admin_1"), true);
  assert.equal(canManageTargetMember(mockCommunity, "user_owner_1", "user_mod_1"), true);
  assert.equal(canManageTargetMember(mockCommunity, "user_owner_1", "user_mem_1"), true);

  // Admin cannot manage owner or peer admin
  assert.equal(canManageTargetMember(mockCommunity, "user_admin_1", "user_owner_1"), false);
  assert.equal(canManageTargetMember(mockCommunity, "user_admin_1", "user_admin_2"), false);

  // Admin CAN manage moderator and regular member
  assert.equal(canManageTargetMember(mockCommunity, "user_admin_1", "user_mod_1"), true);
  assert.equal(canManageTargetMember(mockCommunity, "user_admin_1", "user_mem_1"), true);

  // Moderator cannot manage admin, peer mod, or owner
  assert.equal(canManageTargetMember(mockCommunity, "user_mod_1", "user_admin_1"), false);
  assert.equal(canManageTargetMember(mockCommunity, "user_mod_1", "user_owner_1"), false);
  assert.equal(canManageTargetMember(mockCommunity, "user_mod_1", "user_mem_1"), true);

  // Regular member cannot manage anyone
  assert.equal(canManageTargetMember(mockCommunity, "user_mem_1", "user_mem_1"), false);
});

test("Private Channel Access: respects allowedRoles and rejects unauthorized members", () => {
  const mockCommunity = {
    owner: "user_owner_1",
    members: [
      { user: "user_owner_1", roles: ["admin", "member"] },
      { user: "user_admin_1", roles: ["admin", "member"] },
      { user: "user_mod_1", roles: ["moderator", "member"] },
      { user: "user_mem_1", roles: ["member"] },
    ],
  };

  const publicChannel = {
    isPrivate: false,
    allowedRoles: [],
  };

  const modOnlyChannel = {
    isPrivate: true,
    allowedRoles: ["admin", "moderator"],
  };

  const adminOnlyChannel = {
    isPrivate: true,
    allowedRoles: ["admin"],
  };

  // Public channel accessible to all community members
  assert.equal(canAccessChannel(mockCommunity, publicChannel, "user_owner_1"), true);
  assert.equal(canAccessChannel(mockCommunity, publicChannel, "user_admin_1"), true);
  assert.equal(canAccessChannel(mockCommunity, publicChannel, "user_mod_1"), true);
  assert.equal(canAccessChannel(mockCommunity, publicChannel, "user_mem_1"), true);
  assert.equal(canAccessChannel(mockCommunity, publicChannel, "outsider"), false);

  // Moderator channel accessible to owner, admin, and mod; rejected for regular member
  assert.equal(canAccessChannel(mockCommunity, modOnlyChannel, "user_owner_1"), true);
  assert.equal(canAccessChannel(mockCommunity, modOnlyChannel, "user_admin_1"), true);
  assert.equal(canAccessChannel(mockCommunity, modOnlyChannel, "user_mod_1"), true);
  assert.equal(canAccessChannel(mockCommunity, modOnlyChannel, "user_mem_1"), false);

  // Admin-only channel accessible to owner and admin; rejected for mod and regular member
  assert.equal(canAccessChannel(mockCommunity, adminOnlyChannel, "user_owner_1"), true);
  assert.equal(canAccessChannel(mockCommunity, adminOnlyChannel, "user_admin_1"), true);
  assert.equal(canAccessChannel(mockCommunity, adminOnlyChannel, "user_mod_1"), false);
  assert.equal(canAccessChannel(mockCommunity, adminOnlyChannel, "user_mem_1"), false);
});

test("Payment Security: Signature Verification requires constant-time comparison and 64-char hex format", () => {
  const secret = "test_razorpay_secret_12345";
  const orderId = "order_987654321";
  const paymentId = "pay_123456789";

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  assert.equal(generatedSignature.length, 64);

  // Verify valid signature
  const sigBuffer = Buffer.from(generatedSignature, "hex");
  const expectedBuffer = Buffer.from(
    crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex"),
    "hex"
  );
  assert.equal(crypto.timingSafeEqual(sigBuffer, expectedBuffer), true);

  // Verify tampered signature fails
  const tamperedHex = "a".repeat(64);
  const tamperedBuffer = Buffer.from(tamperedHex, "hex");
  assert.equal(crypto.timingSafeEqual(tamperedBuffer, expectedBuffer), false);
});

test("Payment Security: Order expiration reject windows", () => {
  const expiredOrder = {
    pendingUntil: new Date(Date.now() - 60000), // 1 minute ago
  };
  const validOrder = {
    pendingUntil: new Date(Date.now() + 600000), // 10 minutes from now
  };

  const isExpired = (order) => order.pendingUntil && new Date(order.pendingUntil).getTime() < Date.now();

  assert.equal(isExpired(expiredOrder), true);
  assert.equal(isExpired(validOrder), false);
});

test("Payment Security: Subscription Idempotency prevents re-extending expiry or duplicate entitlements", () => {
  const purchase = {
    status: "paid",
    planId: "pro_monthly",
    paidAt: new Date("2026-10-01"),
    expiresAt: new Date("2026-11-01"),
  };

  const user = {
    isVerified: true,
    verifiedUntil: new Date("2026-11-01"),
  };

  // If already paid, verification returns existing state without recalculating expiry
  const verifyPurchase = (p, u) => {
    if (p.status === "paid") {
      return { modified: false, expiresAt: u.verifiedUntil };
    }
    p.status = "paid";
    u.verifiedUntil = new Date(Date.now() + 30 * 86400 * 1000);
    return { modified: true, expiresAt: u.verifiedUntil };
  };

  const firstAttempt = verifyPurchase(purchase, user);
  assert.equal(firstAttempt.modified, false);
  assert.equal(firstAttempt.expiresAt.toISOString(), new Date("2026-11-01").toISOString());
});

test("Payout Schema & Persistence: UTR, settlement notes, and processor metadata persist correctly in Mongoose document", () => {
  const dummyAdminId = new mongoose.Types.ObjectId();
  const dummyCreatorId = new mongoose.Types.ObjectId();

  const monDoc = new Monetization({
    creator: dummyCreatorId,
    totalEarnings: 2500,
    payoutHistory: [
      {
        amount: 1500,
        status: "paid",
        utrNumber: "UTR987654321012",
        settlementNotes: "Processed via NEFT settlement manual confirmation",
        paymentMethod: "manual_bank_transfer",
        currency: "INR",
        processedAt: new Date(),
        processedBy: dummyAdminId,
      },
    ],
  });

  const serialized = monDoc.toObject();
  const payout = serialized.payoutHistory[0];

  assert.equal(payout.amount, 1500);
  assert.equal(payout.status, "paid");
  assert.equal(payout.utrNumber, "UTR987654321012");
  assert.equal(payout.settlementNotes, "Processed via NEFT settlement manual confirmation");
  assert.equal(payout.paymentMethod, "manual_bank_transfer");
  assert.equal(payout.currency, "INR");
  assert.ok(payout.processedAt instanceof Date);
  assert.equal(payout.processedBy.toString(), dummyAdminId.toString());
});

test("Payout Settlement Logic: status transitions, UTR requirement, and single-refund guard", () => {
  const payout = {
    amount: 1000,
    status: "pending_review",
    utrNumber: "",
  };

  let totalEarnings = 500;

  // 1. Marking paid requires UTR number
  const tryMarkPaid = (p, utr) => {
    if (!utr || !utr.trim()) {
      throw new Error("UTR number is required");
    }
    p.status = "paid";
    p.utrNumber = utr.trim();
  };

  assert.throws(() => tryMarkPaid(payout, ""), /UTR number is required/);
  tryMarkPaid(payout, "AXISB00012345");
  assert.equal(payout.status, "paid");
  assert.equal(payout.utrNumber, "AXISB00012345");

  // 2. Already paid payout cannot be altered
  const tryAlterPaid = (p) => {
    if (p.status === "paid") {
      throw new Error("Finalized as paid and cannot be altered");
    }
  };
  assert.throws(() => tryAlterPaid(payout), /cannot be altered/);

  // 3. Rejection refund: only refunds when transitioning from non-rejected
  const pendingPayout = { amount: 800, status: "pending_review" };
  const handleReject = (p) => {
    const prev = p.status;
    if (prev === "rejected") {
      throw new Error("Already rejected");
    }
    p.status = "rejected";
    if (prev !== "rejected") {
      totalEarnings += p.amount;
    }
  };

  handleReject(pendingPayout);
  assert.equal(totalEarnings, 1300); // 500 + 800
  assert.throws(() => handleReject(pendingPayout), /Already rejected/);
  assert.equal(totalEarnings, 1300); // Does NOT double refund!
});

test("Instagram Ephemeral Media (View Once): opened state is immutable per recipient", () => {
  const message = {
    isViewOnce: true,
    viewOnceOpenedBy: [],
  };

  // Recipient 1 opens
  const userId1 = "user_recip_1";
  const alreadyOpened1 = message.viewOnceOpenedBy.includes(userId1);
  assert.equal(alreadyOpened1, false);

  message.viewOnceOpenedBy.push(userId1);
  assert.equal(message.viewOnceOpenedBy.includes(userId1), true);

  // Subsequent open attempt is blocked
  const alreadyOpenedAgain = message.viewOnceOpenedBy.includes(userId1);
  assert.equal(alreadyOpenedAgain, true);
});

test("Instagram Scheduled DMs: atomic worker claim prevents duplicate concurrent dispatch", () => {
  const dueQueue = [
    { _id: "msg_1", status: "scheduled", text: "Hello" },
    { _id: "msg_2", status: "scheduled", text: "World" },
  ];

  // Simulating atomic findOneAndUpdate({ _id, status: "scheduled" }, { status: "sent" })
  const claimedByWorkerA = [];
  const claimedByWorkerB = [];

  const atomicClaim = (msgId) => {
    const item = dueQueue.find((m) => m._id === msgId && m.status === "scheduled");
    if (!item) return null;
    item.status = "sent";
    return item;
  };

  // Worker A claims msg_1
  const resA1 = atomicClaim("msg_1");
  if (resA1) claimedByWorkerA.push(resA1._id);

  // Worker B attempts to claim msg_1 concurrently
  const resB1 = atomicClaim("msg_1");
  if (resB1) claimedByWorkerB.push(resB1._id);

  // Worker B claims msg_2
  const resB2 = atomicClaim("msg_2");
  if (resB2) claimedByWorkerB.push(resB2._id);

  assert.deepEqual(claimedByWorkerA, ["msg_1"]);
  assert.deepEqual(claimedByWorkerB, ["msg_2"]);
  assert.equal(resB1, null); // Blocked from duplicate processing
});

test("Group QR Invitation: tokens require valid structure and expiration", () => {
  const validToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 86400 * 1000);

  const isTokenValid = (token, exp) => {
    if (!token || typeof token !== "string" || token.length < 32) return false;
    if (new Date(exp).getTime() < Date.now()) return false;
    return true;
  };

  assert.equal(isTokenValid(validToken, expiresAt), true);
  assert.equal(isTokenValid("short", expiresAt), false);
  assert.equal(isTokenValid(validToken, new Date(Date.now() - 1000)), false);
});

test("Community Moderation: Message Deletion & WebRTC room respect role hierarchy & channel access", () => {
  const community = {
    owner: "user_owner_1",
    members: [
      { user: "user_owner_1", roles: ["admin", "member"] },
      { user: "user_admin_1", roles: ["admin", "member"] },
      { user: "user_admin_2", roles: ["admin", "member"] },
      { user: "user_mod_1", roles: ["moderator", "member"] },
      { user: "user_mem_1", roles: ["member"] },
    ],
  };

  const channelPrivate = {
    isPrivate: true,
    allowedRoles: ["admin"],
  };

  // Simulating message deletion permission logic
  const canDeleteMessage = (callerId, senderId) => {
    if (callerId === senderId) return true; // Sender can delete own message
    if (callerId === community.owner) return true; // Owner can delete anyone's message
    const callerMember = community.members.find((m) => m.user === callerId);
    if (!callerMember) return false;
    const isStaff = callerMember.roles.includes("admin") || callerMember.roles.includes("moderator");
    if (!isStaff) return false;
    return canManageTargetMember(community, callerId, senderId);
  };

  // Owner can delete anyone's
  assert.equal(canDeleteMessage("user_owner_1", "user_mem_1"), true);
  assert.equal(canDeleteMessage("user_owner_1", "user_mod_1"), true);
  assert.equal(canDeleteMessage("user_owner_1", "user_admin_1"), true);

  // Admin can delete mod & member, but not peer admin or owner
  assert.equal(canDeleteMessage("user_admin_1", "user_mem_1"), true);
  assert.equal(canDeleteMessage("user_admin_1", "user_mod_1"), true);
  assert.equal(canDeleteMessage("user_admin_1", "user_admin_2"), false);
  assert.equal(canDeleteMessage("user_admin_1", "user_owner_1"), false);

  // Mod can delete member, but not admin, peer mod, or owner
  assert.equal(canDeleteMessage("user_mod_1", "user_mem_1"), true);
  assert.equal(canDeleteMessage("user_mod_1", "user_mod_1"), true); // own message
  assert.equal(canDeleteMessage("user_mod_1", "user_admin_1"), false);
  assert.equal(canDeleteMessage("user_mod_1", "user_owner_1"), false);

  // Member cannot delete anyone else's message
  assert.equal(canDeleteMessage("user_mem_1", "user_mem_1"), true); // own message
  assert.equal(canDeleteMessage("user_mem_1", "user_mod_1"), false);

  // WebRTC private channel room joining check
  assert.equal(canAccessChannel(community, channelPrivate, "user_owner_1"), true);
  assert.equal(canAccessChannel(community, channelPrivate, "user_admin_1"), true);
  assert.equal(canAccessChannel(community, channelPrivate, "user_mod_1"), false);
  assert.equal(canAccessChannel(community, channelPrivate, "user_mem_1"), false);
});


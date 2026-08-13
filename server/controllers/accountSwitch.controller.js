import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
import { SecurityLog } from "../models/securityLog.model.js";
import { generateAccessToken, generateRefreshToken } from "../config/generateToken.js";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getAuthCookieOptions,
} from "../config/cookieOptions.js";
import { parseDeviceDetails } from "../utils/deviceParser.js";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const getOrCreateDeviceGroupId = (req, res) => {
  let deviceGroupId = req.cookies?.deviceGroupId;
  if (!deviceGroupId) {
    deviceGroupId = crypto.randomBytes(16).toString("hex");
    res.cookie("deviceGroupId", deviceGroupId, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true" || false,
      sameSite: process.env.COOKIE_SAME_SITE || "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }
  return deviceGroupId;
};

const createSecurityAuditLog = async (userId, eventType, req, metadata = {}) => {
  try {
    const { deviceInfo, ipAddress, location, userAgent } = parseDeviceDetails(req);
    await SecurityLog.create({
      user: userId,
      eventType,
      deviceInfo,
      ipAddress,
      location,
      userAgent,
      metadata,
    });
  } catch (error) {
    console.error("Security audit logging error:", error.message);
  }
};

/**
 * Switch Account Controller
 * Allows an authenticated user to switch to another account that has
 * an existing active session on the server.
 *
 * POST /auth/switch-account
 * Body: { targetUserId }
 * Requires: isAuthenticated middleware
 */
export const switchAccount = async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    const currentUserId = req.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Target user ID is required.",
      });
    }

    // Prevent switching to same account
    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "You are already on this account.",
      });
    }

    // Verify target user exists
    const targetUser = await User.findById(targetUserId).select("-password -twoFactorSecret -twoFactorRecoveryCodes");
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Target account not found.",
      });
    }

    const currentSession = await Session.findById(req.sessionId);
    if (!currentSession || !currentSession.deviceGroupId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Current session is invalid or missing device group tracking.",
      });
    }

    // Find the most recent active (non-revoked, non-expired) session for target user belonging to the SAME deviceGroupId
    const targetSession = await Session.findOne({
      user: targetUserId,
      isRevoked: false,
      deviceGroupId: currentSession.deviceGroupId,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActive: -1 });

    if (!targetSession) {
      // No active session exists — user needs to re-login for this account
      return res.status(401).json({
        success: false,
        error: true,
        code: "NEEDS_RELOGIN",
        message: "Session expired for this account. Please log in again.",
      });
    }

    // Issue new tokens for the target user's session
    const accessToken = generateAccessToken(targetUser._id, targetSession._id);
    const refreshToken = generateRefreshToken(targetUser._id, targetSession._id);

    // Update session
    targetSession.refreshTokenHash = hashToken(refreshToken);
    targetSession.lastActive = new Date();
    await targetSession.save();

    // Set cookies for target account
    res.cookie("accessToken", accessToken, getAccessTokenCookieOptions());
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions(true));
    res.cookie("token", accessToken, getAuthCookieOptions());

    await createSecurityAuditLog(targetUser._id, "account_switch", req, {
      fromUserId: currentUserId,
    });

    const userResponse = targetUser.toObject();

    return res.status(200).json({
      success: true,
      error: false,
      message: `Switched to @${targetUser.userName}`,
      token: accessToken,
      user: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Switch Account Error: ${error.message}`,
    });
  }
};

/**
 * Add Account Login Controller
 * Same as regular signIn, but does NOT revoke the previous account's session.
 * Used when adding a new account to the multi-account registry.
 *
 * POST /auth/add-account-login
 * Body: { userName, password, rememberMe }
 * Public (no auth required — user might be unauthenticated or authenticated)
 */
export const addAccountLogin = async (req, res) => {
  try {
    const { userName, password, rememberMe = true } = req.body || {};

    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Username and password are required.",
      });
    }

    const escapedUserName = userName.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const user = await User.findOne({
      $or: [
        { userName: { $regex: new RegExp("^" + escapedUserName + "$", "i") } },
        { email: userName.trim().toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid credentials. User not found.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await createSecurityAuditLog(user._id, "login_failed", req, { reason: "incorrect_password", context: "add_account" });
      return res.status(400).json({
        success: false,
        error: true,
        message: "Incorrect password. Please try again.",
      });
    }

    // 2FA CHECK — same as normal signIn
    if (user.twoFactorEnabled) {
      const pendingTwoFactorToken = crypto.randomBytes(32).toString("hex");
      user.pendingTwoFactorToken = pendingTwoFactorToken;
      user.pendingTwoFactorExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();

      await createSecurityAuditLog(user._id, "2fa_prompt", req);

      return res.status(200).json({
        success: true,
        error: false,
        requiresTwoFactor: true,
        pendingToken: pendingTwoFactorToken,
        message: "Two-Factor Authentication required.",
        isAccountAdd: true,
      });
    }

    // CREATE NEW SESSION for the added account (does NOT revoke existing sessions)
    const { deviceInfo, browser, os, ipAddress, location, userAgent } = parseDeviceDetails(req);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const session = await Session.create({
      user: user._id,
      refreshTokenHash: "pending",
      deviceGroupId: getOrCreateDeviceGroupId(req, res),
      deviceInfo,
      browser,
      os,
      ipAddress,
      location,
      userAgent,
      expiresAt,
    });

    const accessToken = generateAccessToken(user._id, session._id);
    const refreshToken = generateRefreshToken(user._id, session._id);

    session.refreshTokenHash = hashToken(refreshToken);
    await session.save();

    res.cookie("accessToken", accessToken, getAccessTokenCookieOptions());
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions(rememberMe));
    res.cookie("token", accessToken, getAuthCookieOptions());

    await createSecurityAuditLog(user._id, "login_success", req, { method: "add_account" });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorSecret;
    delete userResponse.twoFactorRecoveryCodes;

    return res.status(200).json({
      success: true,
      error: false,
      message: `Added @${user.userName} to your accounts`,
      token: accessToken,
      user: userResponse,
      isAccountAdd: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Add Account Login Error: ${error.message}`,
    });
  }
};

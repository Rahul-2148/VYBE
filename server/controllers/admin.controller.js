import bcryptjs from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Reel } from "../models/reel.model.js";
import { Story } from "../models/story.model.js";
import { LiveStream } from "../models/liveStream.model.js";
import { Report } from "../models/report.model.js";
import { VerificationRequest } from "../models/verificationRequest.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { SecurityLog } from "../models/securityLog.model.js";
import { SystemAnnouncement } from "../models/systemAnnouncement.model.js";
import { ModerationLog } from "../models/moderationLog.model.js";
import { Session } from "../models/session.model.js";
import { Notification } from "../models/notification.model.js";
import { Monetization } from "../models/monetization.model.js";
import { PremiumPurchase } from "../models/premiumPurchase.model.js";
import { AdCampaign } from "../models/adCampaign.model.js";
import { generateAccessToken, generateRefreshToken } from "../config/generateToken.js";
import {
  getAdminAccessTokenCookieOptions,
  getAdminRefreshTokenCookieOptions,
  getAdminAuthCookieOptions,
  getAdminClearCookieOptions,
} from "../config/cookieOptions.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { STAFF_ROLES } from "../middlewares/adminAuth.js";
import { getSocket } from "../socket.js";
import { OAuth2Client } from "google-auth-library";
import sendEmail from "../utils/sendEmail.js";
import { forgotPasswordTemplate } from "../utils/emailTemplates/ForgotPasswordTemplate.js";
import { passwordResetSuccessTemplate } from "../utils/emailTemplates/PasswordResetSuccessTemplate.js";
import { staffInvitationTemplate } from "../utils/emailTemplates/StaffInvitationTemplate.js";
import { redisService } from "../services/redis.service.js";

const DISALLOWED_EMAIL_DOMAINS = [
  "mailinator.com",
  "10minutemail.com",
  "tempmail.com",
  "guerrillamail.com",
  "fake.com",
  "dummy.com",
  "test.com",
  "throwaway.com",
  "disposable.com",
  "temp-mail.org",
  "sharklasers.com",
  "yopmail.com",
  "example.com",
  "sample.com",
];

const isValidWorkEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || DISALLOWED_EMAIL_DOMAINS.includes(domain)) return false;
  return true;
};

// Helper: Log Admin Action to Audit Trail
const logAudit = async (adminId, action, targetType, targetId, targetName, details = {}, req = {}) => {
  try {
    const ipAddress = req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "0.0.0.0";
    const userAgent = req.headers?.["user-agent"] || "Internal Admin API";
    const newLog = await AuditLog.create({
      admin: adminId,
      action,
      targetType,
      targetId: targetId?.toString() || "",
      targetName: targetName || "",
      details,
      ipAddress,
      userAgent,
    });

    const populatedLog = await AuditLog.findById(newLog._id).populate("admin", "name userName role profileImage");
    const socket = getSocket();
    if (socket) {
      socket.to("admin_staff").emit("audit:new", populatedLog);
    }
  } catch (err) {
    console.error("Audit log creation error:", err.message);
  }
};

/* ==========================================================================
   1. ADMIN AUTHENTICATION & PROFILE
   ========================================================================== */

export const adminLogin = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ success: false, message: "Please provide credentials." });
    }

    const cleanInput = emailOrUsername.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: cleanInput }, { userName: cleanInput }],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid administrative credentials." });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: "This administrative account is suspended." });
    }

    if (!user.role || !STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have staff or admin privileges.",
      });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid administrative credentials." });
    }

    // Create session
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
    const userAgent = req.headers["user-agent"] || "Admin Portal";

    const session = await Session.create({
      user: user._id,
      userAgent,
      ipAddress,
      deviceInfo: "Admin Portal",
      browser: "Admin Panel",
      os: "Desktop",
      refreshTokenHash: "placeholder",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const accessToken = generateAccessToken(user._id, session._id);
    const refreshToken = generateRefreshToken(user._id, session._id);

    session.refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await session.save();

    res.cookie("admin_accessToken", accessToken, getAdminAccessTokenCookieOptions(true));
    res.cookie("admin_refreshToken", refreshToken, getAdminRefreshTokenCookieOptions(true));
    res.cookie("admin_token", accessToken, getAdminAuthCookieOptions(true));

    await logAudit(user._id, "ADMIN_LOGIN", "system", user._id, user.userName, { role: user.role }, req);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        _id: user._id,
        name: user.name,
        userName: user.userName,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        adminPermissions: user.adminPermissions || [],
        isVerified: user.isVerified,
      },
      token: accessToken,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Admin login error: ${error.message}` });
  }
};

export const getAdminMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        _id: req.adminUser._id,
        name: req.adminUser.name,
        userName: req.adminUser.userName,
        email: req.adminUser.email,
        profileImage: req.adminUser.profileImage,
        role: req.adminUser.role,
        adminPermissions: req.adminUser.adminPermissions || [],
        isVerified: req.adminUser.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getAdminMe error: ${error.message}` });
  }
};

export const adminLogout = async (req, res) => {
  try {
    if (req.sessionId) {
      await Session.findByIdAndUpdate(req.sessionId, { isRevoked: true });
    }

    res.clearCookie("admin_accessToken", getAdminClearCookieOptions());
    res.clearCookie("admin_refreshToken", getAdminClearCookieOptions());
    res.clearCookie("admin_token", getAdminClearCookieOptions());

    return res.status(200).json({ success: true, message: "Logged out from Admin Portal." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Admin logout error: ${error.message}` });
  }
};

// 1.1 Admin Google SSO Login
export const adminGoogleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential missing." });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ success: false, message: "Google Auth is not configured on server." });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No staff account found associated with this Google email.",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: "This administrative account is suspended." });
    }

    if (!user.role || !STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your Google account does not have staff or operational privileges.",
      });
    }

    // Create session
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
    const userAgent = req.headers["user-agent"] || "Admin Portal (Google SSO)";

    const session = await Session.create({
      user: user._id,
      userAgent,
      ipAddress,
      deviceInfo: "Admin Portal (Google SSO)",
      browser: "Admin Panel",
      os: "Desktop",
      refreshTokenHash: "placeholder",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const accessToken = generateAccessToken(user._id, session._id);
    const refreshToken = generateRefreshToken(user._id, session._id);

    session.refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await session.save();

    res.cookie("admin_accessToken", accessToken, getAdminAccessTokenCookieOptions(true));
    res.cookie("admin_refreshToken", refreshToken, getAdminRefreshTokenCookieOptions(true));
    res.cookie("admin_token", accessToken, getAdminAuthCookieOptions(true));

    await logAudit(user._id, "ADMIN_GOOGLE_LOGIN", "system", user._id, user.userName, { role: user.role }, req);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        _id: user._id,
        name: user.name,
        userName: user.userName,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        adminPermissions: user.adminPermissions || [],
        isVerified: user.isVerified,
      },
      token: accessToken,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Google admin login error: ${error.message}` });
  }
};

// 1.2 Admin Forgot Password (Request OTP)
export const adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.role || !STAFF_ROLES.includes(user.role)) {
      return res.status(404).json({ success: false, message: "No operational staff account found with this email." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString("hex");

    await redisService.storeOtp(`admin_reset:${user.email}`, otp, 15 * 60);

    user.otp = otp;
    user.otpExpiresAt = Date.now() + 15 * 60 * 1000;
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `http://localhost:5174/reset-password/${token}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "🔒 VYBE Operations Suite: Password Reset Code",
        html: forgotPasswordTemplate(user.name, otp, resetLink),
        message: `Admin security code: ${otp}. Reset link: ${resetLink}`,
      });
    } catch (mailErr) {
      console.warn("Mail send error (continuing with OTP):", mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Administrative recovery code dispatched to registered email.",
      debugOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Forgot password error: ${error.message}` });
  }
};

// 1.3 Admin Verify Forgot OTP
export const adminVerifyForgotOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required." });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.role || !STAFF_ROLES.includes(user.role)) {
      return res.status(404).json({ success: false, message: "Staff account not found." });
    }

    const isRedisValid = await redisService.verifyOtp(`admin_reset:${user.email}`, otp);
    const isDbValid = String(user.otp) === String(otp) && user.otpExpiresAt > Date.now();

    if (!isRedisValid && !isDbValid) {
      return res.status(400).json({ success: false, message: "Invalid or expired recovery code." });
    }

    user.isOtpVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Code verified successfully.",
      resetToken: user.resetPasswordToken,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Verify OTP error: ${error.message}` });
  }
};

// 1.4 Admin Reset Password
export const adminResetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    let user;
    if (token) {
      user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
    } else if (email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
      if (!user?.isOtpVerified) {
        return res.status(400).json({ success: false, message: "OTP not verified yet." });
      }
    }

    if (!user || !user.role || !STAFF_ROLES.includes(user.role)) {
      return res.status(400).json({ success: false, message: "Invalid or expired recovery request." });
    }

    const hashed = await bcryptjs.hash(newPassword, 10);
    user.password = hashed;
    user.isOtpVerified = false;
    user.otp = null;
    user.otpExpiresAt = null;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await logAudit(user._id, "ADMIN_PASSWORD_RESET", "user", user._id, user.userName, {}, req);

    try {
      await sendEmail({
        email: user.email,
        subject: "✅ VYBE Admin Security: Password Changed Successfully",
        html: passwordResetSuccessTemplate(user.name),
        message: `Hi ${user.name}, your operations console password has been reset.`,
      });
    } catch (e) {}

    return res.status(200).json({ success: true, message: "Administrative password updated successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Reset password error: ${error.message}` });
  }
};

// 1.5 Admin Change Password (Authenticated)
export const adminChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.adminUser._id);
    if (!user) return res.status(404).json({ success: false, message: "Admin account not found." });

    const isMatch = await bcryptjs.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    user.password = await bcryptjs.hash(newPassword, 10);
    await user.save();

    await logAudit(user._id, "ADMIN_PASSWORD_CHANGE", "user", user._id, user.userName, {}, req);

    return res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Change password error: ${error.message}` });
  }
};

// 1.6 Admin Update Profile Details (Authenticated)
export const adminUpdateProfile = async (req, res) => {
  try {
    const { name, bio, phoneNumber } = req.body;
    const user = await User.findById(req.adminUser._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (name && name.trim()) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber.trim();

    await user.save();
    await logAudit(user._id, "ADMIN_PROFILE_UPDATE", "user", user._id, user.userName, { name, bio }, req);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        userName: user.userName,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        adminPermissions: user.adminPermissions || [],
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Update profile error: ${error.message}` });
  }
};

// 1.7 Admin Full Profile & Telemetry Data (Authenticated)
export const adminGetProfileData = async (req, res) => {
  try {
    const user = await User.findById(req.adminUser._id).select("-password -otp -resetPasswordToken");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const sessions = await Session.find({ user: user._id, isRevoked: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(10);

    const recentAudits = await AuditLog.find({ admin: user._id })
      .sort({ createdAt: -1 })
      .limit(15);

    return res.status(200).json({
      success: true,
      profile: {
        user,
        sessions,
        recentAudits,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Get profile data error: ${error.message}` });
  }
};

// 1.8 Admin Revoke Specific Session (Authenticated)
export const adminRevokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, user: req.adminUser._id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found." });

    session.isRevoked = true;
    await session.save();

    await logAudit(req.adminUser._id, "ADMIN_SESSION_REVOKE", "session", sessionId, "", {}, req);

    return res.status(200).json({ success: true, message: "Remote session revoked." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Revoke session error: ${error.message}` });
  }
};

// 1.9 Admin Revoke All Other Sessions (Authenticated)
export const adminRevokeAllOtherSessions = async (req, res) => {
  try {
    await Session.updateMany(
      { user: req.adminUser._id, _id: { $ne: req.sessionId } },
      { isRevoked: true }
    );

    await logAudit(req.adminUser._id, "ADMIN_REVOKE_ALL_SESSIONS", "session", req.adminUser._id, "", {}, req);

    return res.status(200).json({ success: true, message: "All other active sessions revoked." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Revoke all sessions error: ${error.message}` });
  }
};

// 1.10 Admin Send Email Change OTP (Authenticated)
export const adminSendEmailChangeOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || !isValidWorkEmail(newEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid, authentic new email address. Disposable domains are blocked.",
      });
    }

    const cleanNewEmail = newEmail.trim().toLowerCase();

    // Check if new email is already taken
    const existing = await User.findOne({ email: cleanNewEmail, _id: { $ne: req.adminUser._id } });
    if (existing) {
      return res.status(400).json({ success: false, message: "This email address is already in use by another account." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisService.storeOtp(`admin_email_change:${req.adminUser._id}:${cleanNewEmail}`, otp, 15 * 60);

    try {
      await sendEmail({
        email: cleanNewEmail,
        subject: `🔒 VYBE Operations: Verify Your New Administrative Email`,
        html: staffInvitationTemplate(req.adminUser.name, req.adminUser.role, otp, "Security Operations Center"),
        message: `Your administrative email verification code is: ${otp}. Valid for 15 minutes.`,
      });
    } catch (mailErr) {
      console.warn("Mail send warning:", mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `6-digit security code dispatched to ${cleanNewEmail}.`,
      debugOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Send email change OTP error: ${error.message}` });
  }
};

// 1.11 Admin Verify Email Change (Authenticated)
export const adminVerifyEmailChange = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    if (!newEmail || !otp || String(otp).length !== 6) {
      return res.status(400).json({ success: false, message: "New email and 6-digit OTP code are required." });
    }

    const cleanNewEmail = newEmail.trim().toLowerCase();
    const isOtpValid = await redisService.verifyOtp(`admin_email_change:${req.adminUser._id}:${cleanNewEmail}`, String(otp));

    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: "Invalid or expired authorization code." });
    }

    const user = await User.findById(req.adminUser._id);
    if (!user) return res.status(404).json({ success: false, message: "Admin user not found." });

    const oldEmail = user.email;
    user.email = cleanNewEmail;
    user.isEmailVerified = true;
    await user.save();

    await logAudit(
      user._id,
      "ADMIN_EMAIL_CHANGED",
      "user",
      user._id,
      user.userName,
      { oldEmail, newEmail: cleanNewEmail },
      req
    );

    return res.status(200).json({
      success: true,
      message: `Administrative email successfully updated to ${cleanNewEmail}.`,
      user: {
        _id: user._id,
        name: user.name,
        userName: user.userName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Verify email change error: ${error.message}` });
  }
};

/**
 * Send 6-digit email verification OTP before registering new staff — Super Admin only.
 */
export const sendStaffVerificationOtp = async (req, res) => {
  try {
    const { name, userName, email, role } = req.body;

    const validRoles = ["moderator", "support", "finance", "admin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    if (!name || !userName || !email) {
      return res.status(400).json({
        success: false,
        message: "Name, username, and email are required to send verification code.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUserName = userName.trim().toLowerCase();

    if (!isValidWorkEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid, authentic email address. Disposable or test domains are strictly blocked.",
      });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "Email is already registered on VYBE." });
    }

    const existingUser = await User.findOne({ userName: cleanUserName });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username is already taken." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisService.storeOtp(`staff_reg_otp:${cleanEmail}`, otp, 15 * 60);

    try {
      await sendEmail({
        email: cleanEmail,
        subject: `🔒 VYBE Operations Suite: Authorization Code for ${name}`,
        html: staffInvitationTemplate(name, role, otp, req.adminUser.name),
        message: `Hi ${name}, your VYBE Staff onboarding code is: ${otp}. Valid for 15 minutes.`,
      });
    } catch (mailErr) {
      console.warn("Mail send error (continuing with OTP):", mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `6-digit authorization code dispatched to ${cleanEmail}. Please enter the code to finalize staff onboarding.`,
      debugOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Send staff OTP error: ${error.message}` });
  }
};

/**
 * Register a new staff member — Super Admin only (Requires verified OTP).
 */
export const registerStaffMember = async (req, res) => {
  try {
    const { name, userName, email, password, role, adminPermissions, existingUserId, otp } = req.body;

    const validRoles = ["moderator", "support", "finance", "admin"];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    // If promoting an existing user
    if (existingUserId) {
      const existingUser = await User.findById(existingUserId);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      if (STAFF_ROLES.includes(existingUser.role) && existingUser.role !== "user") {
        return res.status(400).json({
          success: false,
          message: `User is already a ${existingUser.role}. Use the Staff Manager to change their role.`,
        });
      }

      existingUser.role = role;
      existingUser.adminPermissions = adminPermissions || [];
      await existingUser.save();

      await logAudit(
        req.adminUser._id,
        "STAFF_PROMOTED",
        "user",
        existingUser._id,
        existingUser.userName,
        { newRole: role, permissions: adminPermissions },
        req
      );

      return res.status(200).json({
        success: true,
        message: `${existingUser.name} has been promoted to ${role}.`,
        staff: {
          _id: existingUser._id,
          name: existingUser.name,
          userName: existingUser.userName,
          email: existingUser.email,
          role: existingUser.role,
          adminPermissions: existingUser.adminPermissions,
        },
      });
    }

    // Creating a brand new staff account — MUST verify OTP first!
    if (!name || !userName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, userName, email, and password for the new staff account.",
      });
    }

    if (!otp || String(otp).length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Email verification required: Please enter the 6-digit authorization code dispatched to the staff member's email.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUserName = userName.trim().toLowerCase();

    if (!isValidWorkEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or disposable email domain. Only genuine, verifiable email addresses are permitted.",
      });
    }

    // Verify OTP from Redis
    const isOtpValid = await redisService.verifyOtp(`staff_reg_otp:${cleanEmail}`, String(otp));
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired 6-digit authorization code. Please request a new code.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const existingByEmail = await User.findOne({ email: cleanEmail });
    if (existingByEmail) {
      return res.status(400).json({ success: false, message: "Email is already registered." });
    }

    const existingByUserName = await User.findOne({ userName: cleanUserName });
    if (existingByUserName) {
      return res.status(400).json({ success: false, message: "Username is already taken." });
    }

    const hashedPassword = await bcryptjs.hash(password, 12);

    const newStaff = await User.create({
      name: name.trim(),
      userName: cleanUserName,
      email: cleanEmail,
      password: hashedPassword,
      role,
      adminPermissions: adminPermissions || [],
      isVerified: true,
      isEmailVerified: true,
    });

    await logAudit(
      req.adminUser._id,
      "STAFF_REGISTERED",
      "user",
      newStaff._id,
      newStaff.userName,
      { role, permissions: adminPermissions, verifiedEmail: cleanEmail },
      req
    );

    return res.status(201).json({
      success: true,
      message: `Staff account for ${newStaff.name} (@${newStaff.userName}) verified and registered as ${role}.`,
      staff: {
        _id: newStaff._id,
        name: newStaff.name,
        userName: newStaff.userName,
        email: newStaff.email,
        role: newStaff.role,
        adminPermissions: newStaff.adminPermissions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Staff registration error: ${error.message}` });
  }
};

/* ==========================================================================
   2. DASHBOARD OVERVIEW & ANALYTICS
   ========================================================================== */

export const getDashboardOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalBannedUsers,
      totalVerifiedUsers,
      totalPosts,
      totalReels,
      totalStories,
      pendingReports,
      pendingVerifications,
      activeLiveStreams,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isVerified: true }),
      Post.countDocuments({ isArchived: { $ne: true } }),
      Reel.countDocuments({ isArchived: { $ne: true } }),
      Story.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      VerificationRequest.countDocuments({ status: "pending" }),
      LiveStream.countDocuments({ isLive: true }),
    ]);

    // Signups in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newSignupsToday = await User.countDocuments({ createdAt: { $gte: oneDayAgo } });
    const postsToday = await Post.countDocuments({ createdAt: { $gte: oneDayAgo } });
    const reelsToday = await Reel.countDocuments({ createdAt: { $gte: oneDayAgo } });

    // Recent reports queue preview
    const recentReports = await Report.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("reporter", "name userName profileImage")
      .populate("reportedUser", "name userName profileImage");

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalBannedUsers,
        totalVerifiedUsers,
        newSignupsToday,
        totalPosts,
        postsToday,
        totalReels,
        reelsToday,
        totalStories,
        pendingReports,
        pendingVerifications,
        activeLiveStreams,
      },
      recentReports,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Dashboard overview error: ${error.message}` });
  }
};

export const getFinanceStats = async (req, res) => {
  try {
    const [
      totalMonetizedCreators,
      purchases,
      adCampaigns,
      monetizations,
    ] = await Promise.all([
      Monetization.countDocuments({ isEligible: true }),
      PremiumPurchase.find().sort({ createdAt: -1 }).limit(10),
      AdCampaign.find().sort({ createdAt: -1 }),
      Monetization.find().populate("creator", "name userName profileImage"),
    ]);

    const totalGrossRevenue = monetizations.reduce((sum, m) => sum + (m.totalEarnings || 0), 0);
    const totalSubscribers = monetizations.reduce((sum, m) => sum + (m.subscribers?.length || 0), 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalMonetizedCreators,
        totalGrossRevenue,
        totalSubscribers,
        totalCampaigns: adCampaigns.length,
      },
      recentPurchases: purchases,
      monetizedCreators: monetizations.slice(0, 10),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Finance stats error: ${error.message}` });
  }
};

export const getGrowthAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [userGrowth, postGrowth, reelGrowth] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Post.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Reel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      analytics: {
        userGrowth,
        postGrowth,
        reelGrowth,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Growth analytics error: ${error.message}` });
  }
};

/* ==========================================================================
   3. USER MANAGEMENT & IDENTITY
   ========================================================================== */

export const getAdminUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const rawSearch = (req.query.search || "").trim();
    const role = req.query.role || "all";
    const status = req.query.status || "all"; // all, banned, verified, shadowbanned, unverified

    const filter = {};

    if (rawSearch) {
      const cleanUsername = rawSearch.replace(/^@/, "").trim();
      const escapedSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedCleanUsername = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { userName: { $regex: escapedCleanUsername, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { phoneNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (role !== "all") {
      filter.role = role;
    }

    if (status === "banned") filter.isBanned = true;
    if (status === "verified") filter.isVerified = true;
    if (status === "unverified") filter.isVerified = { $ne: true };
    if (status === "shadowbanned") filter.isShadowBanned = true;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getAdminUsers error: ${error.message}` });
  }
};

/**
 * Search candidates to promote to staff — Super Admin only
 */
export const searchStaffCandidates = async (req, res) => {
  try {
    const rawQuery = (req.query.query || "").trim();
    if (!rawQuery || rawQuery.length < 1) {
      return res.status(200).json({ success: true, candidates: [] });
    }

    const cleanUsername = rawQuery.replace(/^@/, "").trim();
    const escapedQuery = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedCleanUsername = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const filter = {
      role: { $nin: ["superadmin", "admin"] },
      _id: { $ne: req.adminUser._id },
      $or: [
        { name: { $regex: escapedQuery, $options: "i" } },
        { userName: { $regex: escapedCleanUsername, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
        { phoneNumber: { $regex: escapedQuery, $options: "i" } },
      ],
    };

    const candidates = await User.find(filter)
      .select("name userName email profileImage role isVerified isEmailVerified createdAt followers following")
      .sort({ createdAt: -1 })
      .limit(15);

    return res.status(200).json({
      success: true,
      candidates,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `searchStaffCandidates error: ${error.message}` });
  }
};

export const getAdminUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select("-password")
      .populate("bannedBy", "name userName");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const [posts, reels, stories, reportsAgainstUser, recentSecurityLogs, activeSessions, monetization] = await Promise.all([
      Post.find({ author: userId }).sort({ createdAt: -1 }).limit(12),
      Reel.find({ author: userId }).sort({ createdAt: -1 }).limit(12),
      Story.find({ author: userId }).sort({ createdAt: -1 }).limit(6),
      Report.find({ reportedUser: userId }).sort({ createdAt: -1 }).populate("reporter", "name userName"),
      SecurityLog.find({ user: userId }).sort({ createdAt: -1 }).limit(10),
      Session.find({ user: userId, isRevoked: false }).sort({ lastActive: -1 }).limit(10),
      Monetization.findOne({ creator: userId }),
    ]);

    return res.status(200).json({
      success: true,
      user,
      posts,
      reels,
      stories,
      reportsAgainstUser,
      recentSecurityLogs,
      activeSessions,
      monetization,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getAdminUserDetail error: ${error.message}` });
  }
};

export const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.find({ user: userId }).sort({ lastActive: -1 }).limit(20);
    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getUserSessions error: ${error.message}` });
  }
};

export const revokeUserSession = async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    await Session.findOneAndUpdate({ _id: sessionId, user: userId }, { isRevoked: true });
    await logAudit(req.adminUser._id, "USER_SESSION_REVOKED", "session", sessionId, `User ${userId}`, {}, req);
    return res.status(200).json({ success: true, message: "Device session revoked." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `revokeUserSession error: ${error.message}` });
  }
};

export const revokeAllUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    await Session.updateMany({ user: userId }, { isRevoked: true });
    await logAudit(req.adminUser._id, "ALL_USER_SESSIONS_REVOKED", "user", userId, `User ${userId}`, {}, req);
    return res.status(200).json({ success: true, message: "All user sessions terminated." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `revokeAllUserSessions error: ${error.message}` });
  }
};

export const resetUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { resetBio, resetAvatar } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (resetBio) user.bio = "";
    if (resetAvatar) {
      if (user.profileImage?.publicId) {
        await deleteFromCloudinary(user.profileImage.publicId).catch(() => null);
      }
      user.profileImage = { url: "", publicId: "" };
    }
    await user.save();

    await logAudit(
      req.adminUser._id,
      "USER_PROFILE_FORCE_RESET",
      "user",
      user._id,
      user.userName,
      { resetBio, resetAvatar },
      req
    );

    return res.status(200).json({ success: true, message: "User profile successfully sanitized.", user });
  } catch (error) {
    return res.status(500).json({ success: false, message: `resetUserProfile error: ${error.message}` });
  }
};

export const bulkUserAction = async (req, res) => {
  try {
    const { userIds, action, reason, days } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: "No user IDs provided." });
    }

    const users = await User.find({ _id: { $in: userIds } });
    let affected = 0;

    for (const u of users) {
      if (u.role === "superadmin") continue;
      affected++;

      if (action === "verify") {
        u.isVerified = true;
        u.verificationStatus = "verified";
      } else if (action === "unverify") {
        u.isVerified = false;
        u.verificationStatus = "none";
      } else if (action === "shadowban") {
        u.isShadowBanned = true;
      } else if (action === "unshadowban") {
        u.isShadowBanned = false;
      } else if (action === "ban") {
        u.isBanned = true;
        u.banReason = reason || "Bulk administrative moderation action";
        u.bannedAt = new Date();
        u.bannedBy = req.adminUser._id;
        u.banExpiresAt = days ? new Date(Date.now() + parseInt(days, 10) * 86400000) : null;
        await Session.updateMany({ user: u._id }, { isRevoked: true });
      } else if (action === "unban") {
        u.isBanned = false;
        u.banReason = "";
        u.bannedAt = null;
        u.banExpiresAt = null;
      }
      await u.save();
    }

    await logAudit(
      req.adminUser._id,
      "BULK_USER_ACTION",
      "user",
      null,
      `${affected} users`,
      { action, count: affected },
      req
    );

    return res.status(200).json({
      success: true,
      message: `Bulk action '${action}' successfully applied to ${affected} accounts.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `bulkUserAction error: ${error.message}` });
  }
};

export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, days } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (user.role === "superadmin") {
      return res.status(403).json({ success: false, message: "Cannot ban a Super Admin account." });
    }

    user.isBanned = true;
    user.banReason = reason || "Violation of community guidelines";
    user.bannedAt = new Date();
    user.bannedBy = req.adminUser._id;
    user.banExpiresAt = days ? new Date(Date.now() + parseInt(days, 10) * 24 * 60 * 60 * 1000) : null;
    user.strikes = (user.strikes || 0) + 1;
    user.strikeHistory.push({
      reason: user.banReason,
      issuedBy: req.adminUser._id,
      date: new Date(),
      severity: "high",
    });

    await user.save();

    // Revoke all active sessions
    await Session.updateMany({ user: user._id }, { isRevoked: true });

    await logAudit(req.adminUser._id, "USER_BANNED", "user", user._id, user.userName, { reason, days }, req);

    return res.status(200).json({ success: true, message: `User @${user.userName} has been banned.`, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: `banUser error: ${error.message}` });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.isBanned = false;
    user.banReason = "";
    user.bannedAt = null;
    user.bannedBy = null;
    user.banExpiresAt = null;

    await user.save();

    await logAudit(req.adminUser._id, "USER_UNBANNED", "user", user._id, user.userName, {}, req);

    return res.status(200).json({ success: true, message: `User @${user.userName} ban has been lifted.`, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: `unbanUser error: ${error.message}` });
  }
};

export const toggleShadowban = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.isShadowBanned = !user.isShadowBanned;
    await user.save();

    await logAudit(
      req.adminUser._id,
      user.isShadowBanned ? "USER_SHADOWBANNED" : "USER_UNSHADOWBANNED",
      "user",
      user._id,
      user.userName,
      {},
      req
    );

    return res.status(200).json({
      success: true,
      message: `User @${user.userName} shadowban is now ${user.isShadowBanned ? "ACTIVE" : "REMOVED"}.`,
      isShadowBanned: user.isShadowBanned,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `toggleShadowban error: ${error.message}` });
  }
};

export const toggleVerifyBadge = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.isVerified = !user.isVerified;
    user.verificationStatus = user.isVerified ? "verified" : "none";
    await user.save();

    await logAudit(
      req.adminUser._id,
      user.isVerified ? "VERIFIED_BADGE_GRANTED" : "VERIFIED_BADGE_REVOKED",
      "user",
      user._id,
      user.userName,
      {},
      req
    );

    return res.status(200).json({
      success: true,
      message: `Verified badge for @${user.userName} set to ${user.isVerified ? "VERIFIED" : "UNVERIFIED"}.`,
      isVerified: user.isVerified,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `toggleVerifyBadge error: ${error.message}` });
  }
};

/* ==========================================================================
   4. STAFF & RBAC MANAGEMENT (SUPER ADMIN ONLY)
   ========================================================================= */

export const getStaffList = async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: STAFF_ROLES } })
      .select("-password")
      .sort({ role: 1, createdAt: -1 });

    return res.status(200).json({ success: true, staff });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getStaffList error: ${error.message}` });
  }
};

export const updateStaffMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, adminPermissions } = req.body;

    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid staff role specified." });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found." });

    targetUser.role = role;
    if (Array.isArray(adminPermissions)) {
      targetUser.adminPermissions = adminPermissions;
    }

    await targetUser.save();

    await logAudit(
      req.adminUser._id,
      "STAFF_ROLE_UPDATED",
      "staff",
      targetUser._id,
      targetUser.userName,
      { newRole: role, permissions: adminPermissions },
      req
    );

    return res.status(200).json({
      success: true,
      message: `Staff @${targetUser.userName} updated to role '${role}'.`,
      user: targetUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `updateStaffMember error: ${error.message}` });
  }
};

export const removeStaffMember = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId.toString() === req.adminUser._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot demote your own account." });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found." });

    targetUser.role = "user";
    targetUser.adminPermissions = [];
    await targetUser.save();

    await logAudit(req.adminUser._id, "STAFF_REMOVED", "staff", targetUser._id, targetUser.userName, {}, req);

    return res.status(200).json({
      success: true,
      message: `Staff privileges revoked for @${targetUser.userName}.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `removeStaffMember error: ${error.message}` });
  }
};

/* ==========================================================================
   5. CONTENT MODERATION & REPORT QUEUE (SRT)
   ========================================================================== */

export const getReportedContentQueue = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const targetType = req.query.targetType || "all";
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);

    const filter = {};
    if (status !== "all") filter.status = status;
    if (targetType !== "all") filter.targetType = targetType;

    const skip = (page - 1) * limit;

    const [rawReports, total] = await Promise.all([
      Report.find(filter)
        .populate("reporter", "name userName profileImage")
        .populate("reportedUser", "name userName profileImage isVerified strikes isBanned isShadowBanned")
        .populate("resolvedBy", "name userName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    // Hydrate target media content for rich SRT preview
    const reports = await Promise.all(
      rawReports.map(async (rep) => {
        const doc = rep.toObject();
        try {
          if (rep.targetType === "post") {
            doc.targetContent = await Post.findById(rep.targetId).populate("author", "name userName profileImage isVerified");
          } else if (rep.targetType === "reel") {
            doc.targetContent = await Reel.findById(rep.targetId).populate("author", "name userName profileImage isVerified");
          } else if (rep.targetType === "story") {
            doc.targetContent = await Story.findById(rep.targetId).populate("author", "name userName profileImage isVerified");
          } else if (rep.targetType === "liveStream") {
            doc.targetContent = await LiveStream.findById(rep.targetId).populate("host", "name userName profileImage isVerified");
          }
        } catch (e) {}
        return doc;
      })
    );

    return res.status(200).json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getReportedContentQueue error: ${error.message}` });
  }
};

export const resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, resolutionNotes } = req.body;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ success: false, message: "Report not found." });

    report.status = action === "dismiss" ? "dismissed" : "resolved";
    report.resolution = action === "dismiss" ? "no_action" : action;
    report.resolvedBy = req.adminUser._id;
    report.resolutionNotes = resolutionNotes || "";
    report.resolvedAt = new Date();

    // Take-down or Flag action requested
    if (action === "content_deleted") {
      if (report.targetType === "post") {
        const post = await Post.findById(report.targetId);
        if (post) {
          if (post.media?.publicId) await deleteFromCloudinary(post.media.publicId).catch(() => null);
          await Post.findByIdAndDelete(post._id);
        }
      } else if (report.targetType === "reel") {
        const reel = await Reel.findById(report.targetId);
        if (reel) {
          if (reel.media?.publicId) await deleteFromCloudinary(reel.media.publicId, "video").catch(() => null);
          await Reel.findByIdAndDelete(reel._id);
        }
      } else if (report.targetType === "story") {
        const story = await Story.findById(report.targetId);
        if (story) {
          if (story.media?.publicId) await deleteFromCloudinary(story.media.publicId).catch(() => null);
          await Story.findByIdAndDelete(story._id);
        }
      }
    } else if (action === "user_banned" && report.reportedUser) {
      const u = await User.findById(report.reportedUser);
      if (u && u.role !== "superadmin") {
        u.isBanned = true;
        u.banReason = resolutionNotes || "Severe content violation";
        u.bannedAt = new Date();
        u.bannedBy = req.adminUser._id;
        u.strikes = (u.strikes || 0) + 1;
        await u.save();
        await Session.updateMany({ user: u._id }, { isRevoked: true });
      }
    } else if (action === "user_warned" && report.reportedUser) {
      await User.findByIdAndUpdate(report.reportedUser, {
        $inc: { strikes: 1 },
        $push: {
          strikeHistory: {
            reason: resolutionNotes || "Content warning issued by moderation",
            issuedBy: req.adminUser._id,
            date: new Date(),
            severity: "medium",
          },
        },
      });
    }

    await report.save();

    await logAudit(
      req.adminUser._id,
      "REPORT_RESOLVED",
      "report",
      report._id,
      report.targetType,
      { action, resolutionNotes },
      req
    );

    const socket = getSocket();
    if (socket) {
      socket.to("admin_staff").emit("report:resolved", { reportId: report._id, action });
    }

    return res.status(200).json({ success: true, message: "Report resolved successfully.", report });
  } catch (error) {
    return res.status(500).json({ success: false, message: `resolveReport error: ${error.message}` });
  }
};

export const bulkResolveReports = async (req, res) => {
  try {
    const { reportIds, action, resolutionNotes } = req.body;
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ success: false, message: "No report IDs provided." });
    }

    let resolvedCount = 0;
    for (const id of reportIds) {
      const rep = await Report.findById(id);
      if (!rep || rep.status === "resolved") continue;
      resolvedCount++;

      rep.status = action === "dismiss" ? "dismissed" : "resolved";
      rep.resolution = action === "dismiss" ? "no_action" : action;
      rep.resolvedBy = req.adminUser._id;
      rep.resolutionNotes = resolutionNotes || "Bulk moderation resolution";
      rep.resolvedAt = new Date();

      if (action === "content_deleted") {
        if (rep.targetType === "post") await Post.findByIdAndDelete(rep.targetId);
        else if (rep.targetType === "reel") await Reel.findByIdAndDelete(rep.targetId);
        else if (rep.targetType === "story") await Story.findByIdAndDelete(rep.targetId);
      }
      await rep.save();
    }

    await logAudit(
      req.adminUser._id,
      "BULK_REPORTS_RESOLVED",
      "report",
      null,
      `${resolvedCount} reports`,
      { action, count: resolvedCount },
      req
    );

    const socket = getSocket();
    if (socket) {
      socket.to("admin_staff").emit("report:bulk-resolved", { reportIds, action });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${resolvedCount} reports in batch.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `bulkResolveReports error: ${error.message}` });
  }
};

export const getAIModerationLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "25", 10);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ModerationLog.find()
        .populate("user", "name userName profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ModerationLog.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getAIModerationLogs error: ${error.message}` });
  }
};

/* ==========================================================================
   6. VERIFICATION REQUESTS (BLUE BADGE)
   ========================================================================== */

export const getVerificationRequests = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const filter = status === "all" ? {} : { status };

    const requests = await VerificationRequest.find(filter)
      .populate("user", "name userName email profileImage followers isVerified createdAt")
      .populate("reviewedBy", "name userName")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getVerificationRequests error: ${error.message}` });
  }
};

export const processVerificationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status decision." });
    }

    const request = await VerificationRequest.findById(requestId).populate("user");
    if (!request) return res.status(404).json({ success: false, message: "Request not found." });

    request.status = status;
    request.reviewedBy = req.adminUser._id;
    request.reviewedAt = new Date();
    if (status === "rejected") {
      request.rejectionReason = rejectionReason || "Does not meet verification criteria at this time.";
    }

    await request.save();

    // Update user record
    if (request.user) {
      request.user.isVerified = status === "approved";
      request.user.verificationStatus = status;
      await request.user.save();
    }

    await logAudit(
      req.adminUser._id,
      status === "approved" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
      "verification",
      request._id,
      request.user?.userName || "",
      { status, rejectionReason },
      req
    );

    const socket = getSocket();
    if (socket) {
      socket.to("admin_staff").emit("verification:processed", { requestId: request._id, status });
    }

    return res.status(200).json({
      success: true,
      message: `Verification request ${status.toUpperCase()} for @${request.user?.userName}.`,
      request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `processVerificationRequest error: ${error.message}` });
  }
};

/* ==========================================================================
   7. LIVE STREAMS SAFETY & CONTROL
   ========================================================================== */

export const getActiveLiveStreams = async (req, res) => {
  try {
    const streams = await LiveStream.find({ isLive: true })
      .populate("host", "name userName profileImage isVerified")
      .populate("coHost", "name userName profileImage isVerified")
      .sort({ peakViewers: -1, createdAt: -1 });

    return res.status(200).json({ success: true, streams });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getActiveLiveStreams error: ${error.message}` });
  }
};

export const terminateLiveStream = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { reason } = req.body;

    const stream = await LiveStream.findById(streamId).populate("host");
    if (!stream) return res.status(404).json({ success: false, message: "Stream not found." });

    stream.isLive = false;
    stream.endedAt = new Date();
    await stream.save();

    // Broadcast socket termination event
    const socket = getSocket();
    if (socket) {
      socket.to(`live_${streamId}`).emit("live-force-terminated", {
        reason: reason || "Broadcast terminated by Trust & Safety Moderator.",
      });
      socket.to("admin_staff").emit("stream:updated", { streamId, isLive: false });
    }

    await logAudit(
      req.adminUser._id,
      "LIVE_STREAM_TERMINATED",
      "liveStream",
      stream._id,
      stream.title || "Live Stream",
      { host: stream.host?.userName, reason },
      req
    );

    return res.status(200).json({ success: true, message: "Live stream terminated successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `terminateLiveStream error: ${error.message}` });
  }
};

export const sendLiveStreamWarning = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { message } = req.body;

    const stream = await LiveStream.findById(streamId);
    if (!stream || !stream.isLive) {
      return res.status(404).json({ success: false, message: "Live stream is not active." });
    }

    const socket = getSocket();
    if (socket) {
      socket.to(`live_${streamId}`).emit("moderator-warning", {
        message: message || "Community Guidelines Notice: Please ensure broadcast complies with platform terms.",
        issuedBy: "Vybe Trust & Safety Desk",
        timestamp: new Date(),
      });
    }

    await logAudit(req.adminUser._id, "LIVE_STREAM_WARNING_SENT", "liveStream", streamId, stream.title, { message }, req);

    return res.status(200).json({ success: true, message: "Warning sent to live stream." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `sendLiveStreamWarning error: ${error.message}` });
  }
};

/* ==========================================================================
   8. SYSTEM BROADCASTS & ANNOUNCEMENTS
   ========================================================================== */

export const createSystemAnnouncement = async (req, res) => {
  try {
    const { title, message, type, targetAudience, actionUrl, actionLabel, expiresAt } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required." });
    }

    const announcement = await SystemAnnouncement.create({
      title,
      message,
      type: type || "info",
      targetAudience: targetAudience || "all",
      actionUrl: actionUrl || "",
      actionLabel: actionLabel || "",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.adminUser._id,
    });

    // Push notification to live socket users
    const socket = getSocket();
    if (socket) {
      socket.emit("system-announcement-received", {
        announcement,
      });
    }

    await logAudit(
      req.adminUser._id,
      "SYSTEM_ANNOUNCEMENT_CREATED",
      "system",
      announcement._id,
      announcement.title,
      { type, targetAudience },
      req
    );

    return res.status(201).json({ success: true, message: "System announcement published.", announcement });
  } catch (error) {
    return res.status(500).json({ success: false, message: `createSystemAnnouncement error: ${error.message}` });
  }
};

export const getSystemAnnouncements = async (req, res) => {
  try {
    const announcements = await SystemAnnouncement.find()
      .populate("createdBy", "name userName")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, announcements });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getSystemAnnouncements error: ${error.message}` });
  }
};

export const deleteSystemAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    await SystemAnnouncement.findByIdAndDelete(announcementId);

    await logAudit(
      req.adminUser._id,
      "SYSTEM_ANNOUNCEMENT_DELETED",
      "system",
      announcementId,
      "Announcement",
      {},
      req
    );

    return res.status(200).json({ success: true, message: "Announcement deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: `deleteSystemAnnouncement error: ${error.message}` });
  }
};

/* ==========================================================================
   9. FINANCE & CREATOR MONETIZATION
   ========================================================================== */

export const getPayoutsList = async (req, res) => {
  try {
    const monetizations = await Monetization.find().populate("creator", "name userName email profileImage followers isVerified");
    const payouts = [];

    monetizations.forEach((m) => {
      (m.payoutHistory || []).forEach((p) => {
        payouts.push({
          _id: p._id,
          creator: m.creator,
          amount: p.amount,
          date: p.date,
          status: p.status || "pending",
          totalEarnings: m.totalEarnings,
          subscribersCount: m.subscribers?.length || 0,
        });
      });
    });

    return res.status(200).json({
      success: true,
      payouts,
      creators: monetizations,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getPayoutsList error: ${error.message}` });
  }
};

export const processPayout = async (req, res) => {
  try {
    const { monetizationId, payoutId } = req.params;
    const { status } = req.body; // "paid", "rejected", "processing"

    const mon = await Monetization.findById(monetizationId);
    if (!mon) return res.status(404).json({ success: false, message: "Monetization record not found." });

    const payout = (mon.payoutHistory || []).id(payoutId);
    if (!payout) return res.status(404).json({ success: false, message: "Payout record not found." });

    payout.status = status || "paid";
    await mon.save();

    await logAudit(
      req.adminUser._id,
      "CREATOR_PAYOUT_PROCESSED",
      "finance",
      payoutId,
      `Creator ${mon.creator}`,
      { status, amount: payout.amount },
      req
    );

    return res.status(200).json({ success: true, message: `Payout status updated to ${status}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: `processPayout error: ${error.message}` });
  }
};

/* ==========================================================================
   10. AUDIT LOGS HISTORY & SYSTEM TELEMETRY
   ========================================================================== */

export const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "30", 10);
    const action = req.query.action || "all";
    const targetType = req.query.targetType || "all";
    const search = (req.query.search || "").trim();

    const filter = {};
    if (action !== "all") filter.action = action;
    if (targetType !== "all") filter.targetType = targetType;
    if (search) {
      filter.$or = [
        { targetName: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("admin", "name userName role profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getAuditLogs error: ${error.message}` });
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const dbState = mongoose.connection.readyState === 1 ? "Connected" : "Degraded";

    const [userCount, postCount, reelCount, reportCount] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Reel.countDocuments(),
      Report.countDocuments({ status: "pending" }),
    ]);

    return res.status(200).json({
      success: true,
      health: {
        serverTime: new Date(),
        uptimeSeconds: Math.floor(uptime),
        database: {
          status: dbState,
          host: mongoose.connection.host || "localhost",
          name: mongoose.connection.name || "vybe",
        },
        memory: {
          rssMB: Math.round(memory.rss / 1024 / 1024),
          heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
        },
        telemetry: {
          totalUsers: userCount,
          totalPosts: postCount,
          totalReels: reelCount,
          pendingReports: reportCount,
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getSystemHealth error: ${error.message}` });
  }
};

import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import uploadOnCloudinary from "../config/cloudinary.js";
import { generateAccessToken, generateRefreshToken } from "../config/generateToken.js";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getAuthCookieOptions,
  getClearCookieOptions,
} from "../config/cookieOptions.js";
import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
import { SecurityLog } from "../models/securityLog.model.js";
import { parseDeviceDetails } from "../utils/deviceParser.js";
import {
  generateTwoFactorSecret,
  generateQrCodeDataUrl,
  verifyTwoFactorToken,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from "../utils/twoFactor.js";
import { forgotPasswordTemplate } from "../utils/emailTemplates/ForgotPasswordTemplate.js";
import { passwordResetSuccessTemplate } from "../utils/emailTemplates/PasswordResetSuccessTemplate.js";
import sendEmail from "../utils/sendEmail.js";
import { signUpOtpTemplate } from "../utils/emailTemplates/SignUpOtpTemplate.js";
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

const isValidEmailAddress = (email) => {
  if (!email || typeof email !== "string") return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || DISALLOWED_EMAIL_DOMAINS.includes(domain)) return false;
  return true;
};

// Helper to hash token string
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Helper to log security audit event
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

// 1. SignUp Controller (Modified to require Email OTP Verification first)
export const signUp = async (req, res) => {
  try {
    const { name, email, password, userName } = req.body || {};

    if (!name || !email || !password || !userName) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Name, email, password, and username are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUserName = userName.trim().toLowerCase();

    if (!isValidEmailAddress(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Please enter a valid, real email address. Disposable or test email domains are not allowed.",
      });
    }

    // Check email uniqueness and delete unverified expired accounts to release lock
    const findByEmail = await User.findOne({ email: cleanEmail });
    if (findByEmail) {
      if (!findByEmail.isEmailVerified && findByEmail.otpExpiresAt < Date.now()) {
        await User.deleteOne({ _id: findByEmail._id });
      } else {
        return res.status(400).json({
          success: false,
          error: true,
          message: "An account with this email already exists!",
        });
      }
    }

    // Check username uniqueness and delete unverified expired accounts to release lock
    const findByUserName = await User.findOne({
      userName: { $regex: new RegExp("^" + cleanUserName + "$", "i") },
    });
    if (findByUserName) {
      if (!findByUserName.isEmailVerified && findByUserName.otpExpiresAt < Date.now()) {
        await User.deleteOne({ _id: findByUserName._id });
      } else {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Username is already taken!",
        });
      }
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Password must be at least 6 characters long!",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    // Store in Redis (Fast TTL) with in-memory fallback
    await redisService.storeOtp(`signup:${cleanEmail}`, otp, 15 * 60);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      userName: cleanUserName,
      isEmailVerified: false,
      otp,
      otpExpiresAt,
    });

    // Send verification OTP email
    await sendEmail({
      email: user.email,
      subject: "Verify Your VYBE Registration",
      html: signUpOtpTemplate(user.name, otp),
      message: `Hi ${user.name}, welcome to VYBE! Your verification code is ${otp}.`,
    });

    return res.status(200).json({
      success: true,
      error: false,
      message: "Verification code sent to your email address.",
      requiresVerification: true,
      email: cleanEmail,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `SignUp Error: ${error.message}`,
    });
  }
};

// 1.5. Verify SignUp OTP Controller
export const verifySignUpOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Email and verification code are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail, isEmailVerified: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Registration session not found or already verified.",
      });
    }

    // 1. Check Redis OTP first
    const isRedisValid = await redisService.verifyOtp(`signup:${cleanEmail}`, otp);
    // 2. Fallback to MongoDB User document OTP
    const isDbValid = String(user.otp) === String(otp) && user.otpExpiresAt > Date.now();

    if (!isRedisValid && !isDbValid) {
      return res.status(400).json({
        success: false,
        error: true,
        message: user.otpExpiresAt && user.otpExpiresAt < Date.now()
          ? "Verification code has expired. Please sign up again."
          : "Invalid verification code",
      });
    }

    // Mark verified and clear OTP in both Redis and DB
    await redisService.del(`otp:signup:${cleanEmail}`);
    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    // GENERATE AND STORE PROFILE QR CODE
    const profileUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/profile/${user.userName}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(profileUrl);
      const qrUpload = await uploadOnCloudinary(qrDataUrl, "VYBE/user-qr-codes");
      user.qrCode = {
        url: qrUpload.url,
        public_id: qrUpload.public_id,
      };
      await user.save();
    } catch (qrErr) {
      console.warn("QR code generation skipped/fallback:", qrErr.message);
    }

    // CREATE USER SESSION
    const { deviceInfo, browser, os, ipAddress, location, userAgent } = parseDeviceDetails(req);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

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
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions(true));
    res.cookie("token", accessToken, getAuthCookieOptions()); // 30-day persistent cookie

    await createSecurityAuditLog(user._id, "login_success", req, { method: "signup" });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorSecret;
    delete userResponse.twoFactorRecoveryCodes;

    return res.status(201).json({
      success: true,
      error: false,
      message: "Account verified and created successfully! Welcome to VYBE",
      token: accessToken,
      user: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `SignUp Verification Error: ${error.message}`,
    });
  }
};

// 2. SignIn Controller
export const signIn = async (req, res) => {
  try {
    const { userName, password, rememberMe = true } = req.body || {};

    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Username and password are required",
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
      await createSecurityAuditLog(user._id, "login_failed", req, { reason: "incorrect_password" });
      return res.status(400).json({
        success: false,
        error: true,
        message: "Incorrect password. Please try again.",
      });
    }

    // BAN & SUSPENSION ENFORCEMENT
    if (user.isBanned) {
      if (user.banExpiresAt && new Date(user.banExpiresAt) <= new Date()) {
        user.isBanned = false;
        user.banReason = "";
        user.bannedAt = null;
        user.bannedBy = null;
        user.banExpiresAt = null;
        await user.save();
      } else {
        const expiryStr = user.banExpiresAt
          ? ` Suspension expires on: ${new Date(user.banExpiresAt).toLocaleDateString()}.`
          : " This is a permanent suspension.";
        return res.status(403).json({
          success: false,
          error: true,
          code: "ACCOUNT_BANNED",
          message: `Your account has been suspended. Reason: ${user.banReason || "Violation of Community Guidelines."}${expiryStr}`,
        });
      }
    }

    // 2FA CHECK
    if (user.twoFactorEnabled) {
      const pendingTwoFactorToken = crypto.randomBytes(32).toString("hex");
      user.pendingTwoFactorToken = pendingTwoFactorToken;
      user.pendingTwoFactorExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      await user.save();

      await createSecurityAuditLog(user._id, "2fa_prompt", req);

      return res.status(200).json({
        success: true,
        error: false,
        requiresTwoFactor: true,
        pendingToken: pendingTwoFactorToken,
        message: "Two-Factor Authentication required.",
      });
    }

    // CREATE SESSION
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

    await createSecurityAuditLog(user._id, "login_success", req, { method: "password" });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorSecret;
    delete userResponse.twoFactorRecoveryCodes;

    return res.status(200).json({
      success: true,
      error: false,
      message: `Welcome back, ${user.name}`,
      token: accessToken,
      user: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `SignIn Error: ${error.message}`,
    });
  }
};

// 3. Verify 2FA Challenge Controller (Login Challenge)
export const verifyTwoFactorChallenge = async (req, res) => {
  try {
    const { pendingToken, code, isRecoveryCode = false, rememberMe = true } = req.body || {};

    if (!pendingToken || !code) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Pending token and verification code are required",
      });
    }

    const user = await User.findOne({
      pendingTwoFactorToken: pendingToken,
      pendingTwoFactorExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid or expired 2FA session token. Please sign in again.",
      });
    }

    let isValid = false;

    if (isRecoveryCode) {
      const recoveryCheck = await verifyAndConsumeRecoveryCode(code, user.twoFactorRecoveryCodes);
      if (recoveryCheck.valid) {
        isValid = true;
        user.twoFactorRecoveryCodes = recoveryCheck.updatedCodes;
        await createSecurityAuditLog(user._id, "2fa_recovery_used", req);
      }
    } else {
      isValid = verifyTwoFactorToken(code, user.twoFactorSecret);
    }

    if (!isValid) {
      await createSecurityAuditLog(user._id, "login_failed", req, { reason: "invalid_2fa_code" });
      return res.status(400).json({
        success: false,
        error: true,
        message: isRecoveryCode ? "Invalid recovery code." : "Invalid 6-digit authenticator code.",
      });
    }

    // CLEAR PENDING 2FA
    user.pendingTwoFactorToken = undefined;
    user.pendingTwoFactorExpiresAt = undefined;
    await user.save();

    // CREATE SESSION
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

    await createSecurityAuditLog(user._id, "login_success", req, { method: "2fa" });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorSecret;
    delete userResponse.twoFactorRecoveryCodes;

    return res.status(200).json({
      success: true,
      error: false,
      message: `2FA Verification Successful. Welcome back ${user.name}`,
      token: accessToken,
      user: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `2FA Verification Error: ${error.message}`,
    });
  }
};

// 4. Refresh Token Rotation Engine
export const refreshToken = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Refresh token missing. Please sign in.",
      });
    }

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || "vybe_super_secret_refresh_key_2026";
    let decoded;

    try {
      decoded = jwt.verify(rawRefreshToken, refreshSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Refresh token expired or invalid.",
      });
    }

    const session = await Session.findById(decoded.sessionId);

    if (!session || session.isRevoked || session.user.toString() !== decoded.userId.toString()) {
      res.clearCookie("accessToken", getClearCookieOptions());
      res.clearCookie("refreshToken", getClearCookieOptions());
      res.clearCookie("token", getClearCookieOptions());

      return res.status(401).json({
        success: false,
        error: true,
        code: "SESSION_EXPIRED",
        message: "Session expired or invalid. Please sign in again.",
      });
    }

    const incomingHash = hashToken(rawRefreshToken);

    if (incomingHash !== session.refreshTokenHash) {
      // Replay attack check
      const isGraceWindowActive =
        session.oldRefreshTokenHash &&
        session.oldRefreshTokenHash === incomingHash &&
        session.rotatedAt &&
        (Date.now() - new Date(session.rotatedAt).getTime()) < 15000;

      if (isGraceWindowActive) {
        // Return active accessToken, reuse same refreshToken
        const newAccessToken = generateAccessToken(session.user, session._id);
        res.cookie("accessToken", newAccessToken, getAccessTokenCookieOptions());
        res.cookie("token", newAccessToken, getAuthCookieOptions());

        return res.status(200).json({
          success: true,
          token: newAccessToken,
          message: "Session renewed successfully (grace window).",
        });
      } else {
        // Reuse detected outside grace period, revoke entire session
        session.isRevoked = true;
        await session.save();

        res.clearCookie("accessToken", getClearCookieOptions());
        res.clearCookie("refreshToken", getClearCookieOptions());
        res.clearCookie("token", getClearCookieOptions());

        await createSecurityAuditLog(session.user, "refresh_token_reuse_breach", req, {
          sessionId: session._id,
        });

        return res.status(401).json({
          success: false,
          error: true,
          code: "SECURITY_BREACH",
          message: "Security violation detected. All sessions revoked.",
        });
      }
    }

    // ISSUE NEW PAIR (ROTATE TOKEN SEAMLESSLY)
    const newAccessToken = generateAccessToken(session.user, session._id);
    const newRefreshToken = generateRefreshToken(session.user, session._id);

    session.oldRefreshTokenHash = session.refreshTokenHash;
    session.rotatedAt = new Date();
    session.refreshTokenHash = hashToken(newRefreshToken);
    session.lastActive = new Date();
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await session.save();

    res.cookie("accessToken", newAccessToken, getAccessTokenCookieOptions(true));
    res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions(true));
    res.cookie("token", newAccessToken, getAuthCookieOptions(true));

    return res.status(200).json({
      success: true,
      token: newAccessToken,
      message: "Session renewed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `RefreshToken Error: ${error.message}`,
    });
  }
};

// 5. SignOut Controller
export const signOut = async (req, res) => {
  try {
    if (req.sessionId) {
      await Session.findByIdAndUpdate(req.sessionId, { isRevoked: true });
    }

    if (req.userId) {
      await createSecurityAuditLog(req.userId, "session_revoked", req, { type: "signout" });
    }

    res.clearCookie("accessToken", getClearCookieOptions());
    res.clearCookie("refreshToken", getClearCookieOptions());
    res.clearCookie("token", getClearCookieOptions());

    return res.status(200).json({
      success: true,
      error: false,
      message: "User signed out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `SignOut Error: ${error.message}`,
    });
  }
};

// 6. Setup 2FA (Authenticated)
export const setupTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: true, message: "User not found" });

    const { secret, otpauthUrl } = generateTwoFactorSecret(user.email);
    const qrCodeUrl = await generateQrCodeDataUrl(otpauthUrl);

    // Save temporary secret until verified
    user.twoFactorSecret = secret;
    await user.save();

    return res.status(200).json({
      success: true,
      error: false,
      secret,
      qrCodeUrl,
      message: "Scan the QR code in your Authenticator App (Google Authenticator, Duo, etc.)",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Setup 2FA Error: ${error.message}`,
    });
  }
};

// 7. Verify 2FA Setup & Enable (Authenticated)
export const verifyTwoFactorSetup = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: true, message: "6-digit code is required" });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, error: true, message: "No pending 2FA setup session found." });
    }

    const isValid = verifyTwoFactorToken(code, user.twoFactorSecret);
    if (!isValid) {
      return res.status(400).json({ success: false, error: true, message: "Invalid 6-digit code. Please try again." });
    }

    const { rawCodes, hashedCodes } = await generateRecoveryCodes();

    user.twoFactorEnabled = true;
    user.twoFactorRecoveryCodes = hashedCodes;
    await user.save();

    await createSecurityAuditLog(user._id, "2fa_enabled", req);

    return res.status(200).json({
      success: true,
      error: false,
      recoveryCodes: rawCodes,
      message: "Two-Factor Authentication enabled successfully! Save these recovery codes in a secure place.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Verify 2FA Setup Error: ${error.message}`,
    });
  }
};

// 8. Disable 2FA (Authenticated)
export const disableTwoFactor = async (req, res) => {
  try {
    const { password, code } = req.body;
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ success: false, error: true, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: true, message: "Incorrect account password" });
    }

    const isValidCode = verifyTwoFactorToken(code, user.twoFactorSecret);
    if (!isValidCode) {
      return res.status(400).json({ success: false, error: true, message: "Invalid authenticator code" });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = [];
    await user.save();

    await createSecurityAuditLog(user._id, "2fa_disabled", req);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Two-Factor Authentication disabled successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Disable 2FA Error: ${error.message}`,
    });
  }
};

// 9. Request Magic Link Login
export const requestMagicLink = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: true, message: "Email address is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return success to prevent email enumeration attacks
      return res.status(200).json({
        success: true,
        message: "If an account exists for this email, a Magic Link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.magicLinkToken = hashToken(rawToken);
    user.magicLinkExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    const magicLinkUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/magic-link/${rawToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Your VYBE Magic Login Link 🪄",
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #fafafa; padding: 40px 20px; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 36px 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="font-size: 32px; margin-bottom: 16px;">🪄</div>
            <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #ffffff; letter-spacing: -0.5px;">Sign in to VYBE</h2>
            <p style="font-size: 14px; line-height: 22px; color: #a1a1aa; margin: 0 0 28px;">
              Hi <strong style="color: #ffffff;">${user.name || user.userName}</strong>, tap the button below to log in securely to your account. No password required.
            </p>
            <a href="${magicLinkUrl}" style="background: linear-gradient(135deg, #ec4899, #f43f5e, #8b5cf6); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 14px; display: inline-block; font-weight: 700; font-size: 14px; letter-spacing: 0.2px; box-shadow: 0 4px 14px rgba(244,63,94,0.4);">
              Sign In To VYBE
            </a>
            <p style="margin-top: 28px; font-size: 12px; color: #71717a; line-height: 18px;">
              This link is single-use and will expire in <strong>15 minutes</strong>.<br />
              If you didn't request this login link, you can safely ignore this email.
            </p>
          </div>
        </div>`,
        message: `Sign in to VYBE: ${magicLinkUrl}`,
      });
    } catch (emailError) {
      console.warn("[MagicLink] Email dispatch failed (likely due to SMTP config in dev). Link:", magicLinkUrl);
    }

    await createSecurityAuditLog(user._id, "magic_link_requested", req);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Magic Login Link dispatched to your email address.",
      ...(process.env.NODE_ENV !== "production" && { previewUrl: magicLinkUrl }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Request Magic Link Error: ${error.message}`,
    });
  }
};

// 10. Verify Magic Link Login
export const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: true, message: "Magic link token is required" });
    }

    const incomingHash = hashToken(token);
    const user = await User.findOne({
      magicLinkToken: incomingHash,
      magicLinkExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid or expired Magic Link. Please request a new one.",
      });
    }

    user.magicLinkToken = undefined;
    user.magicLinkExpiresAt = undefined;
    await user.save();

    // CREATE SESSION
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
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions(true));
    res.cookie("token", accessToken, getAuthCookieOptions());

    await createSecurityAuditLog(user._id, "magic_link_used", req);

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorSecret;
    delete userResponse.twoFactorRecoveryCodes;

    return res.status(200).json({
      success: true,
      error: false,
      message: `Welcome back ${user.name}`,
      token: accessToken,
      user: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Verify Magic Link Error: ${error.message}`,
    });
  }
};

// 11. Get Active Sessions (Authenticated)
export const getActiveSessions = async (req, res) => {
  try {
    let sessions = await Session.find({
      user: req.userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActive: -1 });

    const { deviceInfo, browser, os, ipAddress, location, userAgent } = parseDeviceDetails(req);

    // Auto-create active session if user has no registered active session
    if (sessions.length === 0) {
      const fallbackSession = await Session.create({
        user: req.userId,
        refreshTokenHash: "current_active",
        deviceInfo,
        browser,
        os,
        ipAddress,
        location,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastActive: new Date(),
      });
      sessions = [fallbackSession];
      req.sessionId = fallbackSession._id.toString();
    }

    const formattedSessions = sessions.map((s, idx) => {
      const isCurrent = req.sessionId
        ? String(s._id) === String(req.sessionId)
        : idx === 0;

      return {
        id: s._id,
        deviceInfo: s.deviceInfo || deviceInfo,
        browser: s.browser || browser,
        os: s.os || os,
        ipAddress: s.ipAddress || ipAddress,
        location: s.location || location,
        lastActive: s.lastActive || s.createdAt || new Date(),
        isCurrentSession: isCurrent,
        createdAt: s.createdAt || new Date(),
      };
    });

    return res.status(200).json({
      success: true,
      error: false,
      sessions: formattedSessions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Get Sessions Error: ${error.message}`,
    });
  }
};

// 12. Revoke Specific Session (Authenticated)
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, user: req.userId });

    if (!session) {
      return res.status(404).json({ success: false, error: true, message: "Session not found" });
    }

    session.isRevoked = true;
    await session.save();

    await createSecurityAuditLog(req.userId, "session_revoked", req, { revokedSessionId: sessionId });

    return res.status(200).json({
      success: true,
      error: false,
      message: "Remote session revoked successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Revoke Session Error: ${error.message}`,
    });
  }
};

// 13. Revoke All Other Sessions (Authenticated)
export const revokeAllOtherSessions = async (req, res) => {
  try {
    await Session.updateMany(
      { user: req.userId, _id: { $ne: req.sessionId } },
      { isRevoked: true }
    );

    await createSecurityAuditLog(req.userId, "all_sessions_revoked", req);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Logged out from all other active devices.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Revoke All Sessions Error: ${error.message}`,
    });
  }
};

// 14. Get Security Audit Logs (Authenticated)
export const getSecurityLogs = async (req, res) => {
  try {
    let logs = await SecurityLog.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(30);

    // If no security events recorded yet, seed an initial login_success record
    if (logs.length === 0) {
      const { deviceInfo, ipAddress } = parseDeviceDetails(req);
      const initialLog = await SecurityLog.create({
        user: req.userId,
        eventType: "login_success",
        ipAddress,
        deviceInfo,
        metadata: { method: "session_init" },
      });
      logs = [initialLog];
    }

    return res.status(200).json({
      success: true,
      error: false,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Get Security Logs Error: ${error.message}`,
    });
  }
};

// Legacy Handlers Retained
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: true, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: true, message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const token = crypto.randomBytes(32).toString("hex");

    // Store in Redis (Fast TTL) with in-memory fallback
    await redisService.storeOtp(`reset:${user.email}`, otp, 15 * 60);

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.isOtpVerified = false;
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const resetLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/forgot-password/${token}`;

    await sendEmail({
      email: user.email,
      subject: "Reset Your VYBE Password",
      html: forgotPasswordTemplate(user.name, otp, resetLink),
      message: `Hi ${user.name}, reset your password using this link: ${resetLink} or use OTP code: ${otp}`,
    });

    return res.status(200).json({
      success: true,
      message: "Security verification code and password reset link have been sent to your email.",
    });
  } catch (error) {
    return res.status(500).json({ message: `sendOtp error: ${error.message}` });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ success: false, error: true, message: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: true, message: "User not found" });

    if (String(otp).length !== 6) return res.status(400).json({ success: false, error: true, message: "OTP must be 6 digits" });

    // 1. Check Redis OTP
    const isRedisValid = await redisService.verifyOtp(`reset:${email}`, otp);
    // 2. Fallback to MongoDB User OTP
    const isDbValid = String(user.otp) === String(otp) && user.otpExpiresAt > Date.now();

    if (!isRedisValid && !isDbValid) {
      return res.status(400).json({
        success: false,
        error: true,
        message: user.otpExpiresAt && user.otpExpiresAt < Date.now() ? "OTP expired" : "Invalid OTP",
      });
    }

    // Mark verified in DB and clear in both
    await redisService.del(`otp:reset:${email}`);
    user.isOtpVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.status(200).json({ success: true, error: false, message: "OTP verified successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `verifyOtp error: ${error.message}` });
  }
};

export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: true, message: "Token is required" });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, error: true, message: "Invalid or expired reset link" });

    return res.status(200).json({ success: true, error: false, message: "Reset link verified successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `verifyResetToken error: ${error.message}` });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, password, token } = req.body || {};
    if (!password) return res.status(400).json({ success: false, error: true, message: "Password is required" });

    let user;
    if (token) {
      user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) return res.status(400).json({ success: false, error: true, message: "Invalid or expired token" });
    } else if (email) {
      user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, error: true, message: "User not found" });
      if (!user.isOtpVerified) return res.status(400).json({ success: false, error: true, message: "OTP not verified" });
    } else {
      return res.status(400).json({ success: false, error: true, message: "Provide either email or token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isOtpVerified = false;
    user.otp = null;
    user.otpExpiresAt = null;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: "Your VYBE Password Has Been Reset",
      html: passwordResetSuccessTemplate(user.name),
      message: `Hi ${user.name}, your password has been successfully reset.`,
    });

    await createSecurityAuditLog(user._id, "password_changed", req);

    return res.status(200).json({ success: true, error: false, message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: `resetPassword error: ${error.message}` });
  }
};

export const suggestUsername = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "") return res.status(400).json({ suggestions: [] });

    const base = query.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existingUsers = await User.find({ userName: { $regex: `^${base}`, $options: "i" } }).select("userName");
    const existing = new Set(existingUsers.map((u) => u.userName.toLowerCase()));

    const suggestions = [];
    const variations = [
      "",
      Math.floor(Math.random() * 90 + 10),
      Math.floor(Math.random() * 900 + 100),
      "_" + Math.floor(Math.random() * 9999),
      Math.floor(Math.random() * 90000 + 10000),
    ];

    for (const v of variations) {
      const suggested = base + v;
      if (!existing.has(suggested)) suggestions.push(suggested);
      if (suggestions.length === 5) break;
    }

    return res.json({ suggestions });
  } catch (error) {
    return res.status(500).json({ message: "Error generating username suggestions", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await createSecurityAuditLog(user._id, "password_changed", req);

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: `changePassword error: ${error.message}` });
  }
};

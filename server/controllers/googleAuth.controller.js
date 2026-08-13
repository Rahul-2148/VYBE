import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
import { generateAccessToken, generateRefreshToken } from "../config/generateToken.js";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getAuthCookieOptions,
} from "../config/cookieOptions.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import QRCode from "qrcode";
import uploadOnCloudinary from "../config/cloudinary.js";
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

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured on server");
  }
  return new OAuth2Client(clientId);
};

const getAllowedGoogleAudiences = () => {
  const primary = process.env.GOOGLE_CLIENT_ID;
  const extra = (process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return Array.from(new Set([primary, ...extra].filter(Boolean)));
};

// STEP 1: Initial Google Sign-in
export const googleAuth = async (req, res) => {
  try {
    const client = getGoogleClient();
    const allowedAudiences = getAllowedGoogleAudiences();
    const { credential } = req.body; // Google ID Token

    if (!credential)
      return res.status(400).json({ message: "Credential missing" });

    if (allowedAudiences.length === 0) {
      return res.status(500).json({
        message: "Google auth is not configured on server",
      });
    }

    // Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience:
        allowedAudiences.length === 1
          ? allowedAudiences[0]
          : allowedAudiences,
    });

    const payload = ticket.getPayload();
    const { name, email, picture } = payload;

    // Check if user already exists
    let user = await User.findOne({ email: email.trim().toLowerCase() });

    if (user) {
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        await user.save();
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
      res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions(true));
      res.cookie("token", accessToken, getAuthCookieOptions());

      return res.status(200).json({
        success: true,
        user,
        message: `Welcome back ${user.name}`,
      });
    }

    // NO user -> Ask frontend for username
    return res.status(200).json({
      requiresUsername: true,
      googleUser: {
        name,
        email,
        picture,
      },
    });
  } catch (error) {
    if (error?.message?.includes("payload audience != requiredAudience")) {
      return res.status(401).json({
        message:
          "Google auth failed: OAuth client mismatch. Ensure VITE_GOOGLE_CLIENT_ID and server GOOGLE_CLIENT_ID match.",
      });
    }

    return res.status(500).json({
      message: `Google auth error: ${error.message}`,
    });
  }
};

// STEP 2: Complete Signup with chosen username
export const googleAuthComplete = async (req, res) => {
  try {
    const { name, email, picture, userName } = req.body;

    if (!userName)
      return res.status(400).json({ message: "Username required" });

    const cleanUserName = userName.trim().toLowerCase();
    const existing = await User.findOne({ userName: { $regex: new RegExp("^" + cleanUserName + "$", "i") } });
    if (existing)
      return res.status(400).json({ message: "Username already exists" });

    // Create user with object-structured profileImage
    const user = await User.create({
      name,
      email: email.trim().toLowerCase(),
      userName: cleanUserName,
      profileImage: typeof picture === "string" ? { url: picture } : picture,
      password: await bcrypt.hash(crypto.randomBytes(20).toString("hex"), 10),
      isEmailVerified: true,
    });

    // GENERATE QR CODE
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

    return res.status(201).json({
      success: true,
      user,
      message: "Account created via Google successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Google signup error: ${error.message}` });
  }
};

import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";
import generateToken from "../config/generateToken.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import QRCode from "qrcode";
import uploadOnCloudinary from "../config/cloudinary.js";
import { getAuthCookieOptions } from "../config/cookieOptions.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// STEP 1: Initial Google Sign-in
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body; // Google ID Token

    if (!credential)
      return res.status(400).json({ message: "Credential missing" });

    // Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { name, email, picture } = payload;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // LOGIN
      const token = await generateToken(user._id);

      res.cookie("token", token, getAuthCookieOptions());

      return res.status(200).json({
        success: true,
        user,
        message: `Welcome back ${user.name}`,
      });
    }

    // NO user → Ask frontend for username
    return res.status(200).json({
      requiresUsername: true,
      googleUser: {
        name,
        email,
        picture,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Google auth error: ${error.message}` });
  }
};

// STEP 2: Complete Signup with chosen username
export const googleAuthComplete = async (req, res) => {
  try {
    const { name, email, picture, userName } = req.body;

    if (!userName)
      return res.status(400).json({ message: "Username required" });

    const existing = await User.findOne({ userName });
    if (existing)
      return res.status(400).json({ message: "Username already exists" });

    // Create user
    const user = await User.create({
      name,
      email,
      userName: String(userName).toLowerCase().trim(),
      profileImage: {
        url: picture,
      },
      password: await bcrypt.hash(crypto.randomBytes(20).toString("hex"), 10),
    });

    // GENERATE QR CODE (same as signup)
    const profileUrl = `${process.env.CLIENT_URL}/profile/${user.userName}`;
    const qrDataUrl = await QRCode.toDataURL(profileUrl);
    const qrUpload = await uploadOnCloudinary(qrDataUrl, "VYBE/user-qr-codes");

    user.qrCode = qrUpload;
    await user.save();

    const token = await generateToken(user._id);

    res.cookie("token", token, getAuthCookieOptions());

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

import bcrypt from "bcryptjs";
import crypto from "crypto";
import QRCode from "qrcode";
import uploadOnCloudinary from "../config/cloudinary.js";
import generateToken from "../config/generateToken.js";
import {
  getAuthCookieOptions,
  getClearCookieOptions,
} from "../config/cookieOptions.js";
import { User } from "../models/user.model.js";
import { forgotPasswordTemplate } from "../utils/emailTemplates/ForgotPasswordTemplate.js";
import { passwordResetSuccessTemplate } from "../utils/emailTemplates/PasswordResetSuccessTemplate.js";
import sendEmail from "../utils/sendEmail.js";

// signup controller
export const signUp = async (req, res) => {
  try {
    const { name, email, password, userName } = req.body || {};

    if (!name || !email || !password || !userName) {
      return res
        .status(400)
        .json({ message: "name, email, password, userName are required" });
    }

    const findByEmail = await User.findOne({ email });
    if (findByEmail) {
      return res.status(400).json({ message: "Email already exists!" });
    }
    const findByUserName = await User.findOne({ userName });
    if (findByUserName) {
      return res.status(400).json({ message: "Username already exists!" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      userName,
    });

    // GENERATE AND STORE QR CODE
    const profileUrl = `${process.env.CLIENT_URL}/profile/${user.userName}`;

    // Generate QR as Data URL
    const qrDataUrl = await QRCode.toDataURL(profileUrl);

    // Upload QR to Cloudinary
    const qrUpload = await uploadOnCloudinary(qrDataUrl, "VYBE/user-qr-codes");

    // Save QR info in DB as object
    user.qrCode = {
      url: qrUpload.url,
      public_id: qrUpload.public_id,
    };

    await user.save();

    const token = await generateToken(user._id);
    res.cookie("token", token, getAuthCookieOptions());

    return res.status(201).json({
      message: "Account created successfully! Welcome to VYBE",
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: `signup error: ${error.message}` });
  }
};

// signin controller
export const signIn = async (req, res) => {
  try {
    const { userName, password } = req.body || {};

    if (!userName || !password) {
      return res
        .status(400)
        .json({ message: "userName and password are required" });
    }

    const user = await User.findOne({ userName });
    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found with this userName!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const token = await generateToken(user._id);
    res.cookie("token", token, getAuthCookieOptions());

    return res.status(200).json({
      success: true,
      error: false,
      message: `Welcome back ${user.name}`,
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: `signin error: ${error.message}` });
  }
};

// signout controller
export const signOut = async (req, res) => {
  try {
    res.clearCookie("token", getClearCookieOptions());

    return res.status(200).json({ message: "User signed out successfully" });
  } catch (error) {
    return res.status(500).json({ message: `signout error: ${error.message}` });
  }
};

// send otp controller
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email)
      return res
        .status(400)
        .json({ success: false, error: true, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found" });

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    // Generate Reset Link Token
    const token = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    // Save in DB
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.isOtpVerified = false;
    user.resetPasswordToken = token;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Construct Reset Link
    const resetLink = `${process.env.CLIENT_URL}/forgot-password/${token}`;

    // Send Email (Branded VYBE Template)
    await sendEmail({
      email: user.email,
      subject: "Reset Your VYBE Password",
      html: forgotPasswordTemplate(user.name, otp, resetLink),
      message: `Hi ${user.name}, your OTP is ${otp}. Reset Link: ${resetLink}`,
    });

    return res.status(200).json({
      success: true,
      message: "OTP and Reset Link sent to your email",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: `requestPasswordReset error: ${error.message}` });
  }
};

// verify otp controller
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp)
      return res.status(400).json({
        success: false,
        error: true,
        message: "Email and OTP are required",
      });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found" });

    // Correct length validation
    if (String(otp).length !== 4)
      return res.status(400).json({
        success: false,
        error: true,
        message: "OTP must be exactly 4 digits",
      });

    // Compare OTP
    if (String(user.otp) !== String(otp))
      return res
        .status(400)
        .json({ success: false, error: true, message: "Invalid OTP" });

    // Check expiry
    if (user.otpExpiresAt < Date.now())
      return res
        .status(400)
        .json({ success: false, error: true, message: "OTP expired" });

    // Update user
    user.isOtpVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: true,
      message: `verifyOtp error: ${error.message}`,
    });
  }
};

// verify reset token controller
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res
        .status(400)
        .json({ success: false, error: true, message: "Token is required" });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid or expired reset link",
      });

    return res.status(200).json({
      success: true,
      error: false,
      message: "Reset link verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `verifyResetToken error: ${error.message}`,
    });
  }
};

// reset password controller
export const resetPassword = async (req, res) => {
  try {
    const { email, password, token } = req.body || {};

    if (!password)
      return res
        .status(400)
        .json({ success: false, error: true, message: "Password is required" });

    let user;

    if (token) {
      // Reset via token
      user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user)
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid or expired token",
        });
    } else if (email) {
      // Reset via OTP
      user = await User.findOne({ email });
      if (!user)
        return res
          .status(404)
          .json({ success: false, error: true, message: "User not found" });

      if (!user.isOtpVerified)
        return res
          .status(400)
          .json({ success: false, error: true, message: "OTP not verified" });
    } else {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Provide either email or token",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    // Clear OTP & Token
    user.isOtpVerified = false;
    user.otp = null;
    user.otpExpiresAt = null;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Send Email
    await sendEmail({
      email: user.email,
      subject: "Your VYBE Password Has Been Reset",
      html: passwordResetSuccessTemplate(user.name),
      message: `Hi ${user.name}, your password has been successfully reset.`,
    });

    return res.status(200).json({
      success: true,
      error: false,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: true,
      message: `resetPassword error: ${error.message}`,
    });
  }
};

// suggest username controller
export const suggestUsername = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ suggestions: [] });
    }

    const base = query.toLowerCase().replace(/[^a-z0-9]/g, "");

    // find existing usernames starting with base
    const existingUsers = await User.find({
      userName: { $regex: `^${base}`, $options: "i" },
    }).select("userName");

    const existing = new Set(
      existingUsers.map((u) => u.userName.toLowerCase())
    );

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
    return res.status(500).json({
      message: "Error generating username suggestions",
      error: error.message,
    });
  }
};

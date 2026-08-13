import express from "express";
import {
  signUp,
  verifySignUpOtp,
  signIn,
  verifyTwoFactorChallenge,
  refreshToken,
  signOut,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  requestMagicLink,
  verifyMagicLink,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  getSecurityLogs,
  sendOtp,
  verifyOtp,
  verifyResetToken,
  resetPassword,
  suggestUsername,
  changePassword,
} from "../controllers/auth.controller.js";
import {
  googleAuth,
  googleAuthComplete,
} from "../controllers/googleAuth.controller.js";
import {
  switchAccount,
  addAccountLogin,
} from "../controllers/accountSwitch.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { authRateLimiter } from "../middlewares/rateLimiter.js";

const authRouter = express.Router();

// Primary Auth & Registration
authRouter.post("/signup", authRateLimiter, signUp);
authRouter.post("/signup/verify", authRateLimiter, verifySignUpOtp);
authRouter.post("/signin", authRateLimiter, signIn);
authRouter.post("/signout", isAuthenticated, signOut);
authRouter.post("/refresh", authRateLimiter, refreshToken);

// Multi-Account Switching
authRouter.post("/switch-account", isAuthenticated, switchAccount);
authRouter.post("/add-account-login", addAccountLogin);

// 2FA Endpoints
authRouter.post("/2fa/challenge", authRateLimiter, verifyTwoFactorChallenge);
authRouter.post("/2fa/setup", isAuthenticated, setupTwoFactor);
authRouter.post("/2fa/verify", isAuthenticated, verifyTwoFactorSetup);
authRouter.post("/2fa/disable", isAuthenticated, disableTwoFactor);

// Magic Link Passwordless Login
authRouter.post("/magic-link/request", authRateLimiter, requestMagicLink);
authRouter.post("/magic-link/verify", authRateLimiter, verifyMagicLink);

// Active Sessions & Device Management
authRouter.get("/sessions", isAuthenticated, getActiveSessions);
authRouter.delete("/sessions/revoke-others", isAuthenticated, revokeAllOtherSessions);
authRouter.delete("/sessions/:sessionId", isAuthenticated, revokeSession);

// Security Audit History
authRouter.get("/security-logs", isAuthenticated, getSecurityLogs);

// Social Auth
authRouter.post("/google", authRateLimiter, googleAuth);
authRouter.post("/google/complete", authRateLimiter, googleAuthComplete);

// OTP & Password Reset
authRouter.post("/sendOtp", authRateLimiter, sendOtp);
authRouter.post("/verifyOtp", authRateLimiter, verifyOtp);
authRouter.post("/verifyResetToken", authRateLimiter, verifyResetToken);
authRouter.post("/resetPassword", authRateLimiter, resetPassword);
authRouter.post("/change-password", isAuthenticated, authRateLimiter, changePassword);
authRouter.get("/username/suggest", authRateLimiter, suggestUsername);

export default authRouter;

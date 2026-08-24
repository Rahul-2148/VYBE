import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Session } from "../models/session.model.js";
import { generateAccessToken, generateRefreshToken } from "../config/generateToken.js";
import {
  getAdminAccessTokenCookieOptions,
  getAdminRefreshTokenCookieOptions,
  getAdminAuthCookieOptions,
  getAdminClearCookieOptions,
} from "../config/cookieOptions.js";

/**
 * Admin-specific authentication middleware.
 * 
 * This reads `admin_accessToken` and `admin_refreshToken` cookies
 * instead of the standard `accessToken`/`refreshToken` cookies.
 * 
 * This ensures admin sessions are completely isolated from user sessions.
 * You can be logged into the user panel AND admin panel simultaneously
 * without one overwriting the other.
 */
const isAdminAuthenticated = async (req, res, next) => {
  try {
    // Read admin-specific cookies
    let token = req.cookies?.admin_accessToken || req.cookies?.admin_token;

    // Support Authorization: Bearer <token> as fallback
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    const secret = process.env.JWT_SECRET || "vybe_super_secret_jwt_key_2026";
    let decoded = null;

    if (token) {
      try {
        decoded = jwt.verify(token, secret);
      } catch (err) {
        if (err.name !== "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            error: true,
            message: "Invalid admin authentication token.",
          });
        }
      }
    }

    // If access token is expired or missing, try silent recovery via admin_refreshToken
    if (!decoded || !decoded.userId) {
      const rawRefreshToken = req.cookies?.admin_refreshToken;
      if (!rawRefreshToken) {
        return res.status(401).json({
          success: false,
          error: true,
          code: "TOKEN_EXPIRED",
          message: "Admin authentication required. Please sign in to the Admin Panel.",
        });
      }

      const refreshSecret =
        process.env.REFRESH_TOKEN_SECRET ||
        process.env.JWT_SECRET ||
        "vybe_super_secret_refresh_key_2026";

      try {
        const refreshDecoded = jwt.verify(rawRefreshToken, refreshSecret);
        if (refreshDecoded && refreshDecoded.userId && refreshDecoded.sessionId) {
          const session = await Session.findById(refreshDecoded.sessionId);
          if (session && !session.isRevoked) {
            const incomingHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

            if (incomingHash === session.refreshTokenHash) {
              // Valid refresh token — perform rotation
              const newAccessToken = generateAccessToken(session.user, session._id);
              const newRefreshToken = generateRefreshToken(session.user, session._id);

              session.oldRefreshTokenHash = session.refreshTokenHash;
              session.rotatedAt = new Date();
              session.refreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
              session.lastActive = new Date();
              await session.save();

              // Set admin-namespaced cookies
              res.cookie("admin_accessToken", newAccessToken, getAdminAccessTokenCookieOptions(true));
              res.cookie("admin_refreshToken", newRefreshToken, getAdminRefreshTokenCookieOptions(true));
              res.cookie("admin_token", newAccessToken, getAdminAuthCookieOptions(true));

              req.userId = session.user.toString();
              req.sessionId = session._id.toString();
              return next();
            } else {
              // Grace window check for concurrent requests
              const isGraceWindowActive =
                session.oldRefreshTokenHash &&
                session.oldRefreshTokenHash === incomingHash &&
                session.rotatedAt &&
                (Date.now() - new Date(session.rotatedAt).getTime()) < 15000;

              if (isGraceWindowActive) {
                const newAccessToken = generateAccessToken(session.user, session._id);
                res.cookie("admin_accessToken", newAccessToken, getAdminAccessTokenCookieOptions(true));
                res.cookie("admin_token", newAccessToken, getAdminAuthCookieOptions(true));

                req.userId = session.user.toString();
                req.sessionId = session._id.toString();
                return next();
              } else {
                // Potential token theft — revoke session
                session.isRevoked = true;
                await session.save();

                res.clearCookie("admin_accessToken", getAdminClearCookieOptions());
                res.clearCookie("admin_refreshToken", getAdminClearCookieOptions());
                res.clearCookie("admin_token", getAdminClearCookieOptions());
              }
            }
          }
        }
      } catch (rErr) {
        // Refresh token invalid or expired
      }

      return res.status(401).json({
        success: false,
        error: true,
        code: "TOKEN_EXPIRED",
        message: "Admin session expired. Please sign in again.",
      });
    }

    // Verify session validity
    if (decoded.sessionId) {
      const activeSession = await Session.findById(decoded.sessionId);
      if (!activeSession || activeSession.isRevoked) {
        return res.status(401).json({
          success: false,
          error: true,
          code: "SESSION_REVOKED",
          message: "Admin session has been revoked.",
        });
      }

      // Touch last active (debounced 5 min)
      if (Date.now() - new Date(activeSession.lastActive).getTime() > 5 * 60 * 1000) {
        activeSession.lastActive = new Date();
        await activeSession.save();
      }

      // Sliding window renewal
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp - nowSeconds < 3 * 24 * 60 * 60) {
        const freshAccessToken = generateAccessToken(decoded.userId, decoded.sessionId);
        res.cookie("admin_accessToken", freshAccessToken, getAdminAccessTokenCookieOptions(true));
        res.cookie("admin_token", freshAccessToken, getAdminAuthCookieOptions(true));
      }

      req.sessionId = decoded.sessionId;
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Admin authentication middleware error: ${error.message}`,
    });
  }
};

export default isAdminAuthenticated;

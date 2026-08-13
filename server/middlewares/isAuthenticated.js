import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Session } from "../models/session.model.js";
import { generateAccessToken, generateRefreshToken } from "../config/generateToken.js";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getAuthCookieOptions,
  getClearCookieOptions,
} from "../config/cookieOptions.js";

const isAuthenticated = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken || req.cookies?.token;

    // Support Authorization: Bearer <token>
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
            message: "Invalid authentication token.",
          });
        }
      }
    }

    // If access token is expired or missing, try silent auto-recovery via refreshToken cookie
    if (!decoded || !decoded.userId) {
      const rawRefreshToken = req.cookies?.refreshToken;
      if (!rawRefreshToken) {
        return res.status(401).json({
          success: false,
          error: true,
          code: "TOKEN_EXPIRED",
          message: "Authentication required. Please sign in.",
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
              // Valid refresh token, perform rotation
              const newAccessToken = generateAccessToken(session.user, session._id);
              const newRefreshToken = generateRefreshToken(session.user, session._id);

              session.oldRefreshTokenHash = session.refreshTokenHash;
              session.rotatedAt = new Date();
              session.refreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
              session.lastActive = new Date();
              await session.save();

              res.cookie("accessToken", newAccessToken, getAccessTokenCookieOptions(true));
              res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions(true));
              res.cookie("token", newAccessToken, getAuthCookieOptions(true));

              req.userId = session.user.toString();
              req.sessionId = session._id.toString();
              return next();
            } else {
              // Replay attack check
              const isGraceWindowActive =
                session.oldRefreshTokenHash &&
                session.oldRefreshTokenHash === incomingHash &&
                session.rotatedAt &&
                (Date.now() - new Date(session.rotatedAt).getTime()) < 15000;

              if (isGraceWindowActive) {
                // Return active accessToken, reuse same refreshToken
                const newAccessToken = generateAccessToken(session.user, session._id);
                res.cookie("accessToken", newAccessToken, getAccessTokenCookieOptions(true));
                res.cookie("token", newAccessToken, getAuthCookieOptions(true));

                req.userId = session.user.toString();
                req.sessionId = session._id.toString();
                return next();
              } else {
                // Rotated token reused outside grace period - potential theft, revoke entire session
                session.isRevoked = true;
                await session.save();

                res.clearCookie("accessToken", getClearCookieOptions());
                res.clearCookie("refreshToken", getClearCookieOptions());
                res.clearCookie("token", getClearCookieOptions());
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
        message: "Session expired. Refresh required.",
      });
    }

    // Verify Session validity if sessionId exists in token
    if (decoded.sessionId) {
      const activeSession = await Session.findById(decoded.sessionId);
      if (!activeSession || activeSession.isRevoked) {
        return res.status(401).json({
          success: false,
          error: true,
          code: "SESSION_REVOKED",
          message: "Session has been revoked or logged out from another device.",
        });
      }

      // Touch last active timestamp (debounced once per 5 min)
      if (Date.now() - new Date(activeSession.lastActive).getTime() > 5 * 60 * 1000) {
        activeSession.lastActive = new Date();
        await activeSession.save();
      }

      // Sliding Window Session Renewal: if token is within 3 days of expiry, refresh cookie seamlessly
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp - nowSeconds < 3 * 24 * 60 * 60) {
        const freshAccessToken = generateAccessToken(decoded.userId, decoded.sessionId);
        res.cookie("accessToken", freshAccessToken, getAccessTokenCookieOptions(true));
        res.cookie("token", freshAccessToken, getAuthCookieOptions(true));
      }

      req.sessionId = decoded.sessionId;
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Authentication middleware error: ${error.message}`,
    });
  }
};

export default isAuthenticated;

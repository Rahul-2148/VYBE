import jwt from "jsonwebtoken";

export const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    { userId, sessionId },
    process.env.JWT_SECRET || "vybe_super_secret_jwt_key_2026",
    { expiresIn: "7d" }
  );
};

export const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    { userId, sessionId },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || "vybe_super_secret_refresh_key_2026",
    { expiresIn: "30d" }
  );
};

// Legacy compatibility helper for single token requests
const generateToken = (userId, sessionId = null) => {
  return generateAccessToken(userId, sessionId);
};

export default generateToken;

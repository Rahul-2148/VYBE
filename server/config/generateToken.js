import jwt from "jsonwebtoken";

const requireSecret = (name, fallbackName = null) => {
  const secret = process.env[name] || (fallbackName ? process.env[fallbackName] : "");
  if (!secret || !secret.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }
  if (secret.length < 32) {
    throw new Error(
      `${name} must be at least 32 characters long`
    );
  }
  return secret;
};

export const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    { userId, sessionId },
    requireSecret("JWT_SECRET"),
    { expiresIn: "7d" }
  );
};

export const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    { userId, sessionId },
    requireSecret("REFRESH_TOKEN_SECRET"),
    { expiresIn: "30d" }
  );
};

// Legacy compatibility helper for single token requests.
const generateToken = (userId, sessionId = null) => {
  return generateAccessToken(userId, sessionId);
};

export default generateToken;

import jwt from "jsonwebtoken";

const requireSecret = (name) => {
  const secret = process.env[name];
  if (!secret || !secret.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (secret.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }
  return secret;
};

export const getAccessTokenSecret = () => requireSecret("JWT_SECRET");
export const getRefreshTokenSecret = () => requireSecret("REFRESH_TOKEN_SECRET");

export const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    { userId, sessionId },
    getAccessTokenSecret(),
    { expiresIn: "7d" }
  );
};

export const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    { userId, sessionId },
    getRefreshTokenSecret(),
    { expiresIn: "30d" }
  );
};

// Legacy compatibility helper for single token requests.
const generateToken = (userId, sessionId = null) => {
  return generateAccessToken(userId, sessionId);
};

export default generateToken;

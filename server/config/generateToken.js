import jwt from "jsonwebtoken";

const requireSecret = (name) => {
  const value = process.env[name];
  const secret = typeof value === "string" ? value.trim() : "";

  if (!secret) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (secret.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }
  if (/^(your-|change.?me|replace.?me|placeholder|example|default)/i.test(secret)) {
    throw new Error(`${name} still contains a placeholder value; configure a cryptographically random secret`);
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

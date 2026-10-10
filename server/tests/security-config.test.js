import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { getAccessTokenCookieOptions } from "../config/cookieOptions.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../config/generateToken.js";

test("JWT signing rejects missing secrets and signs with configured secrets", () => {
  const previousAccess = process.env.JWT_SECRET;
  const previousRefresh = process.env.REFRESH_TOKEN_SECRET;

  try {
    delete process.env.JWT_SECRET;
    delete process.env.REFRESH_TOKEN_SECRET;

    assert.throws(() => generateAccessToken("user-1", "session-1"), /JWT_SECRET/);
    assert.throws(
      () => generateRefreshToken("user-1", "session-1"),
      /REFRESH_TOKEN_SECRET/
    );

    process.env.JWT_SECRET = "your-strong-random-64-character-jwt-secret-key-here";
    assert.throws(() => generateAccessToken("user-1", "session-1"), /placeholder value/);
    delete process.env.JWT_SECRET;

    process.env.JWT_SECRET = "a".repeat(64);
    process.env.REFRESH_TOKEN_SECRET = "b".repeat(64);

    const accessToken = generateAccessToken("user-1", "session-1");
    const refreshToken = generateRefreshToken("user-1", "session-1");

    assert.deepEqual(jwt.verify(accessToken, process.env.JWT_SECRET).userId, "user-1");
    assert.deepEqual(jwt.verify(accessToken, process.env.JWT_SECRET).sessionId, "session-1");
    assert.equal(jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET).userId, "user-1");
  } finally {
    if (previousAccess === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousAccess;

    if (previousRefresh === undefined) delete process.env.REFRESH_TOKEN_SECRET;
    else process.env.REFRESH_TOKEN_SECRET = previousRefresh;
  }
});

test("auth cookies default to Secure and SameSite=None in production", () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    cookieSecure: process.env.COOKIE_SECURE,
    cookieSameSite: process.env.COOKIE_SAME_SITE,
  };

  try {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SECURE;
    delete process.env.COOKIE_SAME_SITE;

    const options = getAccessTokenCookieOptions();
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, "none");
    assert.equal(options.httpOnly, true);
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.cookieSecure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = previous.cookieSecure;
    if (previous.cookieSameSite === undefined) delete process.env.COOKIE_SAME_SITE;
    else process.env.COOKIE_SAME_SITE = previous.cookieSameSite;
  }
});

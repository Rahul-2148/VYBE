import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
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

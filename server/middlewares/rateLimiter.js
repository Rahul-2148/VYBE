// rateLimiter.js - Scoped IP Rate Limiter Middleware for Auth & Public APIs

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests, please try again later.",
}) => {
  // Scoped store for each limiter instance
  const requestStore = new Map();

  // Cleanup job for this limiter
  setInterval(() => {
    const now = Date.now();
    const expiry = now - windowMs;
    for (const [ip, timestamps] of requestStore.entries()) {
      const active = timestamps.some((t) => t > expiry);
      if (!active) {
        requestStore.delete(ip);
      }
    }
  }, windowMs).unref();

  return (req, res, next) => {
    // Bypass in local development or for localhost/127.0.0.1 to prevent false 429 locks during active testing
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    if (process.env.NODE_ENV !== "production" || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
      return next();
    }

    const now = Date.now();

    if (!requestStore.has(ip)) {
      requestStore.set(ip, []);
    }

    const timestamps = requestStore.get(ip).filter((time) => now - time < windowMs);
    timestamps.push(now);
    requestStore.set(ip, timestamps);

    if (timestamps.length > max) {
      return res.status(429).json({
        success: false,
        error: true,
        message,
        retryAfter: Math.ceil((windowMs - (now - timestamps[0])) / 1000),
      });
    }

    next();
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // 20 attempts per 15 min per IP
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: "API rate limit exceeded. Please slow down your requests.",
});

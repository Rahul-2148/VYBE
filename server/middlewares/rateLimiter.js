// Lightweight IP Rate Limiter Middleware for Auth & Public APIs
const requestStore = new Map();

// Run a cleanup job every 15 minutes to evict old IPs and prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const fifteenMinsAgo = now - 15 * 60 * 1000;
  for (const [ip, timestamps] of requestStore.entries()) {
    const active = timestamps.some((t) => t > fifteenMinsAgo);
    if (!active) {
      requestStore.delete(ip);
    }
  }
}, 15 * 60 * 1000).unref();

export const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests, please try again later." }) => {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
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
  max: 20, // 20 login/signup attempts per 15 min per IP
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Raised to 2000 to prevent false-positive blocks during standard browsing
  message: "API rate limit exceeded. Please slow down your requests.",
});

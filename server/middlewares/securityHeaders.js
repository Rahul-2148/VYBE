export const setSecurityHeaders = (req, res, next) => {
  // Anti-clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS filter
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Remove Express powered-by header
  res.removeHeader("X-Powered-By");

  next();
};

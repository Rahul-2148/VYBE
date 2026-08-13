const parseBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
};

const normalizeSameSite = (value, fallback = "lax") => {
  const normalized = String(value || fallback).toLowerCase();
  if (["lax", "strict", "none"].includes(normalized)) {
    return normalized;
  }
  return fallback;
};

const buildBaseCookieOptions = () => {
  const secure = parseBoolean(process.env.COOKIE_SECURE, false);
  const sameSiteFallback = secure ? "none" : "lax";
  const sameSite = normalizeSameSite(process.env.COOKIE_SAME_SITE, sameSiteFallback);

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

// Access Token Cookie (7 Days)
export const getAccessTokenCookieOptions = (rememberMe = true) => ({
  ...buildBaseCookieOptions(),
  maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
});

// Refresh Token Cookie (30 Days)
export const getRefreshTokenCookieOptions = (rememberMe = true) => ({
  ...buildBaseCookieOptions(),
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
});

// Legacy single auth token cookie options (30 Days)
export const getAuthCookieOptions = (rememberMe = true) => ({
  ...buildBaseCookieOptions(),
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
});

export const getClearCookieOptions = () => ({
  ...buildBaseCookieOptions(),
});

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
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

export const getAuthCookieOptions = () => ({
  ...buildBaseCookieOptions(),
  maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
});

export const getClearCookieOptions = () => ({
  ...buildBaseCookieOptions(),
});

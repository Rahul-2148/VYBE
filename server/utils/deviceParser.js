import useragent from "express-useragent";

export const parseDeviceDetails = (req) => {
  const uaHeader = req.headers["user-agent"] || "";
  const source = useragent.parse(uaHeader);

  let browser = source.browser !== "unknown" ? `${source.browser} ${source.version}` : "Web Browser";
  let os = source.os !== "unknown" ? source.os : "Unknown OS";
  let deviceType = "Desktop";

  if (source.isMobile) deviceType = "Mobile";
  else if (source.isTablet) deviceType = "Tablet";
  else if (source.isSmartTV) deviceType = "Smart TV";
  else if (source.isBot) deviceType = "Automated Bot";

  const deviceInfo = `${browser} on ${os} (${deviceType})`;

  // Extract IP Address (handling proxies / x-forwarded-for)
  const forwarded = req.headers["x-forwarded-for"];
  const ipAddress = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket?.remoteAddress || req.ip || "127.0.0.1";

  // Location string (can be enhanced with GeoIP if external DB available, defaults to IP format)
  const location = req.headers["x-user-location"] || "Local / Dynamic Location";

  return {
    deviceInfo,
    browser,
    os,
    deviceType,
    ipAddress,
    location,
    userAgent: uaHeader,
  };
};

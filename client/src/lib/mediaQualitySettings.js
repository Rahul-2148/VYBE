// Media Quality & Data Saver Settings Manager
const DATA_SAVER_KEY = "vybe_data_saver_mode";
const HIGH_QUALITY_UPLOAD_KEY = "vybe_high_quality_uploads";

export const getDataSaverMode = () => {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DATA_SAVER_KEY) === "true";
};

export const setDataSaverMode = (enabled) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DATA_SAVER_KEY, String(Boolean(enabled)));
  window.dispatchEvent(new CustomEvent("vybe-data-saver-changed", { detail: Boolean(enabled) }));
};

export const getHighQualityUploads = () => {
  if (typeof localStorage === "undefined") return true; // Default high quality on modern devices
  const val = localStorage.getItem(HIGH_QUALITY_UPLOAD_KEY);
  return val === null ? true : val === "true";
};

export const setHighQualityUploads = (enabled) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(HIGH_QUALITY_UPLOAD_KEY, String(Boolean(enabled)));
};

/**
 * Transforms Cloudinary URL according to Data Saver and Upscaling modes
 */
export const getOptimizedMediaUrl = (url, type = "video") => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("cloudinary.com")) return url;

  const isDataSaver = getDataSaverMode();

  if (isDataSaver) {
    if (type === "video") {
      // Lower bitrate, lower resolution for cellular data savings
      return url.replace("/upload/", "/upload/q_auto:low,w_720,c_limit/");
    }
    return url.replace("/upload/", "/upload/q_auto:low,w_1080,c_limit/");
  }

  // Best quality / High Definition
  if (type === "video") {
    return url.replace("/upload/", "/upload/q_auto:best,vc_auto/");
  }
  return url;
};

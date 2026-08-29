import axios from "axios";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (
    typeof window !== "undefined" &&
    window.location.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
      return `http://${window.location.hostname}:8000/api/v1`;
    }
  }
  if (envUrl) {
    return `${envUrl}/api/v1`;
  }
  return "http://localhost:8000/api/v1";
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor for Silent Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Token Expiration & Silent Refresh
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/signin") ||
      originalRequest?.url?.includes("/auth/signup") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/2fa/challenge") ||
      originalRequest?.url?.includes("/auth/magic-link");

    const isTokenExpired =
      error.response?.status === 401 &&
      !isAuthEndpoint &&
      !originalRequest?._retry;

    if (isTokenExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            originalRequest._retry = true;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        isRefreshing = false;
        processQueue(null, data.token);

        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // Only log out if it is a definite authorization revocation (401 or 403)
        const isAuthRevoked =
          refreshError.response?.status === 401 || refreshError.response?.status === 403;

        if (isAuthRevoked && typeof window !== "undefined") {
          window.dispatchEvent(new Event("vybe:session_expired"));
        }
        return Promise.reject(refreshError);
      }
    }

    // Network / Offline Error Detection (Client Disconnected)
    if (!error.response && (error.code === "ERR_NETWORK" || !navigator.onLine)) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vybe:network_error", { detail: { error } }));
      }
    }

    return Promise.reject(error);
  }
);

export default api;

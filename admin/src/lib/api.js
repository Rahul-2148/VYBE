import axios from "axios";

// Environment-driven API and Server URLs with production auto-detection
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api/v1/admin" : "http://localhost:8000/api/v1/admin");

export const SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD
    ? window.location.origin
    : "http://localhost:8000");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (
        window.location.pathname !== "/login" &&
        !window.location.pathname.startsWith("/reset-password") &&
        !window.location.pathname.startsWith("/forgot-password")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

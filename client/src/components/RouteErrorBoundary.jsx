import { useRouteError, useNavigate } from "react-router-dom";
import logo2 from "../assets/logo2.png";

/**
 * RouteErrorBoundary — Vybe-branded error UI for route-level errors.
 *
 * Handles:
 * - 404 Not Found
 * - 401 Unauthorized
 * - 403 Forbidden
 * - 500 Server Error
 * - Network/API errors
 * - Unexpected errors
 */
const RouteErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  // Derive status code and message
  let status = 500;
  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";

  if (error?.status) {
    status = error.status;
  } else if (error?.response?.status) {
    status = error.response.status;
  }

  switch (status) {
    case 404:
      title = "Page not found";
      message = "The page you're looking for doesn't exist or has been moved.";
      break;
    case 401:
      title = "Not authenticated";
      message = "You need to sign in to access this page.";
      break;
    case 403:
      title = "Access denied";
      message = "You don't have permission to view this page.";
      break;
    case 500:
      title = "Server error";
      message = "Something went wrong on our end. Please try again later.";
      break;
    default:
      if (error?.message?.toLowerCase().includes("network") || error?.code === "ERR_NETWORK") {
        title = "Connection lost";
        message = "Please check your internet connection and try again.";
        status = 0;
      }
      break;
  }

  // Use the error's statusText or data message if available
  const errorDetail = error?.statusText || error?.data?.message || error?.message || null;

  return (
    <div className="w-screen h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logo2} alt="VYBE" className="w-16 h-16 object-contain opacity-60" />
        </div>

        {/* Status Code */}
        {status > 0 && (
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500 leading-none">
            {status}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-text">
          {title}
        </h1>

        {/* Message */}
        <p className="text-text-secondary text-sm leading-relaxed">
          {message}
        </p>

        {/* Error detail (dev-friendly, not raw backend errors) */}
        {errorDetail && import.meta.env.DEV && (
          <div className="bg-surface/50 border border-border rounded-xl p-3 text-xs text-text-muted text-left font-mono break-all">
            {errorDetail}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              try {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  window.location.href = "/";
                }
              } catch {
                window.location.href = "/";
              }
            }}
            className="px-5 py-2.5 text-sm font-semibold text-text border border-border rounded-xl hover:bg-surface transition-all duration-200 cursor-pointer"
          >
            Go Back
          </button>
          <button
            onClick={() => {
              try {
                navigate("/");
              } catch {
                window.location.href = "/";
              }
            }}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            Go Home
          </button>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="px-5 py-2.5 text-sm font-semibold text-text-secondary border border-border/80 rounded-xl hover:text-text hover:bg-surface transition-all duration-200 cursor-pointer"
          >
            Reload Page
          </button>
          {status === 401 && (
            <button
              onClick={() => {
                window.location.href = "/signin";
              }}
              className="px-5 py-2.5 text-sm font-semibold text-rose-500 border border-rose-500/30 rounded-xl hover:bg-rose-500/10 transition-all duration-200 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;

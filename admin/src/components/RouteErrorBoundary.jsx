import React from "react";
import { useRouteError, useNavigate } from "react-router-dom";
import { AlertOctagon, RotateCcw, Home, LogIn } from "lucide-react";

/**
 * RouteErrorBoundary — High-end error UI for admin console route-level errors.
 */
export const RouteErrorBoundary = () => {
  let error = null;
  let navigate = null;

  try {
    error = useRouteError();
  } catch (err) {
    console.warn("RouteErrorBoundary: useRouteError unavailable", err);
  }

  try {
    navigate = useNavigate();
  } catch (err) {
    console.warn("RouteErrorBoundary: useNavigate unavailable", err);
  }

  let status = 500;
  let title = "Command Center Error";
  let message = "An unexpected error occurred while executing this administrative action.";

  if (error?.status) {
    status = error.status;
  } else if (error?.response?.status) {
    status = error.response.status;
  }

  switch (status) {
    case 404:
      title = "Console View Not Found";
      message = "The administrative desk or resource you requested does not exist.";
      break;
    case 401:
      title = "Session Expired / Unauthenticated";
      message = "Your staff authentication session has expired. Please re-authenticate.";
      break;
    case 403:
      title = "Access Restricted (RBAC)";
      message = "You do not have the required staff privileges to access this operational desk.";
      break;
    case 500:
      title = "Internal Server Fault";
      message = "The backend operations cluster encountered an unexpected fault.";
      break;
    default:
      if (error?.message?.toLowerCase().includes("network")) {
        title = "Operations Link Disrupted";
        message = "Unable to communicate with the administrative API gateway.";
      }
      break;
  }

  const errorDetail = error?.statusText || error?.data?.message || error?.message || null;

  const handleGoHome = () => {
    if (navigate) {
      navigate("/");
    } else {
      window.location.href = "/";
    }
  };

  const handleGoLogin = () => {
    if (navigate) {
      navigate("/login");
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <div className="w-screen h-screen bg-[#060810] flex items-center justify-center p-6 select-none font-sans text-white">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Emblem */}
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/20">
          <AlertOctagon className="w-8 h-8" />
        </div>

        {/* Status */}
        {status > 0 && (
          <div className="text-5xl font-black font-['Outfit'] text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-400 to-amber-400">
            {status}
          </div>
        )}

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        </div>

        {/* Error Details (if in dev or has detail) */}
        {errorDetail && (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-xs font-mono text-slate-400 max-h-32 overflow-y-auto break-all">
            <span className="text-rose-400 font-bold block mb-1">Fault Diagnostic:</span>
            {errorDetail}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-semibold text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Reload Console
          </button>

          {status === 401 ? (
            <button
              onClick={handleGoLogin}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 text-sm font-semibold text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/25 active:scale-95"
            >
              <LogIn className="w-4 h-4" /> Authenticate
            </button>
          ) : (
            <button
              onClick={handleGoHome}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 text-sm font-semibold text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/25 active:scale-95"
            >
              <Home className="w-4 h-4" /> Command Center
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;

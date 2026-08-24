import React from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import AdminLayout from "../components/AdminLayout";

/**
 * ProtectedLayout — Enforces staff authentication for all operational views.
 * If unauthenticated, redirects to /login.
 */
export const ProtectedLayout = () => {
  const { adminUser, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060810] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 flex items-center justify-center mx-auto text-white font-black text-lg shadow-2xl shadow-rose-500/20 font-['Outfit']">
            V
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-zinc-400">Authenticating Operations Console...</p>
            <div className="w-24 h-0.5 bg-zinc-800 rounded-full mx-auto overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-rose-500 to-purple-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/login" replace />;
  }

  return <AdminLayout />;
};

export default ProtectedLayout;

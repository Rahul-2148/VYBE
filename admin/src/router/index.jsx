import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import GuestLayout from "../layouts/GuestLayout";
import ProtectedLayout from "../layouts/ProtectedLayout";
import PermissionGuard from "../components/PermissionGuard";
import RouteErrorBoundary from "../components/RouteErrorBoundary";
import NotFoundPage from "../components/NotFoundPage";
import { useAdminAuth } from "../context/AdminAuthContext";

// ─── Route Loading Spinner (Suspense fallback) ────────────────────────────────
const RouteLoadingSpinner = () => (
  <div className="w-full h-96 flex flex-col items-center justify-center gap-3">
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-xl shadow-rose-500/20 font-['Outfit'] animate-pulse">
      V
    </div>
    <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─── Lazy Loaded Admin Pages ──────────────────────────────────────────────────
const Login = lazy(() => import("../pages/Login"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const UsersManager = lazy(() => import("../pages/UsersManager"));
const ContentModerator = lazy(() => import("../pages/ContentModerator"));
const LiveStreamsMonitor = lazy(() => import("../pages/LiveStreamsMonitor"));
const VerificationManager = lazy(() => import("../pages/VerificationManager"));
const FinanceDashboardView = lazy(() => import("../components/dashboards/FinanceDashboardView"));
const SystemBroadcasts = lazy(() => import("../pages/SystemBroadcasts"));
const StaffManager = lazy(() => import("../pages/StaffManager"));
const StaffRegistration = lazy(() => import("../pages/StaffRegistration"));
const AuditLogsInspector = lazy(() => import("../pages/AuditLogsInspector"));
const AdminProfile = lazy(() => import("../pages/AdminProfile"));

/**
 * RedirectToRoleHome — Root "/" dynamically redirects each role to their dedicated workspace.
 * Super Admin & Admin → Dashboard. Others → their workspace.
 */
const RedirectToRoleHome = () => {
  const { adminUser, loading, homePath } = useAdminAuth();

  if (loading) return <RouteLoadingSpinner />;
  if (!adminUser) return <Navigate to="/login" replace />;

  if (homePath === "/") {
    return (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <Dashboard />
      </Suspense>
    );
  }

  return <Navigate to={homePath} replace />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTER CONFIGURATION (Modern Data Router)
// ═══════════════════════════════════════════════════════════════════════════════

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // ───────────────────────────────────────────────────────────────────────
      // GUEST-ONLY ROUTES (redirect to / if already logged in)
      // ───────────────────────────────────────────────────────────────────────
      {
        element: <GuestLayout />,
        children: [
          {
            path: "/login",
            element: (
              <Suspense fallback={<RouteLoadingSpinner />}>
                <Login />
              </Suspense>
            ),
          },
          {
            path: "/forgot-password",
            element: (
              <Suspense fallback={<RouteLoadingSpinner />}>
                <ForgotPassword />
              </Suspense>
            ),
          },
          {
            path: "/reset-password/:token?",
            element: (
              <Suspense fallback={<RouteLoadingSpinner />}>
                <ResetPassword />
              </Suspense>
            ),
          },
        ],
      },

      // ───────────────────────────────────────────────────────────────────────
      // PROTECTED OPERATIONAL ROUTES (Requires Staff Authentication)
      // ───────────────────────────────────────────────────────────────────────
      {
        element: <ProtectedLayout />,
        children: [
          // Root — Role-aware redirect
          {
            path: "/",
            element: <RedirectToRoleHome />,
          },

          // Admin Profile & Security Settings
          {
            path: "/profile",
            element: (
              <Suspense fallback={<RouteLoadingSpinner />}>
                <AdminProfile />
              </Suspense>
            ),
          },

          // User 360 Management
          {
            path: "/users",
            element: (
              <PermissionGuard requiredPermission="manage_users">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <UsersManager />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // Content Moderation (SRT Desk)
          {
            path: "/moderation",
            element: (
              <PermissionGuard requiredPermission="manage_reports">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <ContentModerator />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // Live Stream Intercept & Safety
          {
            path: "/live-streams",
            element: (
              <PermissionGuard requiredPermission="manage_live_streams">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <LiveStreamsMonitor />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // Blue Checkmark & Identity Verification Desk
          {
            path: "/verifications",
            element: (
              <PermissionGuard requiredPermission="manage_verification">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <VerificationManager />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // Finance & Creator Monetization Hub
          {
            path: "/finance",
            element: (
              <PermissionGuard requiredPermission="view_financials">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <FinanceDashboardView />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // System Broadcasts & Push Alerts
          {
            path: "/broadcasts",
            element: (
              <PermissionGuard requiredPermission="system_broadcast">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <SystemBroadcasts />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // Staff & RBAC Manager
          {
            path: "/staff",
            element: (
              <PermissionGuard requiredPermission="manage_staff">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <StaffManager />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // Register New Staff Member
          {
            path: "/staff/register",
            element: (
              <PermissionGuard requiredPermission="manage_staff">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <StaffRegistration />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // Security & Compliance Audit Trail
          {
            path: "/audit-logs",
            element: (
              <PermissionGuard requiredPermission="view_audit_logs">
                <Suspense fallback={<RouteLoadingSpinner />}>
                  <AuditLogsInspector />
                </Suspense>
              </PermissionGuard>
            ),
          },

          // 404 Catch-All within protected shell
          {
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);

export default router;

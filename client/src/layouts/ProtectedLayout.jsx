import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * ProtectedLayout — guards all authenticated routes.
 *
 * Reads Redux auth state (same mechanism as the previous inline <ProtectedRoute>).
 * Waits for auth initialization before deciding.
 * Redirects unauthenticated users to /signin.
 * Renders <Outlet /> for authenticated users.
 */
const ProtectedLayout = () => {
  const { userData, isAuthInitialized } = useSelector((state) => state.user);

  // Auth not yet resolved — don't render anything (splash is in RootLayout)
  if (!isAuthInitialized) return null;

  // Not authenticated — redirect to sign in
  if (!userData) {
    return <Navigate to="/signin" replace />;
  }

  // Authenticated — render child routes
  return <Outlet />;
};

export default ProtectedLayout;

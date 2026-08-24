import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * GuestLayout — guards routes that should only be accessible when logged out.
 *
 * Reads Redux auth state (same mechanism as the previous inline <GuestRoute>).
 * Allows authenticated users through if ?addAccount=true (multi-account flow).
 * Redirects authenticated users to / otherwise.
 * Renders <Outlet /> for unauthenticated users.
 */
const GuestLayout = () => {
  const { userData, isAuthInitialized } = useSelector((state) => state.user);
  const [searchParams] = useSearchParams();

  // Auth not yet resolved — don't render anything (splash is in RootLayout)
  if (!isAuthInitialized) return null;

  // Allow authenticated users to access guest routes when adding another account
  if (searchParams.get("addAccount") === "true") {
    return <Outlet />;
  }

  // Already authenticated — redirect to home
  if (userData) {
    return <Navigate to="/" replace />;
  }

  // Not authenticated — render guest routes
  return <Outlet />;
};

export default GuestLayout;

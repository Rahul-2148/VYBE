import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";

import RootLayout from "../layouts/RootLayout";
import ProtectedLayout from "../layouts/ProtectedLayout";
import GuestLayout from "../layouts/GuestLayout";
import RouteErrorBoundary from "../components/RouteErrorBoundary";
import NotFoundPage from "../components/NotFoundPage";
import RouteLoadingSpinner from "../components/RouteLoadingSpinner";

// ─── Helper: wrap a lazy import in Suspense ───────────────────────────────────
const lazyPage = (importFn) => {
  const Component = lazy(importFn);
  return (
    <Suspense fallback={<RouteLoadingSpinner />}>
      <Component />
    </Suspense>
  );
};

// ─── Helper: wrap CompanyHub lazy import with defaultTab prop ─────────────────
const lazyCompanyHub = (defaultTab) => {
  const Component = lazy(() => import("../pages/CompanyHub"));
  return (
    <Suspense fallback={<RouteLoadingSpinner />}>
      <Component defaultTab={defaultTab} />
    </Suspense>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const router = createBrowserRouter([
  {
    // Root Layout — wraps every route in the application
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // ─────────────────────────────────────────────────────────────────────
      // GUEST-ONLY ROUTES (redirect to / if already authenticated)
      // ─────────────────────────────────────────────────────────────────────
      {
        element: <GuestLayout />,
        children: [
          {
            path: "/signin",
            element: lazyPage(() => import("../pages/SignIn")),
          },
          {
            path: "/signup",
            element: lazyPage(() => import("../pages/SignUp")),
          },
          {
            path: "/forgot-password",
            element: lazyPage(() => import("../pages/ForgotPassword")),
          },
          {
            path: "/forgot-password/:token",
            element: lazyPage(() => import("../pages/ForgotPassword")),
          },
        ],
      },

      // ─────────────────────────────────────────────────────────────────────
      // PUBLIC ROUTES (accessible to everyone, no auth guard)
      // ─────────────────────────────────────────────────────────────────────

      // Magic Link Login
      {
        path: "/magic-link/:token",
        element: lazyPage(() => import("../pages/MagicLinkLogin")),
      },

      // Company & Legal Routes
      {
        path: "/about",
        element: lazyCompanyHub("about"),
      },
      {
        path: "/help",
        element: lazyCompanyHub("help"),
      },
      {
        path: "/press",
        element: lazyCompanyHub("press"),
      },
      {
        path: "/api",
        element: lazyCompanyHub("api"),
      },
      {
        path: "/jobs",
        element: lazyCompanyHub("jobs"),
      },
      {
        path: "/privacy",
        element: lazyCompanyHub("privacy"),
      },
      {
        path: "/terms",
        element: lazyCompanyHub("terms"),
      },

      // ─────────────────────────────────────────────────────────────────────
      // PROTECTED ROUTES (require authentication)
      // ─────────────────────────────────────────────────────────────────────
      {
        element: <ProtectedLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          // Core
          {
            path: "/",
            element: lazyPage(() => import("../pages/Home")),
          },
          {
            path: "/home",
            element: lazyPage(() => import("../pages/Home")),
          },
          {
            path: "/profile/:userName",
            element: lazyPage(() => import("../pages/Profile")),
          },
          {
            path: "/profile",
            element: lazyPage(() => import("../pages/Profile")),
          },
          {
            path: "/edit-profile",
            element: lazyPage(() => import("../pages/EditProfile")),
          },
          {
            path: "/upload",
            element: lazyPage(() => import("../pages/Upload")),
          },

          // Reels
          {
            path: "/reels",
            element: lazyPage(() => import("../pages/Reels")),
          },
          {
            path: "/reel/:reelId",
            element: lazyPage(() => import("../pages/Reels")),
          },

          // Explore & discovery
          {
            path: "/explore",
            element: lazyPage(() => import("../pages/Explore")),
          },
          {
            path: "/explore/tag/:hashtag",
            element: lazyPage(() => import("../pages/HashtagPage")),
          },
          {
            path: "/explore/hashtag/:hashtag",
            element: lazyPage(() => import("../pages/HashtagPage")),
          },
          {
            path: "/hashtag/:hashtag",
            element: lazyPage(() => import("../pages/HashtagPage")),
          },
          {
            path: "/tag/:hashtag",
            element: lazyPage(() => import("../pages/HashtagPage")),
          },
          {
            path: "/explore/location/:locationName",
            element: lazyPage(() => import("../pages/LocationPage")),
          },
          {
            path: "/location/:locationName",
            element: lazyPage(() => import("../pages/LocationPage")),
          },

          // Content detail
          {
            path: "/audio/:audioId",
            element: lazyPage(() => import("../pages/AudioTrackPage")),
          },
          {
            path: "/post/:postId",
            element: lazyPage(() => import("../pages/PostDetailPage")),
          },

          // Stories
          {
            path: "/story",
            element: lazyPage(() => import("../pages/Story")),
          },
          {
            path: "/story/archive",
            element: lazyPage(() => import("../pages/StoryArchive")),
          },

          // Archives
          {
            path: "/post/archive",
            element: lazyPage(() => import("../pages/PostArchive")),
          },
          {
            path: "/live/archive",
            element: lazyPage(() => import("../pages/LiveArchive")),
          },

          // Messaging
          {
            path: "/messages",
            element: lazyPage(() => import("../pages/Messages")),
          },
          {
            path: "/messages/:conversationId",
            element: lazyPage(() => import("../pages/Messages")),
          },

          // Vybe Meet (Conferencing)
          {
            path: "/meet",
            element: lazyPage(() => import("../pages/meet/MeetHome")),
          },
          {
            path: "/meet/:meetingId",
            element: lazyPage(() => import("../pages/meet/MeetRoom")),
          },

          // Social
          {
            path: "/communities",
            element: lazyPage(() => import("../pages/Communities")),
          },
          {
            path: "/notifications",
            element: lazyPage(() => import("../pages/NotificationsPage")),
          },

          // Live streaming
          {
            path: "/live/:streamId",
            element: lazyPage(() => import("../pages/LiveRoom")),
          },

          // Dashboards
          {
            path: "/security",
            element: lazyPage(() => import("../pages/SecurityDashboard")),
          },
          {
            path: "/monetization",
            element: lazyPage(() => import("../pages/MonetizationDashboard")),
          },
        ],
      },

      // ─────────────────────────────────────────────────────────────────────
      // WILDCARD — 404 Not Found
      // ─────────────────────────────────────────────────────────────────────
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;

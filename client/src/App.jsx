import { lazy, Suspense } from "react";
import { Toaster } from "./lib/hotToastAdapter";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import logo2 from "./assets/logo2.png";

import GetCurrentUser from "./hooks/GetCurrentUser";
import useStorySocket from "./hooks/useStorySocket";
import useChatSync from "./hooks/useChatSync";

const EditProfile = lazy(() => import("./pages/EditProfile"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Home = lazy(() => import("./pages/Home"));
const Loops = lazy(() => import("./pages/Loops"));
const Profile = lazy(() => import("./pages/Profile"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Story = lazy(() => import("./pages/Story"));
const Upload = lazy(() => import("./pages/Upload"));
const Messages = lazy(() => import("./pages/Messages"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const MagicLinkLogin = lazy(() => import("./pages/MagicLinkLogin"));
const StoryArchive = lazy(() => import("./pages/StoryArchive"));
const AudioTrackPage = lazy(() => import("./pages/AudioTrackPage"));
const PostArchive = lazy(() => import("./pages/PostArchive"));
const Explore = lazy(() => import("./pages/Explore"));
const HashtagPage = lazy(() => import("./pages/HashtagPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const LiveRoom = lazy(() => import("./pages/LiveRoom"));
const MonetizationDashboard = lazy(() => import("./pages/MonetizationDashboard"));
const LocationPage = lazy(() => import("./pages/LocationPage"));
const Communities = lazy(() => import("./pages/Communities"));
import FloatingMessagesDock from "./components/FloatingMessagesDock";
import CallManager from "./components/CallManager";
import NotificationLightBar from "./components/NotificationLightBar";

import { initializeSocket, disconnectSocket } from "./lib/socket";
import { setUserData } from "./redux/features/userSlice";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const ProtectedRoute = ({ children }) => {
  const { userData, isAuthInitialized } = useSelector((state) => state.user);
  if (!isAuthInitialized) return null;
  return userData ? children : <Navigate to="/signin" replace />;
};

const GuestRoute = ({ children }) => {
  const { userData, isAuthInitialized } = useSelector((state) => state.user);
  if (!isAuthInitialized) return null;

  // Allow authenticated users to access sign-in/sign-up when adding another account
  const params = new URLSearchParams(window.location.search);
  if (params.get("addAccount") === "true") return children;

  return !userData ? children : <Navigate to="/" replace />;
};

function App() {
  GetCurrentUser();
  useStorySocket();
  useChatSync();

  const dispatch = useDispatch();
  const { userData, isAuthInitialized } = useSelector((state) => state.user);

  // Global Session Expiration Listener
  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(setUserData(null));
    };

    window.addEventListener("vybe:session_expired", handleSessionExpired);
    return () => window.removeEventListener("vybe:session_expired", handleSessionExpired);
  }, [dispatch]);

  const userId = userData?._id || userData?.user?._id;

  // Initialize Socket.IO connection synchronously so children can access it during mount
  if (userId) {
    initializeSocket(userId);
  }

  // Handle Socket cleanup on logout
  useEffect(() => {
    if (!userId) {
      disconnectSocket();
    }
  }, [userId]);

  if (!isAuthInitialized) {
    return (
      <div className="w-screen h-screen bg-bg flex flex-col items-center justify-center gap-3">
        <img src={logo2} alt="VYBE" className="w-24 object-contain animate-pulse" />
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const RouteLoadingSpinner = () => (
    <div className="w-screen h-screen bg-bg flex flex-col items-center justify-center gap-3">
      <img src={logo2} alt="VYBE" className="w-16 object-contain animate-pulse" />
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <Suspense fallback={<RouteLoadingSpinner />}>
        <Routes>
          {/* Protected Core Routes */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/profile/:userName" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          <Route path="/loops" element={<ProtectedRoute><Loops /></ProtectedRoute>} />
          <Route path="/reels" element={<ProtectedRoute><Loops /></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute><SecurityDashboard /></ProtectedRoute>} />
          <Route path="/monetization" element={<ProtectedRoute><MonetizationDashboard /></ProtectedRoute>} />
          <Route path="/live/:streamId" element={<ProtectedRoute><LiveRoom /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
          <Route path="/explore/tag/:hashtag" element={<ProtectedRoute><HashtagPage /></ProtectedRoute>} />
          <Route path="/explore/location/:locationName" element={<ProtectedRoute><LocationPage /></ProtectedRoute>} />
          <Route path="/audio/:audioId" element={<ProtectedRoute><AudioTrackPage /></ProtectedRoute>} />
          <Route path="/story" element={<ProtectedRoute><Story /></ProtectedRoute>} />
          <Route path="/story/archive" element={<ProtectedRoute><StoryArchive /></ProtectedRoute>} />
          <Route path="/post/archive" element={<ProtectedRoute><PostArchive /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/direct/t/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
          <Route path="/messageArea" element={<Navigate to="/messages" replace />} />
          <Route path="/messageArea/:conversationId" element={<Navigate to="/messages" replace />} />

          {/* Public & Guest Routes */}
          <Route path="/signup" element={<GuestRoute><SignUp /></GuestRoute>} />
          <Route path="/signin" element={<GuestRoute><SignIn /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/forgot-password/:token" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/magic-link/:token" element={<MagicLinkLogin />} />

          {/* Fallback Wildcard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Floating Instagram Messages Dock */}
      <FloatingMessagesDock />

      <CallManager />

      <NotificationLightBar />

      <Toaster />
    </>
  );
}

export default App;

import { useEffect } from "react";
import { Outlet, useNavigation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import logo2 from "../assets/logo2.png";

import GetCurrentUser from "../hooks/GetCurrentUser";
import useStorySocket from "../hooks/useStorySocket";
import useChatSync from "../hooks/useChatSync";

import FloatingMessagesDock from "../components/FloatingMessagesDock";
import CallManager from "../components/CallManager";
import NotificationLightBar from "../components/NotificationLightBar";
import NetworkStatusBar from "../components/NetworkStatusBar";

import { initializeSocket, disconnectSocket } from "../lib/socket";
import { setUserData } from "../redux/features/userSlice";

/**
 * RootLayout — the outermost layout for the entire Vybe application.
 *
 * Responsibilities:
 * - Bootstrap auth (GetCurrentUser), story socket, chat sync hooks
 * - Manage Socket.IO connection lifecycle based on auth state
 * - Show auth-initialization splash screen
 * - Render a subtle navigation-state loading bar
 * - Render global overlays (FloatingMessagesDock, CallManager, etc.)
 * - Render child routes via <Outlet />
 */
const RootLayout = () => {
  GetCurrentUser();
  useStorySocket();
  useChatSync();

  const dispatch = useDispatch();
  const { userData, isAuthInitialized } = useSelector((state) => state.user);
  const navigation = useNavigation();

  // Global Session Expiration Listener
  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(setUserData(null));
    };

    window.addEventListener("vybe:session_expired", handleSessionExpired);
    return () => window.removeEventListener("vybe:session_expired", handleSessionExpired);
  }, [dispatch]);

  const userId = userData?._id || userData?.user?._id;

  // Manage Socket.IO connection lifecycle safely on auth change/logout
  useEffect(() => {
    if (userId) {
      initializeSocket(userId);
    } else {
      disconnectSocket();
    }
  }, [userId]);

  // Auth initialization splash screen
  if (!isAuthInitialized) {
    return (
      <div className="w-screen h-screen bg-bg flex flex-col items-center justify-center gap-3">
        <img src={logo2} alt="VYBE" className="w-24 object-contain animate-pulse" />
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Navigation-state loading bar — subtle top indicator during route transitions */}
      {navigation.state === "loading" && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px]">
          <div className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 animate-pulse rounded-full" />
        </div>
      )}

      {/* Route content */}
      <Outlet />

      {/* Global overlay components — always rendered regardless of route */}
      <FloatingMessagesDock />
      <CallManager />
      <NotificationLightBar />
      <NetworkStatusBar />
    </>
  );
};

export default RootLayout;

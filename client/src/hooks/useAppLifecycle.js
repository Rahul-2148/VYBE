import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "../lib/socket";
import api from "../lib/axios";
import { setUserData } from "../redux/features/userSlice";
import { apiSlice } from "../redux/api/apiSlice";

/**
 * useAppLifecycle — Manages background / foreground state transitions on mobile & desktop browsers.
 *
 * Prevents the need to manually refresh the page after leaving the app in background for hours.
 * Features:
 * - Instant socket reconnection on wake-up.
 * - Silent background session revalidation (refreshing JWTs and user data without screen flash).
 * - Silent RTK Query cache revalidation (posts, stories, notifications).
 * - Dispatches 'vybe:app_resumed' event for individual components to trigger lightweight updates.
 */
export const useAppLifecycle = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const userId = userData?._id || userData?.user?._id;
  const lastActiveRef = useRef(Date.now());
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const handleResume = async () => {
      const now = Date.now();
      const inactiveDuration = now - lastActiveRef.current;
      lastActiveRef.current = now;

      // Only perform revalidation if tab was hidden/asleep for more than 10 seconds
      if (inactiveDuration < 10000) return;

      console.log(`⚡ [AppLifecycle] Resumed after ${Math.round(inactiveDuration / 1000)}s of inactivity.`);

      // 1. Fast Socket Reconnect
      try {
        const socket = getSocket();
        if (socket && !socket.connected) {
          socket.connect();
          if (userId) {
            socket.emit("register-user", { userId });
          }
        }
      } catch (err) {
        console.warn("[AppLifecycle] Socket resume check error:", err);
      }

      // 2. Silent Session Revalidation in background
      if (userId && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          const res = await api.get("/user/current-user");
          if (res.data?.user) {
            try {
              localStorage.setItem("vybe_cached_user", JSON.stringify(res.data.user));
            } catch (e) {
              console.warn("[AppLifecycle] Cache write error:", e);
            }
            dispatch(setUserData(res.data.user));
          }
        } catch (authErr) {
          // If offline or temporary network lapse on wake, preserve existing UI state
          const isExplicitRevocation =
            authErr.response?.status === 401 && authErr.response?.data?.code === "SESSION_REVOKED";
          if (isExplicitRevocation) {
            try {
              localStorage.removeItem("vybe_cached_user");
            } catch (e) {}
            dispatch(setUserData(null));
          }
        } finally {
          isRefreshingRef.current = false;
        }
      }

      // 3. Silent RTK Query Background Revalidation
      try {
        dispatch(
          apiSlice.util.invalidateTags(["Post", "Story", "Notification", "Message", "Explore"])
        );
      } catch (queryErr) {
        console.warn("[AppLifecycle] RTK revalidate notice:", queryErr);
      }

      // 4. Dispatch global resume event for active views
      window.dispatchEvent(
        new CustomEvent("vybe:app_resumed", {
          detail: { inactiveDuration, resumedAt: now },
        })
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResume();
      } else {
        lastActiveRef.current = Date.now();
      }
    };

    const handlePageShow = (e) => {
      // e.persisted is true when restored from bfcache (back-forward cache on mobile)
      if (e.persisted || document.visibilityState === "visible") {
        handleResume();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        handleResume();
      }
    };

    const handleOnline = () => {
      handleResume();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [dispatch, userId]);
};

export default useAppLifecycle;

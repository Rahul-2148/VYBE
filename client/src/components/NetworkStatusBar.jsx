import React, { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const NetworkStatusBar = () => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const wasOfflineRef = useRef(!((typeof navigator !== "undefined" ? navigator.onLine : true)));
  const hideTimerRef = useRef(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setIsReconnecting(false);
    if (wasOfflineRef.current) {
      setShowRestored(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShowRestored(false);
        wasOfflineRef.current = false;
      }, 3500);
    }
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    wasOfflineRef.current = true;
    setShowRestored(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const checkConnection = useCallback(async () => {
    setIsReconnecting(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const pingParam = Math.floor(Math.random() * 1000000);
      const res = await fetch(`/favicon.ico?_v=${pingParam}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);
      
      clearTimeout(timeoutId);

      if (res && (res.ok || res.status === 304 || res.status === 200 || res.type === "opaque")) {
        handleOnline();
      } else if (!navigator.onLine) {
        setIsOnline(false);
      }
    } catch {
      if (!navigator.onLine) {
        setIsOnline(false);
      }
    } finally {
      setIsReconnecting(false);
    }
  }, [handleOnline]);

  useEffect(() => {
    const onOnlineEvent = () => {
      checkConnection();
    };

    const onOfflineEvent = () => {
      handleOffline();
    };

    const onNetworkErrorEvent = () => {
      if (!navigator.onLine) {
        handleOffline();
      }
    };

    window.addEventListener("online", onOnlineEvent);
    window.addEventListener("offline", onOfflineEvent);
    window.addEventListener("vybe:network_error", onNetworkErrorEvent);

    return () => {
      window.removeEventListener("online", onOnlineEvent);
      window.removeEventListener("offline", onOfflineEvent);
      window.removeEventListener("vybe:network_error", onNetworkErrorEvent);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [checkConnection, handleOffline]);

  const showBanner = !isOnline || showRestored;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.aside
          aria-live="polite"
          role="status"
          initial={{ opacity: 0, y: -40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center p-2 sm:p-3 pointer-events-none"
        >
          <div
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-2 rounded-2xl border shadow-2xl backdrop-blur-xl transition-colors duration-300 max-w-md w-full ${
              !isOnline
                ? "bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/40"
                : "bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  !isOnline ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {!isOnline ? (
                  <WifiOff className="w-4 h-4 animate-pulse" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {!isOnline ? "You are currently offline" : "Connection restored"}
                </p>
                <p className="text-[11px] opacity-80 truncate">
                  {!isOnline
                    ? "Check your internet connection to sync feeds"
                    : "Back online. Syncing latest posts and messages..."}
                </p>
              </div>
            </div>

            {!isOnline && (
              <button
                type="button"
                onClick={checkConnection}
                disabled={isReconnecting}
                className="shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isReconnecting ? "animate-spin" : ""}`} />
                <span>{isReconnecting ? "Checking..." : "Retry"}</span>
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusBar;

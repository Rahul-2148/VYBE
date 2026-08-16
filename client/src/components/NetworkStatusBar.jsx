import React, { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const NetworkStatusBar = () => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const wasOfflineRef = useRef(false);
  const hideTimerRef = useRef(null);

  const checkConnection = async () => {
    setIsReconnecting(true);
    try {
      // Fast lightweight ping to check actual internet reachability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch("/favicon.ico?_t=" + Date.now(), {
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
  };

  const handleOnline = () => {
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
  };

  const handleOffline = () => {
    setIsOnline(false);
    wasOfflineRef.current = true;
    setShowRestored(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

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

    // Initial check if opened offline
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("online", onOnlineEvent);
      window.removeEventListener("offline", onOfflineEvent);
      window.removeEventListener("vybe:network_error", onNetworkErrorEvent);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const showBanner = !isOnline || showRestored;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.aside
          aria-live="polite"
          role="status"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto select-none"
        >
          {!isOnline ? (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-amber-600/95 via-rose-600/95 to-red-600/95 text-white backdrop-blur-xl border border-white/25 rounded-full shadow-[0_10px_30px_rgba(220,38,38,0.4)] text-xs font-medium">
              <div className="relative flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-300 rounded-full animate-ping" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight">No Internet Connection</span>
                <span className="text-white/70 hidden sm:inline">•</span>
                <span className="text-amber-100/90 text-[11px] hidden sm:inline">
                  {isReconnecting ? "Re-establishing connection..." : "Waiting for network..."}
                </span>
              </div>
              <button
                onClick={checkConnection}
                disabled={isReconnecting}
                className="ml-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 active:scale-95 text-white font-bold text-[10px] rounded-full transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Retry connecting now"
              >
                <RefreshCw className={`w-3 h-3 ${isReconnecting ? "animate-spin" : ""}`} />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600/95 to-teal-600/95 text-white backdrop-blur-xl border border-white/25 rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.35)] text-xs font-medium animate-fade-in">
              <Wifi className="w-4 h-4 text-emerald-200" />
              <span className="font-bold tracking-tight">Back online!</span>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusBar;

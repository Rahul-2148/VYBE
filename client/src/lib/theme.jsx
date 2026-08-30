import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import api from "./axios";
import ThemeContext from "./themeContext";

const DEFAULT_STORAGE_KEY = "vybe-theme";
const THEMES = ["light", "dark", "system"];

const getUserStorageKey = (uid) => (uid ? `vybe-theme-${uid}` : DEFAULT_STORAGE_KEY);

/**
 * Resolves "system" to actual theme based on OS preference.
 */
function getSystemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Applies the resolved theme class to <html> element.
 * This is the only place DOM mutation happens — zero React re-renders needed for CSS variables.
 */
function applyThemeToDOM(resolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);

  // Update color-scheme for native browser elements (scrollbars, form controls)
  root.style.colorScheme = resolvedTheme;
}

/**
 * Gets the stored theme preference for a specific user, defaulting to "system".
 */
function getStoredTheme(uid) {
  try {
    const key = getUserStorageKey(uid);
    const stored = localStorage.getItem(key);
    if (stored && THEMES.includes(stored)) return stored;
    // Fallback to default key
    const defaultStored = localStorage.getItem(DEFAULT_STORAGE_KEY);
    if (defaultStored && THEMES.includes(defaultStored)) return defaultStored;
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
  return "system";
}

/**
 * ThemeProvider — Wraps the app and provides theme context.
 */
export function ThemeProvider({ children, defaultTheme = "system" }) {
  const userData = useSelector((state) => state.user.userData);
  const userId = userData?._id || userData?.user?._id;

  const [theme, setThemeState] = useState(() => getStoredTheme(userId) || defaultTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = useMemo(() => (theme === "system" ? systemTheme : theme), [theme, systemTheme]);

  const mountedRef = useRef(false);
  const serverSyncTimerRef = useRef(null);
  const activeAnimationRef = useRef(null);
  const activeTransitionRef = useRef(null);
  const transitionCountRef = useRef(0);
  const lastToggleTimestampRef = useRef(0);
  const safetyCleanupTimerRef = useRef(null);

  // Debounced server theme synchronization to avoid network flooding during rapid clicking
  const persistThemeToServer = useCallback(
    (newTheme) => {
      if (!userId) return;
      if (serverSyncTimerRef.current) {
        clearTimeout(serverSyncTimerRef.current);
      }
      serverSyncTimerRef.current = setTimeout(() => {
        api.put("/user/theme", { theme: newTheme }).catch((err) => {
          // Silently handle persistence error if offline or session expired
          if (err?.response?.status !== 401) {
            console.warn("Theme server sync:", err?.message || err);
          }
        });
      }, 400);
    },
    [userId]
  );

  // Safely cancel any active transition / animation and reset transition classes
  const cancelActiveTransition = useCallback(() => {
    if (safetyCleanupTimerRef.current) {
      clearTimeout(safetyCleanupTimerRef.current);
      safetyCleanupTimerRef.current = null;
    }

    if (activeTransitionRef.current) {
      try {
        if (typeof activeTransitionRef.current.skipTransition === "function") {
          activeTransitionRef.current.skipTransition();
        }
      } catch {
        // ignore transition abort errors
      }
      activeTransitionRef.current = null;
    }

    if (activeAnimationRef.current) {
      try {
        activeAnimationRef.current.cancel();
      } catch {
        // ignore animation cancellation errors
      }
      activeAnimationRef.current = null;
    }

    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("theme-transitioning");
    }
  }, []);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);

    if (!mountedRef.current) {
      mountedRef.current = true;
      document.documentElement.classList.add("no-transitions");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove("no-transitions");
        });
      });
    }
  }, [resolvedTheme]);

  // Sync theme when user logs in or switches accounts
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let timer = null;
    // 1. Immediately read cached theme for this specific user
    const localUserTheme = getStoredTheme(userId);
    if (localUserTheme && THEMES.includes(localUserTheme)) {
      timer = setTimeout(() => {
        if (isMounted) setThemeState(localUserTheme);
      }, 0);
    }

    // 2. Fetch fresh theme from server for this user
    api
      .get("/user/theme")
      .then((res) => {
        if (isMounted && res.data?.success && res.data?.theme) {
          const serverTheme = res.data.theme;
          setThemeState(serverTheme);
          try {
            localStorage.setItem(getUserStorageKey(userId), serverTheme);
            localStorage.setItem(DEFAULT_STORAGE_KEY, serverTheme);
          } catch {
            // ignore storage errors
          }
        }
      })
      .catch((err) => {
        // Silently fall back to local cached theme when user is unauthenticated or session expired
        if (err?.response?.status !== 401) {
          console.warn("Theme sync:", err?.message || err);
        }
      });

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [userId]);

  // Listen for OS theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (e) => {
      setSystemTheme(e.matches ? "light" : "dark");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelActiveTransition();
      if (serverSyncTimerRef.current) {
        clearTimeout(serverSyncTimerRef.current);
      }
    };
  }, [cancelActiveTransition]);

  const setTheme = useCallback(
    (newTheme) => {
      if (!THEMES.includes(newTheme)) return;
      setThemeState(newTheme);
      const resolved = newTheme === "system" ? getSystemTheme() : newTheme;
      applyThemeToDOM(resolved);

      try {
        localStorage.setItem(getUserStorageKey(userId), newTheme);
        localStorage.setItem(DEFAULT_STORAGE_KEY, newTheme);
      } catch {
        // Silently fail if localStorage is unavailable
      }

      persistThemeToServer(newTheme);
    },
    [userId, persistThemeToServer]
  );

  const toggleTheme = useCallback(() => {
    // Check actual DOM class to guarantee 100% accurate toggles even under rapid clicks
    const currentIsLight =
      typeof document !== "undefined"
        ? document.documentElement.classList.contains("light")
        : resolvedTheme === "light";
    setTheme(currentIsLight ? "dark" : "light");
  }, [resolvedTheme, setTheme]);

  /**
   * Telegram-Grade Directional Theme Transition with Rapid-Click Immunity
   * - Single/deliberate click: Plays smooth circular ripple (mobile) or smooth crossfade (desktop).
   * - Rapid clicking: Cancels in-flight transitions, skips heavy snapshot overhead, and toggles DOM & state instantly in 0ms (120 FPS).
   */
  const toggleThemeWithTransition = useCallback(
    (event, targetTheme = null) => {
      const now = performance.now();
      const timeSinceLastClick = now - lastToggleTimestampRef.current;
      lastToggleTimestampRef.current = now;

      // Always read exact current theme from DOM state to eliminate any stale closure delay / 2-click lag
      const currentIsLight =
        typeof document !== "undefined"
          ? document.documentElement.classList.contains("light")
          : resolvedTheme === "light";

      const currentActive = currentIsLight ? "light" : "dark";
      const nextTheme = targetTheme || (currentActive === "dark" ? "light" : "dark");

      // Check if rapid clicking (interval < 260ms OR a transition/animation is currently in-flight)
      const isRapid =
        timeSinceLastClick < 260 ||
        Boolean(activeAnimationRef.current || activeTransitionRef.current);

      // Immediately cancel any in-flight animation/transition to free the rendering pipeline
      cancelActiveTransition();

      // If rapid clicking, or View Transitions API is unsupported, execute instantaneous zero-latency toggle
      if (isRapid || typeof document === "undefined" || !document.startViewTransition) {
        setTheme(nextTheme);
        return;
      }

      const currentRunId = ++transitionCountRef.current;

      const w = window.innerWidth || document.documentElement.clientWidth || 390;
      const h = window.innerHeight || document.documentElement.clientHeight || 844;

      let x, y;
      if (event && typeof event.clientX === "number" && (event.clientX !== 0 || event.clientY !== 0)) {
        x = event.clientX;
        y = event.clientY;
      } else if (event?.touches && event.touches[0]) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
      } else if (event?.currentTarget && typeof event.currentTarget.getBoundingClientRect === "function") {
        const rect = event.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else if (event?.target && typeof event.target.getBoundingClientRect === "function") {
        const rect = event.target.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else {
        // Fallback: screen center
        x = w / 2;
        y = h / 2;
      }

      const endRadius = Math.hypot(
        Math.max(x, w - x),
        Math.max(y, h - y)
      );

      const isDesktop = w >= 1024;

      // Disable individual CSS transitions during DOM snap to eliminate reflow jitter & frame drops
      document.documentElement.classList.add("theme-transitioning");

      // Safety timeout to ensure class is never stuck on DOM under any unexpected condition
      safetyCleanupTimerRef.current = setTimeout(() => {
        if (transitionCountRef.current === currentRunId) {
          document.documentElement.classList.remove("theme-transitioning");
        }
      }, 700);

      let transition;
      try {
        transition = document.startViewTransition(() => {
          applyThemeToDOM(nextTheme);
          setThemeState(nextTheme);
          try {
            localStorage.setItem(getUserStorageKey(userId), nextTheme);
            localStorage.setItem(DEFAULT_STORAGE_KEY, nextTheme);
          } catch {
            // ignore storage errors
          }
          persistThemeToServer(nextTheme);
        });
        activeTransitionRef.current = transition;
      } catch {
        // Fallback if startViewTransition throws
        setTheme(nextTheme);
        document.documentElement.classList.remove("theme-transitioning");
        return;
      }

      transition.ready
        .then(() => {
          if (transitionCountRef.current !== currentRunId) return;

          // Desktop: Smooth clean crossfade without circular clip-path
          // Mobile: Signature Telegram directional circular ripple
          const keyframes = isDesktop
            ? { opacity: [0, 1] }
            : {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              };

          const animationOptions = isDesktop
            ? {
                duration: 220,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                pseudoElement: "::view-transition-new(root)",
                fill: "forwards",
              }
            : {
                duration: 460,
                easing: "cubic-bezier(0.32, 0.72, 0, 1)",
                pseudoElement: "::view-transition-new(root)",
                fill: "forwards",
              };

          const animation = document.documentElement.animate(keyframes, animationOptions);
          activeAnimationRef.current = animation;

          animation.finished
            .then(() => {
              if (transitionCountRef.current === currentRunId) {
                document.documentElement.classList.remove("theme-transitioning");
              }
            })
            .catch(() => {})
            .finally(() => {
              if (activeAnimationRef.current === animation) {
                activeAnimationRef.current = null;
              }
            });
        })
        .catch(() => {
          if (transitionCountRef.current === currentRunId) {
            document.documentElement.classList.remove("theme-transitioning");
          }
        });

      transition.finished
        .catch(() => {})
        .finally(() => {
          if (activeTransitionRef.current === transition) {
            activeTransitionRef.current = null;
          }
          if (transitionCountRef.current === currentRunId) {
            document.documentElement.classList.remove("theme-transitioning");
          }
        });
    },
    [resolvedTheme, setTheme, userId, persistThemeToServer, cancelActiveTransition]
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, toggleThemeWithTransition }),
    [theme, resolvedTheme, setTheme, toggleTheme, toggleThemeWithTransition]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;

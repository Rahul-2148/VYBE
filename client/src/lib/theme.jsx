import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
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
 * This is the only place DOM mutation happens — no React rerenders needed.
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

  const setTheme = useCallback((newTheme) => {
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

    // Update on the server if logged in
    if (userId) {
      api.put("/user/theme", { theme: newTheme }).catch((err) => {
        console.error("Failed to persist theme to server:", err);
      });
    }
  }, [userId]);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const activeAnimationRef = useRef(null);
  const transitionCountRef = useRef(0);

  // Telegram-Grade Directional Theme Transition (Day: Bottom-Left -> Top-Right, Night: Top-Right -> Bottom-Left)
  const toggleThemeWithTransition = useCallback(
    (event, targetTheme = null) => {
      // Cancel / finish any in-flight animation immediately so new transition starts instantly
      if (activeAnimationRef.current) {
        try {
          activeAnimationRef.current.finish();
        } catch {
          // ignore if already completed
        }
        activeAnimationRef.current = null;
      }

      // Always get exact current theme from DOM state to eliminate any stale closure delay / 2-click lag
      const currentIsLight =
        typeof document !== "undefined"
          ? document.documentElement.classList.contains("light")
          : resolvedTheme === "light";

      const currentActive = currentIsLight ? "light" : "dark";
      const nextTheme = targetTheme || (currentActive === "dark" ? "light" : "dark");

      // Fallback if View Transitions API is not supported in the browser
      if (typeof document === "undefined" || !document.startViewTransition) {
        setTheme(nextTheme);
        return;
      }

      const currentRunId = ++transitionCountRef.current;

      const w = window.innerWidth || (typeof document !== "undefined" && document.documentElement.clientWidth) || 390;
      const h = window.innerHeight || (typeof document !== "undefined" && document.documentElement.clientHeight) || 844;

      const isTargetLight =
        nextTheme === "light" || (nextTheme === "system" && getSystemTheme() === "light");

      let x, y;
      if (isTargetLight) {
        // DAY THEME (Light): Sweeps from Bottom-Left ➔ Top-Right
        x = 0;
        y = h;
      } else {
        // NIGHT THEME (Dark): Sweeps from Top-Right ➔ Bottom-Left
        x = w;
        y = 0;
      }

      const endRadius = Math.hypot(
        Math.max(x, w - x),
        Math.max(y, h - y)
      );

      const isDesktop = w >= 1024;

      // Disable individual CSS transitions during DOM snap to eliminate reflow jitter & frame drops
      document.documentElement.classList.add("theme-transitioning");

      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setTheme(nextTheme);
        });
      });

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
                duration: 260,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                pseudoElement: "::view-transition-new(root)",
                fill: "forwards",
              }
            : {
                duration: 520,
                easing: "cubic-bezier(0.32, 0.72, 0, 1)",
                pseudoElement: "::view-transition-new(root)",
                fill: "forwards",
              };

          const animation = document.documentElement.animate(keyframes, animationOptions);

          activeAnimationRef.current = animation;

          animation.finished
            .finally(() => {
              if (activeAnimationRef.current === animation) {
                activeAnimationRef.current = null;
              }
              if (transitionCountRef.current === currentRunId) {
                document.documentElement.classList.remove("theme-transitioning");
              }
            });
        })
        .catch(() => {
          if (transitionCountRef.current === currentRunId) {
            document.documentElement.classList.remove("theme-transitioning");
          }
        });

      transition.finished
        .finally(() => {
          if (transitionCountRef.current === currentRunId) {
            document.documentElement.classList.remove("theme-transitioning");
          }
        });
    },
    [resolvedTheme, setTheme]
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, toggleThemeWithTransition }),
    [theme, resolvedTheme, setTheme, toggleTheme, toggleThemeWithTransition]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;

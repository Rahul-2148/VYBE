// src/lib/theme.jsx — ThemeProvider + useTheme hook
// Zero-rerender theme switching via CSS class toggling on <html>
// Enterprise-grade sync with user settings on the server

import { useEffect, useState, useCallback, useMemo } from "react";
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
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const stored = getStoredTheme(userId) || defaultTheme;
    return stored === "system" ? getSystemTheme() : stored;
  });

  const [mounted, setMounted] = useState(false);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    const id = setTimeout(() => setResolvedTheme(resolved), 0);
    applyThemeToDOM(resolved);

    if (!mounted) {
      const mountId = setTimeout(() => setMounted(true), 0);
      document.documentElement.classList.add("no-transitions");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove("no-transitions");
        });
      });
      return () => clearTimeout(mountId);
    }

    return () => clearTimeout(id);
  }, [theme, mounted]);

  // Sync theme when user logs in or switches accounts
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    // 1. Immediately read cached theme for this specific user
    const localUserTheme = getStoredTheme(userId);
    let timer = null;
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
        console.error("Failed to fetch user theme from server:", err);
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
      const newTheme = e.matches ? "light" : "dark";
      setResolvedTheme(newTheme);
      applyThemeToDOM(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    if (!THEMES.includes(newTheme)) return;
    setThemeState(newTheme);
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

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;

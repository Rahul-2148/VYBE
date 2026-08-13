// src/lib/theme.jsx — ThemeProvider + useTheme hook
// Zero-rerender theme switching via CSS class toggling on <html>
// Enterprise-grade sync with user settings on the server

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import api from "./axios";

const STORAGE_KEY = "vybe-theme";
const THEMES = ["light", "dark", "system"];

const ThemeContext = createContext({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

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
 * Gets the stored theme preference, defaulting to "system".
 */
function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.includes(stored)) return stored;
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
  return "system";
}

/**
 * ThemeProvider — Wraps the app and provides theme context.
 * 
 * Architecture:
 * - Stores user preference ("light" | "dark" | "system") in localStorage
 * - Resolves "system" to actual theme via matchMedia
 * - Applies CSS class to <html> — all styling is handled by CSS custom properties
 * - Listens for OS theme changes when preference is "system"
 * - Automatically fetches user preference from server when logged in
 * - Persists changes to both local storage and user server settings
 */
export function ThemeProvider({ children, defaultTheme = "system" }) {
  const [theme, setThemeState] = useState(() => getStoredTheme() || defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const stored = getStoredTheme() || defaultTheme;
    return stored === "system" ? getSystemTheme() : stored;
  });

  const userData = useSelector((state) => state.user.userData);
  const userId = userData?._id || userData?.user?._id;

  const [mounted, setMounted] = useState(false);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);

    if (!mounted) {
      setMounted(true);
      // Briefly disable transitions to prevent flash on initial mount
      document.documentElement.classList.add("no-transitions");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove("no-transitions");
        });
      });
    }
  }, [theme, mounted]);

  // Sync theme from server when user logs in
  useEffect(() => {
    if (!userId) return;

    const fetchUserTheme = async () => {
      try {
        const res = await api.get("/user/theme");
        if (res.data?.success && res.data?.theme) {
          const serverTheme = res.data.theme;
          setThemeState(serverTheme);
          try {
            localStorage.setItem(STORAGE_KEY, serverTheme);
          } catch (e) {}
        }
      } catch (err) {
        console.error("Failed to fetch theme from server:", err);
      }
    };

    fetchUserTheme();
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
      localStorage.setItem(STORAGE_KEY, newTheme);
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

/**
 * useTheme — Hook to access and control the theme.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return {
    ...context,
    isDark: context.resolvedTheme === "dark",
    isLight: context.resolvedTheme === "light",
  };
}

export default ThemeProvider;

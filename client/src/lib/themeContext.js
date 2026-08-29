import { createContext, useContext } from "react";

const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext) || {};
  const resolved = context.resolvedTheme || (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark");
  return {
    theme: context.theme || "system",
    resolvedTheme: resolved,
    setTheme: context.setTheme || (() => {}),
    toggleTheme: context.toggleTheme || (() => {}),
    toggleThemeWithTransition: context.toggleThemeWithTransition || context.toggleTheme || (() => {}),
    isDark: resolved === "dark",
    isLight: resolved === "light",
  };
}

export default ThemeContext;

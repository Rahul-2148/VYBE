import { createContext, useContext } from "react";

const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return {
    ...context,
    isDark: context.resolvedTheme === "dark",
    isLight: context.resolvedTheme === "light",
  };
}

export default ThemeContext;

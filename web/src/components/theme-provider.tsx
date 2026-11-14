/**
 * Shared dark/light state for multiple toggles.
 * Animation + DOM class come from react-theme-switch-animation (localStorage key: theme).
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeModeContextValue = {
  isDark: boolean;
  setIsDark: (value: boolean | ((prev: boolean) => boolean)) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function readInitialDark(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(readInitialDark);
  const value = useMemo(() => ({ isDark, setIsDark }), [isDark]);
  return (
    <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
}

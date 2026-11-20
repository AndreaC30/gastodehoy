/**
 * Theme state: default dark, persisted in localStorage.theme.
 * One useModeAnimation here so multiple toggles cannot fight on reload.
 */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ThemeAnimationType,
  useModeAnimation,
} from "react-theme-switch-animation";

const STORAGE_KEY = "theme";

type ThemeModeContextValue = {
  isDark: boolean;
  /** Animate from the clicked control (View Transition) and flip theme. */
  toggleTheme: (fromEl?: HTMLElement | null) => Promise<void>;
  /** Set an absolute mode without requiring a prior opposite state. */
  setTheme: (wantDark: boolean, fromEl?: HTMLElement | null) => Promise<void>;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

/** true = dark. Default brand theme is dark when unset. */
function readStoredIsDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light") return false;
    if (stored === "dark") return true;
  } catch {
    /* private mode, etc. */
  }
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark");
  }
  return true;
}

function writeTheme(isDark: boolean) {
  const value = isDark ? "dark" : "light";
  try {
    localStorage.setItem(STORAGE_KEY, value);
    // Library also reads/writes localStorage.theme as a property.
    localStorage.theme = value;
  } catch {
    /* ignore */
  }
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.backgroundColor = isDark
    ? "#0B1727"
    : "#eef3f8";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(readStoredIsDark);
  const { ref, toggleSwitchTheme, isDarkMode } = useModeAnimation({
    isDarkMode: isDark,
    onDarkModeChange: setIsDark,
    animationType: ThemeAnimationType.CIRCLE,
    duration: 700,
    globalClassName: "dark",
  });

  // Keep DOM + storage aligned before paint (survives F5 / Cmd+R).
  useLayoutEffect(() => {
    writeTheme(isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = useCallback(
    async (fromEl?: HTMLElement | null) => {
      if (fromEl && ref && "current" in ref) {
        (ref as { current: HTMLElement | null }).current = fromEl;
      }
      await toggleSwitchTheme();
    },
    [ref, toggleSwitchTheme],
  );

  const setTheme = useCallback(
    async (wantDark: boolean, fromEl?: HTMLElement | null) => {
      if (wantDark === isDarkMode) return;
      await toggleTheme(fromEl);
    },
    [isDarkMode, toggleTheme],
  );

  const value = useMemo(
    () => ({ isDark: isDarkMode, toggleTheme, setTheme }),
    [isDarkMode, toggleTheme, setTheme],
  );

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

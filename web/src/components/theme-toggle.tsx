/** Theme switcher: Within (toggles.dev) + next-themes. */
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { ThemeWithin } from "@/components/ui/theme-within";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  className?: string;
  /** Larger control for account prefs row. */
  size?: "sm" | "md";
};

export function ThemeToggle({ className = "", size = "md" }: Props) {
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !resolvedTheme) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        resolvedTheme === "light" ? "#f4f7fa" : "#070A0D",
      );
    }
  }, [mounted, resolvedTheme]);

  const isDark = mounted
    ? resolvedTheme !== "light"
    : typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");
  const label = isDark ? t("account.themeToLight") : t("account.themeToDark");

  return (
    <ThemeWithin
      toggled={isDark}
      duration={500}
      title={label}
      aria-label={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg text-[var(--color-text)] ${FOCUS_RING} ${
        size === "sm" ? "h-9 w-9 text-[1.35rem]" : "h-11 w-11 text-[1.6rem]"
      } ${className}`}
    />
  );
}

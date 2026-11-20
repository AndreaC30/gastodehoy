/** Theme switcher (Within icon) — shared provider owns animation + persistence. */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ThemeWithin } from "@/components/ui/theme-within";
import { useThemeMode } from "@/components/theme-provider";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  className?: string;
  size?: "sm" | "md";
};

export function ThemeToggle({ className = "", size = "md" }: Props) {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useThemeMode();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isDark ? "#0B1727" : "#eef3f8");
    }
  }, [isDark]);

  const label = isDark ? t("account.themeToLight") : t("account.themeToDark");

  return (
    <ThemeWithin
      toggled={isDark}
      duration={500}
      title={label}
      aria-label={label}
      onClick={(e) => {
        void toggleTheme(e.currentTarget);
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg text-[var(--color-text)] ${FOCUS_RING} ${
        size === "sm" ? "h-9 w-9 text-[1.35rem]" : "h-11 w-11 text-[1.6rem]"
      } ${className}`}
    />
  );
}

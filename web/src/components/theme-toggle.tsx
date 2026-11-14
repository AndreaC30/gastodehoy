/** Theme switcher: Within icon + react-theme-switch-animation (View Transition). */
import { useEffect, type Ref } from "react";
import { useTranslation } from "react-i18next";
import {
  ThemeAnimationType,
  useModeAnimation,
} from "react-theme-switch-animation";
import { ThemeWithin } from "@/components/ui/theme-within";
import { useThemeMode } from "@/components/theme-provider";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  className?: string;
  size?: "sm" | "md";
};

export function ThemeToggle({ className = "", size = "md" }: Props) {
  const { t } = useTranslation();
  const { isDark, setIsDark } = useThemeMode();
  const { ref, toggleSwitchTheme, isDarkMode } = useModeAnimation({
    isDarkMode: isDark,
    onDarkModeChange: setIsDark,
    animationType: ThemeAnimationType.CIRCLE,
    duration: 700,
    globalClassName: "dark",
  });

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isDarkMode ? "#070A0D" : "#f4f7fa");
    }
  }, [isDarkMode]);

  const label = isDarkMode ? t("account.themeToLight") : t("account.themeToDark");

  return (
    <ThemeWithin
      ref={ref as Ref<HTMLButtonElement>}
      toggled={isDarkMode}
      duration={500}
      title={label}
      aria-label={label}
      onClick={() => {
        void toggleSwitchTheme();
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg text-[var(--color-text)] ${FOCUS_RING} ${
        size === "sm" ? "h-9 w-9 text-[1.35rem]" : "h-11 w-11 text-[1.6rem]"
      } ${className}`}
    />
  );
}

/** Theme switcher: Within icon or Oscuro/Claro choice + View Transition. */
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
  /** icon = header Within; segmented = explicit dark/light choice in Account */
  variant?: "icon" | "segmented";
};

export function ThemeToggle({
  className = "",
  size = "md",
  variant = "icon",
}: Props) {
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

  const choose = (wantDark: boolean) => {
    if (wantDark === isDarkMode) return;
    void toggleSwitchTheme();
  };

  if (variant === "segmented") {
    const segmentBtn =
      "min-h-10 flex-1 rounded-md px-3 text-sm font-medium transition-colors " +
      FOCUS_RING;
    return (
      <div
        ref={ref as unknown as Ref<HTMLDivElement>}
        role="group"
        aria-label={t("account.themeTitle")}
        className={`inline-flex min-w-[11.5rem] shrink-0 gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-1 ${className}`}
      >
        <button
          type="button"
          aria-pressed={isDarkMode}
          onClick={() => choose(true)}
          className={`${segmentBtn} ${
            isDarkMode
              ? "bg-[var(--color-panel-elevated)] text-[var(--color-text)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {t("account.themeDark")}
        </button>
        <button
          type="button"
          aria-pressed={!isDarkMode}
          onClick={() => choose(false)}
          className={`${segmentBtn} ${
            !isDarkMode
              ? "bg-[var(--color-panel-elevated)] text-[var(--color-text)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {t("account.themeLight")}
        </button>
      </div>
    );
  }

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

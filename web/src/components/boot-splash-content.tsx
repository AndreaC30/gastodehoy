import { useTranslation } from "react-i18next";
import {
  BOOT_SPLASH_LOGO_LIGHT_SRC,
  BOOT_SPLASH_LOGO_SRC,
} from "@/lib/boot-splash";

/**
 * React 18 no conoce `fetchPriority` y avisa en consola; el atributo DOM es
 * `fetchpriority` en minúsculas, que React 18 escribe tal cual sin aviso.
 */
const HIGH_PRIORITY_ATTR = { fetchpriority: "high" } as Record<string, string>;

type Props = {
  /** When true, shows a subtle pulse on the logo (React loading state). */
  showSpinner?: boolean;
};

export function BootSplashContent({ showSpinner = false }: Props) {
  const { t } = useTranslation();
  const pulse = showSpinner ? " boot-splash__logo--pulse" : "";

  return (
    <>
      <img
        className={`boot-splash__logo boot-splash__logo--dark${pulse}`}
        src={BOOT_SPLASH_LOGO_SRC}
        alt={t("app.name")}
        width={607}
        height={141}
        decoding="async"
        {...HIGH_PRIORITY_ATTR}
        draggable={false}
      />
      <img
        className={`boot-splash__logo boot-splash__logo--light${pulse}`}
        src={BOOT_SPLASH_LOGO_LIGHT_SRC}
        alt=""
        width={607}
        height={141}
        decoding="async"
        aria-hidden
        draggable={false}
      />
      <p className="boot-splash__tagline">{t("splash.tagline")}</p>
    </>
  );
}

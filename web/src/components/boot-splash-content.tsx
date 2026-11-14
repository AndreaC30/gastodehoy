import { useTranslation } from "react-i18next";
import {
  BOOT_SPLASH_LOGO_LIGHT_SRC,
  BOOT_SPLASH_LOGO_SRC,
} from "@/lib/boot-splash";

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
        fetchPriority="high"
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

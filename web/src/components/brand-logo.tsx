/**
 * Logo empaquetado por Vite → /assets/… (FastAPI solo sirve /assets/*).
 * Variante light sin el halo negro entre letras del PNG pensado para fondo oscuro.
 */
import logoDarkSrc from "@/assets/gastodehoy-logo.png";
import logoLightSrc from "@/assets/gastodehoy-logo-light.png";

type Props = {
  /** hero: landing/login centrado; header: barra del dashboard más compacto. */
  variant?: "hero" | "header";
  className?: string;
};

export function BrandLogo({ variant = "hero", className = "" }: Props) {
  /**
   * Hero: ancho acotado (no 100% del contenedor) para tamaño equilibrado.
   * Sin transform scale: el scale amplía el dibujo pero no el hueco en layout y solapa el texto.
   */
  const sizing =
    variant === "hero"
      ? "mx-auto block h-auto w-full max-w-[min(100%,19rem)] object-contain sm:max-w-[21rem] md:max-w-[23rem]"
      : "h-9 w-auto max-w-[min(100%,11.5rem)] object-contain object-left sm:h-10 sm:max-w-[14rem] md:h-11 md:max-w-[16rem]";

  return (
    <span
      role="img"
      aria-label="GastoDeHoy"
      className={`inline-flex items-center leading-none ${variant === "hero" ? "w-full justify-center" : ""} ${className}`}
    >
      <img
        src={logoDarkSrc}
        alt=""
        width={607}
        height={141}
        loading={variant === "hero" ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className={`${sizing} hidden dark:block`}
      />
      <img
        src={logoLightSrc}
        alt=""
        width={607}
        height={141}
        loading={variant === "hero" ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className={`${sizing} dark:hidden`}
      />
    </span>
  );
}

/**
 * Logo empaquetado por Vite → sirve bajo /assets/… (compatible con FastAPI
 * que solo expone /assets/*, no la raíz de /public).
 */
import logoSrc from "@/assets/gastodehoy-logo.png";

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
      : "h-12 w-auto max-w-[min(100%,26rem)] object-contain object-left sm:h-14 md:h-16 md:max-w-[min(100%,30rem)]";

  return (
    <span
      className={`inline-flex items-center leading-none ${variant === "hero" ? "w-full justify-center" : ""} ${className}`}
    >
      <img
        src={logoSrc}
        alt="GastoDeHoy"
        width={607}
        height={141}
        loading={variant === "hero" ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className={sizing}
      />
    </span>
  );
}

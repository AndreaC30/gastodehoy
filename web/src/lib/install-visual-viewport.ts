/**
 * Altura visible real (iOS PWA y ventana de escritorio).
 * 100dvh a veces incluye zona que ya no se ve al hacer scroll y la barra
 * inferior se queda unos píxeles por encima del borde.
 */
export function installVisualViewport() {
  const root = document.documentElement;

  const apply = () => {
    const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
    const next = `${Math.max(height, 1)}px`;
    if (root.style.getPropertyValue("--gdh-vvh") !== next) {
      root.style.setProperty("--gdh-vvh", next);
    }
  };

  apply();
  window.visualViewport?.addEventListener("resize", apply);
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", apply);
}

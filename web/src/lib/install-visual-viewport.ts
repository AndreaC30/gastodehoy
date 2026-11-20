/**
 * Altura visible real de la app (`--gdh-vvh`), usada por el CSS en vez de 100dvh.
 *
 * iOS con la PWA instalada puede dar un alto menor que la pantalla al arrancar
 * (en la captura del problema, unos 60 pt, lo que mide la barra de estado) y no
 * vuelve a avisar: la barra inferior queda flotando con una franja debajo.
 * Por eso:
 *  - se vuelve a medir al arrancar (varias veces), al volver a la app y al girar;
 *  - en un iPhone con la PWA instalada, sin teclado abierto, la app ocupa la
 *    pantalla entera (viewport-fit=cover), así que se usa el alto del dispositivo;
 *  - con el teclado abierto se usa el alto del visor, para que el formulario
 *    quede por encima del teclado.
 */

const KEYBOARD_MIN_PX = 120;

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function isEditingText(): boolean {
  const el = document.activeElement;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["checkbox", "radio", "button", "submit", "range", "color", "file"].includes(el.type);
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

/** Alto de pantalla completa del iPhone según la orientación; null si no aplica. */
export function iphoneFullScreenHeight(): number | null {
  if (!/iPhone/.test(navigator.userAgent) || !isStandalone()) return null;
  const long = Math.max(window.screen.width, window.screen.height);
  const short = Math.min(window.screen.width, window.screen.height);
  return window.matchMedia("(orientation: portrait)").matches ? long : short;
}

export function measureViewportHeight(): number {
  const visual = Math.round(window.visualViewport?.height ?? window.innerHeight);
  const keyboardOpen = isEditingText() && window.innerHeight - visual > KEYBOARD_MIN_PX;
  if (keyboardOpen) return Math.max(visual, 1);
  return Math.max(iphoneFullScreenHeight() ?? visual, 1);
}

export function installVisualViewport() {
  const root = document.documentElement;

  const apply = () => {
    const next = `${measureViewportHeight()}px`;
    if (root.style.getPropertyValue("--gdh-vvh") !== next) {
      root.style.setProperty("--gdh-vvh", next);
    }
  };

  apply();
  // El primer valor en iOS puede ser provisional: se repite mientras se asienta.
  for (const ms of [100, 400, 1200]) window.setTimeout(apply, ms);

  window.visualViewport?.addEventListener("resize", apply);
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", () => {
    apply();
    window.setTimeout(apply, 300);
  });
  window.addEventListener("pageshow", apply);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") apply();
  });
  // El teclado abre y cierra sin garantizar un `resize` a tiempo en iOS.
  document.addEventListener("focusin", () => window.setTimeout(apply, 300));
  document.addEventListener("focusout", () => window.setTimeout(apply, 300));
}

/**
 * Panel de diagnóstico de la pantalla: se activa con `?debug=layout`.
 * Muestra las medidas que usa la app para calcular su alto, para poder
 * enviar una captura desde un móvil concreto. No cambia nada del diseño.
 */
import { iphoneFullScreenHeight, measureViewportHeight } from "@/lib/install-visual-viewport";

function safeInset(side: "top" | "bottom"): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;padding-${side}:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).getPropertyValue(`padding-${side}`)) || 0;
  probe.remove();
  return value;
}

export function maybeShowLayoutDebug(): void {
  if (new URLSearchParams(window.location.search).get("debug") !== "layout") return;
  const panel = document.createElement("pre");
  panel.setAttribute("aria-hidden", "true");
  panel.style.cssText =
    "position:fixed;left:6px;top:calc(env(safe-area-inset-top,0px) + 6px);z-index:2147483647;margin:0;padding:8px;" +
    "font:11px/1.35 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.82);border-radius:8px;pointer-events:none;white-space:pre-wrap;max-width:92vw";
  document.body.appendChild(panel);

  const render = () => {
    const root = document.getElementById("root");
    const frame = document.querySelector(".gdh-app-frame");
    // Varias <nav> (la lateral está oculta en móvil): la barra inferior es la más baja.
    const navBottom = Math.max(
      0,
      ...Array.from(document.querySelectorAll("nav")).map((n) => n.getBoundingClientRect().bottom),
    );
    const nav3 = navBottom > 0 ? Math.round(navBottom) : "-";
    const std = (navigator as Navigator & { standalone?: boolean }).standalone;
    panel.textContent = [
      `standalone: nav=${String(std)} mq=${window.matchMedia("(display-mode: standalone)").matches}`,
      `iPhone: ${/iPhone/.test(navigator.userAgent)}  orient: ${window.matchMedia("(orientation: portrait)").matches ? "vertical" : "horizontal"}`,
      `screen: ${window.screen.width}x${window.screen.height}`,
      `innerHeight: ${window.innerHeight}`,
      `visualViewport.h: ${Math.round(window.visualViewport?.height ?? -1)}`,
      `html.clientHeight: ${document.documentElement.clientHeight}`,
      `--gdh-vvh: ${document.documentElement.style.getPropertyValue("--gdh-vvh") || "(no)"}`,
      `medido ahora: ${measureViewportHeight()}  pantalla iPhone: ${iphoneFullScreenHeight() ?? "-"}`,
      `safe top/bottom: ${safeInset("top")} / ${safeInset("bottom")}`,
      `#root alto: ${Math.round(root?.getBoundingClientRect().height ?? -1)}`,
      `app-frame alto: ${Math.round(frame?.getBoundingClientRect().height ?? -1)}`,
      `barra inferior: borde ${nav3} de ${window.innerHeight}`,
    ].join("\n");
  };
  render();
  window.setInterval(render, 700);
}

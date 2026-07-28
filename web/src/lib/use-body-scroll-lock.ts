import { useEffect } from "react";

/** Contador compartido: varios modales/menús pueden bloquear a la vez. */
let overlayLockCount = 0;

/**
 * Evita que el scroll del modal arrastre la página de detrás (sobre todo en iOS).
 * Guarda la posición del scroll y la restaura al cerrar.
 * También marca `data-overlay-open` para que el chrome de cookies no tape CTAs del menú.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prevBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const prevHtmlOverflow = html.style.overflow;
    const isOuterLock = overlayLockCount === 0;

    overlayLockCount += 1;
    html.style.overflow = "hidden";
    html.setAttribute("data-overlay-open", "1");

    // Solo el primer lock fijo el body; anidados no pisan scrollY.
    if (isOuterLock) {
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }

    return () => {
      overlayLockCount = Math.max(0, overlayLockCount - 1);
      if (overlayLockCount === 0) {
        html.removeAttribute("data-overlay-open");
        html.style.overflow = prevHtmlOverflow;
        if (isOuterLock) {
          body.style.overflow = prevBody.overflow;
          body.style.position = prevBody.position;
          body.style.top = prevBody.top;
          body.style.left = prevBody.left;
          body.style.right = prevBody.right;
          body.style.width = prevBody.width;
          window.scrollTo(0, scrollY);
        }
      }
    };
  }, [locked]);
}

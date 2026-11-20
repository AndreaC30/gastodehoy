import type { KeyboardEvent } from "react";

/**
 * Teclado de una lista de pestañas (patrón WAI-ARIA con activación automática):
 * flechas izquierda/derecha (con vuelta), Inicio y Fin mueven el foco a la
 * pestaña vecina y la activan. Úsalo en el `onKeyDown` del `role="tablist"`.
 * Cada pestaña debe llevar `tabIndex={selected ? 0 : -1}`.
 */
export function onTabListKeyDown(e: KeyboardEvent<HTMLElement>): void {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const tabs = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'),
  );
  if (tabs.length === 0) return;
  const current = tabs.indexOf(document.activeElement as HTMLElement);
  if (current === -1) return;
  let next = current;
  if (e.key === "ArrowRight") next = (current + 1) % tabs.length;
  else if (e.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = tabs.length - 1;
  e.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}

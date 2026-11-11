/** Pantallas que se desplazan dentro del marco (landing, login, legal). */
export const APP_SHELL_CLASS =
  "gdh-app-frame gdh-app-frame--scroll relative bg-[var(--color-bg)] text-[var(--color-text)]";

/**
 * Columna scrolleable del dashboard.
 * `min-h-0` es obligatorio: sin él el flex item crece con el contenido,
 * el padre hace overflow-hidden y la UI queda «pillada» sin scroll.
 * No poner overflow-x: hidden ni clip. Con overflow-y: auto, la
 * especificación convierte clip en hidden, y ese par es el que en
 * Chrome Android duplica y desgarra las tarjetas al desplazar.
 * WebKit (iPhone) no lo hace. Sin eje X, ambos computan a auto.
 */
export const DASHBOARD_SCROLL_CLASS =
  "gdh-dashboard-scroll relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-[var(--color-bg)] text-[var(--color-text)]";

/** @deprecated Usar APP_SHELL_CLASS */
export const RADIAL_SHELL_CLASS = APP_SHELL_CLASS;

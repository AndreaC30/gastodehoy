/** Shell raíz: sin capas de fondo (van en AppBackdrop). */
export const APP_SHELL_CLASS =
  "relative min-h-[100dvh] overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)] " +
  "pb-[max(1.25rem,env(safe-area-inset-bottom))] " +
  "pt-[max(0px,env(safe-area-inset-top))]";

/**
 * Columna scrolleable del dashboard (hijo de flex h-screen).
 * `min-h-0` es obligatorio: sin él el flex item crece con el contenido,
 * el padre hace overflow-hidden y la UI queda «pillada» sin scroll.
 */
export const DASHBOARD_SCROLL_CLASS =
  "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[var(--color-bg)] text-[var(--color-text)] " +
  "pt-[max(0px,env(safe-area-inset-top))]";

/** @deprecated Usar APP_SHELL_CLASS */
export const RADIAL_SHELL_CLASS = APP_SHELL_CLASS;

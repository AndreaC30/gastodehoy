/** Shell raíz: sin capas de fondo (van en AppBackdrop). */
export const APP_SHELL_CLASS =
  "relative min-h-screen overflow-y-auto overflow-x-hidden text-slate-100 " +
  "pb-[max(1.25rem,env(safe-area-inset-bottom))] " +
  "pt-[max(0px,env(safe-area-inset-top))]";

/** @deprecated Usar APP_SHELL_CLASS */
export const RADIAL_SHELL_CLASS = APP_SHELL_CLASS;

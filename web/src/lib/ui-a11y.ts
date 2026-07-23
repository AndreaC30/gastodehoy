/**
 * Shared design tokens for forms, focus rings, and touch targets (44px min).
 *
 * ## Radii convention
 * - `rounded-2xl` → section-level cards (dashboard sections, hero)
 * - `rounded-xl`  → intermediate panels, toast, modals
 * - `rounded-lg`  → inputs, buttons, inner cards, list items
 * - `rounded-md`  → segmented controls, inline chips
 */

export const FOCUS_RING =
  "focus-visible:border-sky-500/50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none";

export const INPUT_CLASS = `w-full min-w-0 max-w-full min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-100 ${FOCUS_RING}`;

/** Input en fila flex (p. ej. cantidad + sufijo % o €). */
export const INPUT_FLEX_CLASS = `min-w-0 flex-1 max-w-full min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-100 ${FOCUS_RING}`;

export const BTN_PRIMARY = `inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;

export const BTN_SECONDARY = `inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 ${FOCUS_RING}`;

export const BTN_GHOST = `inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 ${FOCUS_RING}`;

/** Section card: rounded-2xl, border-slate-800, bg-slate-900, shadow. */
export const SECTION_CARD = `rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20`;

/** Inner card / panel inside a section. */
export const INNER_CARD = `rounded-lg border border-slate-800 bg-slate-900`;

/** Shared classes for focus rings and minimum touch targets (44px). */

export const FOCUS_RING =
  "focus-visible:border-sky-500/50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none";

export const INPUT_CLASS = `w-full min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${FOCUS_RING}`;

export const BTN_PRIMARY = `inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;

export const BTN_SECONDARY = `inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 ${FOCUS_RING}`;

export const BTN_GHOST = `inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 ${FOCUS_RING}`;

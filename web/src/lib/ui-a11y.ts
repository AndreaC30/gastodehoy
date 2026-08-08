/**
 * Shared design tokens for forms, focus rings, and touch targets (44px min).
 *
 * Visual language: Observabilidad V11 (dense panels, cyan accent, soft borders).
 *
 * ## Radii convention
 * - `rounded-[10px]` → section-level cards (dashboard sections, hero)
 * - `rounded-xl`     → intermediate panels, toast, modals
 * - `rounded-lg` / `rounded-[8px]` → inputs, buttons, inner cards, list items
 * - `rounded-md`     → segmented controls, inline chips
 *
 * ## Breakpoints
 * - `md` (768px) = app chrome (BottomNav / sidebar) and overlay sheets (AppSheet)
 * - `sm` (640px) = typography / content density only — do not flip shell or modals at sm
 */

export const FOCUS_RING =
  "focus-visible:border-[var(--color-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-dim)] focus-visible:outline-none";

export const INPUT_CLASS = `w-full min-w-0 max-w-full min-h-11 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2.5 text-base text-[var(--color-text)] ${FOCUS_RING}`;

/** Input en fila flex (p. ej. cantidad + sufijo % o €). */
export const INPUT_FLEX_CLASS = `min-w-0 flex-1 max-w-full min-h-11 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2.5 text-base text-[var(--color-text)] ${FOCUS_RING}`;

export const BTN_PRIMARY = `inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;

export const BTN_SECONDARY = `inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)] hover:text-[var(--color-text)] ${FOCUS_RING}`;

export const BTN_GHOST = `inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-dim)] hover:bg-[var(--color-panel-elevated)] hover:text-[var(--color-text)] ${FOCUS_RING}`;

/** Section card: panel + soft border (mockup kpi / plant-panel). */
export const SECTION_CARD =
  "rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-surface)] sm:rounded-[10px]";

/** Inner card / panel inside a section. */
export const INNER_CARD =
  "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)]";

/** Inline error / destructive alert surface. */
export const ALERT_CRIT =
  "rounded-xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] text-sm text-[var(--color-crit)]";

/** Overlay elevation (sheets, toasts, dialogs) — not for section cards. */
export const MODAL_SHADOW = "shadow-[var(--shadow-overlay)]";

/** Icon-only control with ≥44px hit area. */
export const ICON_BTN = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)] hover:text-[var(--color-text)] ${FOCUS_RING}`;

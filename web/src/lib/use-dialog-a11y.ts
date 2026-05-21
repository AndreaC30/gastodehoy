import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus trap + restore focus when a modal dialog opens/closes.
 * Pair with role="dialog", aria-modal="true", and Escape handler.
 */
export function useDialogA11y(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previous = document.activeElement as HTMLElement | null;

    const root = panel;

    function focusables(): HTMLElement[] {
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    }

    const t = window.setTimeout(() => {
      const list = focusables();
      (list[0] ?? root).focus();
    }, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    root.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      root.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, panelRef]);
}

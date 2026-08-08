/**
 * Shared mobile bottom sheet / desktop dialog shell.
 * Full-bleed on mobile (no side gutters); centered panel from md up.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { FOCUS_RING, MODAL_SHADOW } from "@/lib/ui-a11y";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Extra footer below scroll (optional). */
  footer?: ReactNode;
  /** Tailwind z-index class, default z-[70] */
  zClass?: string;
  /** Crit/danger border tone */
  danger?: boolean;
  /** Show drag handle on mobile */
  showHandle?: boolean;
  labelledById?: string;
  panelClassName?: string;
};

export function AppSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  zClass = "z-[70]",
  danger = false,
  showHandle = true,
  labelledById,
  panelClassName = "",
}: Props) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const titleId = labelledById ?? autoId;

  useBodyScrollLock(open);
  useDialogA11y(open, panelRef);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const border = danger
    ? "border-[var(--color-crit-border)]"
    : "border-[var(--color-border-subtle)]";

  return (
    <div
      className={`fixed inset-0 ${zClass} flex touch-none items-end justify-center overflow-hidden bg-black/60 pt-10 md:items-center md:px-4 md:py-6`}
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-scroll flex max-h-[min(92dvh,100%)] w-full max-w-lg touch-auto flex-col overflow-hidden rounded-t-2xl border ${border} bg-[var(--color-panel)] ${MODAL_SHADOW} md:max-h-[min(90vh,100dvh)] md:rounded-2xl ${panelClassName}`}
        style={{
          paddingBottom:
            "max(0.75rem, var(--gdh-overlay-footer-pad, env(safe-area-inset-bottom)))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showHandle ? (
          <div className="flex justify-center pt-2.5 pb-1 md:hidden" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-[var(--color-border-subtle)]" />
          </div>
        ) : null}

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 pb-4 pt-2 md:pt-5">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className={`font-display text-lg font-semibold tracking-tight ${danger ? "text-[var(--color-crit)]" : "text-[var(--color-text)]"}`}
            >
              {title}
            </h2>
            {subtitle ? (
              <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)]/60 ${FOCUS_RING}`}
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Left navigation drawer (mobile) — slides in/out like the desktop sidebar,
 * not a centered modal / bottom sheet.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { ICON_BTN } from "@/lib/ui-a11y";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  labelledById?: string;
  zClass?: string;
};

export function AppDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  labelledById,
  zClass = "z-[60]",
}: Props) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const titleId = labelledById ?? autoId;
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  useBodyScrollLock(open);
  useDialogA11y(open && mounted, panelRef);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setEntered(false);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 ${zClass} md:hidden`} role="presentation">
      <button
        type="button"
        aria-label={t("common.close")}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute inset-y-0 left-0 flex w-[min(17.5rem,86vw)] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-soft)] shadow-[var(--shadow-overlay)] outline-none transition-transform duration-200 ease-out ${
          entered ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onTransitionEnd={(e) => {
          if (e.target !== panelRef.current) return;
          if (!open) setMounted(false);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--color-border)] px-3 py-3">
          <div className="min-w-0 flex-1 px-1 pt-1">
            <h2
              id={titleId}
              className="font-display text-base font-semibold tracking-tight text-[var(--color-text)]"
            >
              {title}
            </h2>
            {subtitle ? (
              <div className="mt-0.5 truncate text-sm text-[var(--color-accent)]">
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className={ICON_BTN}
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 py-2">
          {children}
        </div>
      </aside>
    </div>
  );
}

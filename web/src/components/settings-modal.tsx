/**
 * Modal dialog used by the dashboard / monthly income check to edit
 * income + savings (+ extras when focus is full).
 */
import { useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import type { ExtraIncome, Settings } from "@/api/types";
import {
  IncomeSettingsContent,
  type SettingsFocus,
} from "@/components/dashboard/income-settings-content";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";

export type { SettingsFocus };

type Props = {
  initial: Settings;
  extras: ExtraIncome[];
  onClose: () => void;
  onBackToMenu?: () => void;
  onSaved: (next: Settings) => void;
  onExtrasChanged: () => void;
  /** Defaults to full settings modal with both tabs. */
  focus?: SettingsFocus;
  title?: string;
  subtitle?: string;
  saveLabel?: string;
};

/** Controlled modal: pre-fills with `initial` and reports the saved row. */
export function SettingsModal({
  initial,
  extras,
  onClose,
  onBackToMenu,
  onSaved,
  onExtrasChanged,
  focus = "full",
  title,
  subtitle,
  saveLabel,
}: Props) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  useBodyScrollLock(true);
  useDialogA11y(true, panelRef);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onTouchStart(e: React.TouchEvent) {
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.scrollTop > 5) return;
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta < 0) return;
    const clamped = Math.min(delta, 120);
    setDragOffset(clamped);
  }

  function onTouchEnd() {
    if (!dragging) return;
    setDragging(false);
    if (dragOffset > 80) {
      onClose();
    }
    setDragOffset(0);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex touch-none items-end justify-center overflow-hidden bg-black/60 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ transform: `translateY(${dragOffset}px)` }}
        className={`modal-scroll max-h-[min(90vh,100dvh)] w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)] p-4 pr-3 shadow-2xl shadow-black/50 transition-transform duration-300 sm:rounded-2xl sm:p-5 sm:pr-4 ${dragging ? "transition-none" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-600 sm:hidden" />
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="settings-modal-title"
              className="text-lg font-bold tracking-tight"
            >
              {title ?? t("incomeSettings.title")}
            </h2>
            <p className="text-sm text-[var(--color-text-dim)]">
              {subtitle ?? t("incomeSettings.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-panel-elevated)]/60"
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <IncomeSettingsContent
          initial={initial}
          extras={extras}
          focus={focus}
          saveLabel={saveLabel}
          variant="modal"
          idPrefix="settings"
          onClose={onClose}
          onBackToMenu={onBackToMenu}
          onSaved={onSaved}
          onExtrasChanged={onExtrasChanged}
        />
      </div>
    </div>
  );
}

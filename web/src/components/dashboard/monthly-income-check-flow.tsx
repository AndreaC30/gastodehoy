/**
 * On the 1st of each month, asks whether income changed; reuses SettingsModal
 * for income-only and savings-only steps when the user says no.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import type { ExtraIncome, Settings } from "@/api/types";
import { SettingsModal } from "@/components/settings-modal";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { isFirstDayOfMonth } from "@/lib/month-income-check";
import {
  isIncomeCheckAnsweredForMonth,
  markIncomeCheckAnswered,
} from "@/lib/income-check-preference";
import { todayDate } from "@/lib/month-context";

type Phase = "idle" | "askIncome" | "enterIncome" | "askSavings" | "enterSavings";

type Props = {
  settings: Settings;
  extras: ExtraIncome[];
  showTour: boolean;
  /** Incremented when the guided tour closes so the check can open right after. */
  tourClosedSignal: number;
  onSettingsSaved: (next: Settings) => void;
  onExtrasChanged: () => void;
  onToast: (message: string) => void;
  onFlowComplete: () => void;
};

function ChoiceDialog({
  title,
  body,
  hint,
  yesLabel,
  noLabel,
  onYes,
  onNo,
  onClose,
}: {
  title: string;
  body: string;
  hint?: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useBodyScrollLock(true);
  useDialogA11y(true, panelRef);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] flex touch-none items-end justify-center overflow-hidden bg-black/60 px-3 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-scroll max-h-[min(85dvh,100dvh)] w-full max-w-md touch-auto overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-black/50 sm:max-h-none sm:rounded-2xl sm:p-5"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="min-w-0 flex-1 text-lg font-bold tracking-tight sm:text-xl">
            {title}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="min-h-11 min-w-11 shrink-0 rounded-lg border border-slate-800 p-2 text-slate-400 hover:bg-slate-800/60"
            >
              <IoClose className="mx-auto h-5 w-5" aria-hidden />
            </button>
          )}
        </header>
        <p className="text-sm leading-relaxed text-slate-400 sm:text-base">{body}</p>
        {hint && (
          <p className="mt-3 text-xs leading-relaxed text-slate-500 sm:text-sm">{hint}</p>
        )}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end sm:gap-2">
          <button
            type="button"
            onClick={onNo}
            className="min-h-11 w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60 sm:w-auto"
          >
            {noLabel}
          </button>
          <button
            type="button"
            onClick={onYes}
            className="min-h-11 w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 sm:w-auto"
          >
            {yesLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MonthlyIncomeCheckFlow({
  settings,
  extras,
  showTour,
  tourClosedSignal,
  onSettingsSaved,
  onExtrasChanged,
  onToast,
  onFlowComplete,
}: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [answeredThisSession, setAnsweredThisSession] = useState(false);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (answeredThisSession || showTour) return;
    if (phase !== "idle") return;
    const today = todayDate();
    if (!isFirstDayOfMonth(today)) return;
    if (isIncomeCheckAnsweredForMonth(today, settings.income_check_month)) return;
    if (Number(settings.monthly_income) <= 0) return;
    setPhase("askIncome");
  }, [
    phase,
    answeredThisSession,
    showTour,
    tourClosedSignal,
    settings.monthly_income,
    settings.income_check_month,
  ]);

  function finishFlow() {
    void markIncomeCheckAnswered(todayDate()).then(() => {
      onFlowComplete();
    });
    setAnsweredThisSession(true);
    setPhase("idle");
  }

  function handleIncomeSameYes() {
    finishFlow();
  }

  function handleIncomeSameNo() {
    setPhase("enterIncome");
  }

  function handleIncomeSaved(next: Settings) {
    setCurrentSettings(next);
    onSettingsSaved(next);
    onToast(t("monthIncomeCheck.incomeSaved"));
    setPhase("askSavings");
  }

  function handleSavingsSameYes() {
    finishFlow();
  }

  function handleSavingsSameNo() {
    setPhase("enterSavings");
  }

  function handleSavingsSaved(next: Settings) {
    setCurrentSettings(next);
    onSettingsSaved(next);
    onToast(t("toasts.changesSaved"));
    finishFlow();
  }

  if (phase === "idle") return null;

  if (phase === "askIncome") {
    return (
      <ChoiceDialog
        title={t("monthIncomeCheck.incomeQuestionTitle")}
        body={t("monthIncomeCheck.incomeQuestionBody")}
        hint={t("monthIncomeCheck.incomeQuestionHint")}
        yesLabel={t("monthIncomeCheck.sameYes")}
        noLabel={t("monthIncomeCheck.sameNo")}
        onYes={handleIncomeSameYes}
        onNo={handleIncomeSameNo}
        onClose={handleIncomeSameYes}
      />
    );
  }

  if (phase === "askSavings") {
    return (
      <ChoiceDialog
        title={t("monthIncomeCheck.savingsQuestionTitle")}
        body={t("monthIncomeCheck.savingsQuestionBody")}
        yesLabel={t("monthIncomeCheck.sameYes")}
        noLabel={t("monthIncomeCheck.sameNo")}
        onYes={handleSavingsSameYes}
        onNo={handleSavingsSameNo}
        onClose={handleSavingsSameYes}
      />
    );
  }

  if (phase === "enterIncome") {
    return (
      <SettingsModal
        initial={currentSettings}
        extras={extras}
        focus="incomeOnly"
        title={t("monthIncomeCheck.incomeModalTitle")}
        subtitle={t("monthIncomeCheck.incomeModalSubtitle")}
        saveLabel={t("monthIncomeCheck.saveIncome")}
        onClose={() => setPhase("askIncome")}
        onSaved={handleIncomeSaved}
        onExtrasChanged={onExtrasChanged}
      />
    );
  }

  if (phase === "enterSavings") {
    return (
      <SettingsModal
        initial={currentSettings}
        extras={extras}
        focus="savingsOnly"
        title={t("monthIncomeCheck.savingsModalTitle")}
        subtitle={t("monthIncomeCheck.savingsModalSubtitle")}
        onClose={() => setPhase("askSavings")}
        onSaved={handleSavingsSaved}
        onExtrasChanged={onExtrasChanged}
      />
    );
  }

  return null;
}

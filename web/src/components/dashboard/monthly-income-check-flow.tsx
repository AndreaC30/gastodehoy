/**
 * On the 1st of each month, asks whether income changed; reuses SettingsModal
 * for income-only and savings-only steps when the user says no.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ExtraIncome, Settings } from "@/api/types";
import { SettingsModal } from "@/components/settings-modal";
import { AppSheet } from "@/components/ui/app-sheet";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui-a11y";
import { TYPE_BODY, TYPE_CAPTION } from "@/lib/typography";
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
  return (
    <AppSheet
      open
      onClose={onClose ?? onYes}
      title={title}
      zClass="z-[95]"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onNo} className={`w-full sm:w-auto ${BTN_SECONDARY}`}>
            {noLabel}
          </button>
          <button type="button" onClick={onYes} className={`w-full sm:w-auto ${BTN_PRIMARY}`}>
            {yesLabel}
          </button>
        </div>
      }
    >
      <p className={TYPE_BODY}>{body}</p>
      {hint ? <p className={`mt-3 ${TYPE_CAPTION}`}>{hint}</p> : null}
    </AppSheet>
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

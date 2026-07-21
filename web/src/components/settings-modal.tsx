/**
 * Modal dialog used by the dashboard's gear button to edit the same
 * fields that the onboarding wizard captured (income + savings rule).
 */
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import type {
  ExtraIncome,
  ExtraIncomeSavingsMode,
  SavingsMode,
  Settings,
} from "@/api/types";
import { FormField } from "@/components/ui/form-field";
import { money } from "@/lib/format";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { ModalMenuFooter } from "@/components/modal-menu-footer";
import { INPUT_CLASS, INPUT_FLEX_CLASS } from "@/lib/ui-a11y";
import {
  isDailyNotificationEnabled,
  setDailyNotificationEnabled,
} from "@/lib/daily-notification-preference";
import { requestNotificationPermission } from "@/lib/daily-notification";
import { registerWebPush, unregisterWebPush } from "@/lib/push-subscription";
import { getDensity, setDensity, type Density } from "@/lib/density-preference";

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

const inputClass = `${INPUT_CLASS} py-2.5`;

const inputClassSm = `${INPUT_CLASS} text-sm`;

type SettingsTab = "monthly" | "extra";

/** Which fields to show: full settings, income-only, or savings-only (monthly check flow). */
export type SettingsFocus = "full" | "incomeOnly" | "savingsOnly";

function describeExtraSavings(it: ExtraIncome, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const mode = it.savings_mode ?? "none";
  if (mode === "all") return t("incomeSettings.extraSavingsAll");
  if (mode === "percent") {
    return t("incomeSettings.extraSavingsPercent", { pct: it.savings_percent });
  }
  if (mode === "fixed") {
    return t("incomeSettings.extraSavingsFixed", { amount: money(it.savings_fixed) });
  }
  return t("incomeSettings.extraSavingsNone");
}

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  const isFocused = focus !== "full";
  const [income, setIncome] = useState(String(initial.monthly_income ?? ""));
  const [mode, setMode] = useState<SavingsMode>(initial.savings_mode);
  const [percent, setPercent] = useState(String(initial.savings_percent ?? "0"));
  const [amount, setAmount] = useState(String(initial.savings_amount ?? "0"));
  const [tab, setTab] = useState<SettingsTab>("monthly");
  const [extraAmount, setExtraAmount] = useState("");
  const [extraDate, setExtraDate] = useState(todayIsoLocal);
  const [extraSavingsMode, setExtraSavingsMode] =
    useState<ExtraIncomeSavingsMode>("none");
  const [extraSavingsPercent, setExtraSavingsPercent] = useState("0");
  const [extraSavingsFixed, setExtraSavingsFixed] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dailyNotify, setDailyNotify] = useState(isDailyNotificationEnabled);
  const [density, setDensityState] = useState<Density>(getDensity);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  useBodyScrollLock(true);
  useDialogA11y(true, panelRef);

  const addExtra = useMutation({
    mutationFn: (body: {
      amount: string;
      received_at: string;
      savings_mode: ExtraIncomeSavingsMode;
      savings_percent: string;
      savings_fixed: string;
    }) =>
      api<ExtraIncome>("/api/extra-income", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setExtraAmount("");
      setExtraDate(todayIsoLocal());
      setExtraSavingsMode("none");
      setExtraSavingsPercent("0");
      setExtraSavingsFixed("0");
      onExtrasChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  const delExtra = useMutation({
    mutationFn: (id: number) =>
      api(`/api/extra-income/${id}`, { method: "DELETE" }),
    onSuccess: () => onExtrasChanged(),
    onError: (e: Error) => setError(e.message),
  });

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

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const next = await api<Settings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          monthly_income: income || "0",
          savings_mode: mode,
          savings_percent: mode === "percent" ? percent || "0" : "0",
          savings_amount: mode === "fixed" ? amount || "0" : "0",
        }),
      });
      onSaved(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function addExtraIncomeRow() {
    setError(null);
    const n = Number(extraAmount.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setError(t("incomeSettings.extraError"));
      return;
    }
    if (extraSavingsMode === "percent") {
      const pct = Number(extraSavingsPercent.replace(",", "."));
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setError(t("incomeSettings.pctError"));
        return;
      }
    }
    if (extraSavingsMode === "fixed") {
      const fixed = Number(extraSavingsFixed.replace(",", "."));
      if (!Number.isFinite(fixed) || fixed < 0) {
        setError(t("incomeSettings.fixedError"));
        return;
      }
      if (fixed > n) {
        setError(t("incomeSettings.savingsExceedError"));
        return;
      }
    }
    addExtra.mutate({
      amount: extraAmount,
      received_at: extraDate,
      savings_mode: extraSavingsMode,
      savings_percent:
        extraSavingsMode === "percent" ? extraSavingsPercent || "0" : "0",
      savings_fixed: extraSavingsMode === "fixed" ? extraSavingsFixed || "0" : "0",
    });
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
        className={`modal-scroll max-h-[min(90vh,100dvh)] w-full max-w-md touch-auto overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-800 bg-slate-900 p-4 pr-3 shadow-2xl shadow-black/50 transition-transform duration-300 sm:rounded-2xl sm:p-5 sm:pr-4 ${dragging ? "transition-none" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle – visible only on mobile */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-600 sm:hidden" />
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="settings-modal-title"
              className="text-lg font-bold tracking-tight"
            >
              {title ?? t("incomeSettings.title")}
            </h2>
            <p className="text-sm text-slate-500">
              {subtitle ?? t("incomeSettings.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800/60"
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {error && (
          <div
            className="mb-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {!isFocused && (
          <div
            className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-sm"
            role="tablist"
            aria-label={t("incomeSettings.tabsLabel")}
          >
            <TabBtn
              active={tab === "monthly"}
              onClick={() => setTab("monthly")}
              id="settings-tab-monthly"
              controls="settings-panel-monthly"
            >
              {t("incomeSettings.tabMonthly")}
            </TabBtn>
            <TabBtn
              active={tab === "extra"}
              onClick={() => setTab("extra")}
              id="settings-tab-extra"
              controls="settings-panel-extra"
            >
              {t("incomeSettings.tabExtra")}
            </TabBtn>
          </div>
        )}

        {tab === "monthly" || isFocused ? (
          <form
            id="settings-panel-monthly"
            role="tabpanel"
            aria-labelledby="settings-tab-monthly"
            onSubmit={submit}
            className="space-y-4"
          >
            {focus !== "savingsOnly" && (
              <FormField id="settings-income" label={t("incomeSettings.monthlyIncome")}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  required
                  autoFocus={focus === "incomeOnly"}
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className={inputClass}
                />
              </FormField>
            )}

            {focus !== "incomeOnly" && (
            <div>
              <p
                id="settings-savings-label"
                className="text-sm font-medium text-slate-400"
              >
                {t("incomeSettings.savingsLabel")}
              </p>
              <div
                className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-sm"
                role="group"
                aria-labelledby="settings-savings-label"
              >
                <ModeBtn
                  active={mode === "percent"}
                  onClick={() => setMode("percent")}
                >
                  {t("incomeSettings.savingsPercent")}
                </ModeBtn>
                <ModeBtn
                  active={mode === "fixed"}
                  onClick={() => setMode("fixed")}
                >
                  {t("incomeSettings.savingsFixed")}
                </ModeBtn>
              </div>

              {mode === "percent" ? (
                <SavingsInputRow
                  id="settings-savings-percent"
                  label={t("incomeSettings.savingsPercentLabel")}
                  suffix="%"
                  hint={t("incomeSettings.savingsPercentHint")}
                  value={percent}
                  onChange={setPercent}
                  max={100}
                />
              ) : (
                <SavingsInputRow
                  id="settings-savings-amount"
                  label={t("incomeSettings.savingsFixedLabel")}
                  suffix="€"
                  hint={t("incomeSettings.savingsFixedHint")}
                  value={amount}
                  onChange={setAmount}
                />
              )}
            </div>
            )}

            {!isFocused && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
              <input
                type="checkbox"
                checked={dailyNotify}
                className="mt-1 h-4 w-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500"
                onChange={async (e) => {
                  const on = e.target.checked;
                  setError(null);
                  if (on) {
                    const perm = await requestNotificationPermission();
                    if (perm !== "granted") {
                      setError(
                        t("incomeSettings.notifyError"),
                      );
                      return;
                    }
                    await registerWebPush();
                  } else {
                    await unregisterWebPush();
                  }
                  setDailyNotificationEnabled(on);
                  setDailyNotify(on);
                }}
              />
              <span className="text-sm text-slate-300">
                <span className="font-medium text-slate-100">{t("incomeSettings.dailyNotifyTitle")}</span>
                <span className="mt-0.5 block text-slate-400">
                  {t("incomeSettings.dailyNotifyDesc")}
                </span>
              </span>
            </label>
            )}

            {!isFocused && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
              <input
                type="checkbox"
                checked={density === "compact"}
                className="mt-1 h-4 w-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500"
                onChange={(e) => {
                  const next: Density = e.target.checked ? "compact" : "comfortable";
                  setDensity(next);
                  setDensityState(next);
                }}
              />
              <span className="text-sm text-slate-300">
                <span className="font-medium text-slate-100">{t("incomeSettings.densityTitle")}</span>
                <span className="mt-0.5 block text-slate-400">
                  {t("incomeSettings.densityDesc")}
                </span>
              </span>
            </label>
            )}

            <ModalMenuFooter
              className="pt-2"
              onBackToMenu={isFocused ? undefined : onBackToMenu}
              onClose={onClose}
              closeLabel={t("common.cancel")}
            >
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 sm:w-auto"
              >
                {busy ? t("incomeSettings.saving") : (saveLabel ?? t("common.save"))}
              </button>
            </ModalMenuFooter>
          </form>
        ) : !isFocused ? (
          <div
            id="settings-panel-extra"
            role="tabpanel"
            aria-labelledby="settings-tab-extra"
            className="space-y-4"
          >
            <p className="text-sm leading-relaxed text-slate-400">
              {t("incomeSettings.extraDesc")}
            </p>

            <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
              <FormField
                id="settings-extra-amount"
                label={t("incomeSettings.extraAmount")}
                className="w-full min-w-0 lg:flex-1"
              >
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder={t("incomeSettings.extraAmountPlaceholder")}
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(e.target.value)}
                  className={inputClassSm}
                />
              </FormField>
              <FormField
                id="settings-extra-date"
                label={t("incomeSettings.extraDate")}
                className="w-full lg:w-auto"
              >
                <input
                  type="date"
                  value={extraDate}
                  onChange={(e) => setExtraDate(e.target.value)}
                  className={inputClassSm}
                />
              </FormField>
            </div>

            <div>
              <p
                id="settings-extra-savings-label"
                className="text-sm font-medium text-slate-400"
              >
                {t("incomeSettings.extraSavingsQuestion")}
              </p>
              <div
                className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-sm"
                role="group"
                aria-labelledby="settings-extra-savings-label"
              >
                <ModeBtn
                  active={extraSavingsMode === "none"}
                  onClick={() => setExtraSavingsMode("none")}
                >
                  {t("incomeSettings.extraSpendAll")}
                </ModeBtn>
                <ModeBtn
                  active={extraSavingsMode === "all"}
                  onClick={() => setExtraSavingsMode("all")}
                >
                  {t("incomeSettings.extraSaveAll")}
                </ModeBtn>
                <ModeBtn
                  active={extraSavingsMode === "percent"}
                  onClick={() => setExtraSavingsMode("percent")}
                >
                  {t("incomeSettings.extraPercent")}
                </ModeBtn>
                <ModeBtn
                  active={extraSavingsMode === "fixed"}
                  onClick={() => setExtraSavingsMode("fixed")}
                >
                  {t("incomeSettings.extraFixed")}
                </ModeBtn>
              </div>

              {extraSavingsMode === "percent" && (
                <SavingsInputRow
                  id="settings-extra-savings-percent"
                  label={t("incomeSettings.extraPercentLabel")}
                  suffix="%"
                  hint={t("incomeSettings.extraPercentHint")}
                  value={extraSavingsPercent}
                  onChange={setExtraSavingsPercent}
                  max={100}
                />
              )}
              {extraSavingsMode === "fixed" && (
                <SavingsInputRow
                  id="settings-extra-savings-fixed"
                  label={t("incomeSettings.extraFixedLabel")}
                  suffix="€"
                  hint={t("incomeSettings.extraFixedHint")}
                  value={extraSavingsFixed}
                  onChange={setExtraSavingsFixed}
                />
              )}
            </div>

            <button
              type="button"
              onClick={addExtraIncomeRow}
              disabled={addExtra.isPending}
              className="w-full rounded-lg border border-teal-500/50 bg-teal-500/15 px-3 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-500/25 disabled:opacity-60"
            >
              {addExtra.isPending ? t("incomeSettings.adding") : t("incomeSettings.addExtra")}
            </button>

            <ul className="space-y-2">
              {extras.length === 0 ? (
                <li className="text-sm text-slate-600">{t("incomeSettings.extraEmpty")}</li>
              ) : (
                extras.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold tabular-nums text-teal-300/90">
                        {money(it.amount)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {it.received_at} · {describeExtraSavings(it, t)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => delExtra.mutate(it.id)}
                      disabled={delExtra.isPending}
                      className="shrink-0 rounded-lg border border-rose-500/40 px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {t("incomeSettings.extraDelete")}
                    </button>
                  </li>
                ))
              )}
            </ul>

            <ModalMenuFooter
              className="pt-2"
              onBackToMenu={onBackToMenu}
              onClose={onClose}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SavingsInputRow({
  id,
  label,
  suffix,
  hint,
  value,
  onChange,
  max,
}: {
  id: string;
  label: string;
  suffix: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  const hintId = `${id}-hint`;
  return (
    <div className="mt-3">
      <label htmlFor={id} className="text-sm font-medium text-slate-400">
        {label}
      </label>
      <div className="mt-1.5 flex min-w-0 items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hintId}
          className={INPUT_FLEX_CLASS}
        />
        <span className="shrink-0 text-slate-500">{suffix}</span>
      </div>
      <p id={hintId} className="mt-2 text-xs leading-relaxed text-slate-500">
        {hint}
      </p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
  id,
  controls,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id: string;
  controls: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`min-h-11 rounded-lg px-3 py-2 font-medium transition ${
        active
          ? "bg-slate-900 text-slate-100 shadow-inner"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

/** Pill button used to switch savings modes. */
function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 font-medium transition ${
        active
          ? "bg-slate-900 text-slate-100 shadow-inner"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

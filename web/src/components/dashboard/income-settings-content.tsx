/**
 * Shared income + savings + extra-income form (modal and inline section).
 */
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import type {
  ExtraIncome,
  ExtraIncomeSavingsMode,
  SavingsMode,
  Settings,
} from "@/api/types";
import { FormField } from "@/components/ui/form-field";
import { ModalMenuFooter } from "@/components/modal-menu-footer";
import { money } from "@/lib/format";
import { INPUT_CLASS, INPUT_FLEX_CLASS } from "@/lib/ui-a11y";

export type SettingsFocus = "full" | "incomeOnly" | "savingsOnly";

type SettingsTab = "monthly" | "extra";

type Props = {
  initial: Settings;
  extras: ExtraIncome[];
  onSaved: (next: Settings) => void;
  onExtrasChanged: () => void;
  focus?: SettingsFocus;
  saveLabel?: string;
  /** `modal` keeps cancel / back-to-menu; `page` is inline section chrome. */
  variant?: "modal" | "page";
  onClose?: () => void;
  onBackToMenu?: () => void;
  /** Prefix for form control ids (avoids clashes if both mount). */
  idPrefix?: string;
};

const inputClass = `${INPUT_CLASS} py-2.5`;
const inputClassSm = `${INPUT_CLASS} text-sm`;

function describeExtraSavings(
  it: ExtraIncome,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
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

export function IncomeSettingsContent({
  initial,
  extras,
  onSaved,
  onExtrasChanged,
  focus = "full",
  saveLabel,
  variant = "page",
  onClose,
  onBackToMenu,
  idPrefix = "income",
}: Props) {
  const { t } = useTranslation();
  const isFocused = focus !== "full";
  const isModal = variant === "modal";
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

  const pid = (name: string) => `${idPrefix}-${name}`;

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
    } catch (err) {
      setError((err as Error).message);
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

  const saveBtn = (
    <button
      type="submit"
      disabled={busy}
      className="min-h-11 w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-110 disabled:opacity-60 sm:w-auto"
    >
      {busy ? t("incomeSettings.saving") : (saveLabel ?? t("common.save"))}
    </button>
  );

  return (
    <div>
      {error && (
        <div
          className="mb-3 rounded-xl border border-[var(--color-crit-border)] bg-[var(--color-crit-dim)] px-3 py-2 text-sm text-[var(--color-crit)]"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {!isFocused && (
        <div
          className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/60 p-1 text-sm"
          role="tablist"
          aria-label={t("incomeSettings.tabsLabel")}
        >
          <TabBtn
            active={tab === "monthly"}
            onClick={() => setTab("monthly")}
            id={pid("tab-monthly")}
            controls={pid("panel-monthly")}
          >
            {t("incomeSettings.tabMonthly")}
          </TabBtn>
          <TabBtn
            active={tab === "extra"}
            onClick={() => setTab("extra")}
            id={pid("tab-extra")}
            controls={pid("panel-extra")}
          >
            {t("incomeSettings.tabExtra")}
          </TabBtn>
        </div>
      )}

      {tab === "monthly" || isFocused ? (
        <form
          id={pid("panel-monthly")}
          role="tabpanel"
          aria-labelledby={pid("tab-monthly")}
          onSubmit={submit}
          className="space-y-4"
        >
          {focus !== "savingsOnly" && (
            <FormField id={pid("income")} label={t("incomeSettings.monthlyIncome")}>
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
                id={pid("savings-label")}
                className="text-sm font-medium text-[var(--color-text-muted)]"
              >
                {t("incomeSettings.savingsLabel")}
              </p>
              <div
                className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/60 p-1 text-sm"
                role="group"
                aria-labelledby={pid("savings-label")}
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
                  id={pid("savings-percent")}
                  label={t("incomeSettings.savingsPercentLabel")}
                  suffix="%"
                  hint={t("incomeSettings.savingsPercentHint")}
                  value={percent}
                  onChange={setPercent}
                  max={100}
                />
              ) : (
                <SavingsInputRow
                  id={pid("savings-amount")}
                  label={t("incomeSettings.savingsFixedLabel")}
                  suffix="€"
                  hint={t("incomeSettings.savingsFixedHint")}
                  value={amount}
                  onChange={setAmount}
                />
              )}
            </div>
          )}

          {isModal ? (
            <ModalMenuFooter
              className="pt-2"
              onBackToMenu={isFocused ? undefined : onBackToMenu}
              onClose={onClose}
              closeLabel={t("common.cancel")}
            >
              {saveBtn}
            </ModalMenuFooter>
          ) : (
            <div className="border-t border-[var(--color-border)] pt-4">{saveBtn}</div>
          )}
        </form>
      ) : !isFocused ? (
        <div
          id={pid("panel-extra")}
          role="tabpanel"
          aria-labelledby={pid("tab-extra")}
          className="space-y-4"
        >
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            {t("incomeSettings.extraDesc")}
          </p>

          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
            <FormField
              id={pid("extra-amount")}
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
              id={pid("extra-date")}
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
              id={pid("extra-savings-label")}
              className="text-sm font-medium text-[var(--color-text-muted)]"
            >
              {t("incomeSettings.extraSavingsQuestion")}
            </p>
            <div
              className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/60 p-1 text-sm"
              role="group"
              aria-labelledby={pid("extra-savings-label")}
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
                id={pid("extra-savings-percent")}
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
                id={pid("extra-savings-fixed")}
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
            className="w-full rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] disabled:opacity-60"
          >
            {addExtra.isPending ? t("incomeSettings.adding") : t("incomeSettings.addExtra")}
          </button>

          <ul className="space-y-2">
            {extras.length === 0 ? (
              <li className="text-sm text-[var(--color-text-dim)]">
                {t("incomeSettings.extraEmpty")}
              </li>
            ) : (
              extras.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel-elevated)]/50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold tabular-nums text-[var(--color-accent)]/90">
                      {money(it.amount)}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-dim)]">
                      {it.received_at} · {describeExtraSavings(it, t)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => delExtra.mutate(it.id)}
                    disabled={delExtra.isPending}
                    className="shrink-0 rounded-lg border border-[var(--color-crit-border)] px-2 py-1 text-xs font-medium text-[var(--color-crit)] hover:bg-[var(--color-crit-dim)] disabled:opacity-50"
                  >
                    {t("incomeSettings.extraDelete")}
                  </button>
                </li>
              ))
            )}
          </ul>

          {isModal && (
            <ModalMenuFooter
              className="pt-2"
              onBackToMenu={onBackToMenu}
              onClose={onClose}
            />
          )}
        </div>
      ) : null}
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
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-text-muted)]">
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
        <span className="shrink-0 text-[var(--color-text-dim)]">{suffix}</span>
      </div>
      <p id={hintId} className="mt-2 text-xs leading-relaxed text-[var(--color-text-dim)]">
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
          ? "bg-[var(--color-panel)] text-[var(--color-text)] shadow-inner"
          : "text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

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
          ? "bg-[var(--color-panel)] text-[var(--color-text)] shadow-inner"
          : "text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

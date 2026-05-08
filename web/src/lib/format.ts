/**
 * UI formatting helpers (currency, savings descriptors).
 */
import type { SavingsMode } from "@/api/types";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

/** Format a number-ish value as EUR; returns "—" for missing/invalid input. */
export function money(n: string | number | undefined | null): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return eur.format(x);
}

/** Human-friendly description of the savings amount and the rule that produced it. */
export function savingsLabel(
  savingsAmount: string | number | undefined,
  pct: string | number | undefined,
  mode: SavingsMode | undefined = "percent",
): string {
  const base = money(savingsAmount);
  if (base === "—") return "—";
  if (mode === "fixed") return `${base} (fijo)`;
  const p = Number(pct);
  if (!Number.isFinite(p)) return base;
  return `${base} (${p} % del ingreso)`;
}

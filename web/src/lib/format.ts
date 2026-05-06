const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function money(n: string | number | undefined | null): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return eur.format(x);
}

export function savingsLabel(
  savingsAmount: string | number | undefined,
  pct: string | number | undefined,
): string {
  const base = money(savingsAmount);
  if (base === "—") return "—";
  const p = Number(pct);
  if (!Number.isFinite(p)) return base;
  return p > 0 ? `${base} (${p} % del ingreso)` : `${base} (0 % del ingreso)`;
}

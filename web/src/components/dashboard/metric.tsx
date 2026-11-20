/** KPI compacto al estilo mockup V11 — plano dentro de SECTION_CARD (sin card-in-card). */
import type { ReactNode } from "react";
import { TYPE_EYEBROW } from "@/lib/typography";

type Props = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  /** Valor negativo o en alerta: mismo recuadro, tono de error. */
  danger?: boolean;
};

export function Metric({ label, value, highlight, danger }: Props) {
  return (
    <div
      className={`flex h-full flex-col justify-center rounded-lg px-3 py-2.5 ${
        danger
          ? "bg-[var(--color-crit-dim)]"
          : highlight
          ? "bg-[var(--color-ok-dim)]"
          : "border border-[var(--color-border-subtle)] bg-[var(--color-panel-elevated)]"
      }`}
    >
      <p className={`${TYPE_EYEBROW} line-clamp-2 leading-tight`}>{label}</p>
      <p
        className={`mt-1 break-words font-display text-lg font-semibold tabular-nums leading-tight ${
          danger
            ? "text-[var(--color-crit)]"
            : highlight
              ? "text-[var(--color-ok)]"
              : "text-[var(--color-text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

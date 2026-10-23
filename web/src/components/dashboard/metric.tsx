/** KPI compacto al estilo mockup V11 — plano dentro de SECTION_CARD (sin card-in-card). */
import type { ReactNode } from "react";
import { TYPE_EYEBROW } from "@/lib/typography";

type Props = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  /** Menos alto, para que el bloque de hoy quepa en un iPhone. */
  compact?: boolean;
};

export function Metric({ label, value, highlight, compact }: Props) {
  return (
    <div
      className={`rounded-lg ${compact ? "px-2 py-1.5" : "px-2.5 py-2"} ${
        highlight ? "bg-[var(--color-ok-dim)]" : "bg-[var(--color-bg-soft)]/80"
      }`}
    >
      <p className={`${TYPE_EYEBROW} line-clamp-2 leading-tight`}>{label}</p>
      <p
        className={`break-words font-display font-semibold tabular-nums leading-tight ${
          compact ? "mt-0.5 text-base" : "mt-1 text-lg sm:text-xl"
        } ${highlight ? "text-[var(--color-ok)]" : "text-[var(--color-text)]"}`}
      >
        {value}
      </p>
    </div>
  );
}

/** KPI compacto al estilo mockup V11 — plano dentro de SECTION_CARD (sin card-in-card). */
import type { ReactNode } from "react";
import { TYPE_EYEBROW } from "@/lib/typography";

type Props = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
};

export function Metric({ label, value, highlight }: Props) {
  return (
    <div
      className={`rounded-lg px-2.5 py-2 ${
        highlight ? "bg-[var(--color-ok-dim)]" : "bg-[var(--color-bg-soft)]/80"
      }`}
    >
      <p className={`${TYPE_EYEBROW} line-clamp-2 leading-tight`}>{label}</p>
      <p
        className={`mt-1 break-words font-display text-lg font-semibold tabular-nums leading-tight sm:text-xl ${
          highlight ? "text-[var(--color-ok)]" : "text-[var(--color-text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

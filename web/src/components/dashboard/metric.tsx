import type { ReactNode } from "react";
import { TYPE_EYEBROW } from "@/lib/typography";

type Props = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
};

/** KPI compacto al estilo mockup V11. */
export function Metric({ label, value, highlight }: Props) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        highlight
          ? "border-[var(--color-ok-border)] bg-[var(--color-ok-dim)]"
          : "border-[var(--color-border)] bg-[var(--color-bg-soft)]"
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

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
      className={`rounded-xl border px-3 py-3 ${
        highlight
          ? "border-[var(--color-ok-border)] bg-[var(--color-ok-dim)]"
          : "border-[var(--color-border)] bg-[var(--color-panel)]"
      }`}
    >
      <p className={`${TYPE_EYEBROW} line-clamp-2 leading-tight`}>{label}</p>
      <p
        className={`mt-1.5 break-words text-base font-bold tabular-nums leading-snug sm:text-lg ${
          highlight ? "text-[var(--color-ok)]" : "text-[var(--color-text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

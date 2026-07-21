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
          ? "border-teal-500/35 bg-teal-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className={`${TYPE_EYEBROW} line-clamp-2 leading-tight`}>{label}</p>
      <p
        className={`mt-1.5 break-words text-base font-bold tabular-nums leading-snug sm:text-lg ${
          highlight ? "text-teal-300" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

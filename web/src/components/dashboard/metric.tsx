type Props = {
  label: string;
  value: string;
  highlight?: boolean;
};

export function Metric({ label, value, highlight }: Props) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        highlight
          ? "border-teal-500/35 bg-teal-500/10"
          : "border-slate-800 bg-slate-900/90"
      }`}
    >
      <p className="text-[0.65rem] font-semibold uppercase leading-tight tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1.5 break-words text-sm font-bold leading-snug ${
          highlight ? "text-teal-300" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

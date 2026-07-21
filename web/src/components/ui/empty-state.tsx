import type { ReactNode } from "react";

type Props = {
  icon: ReactNode; // inline SVG or icon component
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
};

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-10 text-center">
      <div className="mb-4 text-slate-500">{icon}</div>
      <h3 className="text-base font-semibold text-slate-300">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

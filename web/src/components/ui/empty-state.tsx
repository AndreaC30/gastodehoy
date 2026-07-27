import type { ReactNode } from "react";
import { BTN_SECONDARY } from "@/lib/ui-a11y";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
};

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-panel)]/60 px-4 py-10 text-center">
      <div className="mb-4 text-[var(--color-text-dim)]">{icon}</div>
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-[var(--color-text-dim)]">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`mt-4 ${BTN_SECONDARY}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

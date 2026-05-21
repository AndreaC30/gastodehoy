import { useState } from "react";
import { IoMenu } from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";
import {
  DashboardNavPanel,
  type DashboardNavAction,
} from "@/components/dashboard/dashboard-nav-panel";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  profileName: string;
  settingsReady: boolean;
  onOpenSettings: () => void;
  onOpenCategories: () => void;
  onOpenSavingsGoals: () => void;
  onExport: () => void;
  exportBusy?: boolean;
};

export function DashboardHeader({
  profileName,
  settingsReady,
  onOpenSettings,
  onOpenCategories,
  onOpenSavingsGoals,
  onExport,
  exportBusy = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNavigate(action: DashboardNavAction) {
    switch (action) {
      case "settings":
        onOpenSettings();
        break;
      case "categories":
        onOpenCategories();
        break;
      case "savings-goals":
        onOpenSavingsGoals();
        break;
      case "export":
        onExport();
        break;
    }
  }

  return (
    <>
      <header className="relative z-10 border-b border-slate-800/80 px-3 py-5 sm:px-4 sm:py-7">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-3 lg:max-w-6xl">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 leading-none">
              <BrandLogo variant="header" />
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-slate-400 sm:mt-2">
              Tu margen para hoy, claro y al instante.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <p className="hidden text-[0.65rem] uppercase tracking-widest text-slate-500 sm:block sm:text-xs">
              Perfil
            </p>
            <p className="hidden max-w-[10rem] truncate text-sm font-semibold text-teal-300 sm:block">
              {profileName}
            </p>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-200 shadow-sm transition-colors hover:border-teal-500/40 hover:bg-slate-800 hover:text-teal-200 ${FOCUS_RING}`}
              aria-expanded={menuOpen}
              aria-controls="dashboard-nav-panel"
              aria-haspopup="dialog"
            >
              <IoMenu className="h-5 w-5 shrink-0" aria-hidden />
              <span>Menú</span>
            </button>
            <p className="max-w-[8.5rem] truncate text-xs font-medium text-teal-300/90 sm:hidden">
              {profileName}
            </p>
          </div>
        </div>
      </header>

      <DashboardNavPanel
        open={menuOpen}
        profileName={profileName}
        settingsReady={settingsReady}
        exportBusy={exportBusy}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
      />
    </>
  );
}

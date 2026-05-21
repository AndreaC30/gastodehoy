import { BrandLogo } from "@/components/brand-logo";
import { logout } from "@/lib/session";

type Props = {
  profileName: string;
  settingsReady: boolean;
  onOpenSettings: () => void;
  onOpenCategories: () => void;
};

export function DashboardHeader({
  profileName,
  settingsReady,
  onOpenSettings,
  onOpenCategories,
}: Props) {
  return (
    <header className="relative z-10 border-b border-slate-800/80 px-3 py-5 sm:px-4 sm:py-7">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 lg:max-w-6xl">
        <div>
          <h1 className="m-0 leading-none">
            <BrandLogo variant="header" />
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-slate-400 sm:mt-2">
            Tu margen para hoy, claro y al instante.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 sm:text-xs">
            Perfil
          </p>
          <p className="mt-0.5 text-sm font-semibold text-teal-300">
            {profileName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:justify-end">
            <button
              type="button"
              onClick={onOpenSettings}
              disabled={!settingsReady}
              className="font-medium text-slate-400 hover:text-teal-300 disabled:opacity-40"
              aria-label="Configura tus ingresos"
            >
              Tus ingresos
            </button>
            <button
              type="button"
              onClick={onOpenCategories}
              className="font-medium text-slate-400 hover:text-teal-300"
              aria-label="Gestionar categorías"
            >
              Categorías
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="font-medium text-slate-500 underline decoration-slate-700 underline-offset-4 hover:text-slate-300"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

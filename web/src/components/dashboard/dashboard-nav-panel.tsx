import { useEffect, useState } from "react";
import {
  IoClose,
  IoDownloadOutline,
  IoFlagOutline,
  IoHelpCircleOutline,
  IoLogOutOutline,
  IoPersonOutline,
  IoPricetagsOutline,
  IoWalletOutline,
} from "react-icons/io5";
import { AccountModal } from "@/components/account-modal";
import { logout } from "@/lib/session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { FOCUS_RING } from "@/lib/ui-a11y";

export type DashboardNavAction =
  | "settings"
  | "categories"
  | "savings-goals"
  | "export"
  | "guided-tour"
  | "account";

type Props = {
  open: boolean;
  profileName: string;
  settingsReady: boolean;
  exportBusy?: boolean;
  onClose: () => void;
  onNavigate: (action: DashboardNavAction) => void;
};

type NavItem = {
  id: DashboardNavAction;
  label: string;
  description: string;
  Icon: typeof IoWalletOutline;
  disabled?: boolean;
};

export function DashboardNavPanel({
  open,
  profileName,
  settingsReady,
  exportBusy = false,
  onClose,
  onNavigate,
}: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items: NavItem[] = [
    {
      id: "settings",
      label: "Tus ingresos",
      description: "Ingreso mensual, ahorro e ingresos extra",
      Icon: IoWalletOutline,
      disabled: !settingsReady,
    },
    {
      id: "categories",
      label: "Categorías",
      description: "Etiquetas y presupuesto por categoría",
      Icon: IoPricetagsOutline,
    },
    {
      id: "savings-goals",
      label: "Metas de ahorro",
      description: "Objetivos y progreso ahorrado",
      Icon: IoFlagOutline,
    },
    {
      id: "export",
      label: exportBusy ? "Exportando…" : "Exportar CSV",
      description: "Ajustes, gastos fijos y variables del mes",
      Icon: IoDownloadOutline,
      disabled: exportBusy,
    },
    {
      id: "guided-tour",
      label: "Guía paso a paso",
      description: "Tutorial: qué es cada zona del panel",
      Icon: IoHelpCircleOutline,
    },
    {
      id: "account",
      label: "Cuenta",
      description: "Sesión y eliminación de cuenta",
      Icon: IoPersonOutline,
    },
  ];

  function pick(action: DashboardNavAction) {
    if (action === "account") {
      onClose();
      setAccountOpen(true);
      return;
    }
    onClose();
    onNavigate(action);
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label="Cerrar menú"
        onClick={onClose}
      />

      <nav
        id="dashboard-nav-panel"
        className="relative flex h-full w-full max-w-[min(100%,20rem)] flex-col border-l border-slate-800 bg-slate-950 shadow-2xl shadow-black/50 sm:max-w-xs"
        aria-label="Menú de cuenta"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
              Cuenta
            </p>
            <p className="mt-0.5 truncate text-base font-semibold text-teal-300">
              {profileName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 min-h-11 min-w-11 rounded-lg border border-slate-800 p-2 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 ${FOCUS_RING}`}
            aria-label="Cerrar menú"
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto px-3 py-3">
          {items.map(({ id, label, description, Icon, disabled }) => (
            <li key={id} className="mb-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => pick(id)}
                className="flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-slate-700 hover:bg-slate-900/90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-transparent disabled:hover:bg-transparent"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-teal-400">
                  <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-slate-100">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-slate-400">
                    {description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-slate-800 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              onClose();
              void logout();
            }}
            className={`flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-3 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 ${FOCUS_RING}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950">
              <IoLogOutOutline className="h-[1.15rem] w-[1.15rem]" aria-hidden />
            </span>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <AccountModal
        open={accountOpen}
        profileName={profileName}
        onClose={() => setAccountOpen(false)}
      />
    </div>
  );
}

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
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { AccountModal } from "@/components/account-modal";
import { DeleteAccountModal } from "@/components/delete-account-modal";
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
  onReopenMenu: () => void;
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
  onReopenMenu,
  onNavigate,
}: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { t, i18n } = useTranslation();
  useBodyScrollLock(open || accountOpen || deleteOpen);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const items: NavItem[] = [
    {
      id: "settings",
      label: t("nav.yourIncome"),
      description: t("nav.yourIncomeDesc"),
      Icon: IoWalletOutline,
      disabled: !settingsReady,
    },
    {
      id: "categories",
      label: t("nav.categories"),
      description: t("nav.categoriesDesc"),
      Icon: IoPricetagsOutline,
    },
    {
      id: "savings-goals",
      label: t("nav.savingsGoals"),
      description: t("nav.savingsGoalsDesc"),
      Icon: IoFlagOutline,
    },
    {
      id: "export",
      label: exportBusy ? t("nav.exporting") : t("nav.exportCsv"),
      description: t("nav.exportDesc"),
      Icon: IoDownloadOutline,
      disabled: exportBusy,
    },
    {
      id: "guided-tour",
      label: t("nav.guidedTour"),
      description: t("nav.guidedTourDesc"),
      Icon: IoHelpCircleOutline,
    },
    {
      id: "account",
      label: t("nav.account"),
      description: t("nav.accountDesc"),
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

  if (!open && !accountOpen && !deleteOpen) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
            aria-label={t("nav.closeMenu")}
            onClick={onClose}
          />

          <nav
            id="dashboard-nav-panel"
            className="relative flex h-full w-full max-w-[min(100%,20rem)] flex-col border-l border-slate-800 bg-slate-950 shadow-2xl shadow-black/50 sm:max-w-xs"
            aria-label={t("nav.accountMenu")}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
                  {t("nav.account")}
                </p>
                <p className="mt-0.5 truncate text-base font-semibold text-teal-300">
                  {profileName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`shrink-0 min-h-11 min-w-11 rounded-lg border border-slate-800 p-2 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 ${FOCUS_RING}`}
                aria-label={t("nav.closeMenu")}
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
                    className="flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-slate-700 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-transparent disabled:hover:bg-transparent"
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

            {/* Language selector */}
            <div className="border-t border-slate-800 px-3 py-3">
              <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-widest text-slate-500">
                {t("nav.language")}
              </p>
              <div className="flex gap-1.5">
                {(["es", "en", "fr", "de"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage(lang);
                      // Save to backend for cross-device sync (fire-and-forget)
                      api("/api/settings/language", {
                        method: "PUT",
                        body: JSON.stringify({ language: lang }),
                      }).catch(() => {});
                    }}
                    className={`min-h-9 min-w-[2.75rem] rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      (i18n.language?.startsWith(lang) ?? false) || (lang === "es" && !i18n.language)
                        ? "border-teal-500/40 bg-teal-500/15 text-teal-300"
                        : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                    }`}
                    title={t(`nav.lang_${lang}`)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void logout();
                }}
                className={`flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 ${FOCUS_RING}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950">
                  <IoLogOutOutline className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                </span>
                {t("nav.logout")}
              </button>
            </div>
          </nav>
        </div>
      )}

      <AccountModal
        open={accountOpen}
        profileName={profileName}
        onClose={() => setAccountOpen(false)}
        onBackToMenu={() => {
          setAccountOpen(false);
          onReopenMenu();
        }}
        onRequestDelete={() => {
          setAccountOpen(false);
          setDeleteOpen(true);
        }}
      />

      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onBackToMenu={() => {
          setDeleteOpen(false);
          onReopenMenu();
        }}
      />
    </>
  );
}

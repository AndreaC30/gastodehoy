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
  IoChevronBack,
  IoChevronForward,
  IoMenu,
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
  profileName: string;
  settingsReady: boolean;
  exportBusy?: boolean;
  onNavigate: (action: DashboardNavAction) => void;
  onExport: () => void;
};

type NavItem = {
  id: DashboardNavAction;
  label: string;
  Icon: typeof IoWalletOutline;
  disabled?: boolean;
};

const COLLAPSED_KEY = "gastodehoy_sidebar_collapsed";
const COLLAPSED_W = "w-[3.5rem]";
const EXPANDED_W = "w-56";

export function Sidebar({
  profileName,
  settingsReady,
  exportBusy = false,
  onNavigate,
  onExport,
}: Props) {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useBodyScrollLock(mobileOpen || accountOpen || deleteOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMobileOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0"); } catch {}
  };

  const items: NavItem[] = [
    { id: "settings", label: t("nav.yourIncome"), Icon: IoWalletOutline, disabled: !settingsReady },
    { id: "categories", label: t("nav.categories"), Icon: IoPricetagsOutline },
    { id: "savings-goals", label: t("nav.savingsGoals"), Icon: IoFlagOutline },
    { id: "export", label: exportBusy ? t("nav.exporting") : t("nav.exportCsv"), Icon: IoDownloadOutline, disabled: exportBusy },
    { id: "guided-tour", label: t("nav.guidedTour"), Icon: IoHelpCircleOutline },
    { id: "account", label: t("nav.account"), Icon: IoPersonOutline },
  ];

  function pick(action: DashboardNavAction) {
    if (action === "account") {
      setAccountOpen(true);
      return;
    }
    if (action === "export") {
      onExport();
      return;
    }
    onNavigate(action);
    setMobileOpen(false);
  }

  function handleLogout() {
    setMobileOpen(false);
    void logout();
  }

  const sidebarContent = (
    <nav
      className={`flex h-full flex-col border-r border-slate-800 bg-slate-950 ${collapsed ? COLLAPSED_W : EXPANDED_W} transition-[width] duration-200 ease-out`}
      aria-label={t("nav.accountMenu")}
    >
      {/* Header: logo area + collapse toggle */}
      <div className={`flex items-center border-b border-slate-800 px-2 py-3 ${collapsed ? "justify-center" : "justify-between px-3"}`}>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-teal-400">GastoDeHoy</span>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          className={`hidden md:flex min-h-8 min-w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 ${FOCUS_RING}`}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <IoChevronForward className="h-4 w-4" /> : <IoChevronBack className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav items */}
      <ul className="flex-1 overflow-y-auto px-1.5 py-2 space-y-0.5">
        {items.map(({ id, label, Icon, disabled }) => (
          <li key={id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => pick(id)}
              className={`flex w-full items-center gap-3 rounded-lg border border-transparent text-left transition-colors hover:border-slate-700 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-transparent disabled:hover:bg-transparent ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}`}
              title={collapsed ? label : undefined}
            >
              <span className={`flex shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-teal-400 ${collapsed ? "h-9 w-9" : "h-8 w-8"}`}>
                <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                  {label}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Language selector */}
      <div className={`border-t border-slate-800 px-1.5 py-2 ${collapsed ? "flex flex-col items-center gap-1" : ""}`}>
        {!collapsed && (
          <p className="mb-1.5 px-2 text-[0.6rem] font-semibold uppercase tracking-widest text-slate-500">
            {t("nav.language")}
          </p>
        )}
        {(["es", "en", "fr", "de"] as const).map((lang) => {
          const active = (i18n.language?.startsWith(lang) ?? false) || (lang === "es" && !i18n.language);
          return (
            <button
              key={lang}
              type="button"
              onClick={() => {
                i18n.changeLanguage(lang);
                api("/api/settings/language", { method: "PUT", body: JSON.stringify({ language: lang }) }).catch(() => {});
              }}
              className={`rounded-md text-[0.65rem] font-semibold uppercase tracking-wide transition-colors ${
                collapsed
                  ? "h-7 w-7 flex items-center justify-center"
                  : "min-h-7 px-2 py-1"
              } ${
                active
                  ? "border border-teal-500/40 bg-teal-500/15 text-teal-300"
                  : "border border-transparent text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
              title={t(`nav.lang_${lang}`)}
            >
              {lang}
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div className={`border-t border-slate-800 px-1.5 py-2 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 ${collapsed ? "justify-center p-2.5" : "w-full px-3 py-2.5"} ${FOCUS_RING}`}
          title={collapsed ? t("nav.logout") : undefined}
        >
          <span className="flex shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 h-8 w-8">
            <IoLogOutOutline className="h-[1rem] w-[1rem]" aria-hidden />
          </span>
          {!collapsed && t("nav.logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger — visible in header area */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        data-tour="menu"
        className={`md:hidden fixed top-3 left-3 z-30 min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur text-slate-200 shadow-lg ${FOCUS_RING}`}
        aria-label={t("header.menu")}
        aria-expanded={mobileOpen}
        aria-haspopup="dialog"
      >
        <IoMenu className="h-5 w-5" aria-hidden />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:block shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
            aria-label={t("nav.closeMenu")}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full">
            <div className="relative flex h-full">
              {/* Close button overlaid on sidebar */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className={`absolute top-3 right-3 z-10 min-h-8 min-w-8 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 ${FOCUS_RING}`}
                aria-label={t("nav.closeMenu")}
              >
                <IoClose className="h-4 w-4" aria-hidden />
              </button>
              {sidebarContent}
            </div>
            {/* Click outside to close */}
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Account modals */}
      <AccountModal
        open={accountOpen}
        profileName={profileName}
        onClose={() => setAccountOpen(false)}
        onBackToMenu={() => {
          setAccountOpen(false);
          setMobileOpen(true);
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
          setMobileOpen(true);
        }}
      />
    </>
  );
}

/** Sidebar navigation for desktop + mobile drawer. */

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
  IoHome,
  IoWallet,
  IoPieChart,
  IoCalendar,
} from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { AccountModal } from "@/components/account-modal";
import { DeleteAccountModal } from "@/components/delete-account-modal";
import { logout } from "@/lib/session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { FOCUS_RING } from "@/lib/ui-a11y";
import type { DashboardSection } from "@/lib/dashboard-state";

type Props = {
  profileName: string;
  exportBusy?: boolean;
  onExport?: () => void;
  onSectionChange?: (section: DashboardSection) => void;
  activeSection: DashboardSection;
  /** Controlled mobile drawer (so the header can own the hamburger). */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

export function Sidebar({
  profileName,
  exportBusy = false,
  onExport,
  onSectionChange,
  activeSection,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange,
}: Props) {
  const { t, i18n } = useTranslation();
  const [mobileOpenLocal, setMobileOpenLocal] = useState(false);
  const mobileOpen = mobileOpenProp ?? mobileOpenLocal;
  const setMobileOpen = onMobileOpenChange ?? setMobileOpenLocal;
  const [accountOpen, setAccountOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useBodyScrollLock(mobileOpen || accountOpen || deleteOpen);

  const isExportBusy = exportBusy ?? false;

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMobileOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const handleSectionChange = (section: DashboardSection) => {
    setMobileOpen(false);
    onSectionChange?.(section);
  };

  function handleLogout() {
    setMobileOpen(false);
    void logout();
  }

  const sidebarContent = (
    <nav
      className="flex h-full w-[230px] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-soft)]"
      aria-label={t("nav.accountMenu")}
      data-tour="menu"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
      {/* Section navigation */}
      <div className="border-b border-[var(--color-border)] px-1.5 py-2">
        <p className="mb-1.5 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-dim)]">
          Navegación
        </p>
        <ul className="space-y-0.5">
          {[
            { id: 'hoy' as DashboardSection, label: 'Hoy', Icon: IoHome },
            { id: 'gastos' as DashboardSection, label: 'Gastos', Icon: IoWallet },
            { id: 'analisis' as DashboardSection, label: 'Análisis', Icon: IoPieChart },
            { id: 'historico' as DashboardSection, label: 'Histórico', Icon: IoCalendar },
            { id: 'ingresos' as DashboardSection, label: 'Ingresos', Icon: IoWalletOutline },
            { id: 'categorias' as DashboardSection, label: 'Categorías', Icon: IoPricetagsOutline },
            { id: 'metas' as DashboardSection, label: 'Metas', Icon: IoFlagOutline },
            { id: 'tour' as DashboardSection, label: 'Tour guiado', Icon: IoHelpCircleOutline },
          ].map(({ id, label, Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => handleSectionChange(id)}
                className={`flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors ${
                  activeSection === id
                    ? 'border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]'
                    : 'hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-panel)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)]">
                  <Icon className="gdh-icon" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Export action */}
      <div className="border-t border-[var(--color-border)] px-1.5 py-2">
        <button
          type="button"
          onClick={() => onExport?.()}
          disabled={isExportBusy}
          className={`flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-panel)] disabled:cursor-not-allowed disabled:opacity-45`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-accent)]">
            <IoDownloadOutline className="gdh-icon" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text)]">
            {isExportBusy ? t("nav.exporting") : t("nav.exportCsv")}
          </span>
        </button>
      </div>

      {/* Language selector */}
      <div className="border-t border-[var(--color-border)] px-1.5 py-2">
        <p className="mb-1.5 px-2 text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--color-text-dim)]">
          {t("nav.language")}
        </p>
        {(["es", "en", "fr", "de"] as const).map((lang) => {
          const active = (i18n.language?.startsWith(lang) ?? false) || (lang === "es" && !i18n.language);
          return (
            <button
              key={lang}
              type="button"
              onClick={() => {
                i18n.changeLanguage(lang);
              }}
              className={`min-h-7 rounded-md px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide transition-colors ${
                active
                  ? "border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                  : "border border-transparent text-[var(--color-text-dim)] hover:border-[var(--color-border-subtle)] hover:text-[var(--color-text-muted)]"
              }`}
              title={t(`nav.lang_${lang}`)}
            >
              {lang}
            </button>
          );
        })}
      </div>
      </div>

      {/* Account + logout */}
      <div className="shrink-0 border-t border-[var(--color-border)] px-1.5 py-2">
        <div className="mb-2 px-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-dim)]">
            {t("nav.account")}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-accent)]">
            {profileName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            setAccountOpen(true);
          }}
          className={`mb-1 flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-panel)] ${FOCUS_RING}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-accent)]">
            <IoPersonOutline className="gdh-icon" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[var(--color-text)]">
              {t("nav.account")}
            </span>
            <span className="block truncate text-[11px] text-[var(--color-text-dim)]">
              {t("nav.accountDesc")}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-panel-elevated)] ${FOCUS_RING}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-soft)]">
            <IoLogOutOutline className="gdh-icon" aria-hidden />
          </span>
          {t("nav.logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={t("nav.closeMenu")}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full max-w-[min(100%,16rem)] justify-start shadow-[8px_0_24px_rgb(0_0_0_/_0.35)]">
            {sidebarContent}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className={`absolute right-2 top-3 z-10 inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-elevated)] px-2 py-1.5 text-[var(--color-text-dim)] hover:border-[var(--color-accent-border)] hover:text-[var(--color-accent)] ${FOCUS_RING}`}
              aria-label={t("nav.closeMenu")}
            >
              <IoClose className="gdh-icon" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen shrink-0 md:block">
        {sidebarContent}
      </aside>

      {/* Account modals */}
      <AccountModal
        open={accountOpen}
        profileName={profileName}
        onClose={() => setAccountOpen(false)}
        onBackToMenu={() => {
          setAccountOpen(false);
          if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
            setMobileOpen(true);
          }
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
          if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
            setMobileOpen(true);
          }
        }}
      />
    </>
  );
}

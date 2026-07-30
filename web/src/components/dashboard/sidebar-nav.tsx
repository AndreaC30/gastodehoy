/** Sidebar (desktop) + bottom sheet “Más” (móvil). */

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
import type { IconType } from "react-icons";

type Props = {
  profileName: string;
  exportBusy?: boolean;
  onExport?: () => void;
  onSectionChange?: (section: DashboardSection) => void;
  activeSection: DashboardSection;
  /** Controlled mobile sheet (header owns the trigger). */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

type NavItem = {
  id: DashboardSection;
  labelKey: string;
  Icon: IconType;
};

const PRIMARY_IDS: DashboardSection[] = ["hoy", "gastos", "analisis", "historico"];

const ALL_NAV: NavItem[] = [
  { id: "hoy", labelKey: "header.sectionHoy", Icon: IoHome },
  { id: "gastos", labelKey: "header.sectionGastos", Icon: IoWallet },
  { id: "analisis", labelKey: "header.sectionAnalisis", Icon: IoPieChart },
  { id: "historico", labelKey: "header.sectionHistorico", Icon: IoCalendar },
  { id: "ingresos", labelKey: "header.sectionIngresos", Icon: IoWalletOutline },
  { id: "categorias", labelKey: "header.sectionCategorias", Icon: IoPricetagsOutline },
  { id: "metas", labelKey: "header.sectionMetas", Icon: IoFlagOutline },
  { id: "tour", labelKey: "header.sectionTour", Icon: IoHelpCircleOutline },
];

const SECONDARY_NAV = ALL_NAV.filter((item) => !PRIMARY_IDS.includes(item.id));

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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  const handleSectionChange = (section: DashboardSection) => {
    setMobileOpen(false);
    onSectionChange?.(section);
  };

  function handleLogout() {
    setMobileOpen(false);
    void logout();
  }

  function openAccountFromMenu() {
    setMobileOpen(false);
    setAccountOpen(true);
  }

  function LanguageRow() {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(["es", "en", "fr", "de"] as const).map((lang) => {
          const active =
            (i18n.language?.startsWith(lang) ?? false) ||
            (lang === "es" && !i18n.language);
          return (
            <button
              key={lang}
              type="button"
              onClick={() => {
                void i18n.changeLanguage(lang);
              }}
              className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                active
                  ? "border border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                  : "border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]"
              }`}
              title={t(`nav.lang_${lang}`)}
            >
              {lang}
            </button>
          );
        })}
      </div>
    );
  }

  function NavButton({
    id,
    labelKey,
    Icon,
    dense = false,
  }: NavItem & { dense?: boolean }) {
    const active = activeSection === id;
    return (
      <button
        type="button"
        onClick={() => handleSectionChange(id)}
        className={`flex w-full items-center gap-3 rounded-xl border border-transparent text-left transition-colors ${
          dense ? "min-h-11 px-3 py-2.5" : "min-h-12 px-3.5 py-3"
        } ${
          active
            ? "border-[var(--color-accent-border)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
            : "text-[var(--color-text-muted)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)]">
          <Icon className="gdh-icon" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {t(labelKey)}
        </span>
      </button>
    );
  }

  const desktopSidebar = (
    <nav
      className="flex h-full w-[230px] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-soft)]"
      aria-label={t("nav.accountMenu")}
      data-tour="menu"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-[var(--color-border)] px-1.5 py-2">
          <p className="mb-1.5 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-dim)]">
            {t("nav.accountMenu")}
          </p>
          <ul className="space-y-0.5">
            {ALL_NAV.map((item) => (
              <li key={item.id}>
                <NavButton {...item} dense />
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[var(--color-border)] px-1.5 py-2">
          <button
            type="button"
            onClick={() => onExport?.()}
            disabled={isExportBusy}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-panel)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-accent)]">
              <IoDownloadOutline className="gdh-icon" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text)]">
              {isExportBusy ? t("nav.exporting") : t("nav.exportCsv")}
            </span>
          </button>
        </div>

        <div className="border-t border-[var(--color-border)] px-1.5 py-2">
          <p className="mb-1.5 px-2 text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--color-text-dim)]">
            {t("nav.language")}
          </p>
          <div className="px-1">
            <LanguageRow />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)] px-1.5 py-2 md:pb-2">
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
          onClick={openAccountFromMenu}
          className={`mb-1 flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-panel)] ${FOCUS_RING}`}
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
          className={`flex min-h-11 w-full items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-panel-elevated)] ${FOCUS_RING}`}
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
      {/* Mobile: bottom sheet (app pattern), not side drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] flex touch-none items-end justify-center overflow-hidden bg-black/60 px-0 pt-8 md:hidden"
          role="presentation"
          onClick={() => setMobileOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.moreTitle")}
            data-tour="menu"
            className="modal-scroll flex max-h-[min(88dvh,100%)] w-full touch-auto flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)] shadow-2xl"
            style={{
              paddingBottom: "max(0.75rem, var(--gdh-overlay-footer-pad, env(safe-area-inset-bottom)))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 flex-col border-b border-[var(--color-border)]">
              <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
                <div className="h-1 w-10 rounded-full bg-[var(--color-border-subtle)]" />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 pb-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[var(--color-text)]">
                    {t("nav.moreTitle")}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-[var(--color-accent)]">
                    {profileName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] ${FOCUS_RING}`}
                  aria-label={t("nav.closeMenu")}
                >
                  <IoClose className="gdh-icon" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3">
              <ul className="space-y-1.5">
                {SECONDARY_NAV.map((item) => (
                  <li key={item.id}>
                    <NavButton {...item} />
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-1.5 border-t border-[var(--color-border)] pt-4">
                <button
                  type="button"
                  onClick={() => onExport?.()}
                  disabled={isExportBusy}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-left transition-colors hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-accent)]">
                    <IoDownloadOutline className="gdh-icon" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {isExportBusy ? t("nav.exporting") : t("nav.exportCsv")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={openAccountFromMenu}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-left transition-colors hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-soft)] ${FOCUS_RING}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-accent)]">
                    <IoPersonOutline className="gdh-icon" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-medium text-[var(--color-text)]">
                      {t("nav.account")}
                    </span>
                    <span className="block text-xs text-[var(--color-text-dim)]">
                      {t("nav.accountDesc")}
                    </span>
                  </span>
                </button>
              </div>

              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--color-text-dim)]">
                  {t("nav.language")}
                </p>
                <LanguageRow />
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-panel-elevated)] ${FOCUS_RING}`}
              >
                <IoLogOutOutline className="h-5 w-5 shrink-0" aria-hidden />
                {t("nav.logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="sticky top-0 z-20 hidden h-screen shrink-0 md:block">
        {desktopSidebar}
      </aside>

      <AccountModal
        open={accountOpen}
        profileName={profileName}
        onClose={() => setAccountOpen(false)}
        onBackToMenu={() => {
          setAccountOpen(false);
          if (
            typeof window !== "undefined" &&
            window.matchMedia("(max-width: 767px)").matches
          ) {
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
          if (
            typeof window !== "undefined" &&
            window.matchMedia("(max-width: 767px)").matches
          ) {
            setMobileOpen(true);
          }
        }}
      />
    </>
  );
}

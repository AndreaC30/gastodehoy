/** Sidebar (desktop) + left drawer menu (móvil). */

import { useState } from "react";
import {
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
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import type { Settings } from "@/api/types";
import { AppDrawer } from "@/components/ui/app-drawer";
import { logout } from "@/lib/session";
import { FOCUS_RING } from "@/lib/ui-a11y";
import { TYPE_EYEBROW } from "@/lib/typography";
import type { DashboardSection } from "@/lib/dashboard-state";
import type { IconType } from "react-icons";

type Props = {
  profileName: string;
  exportBusy?: boolean;
  onExport?: () => void;
  onSectionChange?: (section: DashboardSection) => void;
  activeSection: DashboardSection;
  /** Controlled mobile drawer (header owns the trigger). */
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
  { id: "cuenta", labelKey: "header.sectionCuenta", Icon: IoPersonOutline },
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
  const qc = useQueryClient();
  const [mobileOpenLocal, setMobileOpenLocal] = useState(false);
  const [langSaving, setLangSaving] = useState(false);
  const mobileOpen = mobileOpenProp ?? mobileOpenLocal;
  const setMobileOpen = onMobileOpenChange ?? setMobileOpenLocal;

  const isExportBusy = exportBusy ?? false;

  const handleSectionChange = (section: DashboardSection) => {
    setMobileOpen(false);
    onSectionChange?.(section);
  };

  function handleLogout() {
    setMobileOpen(false);
    void logout();
  }

  async function persistLanguage(lang: "es" | "en" | "fr" | "de") {
    if (langSaving || i18n.language?.startsWith(lang)) return;
    setLangSaving(true);
    const previous = i18n.language;
    try {
      await i18n.changeLanguage(lang);
      await api<Settings>("/api/settings/language", {
        method: "PUT",
        body: JSON.stringify({ language: lang }),
      });
      void qc.invalidateQueries({ queryKey: ["settings"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["insights"] });
      void qc.invalidateQueries({ queryKey: ["rule-503020"] });
    } catch {
      if (previous) void i18n.changeLanguage(previous);
    } finally {
      setLangSaving(false);
    }
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
              disabled={langSaving}
              onClick={() => {
                void persistLanguage(lang);
              }}
              className={`min-h-11 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-60 ${
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

  function NavChrome({ items }: { items: NavItem[] }) {
    return (
      <>
        <div className="border-b border-[var(--color-border)] px-0.5 py-1">
          <p className={`mb-1.5 px-2 ${TYPE_EYEBROW}`}>{t("nav.accountMenu")}</p>
          <ul className="space-y-0.5" data-tour="menu">
            {items.map((item) => (
              <li key={item.id}>
                <NavButton {...item} dense />
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[var(--color-border)] px-0.5 py-2">
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

        <div className="border-t border-[var(--color-border)] px-0.5 py-2">
          <p className={`mb-1.5 px-2 ${TYPE_EYEBROW}`}>{t("nav.language")}</p>
          <div className="px-1">
            <LanguageRow />
          </div>
        </div>
      </>
    );
  }

  function LogoutRow() {
    return (
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
    );
  }

  const desktopSidebar = (
    <nav
      className="flex h-full w-[230px] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-soft)]"
      aria-label={t("nav.accountMenu")}
      data-tour="menu"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
        <NavChrome items={ALL_NAV} />
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)] px-1.5 py-2 md:pb-2">
        <div className="mb-2 px-2">
          <p className={TYPE_EYEBROW}>{t("nav.account")}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-accent)]">
            {profileName}
          </p>
        </div>
        <LogoutRow />
      </div>
    </nav>
  );

  return (
    <>
      <AppDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={t("header.menu")}
        subtitle={profileName}
        labelledById="gdh-more-drawer-title"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-0.5">
            <NavChrome items={SECONDARY_NAV} />
          </div>
          <div className="shrink-0 border-t border-[var(--color-border)] px-1.5 py-2">
            <LogoutRow />
          </div>
        </div>
      </AppDrawer>

      <aside className="sticky top-0 z-20 hidden h-screen shrink-0 md:block">
        {desktopSidebar}
      </aside>
    </>
  );
}

/** Mobile bottom navigation bar for dashboard sections. */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { DashboardSection } from '@/lib/dashboard-state';
import { FOCUS_RING } from '@/lib/ui-a11y';
import { TYPE_NAV_LABEL } from '@/lib/typography';
import {
  IoHome,
  IoHomeOutline,
  IoWallet,
  IoWalletOutline,
  IoPieChart,
  IoPieChartOutline,
  IoCalendar,
  IoCalendarOutline,
} from 'react-icons/io5';

type Props = {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
};

const MAIN_SECTIONS: { id: DashboardSection; labelKey: string }[] = [
  { id: 'hoy', labelKey: 'header.sectionHoy' },
  { id: 'gastos', labelKey: 'header.sectionGastos' },
  { id: 'analisis', labelKey: 'header.sectionAnalisis' },
  { id: 'historico', labelKey: 'header.sectionHistorico' },
];

function getIcon(section: DashboardSection, active: boolean) {
  if (section === 'hoy') return active ? IoHome : IoHomeOutline;
  if (section === 'gastos') return active ? IoWallet : IoWalletOutline;
  if (section === 'analisis') return active ? IoPieChart : IoPieChartOutline;
  if (section === 'historico') return active ? IoCalendar : IoCalendarOutline;
  return IoHomeOutline;
}

export function BottomNav({ activeSection, onSectionChange }: Props) {
  const { t } = useTranslation();

  // Signal cookie chrome / overlays to sit above this bar on mobile.
  useEffect(() => {
    document.documentElement.setAttribute('data-mobile-bottom-nav', '1');
    return () => {
      document.documentElement.removeAttribute('data-mobile-bottom-nav');
    };
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-panel)] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      role="navigation"
      aria-label={t("common.mainNav")}
    >
      <ul className="flex h-[60px] items-center justify-around">
        {MAIN_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          const Icon = getIcon(section.id, isActive);

          return (
            <li key={section.id} className="flex h-full flex-1 items-center justify-center">
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`flex h-full w-full flex-1 flex-col items-center justify-center gap-0.5 ${FOCUS_RING}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={t(section.labelKey)}
              >
                <Icon
                  className={`gdh-icon-nav transition-colors ${
                    isActive
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                  aria-hidden
                />
                <span
                  className={`${TYPE_NAV_LABEL} transition-colors ${
                    isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {t(section.labelKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

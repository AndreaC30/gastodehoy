/** Mobile bottom navigation bar for dashboard sections. */

import { useTranslation } from 'react-i18next';
import type { DashboardSection } from '@/lib/dashboard-state';
import { FOCUS_RING } from '@/lib/ui-a11y';
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

const MAIN_SECTIONS: { id: DashboardSection; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'analisis', label: 'Análisis' },
  { id: 'historico', label: 'Histórico' },
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-panel)] md:hidden"
      role="navigation"
      aria-label="Navegación principal"
    >
      <ul className="flex h-[60px] items-center justify-around pb-[max(0.25rem,env(safe-area-inset-bottom))]">
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
                aria-label={t(`nav.${section.id}`)}
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
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {section.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

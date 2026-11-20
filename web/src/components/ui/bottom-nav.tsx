/** Barra inferior móvil: Hoy, Gastos, Añadir (centro), Análisis y Más. */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { DashboardSection } from '@/lib/dashboard-state';
import { FOCUS_RING } from '@/lib/ui-a11y';
import { TYPE_NAV_LABEL } from '@/lib/typography';
import {
  IoAdd,
  IoEllipsisHorizontal,
  IoEllipsisHorizontalOutline,
  IoHome,
  IoHomeOutline,
  IoPieChart,
  IoPieChartOutline,
  IoWallet,
  IoWalletOutline,
} from 'react-icons/io5';

type Props = {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  /** Abre la hoja «Añadir gasto». */
  onAdd: () => void;
  /** Abre el menú Más (ingresos, categorías, metas, guía, cuenta…). */
  onMore: () => void;
  moreOpen: boolean;
};

type MainId = 'hoy' | 'gastos' | 'analisis';

const MAIN_SECTIONS: { id: MainId; labelKey: string }[] = [
  { id: 'hoy', labelKey: 'header.sectionHoy' },
  { id: 'gastos', labelKey: 'header.sectionGastos' },
  { id: 'analisis', labelKey: 'header.sectionAnalisis' },
];

function getIcon(section: MainId, active: boolean) {
  if (section === 'hoy') return active ? IoHome : IoHomeOutline;
  if (section === 'gastos') return active ? IoWallet : IoWalletOutline;
  return active ? IoPieChart : IoPieChartOutline;
}

const ITEM = `flex h-full w-full flex-1 flex-col items-center justify-center gap-0.5 ${FOCUS_RING}`;

export function BottomNav({
  activeSection,
  onSectionChange,
  onAdd,
  onMore,
  moreOpen,
}: Props) {
  const { t } = useTranslation();

  // Signal cookie chrome / overlays to sit above this bar on mobile.
  useEffect(() => {
    document.documentElement.setAttribute('data-mobile-bottom-nav', '1');
    return () => {
      document.documentElement.removeAttribute('data-mobile-bottom-nav');
    };
  }, []);

  const mainIds: DashboardSection[] = MAIN_SECTIONS.map((s) => s.id);
  // «Más» es la pantalla actual cuando se está en una sección que no es de la barra.
  const moreActive = !mainIds.includes(activeSection);
  const MoreIcon = moreActive || moreOpen ? IoEllipsisHorizontal : IoEllipsisHorizontalOutline;

  function renderMain(section: (typeof MAIN_SECTIONS)[number]) {
    const isActive = activeSection === section.id;
    const Icon = getIcon(section.id, isActive);
    return (
      <li key={section.id} className="flex h-full flex-1 items-center justify-center">
        <button
          type="button"
          onClick={() => onSectionChange(section.id)}
          className={ITEM}
          aria-current={isActive ? 'page' : undefined}
          aria-label={t(section.labelKey)}
        >
          <Icon
            className={`gdh-icon-nav transition-colors ${
              isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
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
  }

  return (
    <nav
      className="z-40 shrink-0 border-t border-[var(--color-border)] bg-[var(--color-panel)] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      role="navigation"
      aria-label={t('common.mainNav')}
    >
      <ul className="flex h-[60px] items-center justify-around">
        {renderMain(MAIN_SECTIONS[0])}
        {renderMain(MAIN_SECTIONS[1])}

        <li className="flex h-full flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onAdd}
            className={ITEM}
            aria-haspopup="dialog"
            aria-label={t('nav.add')}
          >
            <span className="flex h-9 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
              <IoAdd className="h-6 w-6" aria-hidden />
            </span>
            <span className={`${TYPE_NAV_LABEL} text-[var(--color-text-muted)]`}>
              {t('nav.add')}
            </span>
          </button>
        </li>

        {renderMain(MAIN_SECTIONS[2])}

        <li className="flex h-full flex-1 items-center justify-center">
          <button
            type="button"
            data-tour="menu"
            onClick={onMore}
            className={ITEM}
            aria-current={moreActive ? 'page' : undefined}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-label={t('nav.more')}
          >
            <MoreIcon
              className={`gdh-icon-nav transition-colors ${
                moreActive || moreOpen
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
              aria-hidden
            />
            <span
              className={`${TYPE_NAV_LABEL} transition-colors ${
                moreActive || moreOpen
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {t('nav.more')}
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

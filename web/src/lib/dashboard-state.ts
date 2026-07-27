/** Dashboard section state management with localStorage persistence. */

export type DashboardSection = 'hoy' | 'gastos' | 'analisis' | 'historico' | 'ingresos' | 'categorias' | 'metas' | 'tour';

const SECTION_KEY = 'gastodehoy_active_section';

export function getActiveSection(): DashboardSection {
  try {
    const stored = localStorage.getItem(SECTION_KEY);
    if (stored === 'hoy' || stored === 'gastos' || stored === 'analisis' || stored === 'historico') {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return 'hoy';
}

export function setActiveSection(section: DashboardSection): void {
  try {
    localStorage.setItem(SECTION_KEY, section);
  } catch {
    // localStorage not available
  }
}

export const SECTIONS: { id: DashboardSection; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'analisis', label: 'Análisis' },
  { id: 'historico', label: 'Histórico' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'metas', label: 'Metas' },
  { id: 'tour', label: 'Tour' },
];

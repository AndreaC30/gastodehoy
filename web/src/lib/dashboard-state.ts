/** Dashboard section state management with localStorage persistence. */

export type DashboardSection =
  | "hoy"
  | "gastos"
  | "analisis"
  | "historico"
  | "ingresos"
  | "categorias"
  | "metas"
  | "tour"
  | "cuenta";

const SECTION_KEY = "gastodehoy_active_section";

export function getActiveSection(): DashboardSection {
  try {
    const stored = localStorage.getItem(SECTION_KEY);
    const allowed: DashboardSection[] = [
      "hoy",
      "gastos",
      "analisis",
      "ingresos",
      "historico",
      "categorias",
      "metas",
      "tour",
      "cuenta",
    ];
    if (stored && (allowed as string[]).includes(stored)) {
      return stored as DashboardSection;
    }
  } catch {
    // localStorage not available
  }
  return "hoy";
}

export function setActiveSection(section: DashboardSection): void {
  try {
    localStorage.setItem(SECTION_KEY, section);
  } catch {
    // localStorage not available
  }
}

export const SECTIONS: { id: DashboardSection; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "gastos", label: "Gastos" },
  { id: "analisis", label: "Análisis" },
  { id: "ingresos", label: "Ingresos" },
  { id: "historico", label: "Histórico" },
  { id: "categorias", label: "Categorías" },
  { id: "metas", label: "Metas" },
  { id: "tour", label: "Tour" },
  { id: "cuenta", label: "Cuenta" },
];

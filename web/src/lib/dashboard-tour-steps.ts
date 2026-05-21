export type TourStep = {
  target: string;
  title: string;
  body: string;
};

/** Textos breves para la guía del panel. */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: "hero",
    title: "Cuánto gastar hoy",
    body: "El número grande es tu margen de hoy.",
  },
  {
    target: "variable-expenses",
    title: "Gastos del día",
    body: "Cantidad + Registrar. Listo.",
  },
  {
    target: "fixed-expenses",
    title: "Gastos fijos",
    body: "Alquiler, luz… una vez al mes.",
  },
  {
    target: "insights",
    title: "Avisos",
    body: "Consejos si te pasas o vas justo.",
  },
  {
    target: "menu",
    title: "Menú",
    body: "Ingresos, categorías y más.",
  },
];

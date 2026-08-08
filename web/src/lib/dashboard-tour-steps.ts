export type TourGastosTab = "variables" | "fijos";

export type TourStep = {
  target: string;
  title: string;
  body: string;
  /** Dashboard section that must be visible for ``target`` to exist in the DOM. */
  section?: "hoy" | "gastos" | "analisis" | "historico";
  /** Mobile Gastos segment tab (variables/fijos are mutually hidden below md). */
  gastosTab?: TourGastosTab;
};

/** I18n key‑based steps for the dashboard guided tour. */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: "hero",
    title: "tour.step1.title",
    body: "tour.step1.body",
    section: "hoy",
  },
  {
    target: "variable-expenses",
    title: "tour.step2.title",
    body: "tour.step2.body",
    section: "gastos",
    gastosTab: "variables",
  },
  {
    target: "fixed-expenses",
    title: "tour.step3.title",
    body: "tour.step3.body",
    section: "gastos",
    gastosTab: "fijos",
  },
  {
    target: "month-context",
    title: "tour.step4.title",
    body: "tour.step4.body",
    section: "hoy",
  },
  {
    target: "insights",
    title: "tour.step5.title",
    body: "tour.step5.body",
    section: "analisis",
  },
  {
    target: "menu",
    title: "tour.step6.title",
    body: "tour.step6.body",
  },
];

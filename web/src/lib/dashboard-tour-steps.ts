export type TourStep = {
  target: string;
  title: string;
  body: string;
};

/** I18n key‑based steps for the dashboard guided tour. */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: "hero",
    title: "tour.step1.title",
    body: "tour.step1.body",
  },
  {
    target: "variable-expenses",
    title: "tour.step2.title",
    body: "tour.step2.body",
  },
  {
    target: "fixed-expenses",
    title: "tour.step3.title",
    body: "tour.step3.body",
  },
  {
    target: "month-context",
    title: "tour.step4.title",
    body: "tour.step4.body",
  },
  {
    target: "insights",
    title: "tour.step5.title",
    body: "tour.step5.body",
  },
  {
    target: "menu",
    title: "tour.step6.title",
    body: "tour.step6.body",
  },
];

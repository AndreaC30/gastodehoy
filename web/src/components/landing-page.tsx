/**
 * Landing pública: valor del producto y CTAs antes del login.
 * Identidad GastoDeHoy (cian V11) — distinta de WorkShift.
 */
import { useTranslation } from "react-i18next";
import {
  IoCalendarOutline,
  IoCashOutline,
  IoCheckmark,
  IoPieChartOutline,
  IoShieldCheckmarkOutline,
  IoTodayOutline,
} from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";
import type { AuthEntryTab } from "@/components/login-screen";
import { TYPE_BODY, TYPE_EYEBROW } from "@/lib/typography";
import { BTN_PRIMARY, BTN_SECONDARY, SECTION_CARD } from "@/lib/ui-a11y";

type Props = {
  onEnter: (mode: AuthEntryTab) => void;
};

function TodayPreview() {
  const { t } = useTranslation();
  return (
    <div className="gdh-landing-preview relative mx-auto w-full max-w-sm" aria-hidden>
      <div className={`${SECTION_CARD} p-5`}>
        <p className={TYPE_EYEBROW}>{t("landing.previewEyebrow")}</p>
        <p className="mt-1 font-display text-sm font-medium text-[var(--color-text-muted)]">
          {t("landing.previewDate")}
        </p>
        <p className="mt-4 font-display text-4xl font-semibold tabular-nums tracking-tight text-[var(--color-accent)] sm:text-5xl">
          {t("landing.previewAmount")}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("landing.previewHint")}</p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
          <div className="gdh-landing-bar h-full w-[62%] rounded-full bg-[var(--color-accent)]" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[var(--color-bg-soft)] px-3 py-2.5">
            <p className={TYPE_EYEBROW}>
              {t("landing.previewMonthLabel")}
            </p>
            <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-[var(--color-text)]">
              {t("landing.previewMonthValue")}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--color-bg-soft)] px-3 py-2.5">
            <p className={TYPE_EYEBROW}>
              {t("landing.previewDaysLabel")}
            </p>
            <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-[var(--color-text)]">
              {t("landing.previewDaysValue")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURE_ICONS = [
  IoTodayOutline,
  IoCashOutline,
  IoPieChartOutline,
  IoCalendarOutline,
  IoShieldCheckmarkOutline,
] as const;

export function LandingPage({ onEnter }: Props) {
  const { t } = useTranslation();
  const features = [
    { Icon: FEATURE_ICONS[0], title: t("landing.feat1Title"), text: t("landing.feat1Text") },
    { Icon: FEATURE_ICONS[1], title: t("landing.feat2Title"), text: t("landing.feat2Text") },
    { Icon: FEATURE_ICONS[2], title: t("landing.feat3Title"), text: t("landing.feat3Text") },
    { Icon: FEATURE_ICONS[3], title: t("landing.feat4Title"), text: t("landing.feat4Text") },
    { Icon: FEATURE_ICONS[4], title: t("landing.feat5Title"), text: t("landing.feat5Text") },
  ];
  const steps = [
    { n: "01", title: t("landing.step1Title"), text: t("landing.step1Text") },
    { n: "02", title: t("landing.step2Title"), text: t("landing.step2Text") },
    { n: "03", title: t("landing.step3Title"), text: t("landing.step3Text") },
  ];

  return (
    <div className="gdh-landing relative z-10 min-h-dvh overflow-x-clip text-[var(--color-text)]">
      <div className="gdh-landing-atmosphere pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-20 border-b border-[var(--color-border)]/80 bg-[var(--color-bg)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="min-w-0 border-0 bg-transparent p-0 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            aria-label="GastoDeHoy"
          >
            <BrandLogo variant="header" />
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onEnter("login")}
              className={BTN_SECONDARY}
            >
              {t("landing.ctaLogin")}
            </button>
            <button
              type="button"
              onClick={() => onEnter("register")}
              className={BTN_PRIMARY}
            >
              {t("landing.ctaRegister")}
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — una composición */}
        <section className="relative z-10">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-20">
            <div className="gdh-landing-fade space-y-6 text-center lg:text-left">
              <h1 className="m-0 leading-none">
                <BrandLogo variant="hero" className="lg:!justify-start" />
              </h1>
              <div className="space-y-3">
                <p className={TYPE_EYEBROW}>{t("landing.eyebrow")}</p>
                <p className="font-display text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                  {t("landing.headline")}
                </p>
                <p className={`${TYPE_BODY} mx-auto max-w-md text-base sm:text-lg lg:mx-0`}>
                  {t("landing.hero")}
                </p>
              </div>
              <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => onEnter("register")}
                  className="min-h-11 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-surface)] transition hover:brightness-110 sm:min-w-[11rem]"
                >
                  {t("landing.ctaStart")}
                </button>
                <button
                  type="button"
                  onClick={() => onEnter("login")}
                  className="min-h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)] px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-panel-elevated)] sm:min-w-[11rem]"
                >
                  {t("landing.ctaLogin")}
                </button>
              </div>
              <ul className="mx-auto flex max-w-md flex-col gap-2 text-left text-sm text-[var(--color-text-muted)] lg:mx-0">
                {[t("landing.bullet1"), t("landing.bullet2"), t("landing.bullet3")].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                      aria-hidden
                    >
                      <IoCheckmark className="h-3.5 w-3.5" />
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="gdh-landing-fade gdh-landing-fade-delay flex justify-center lg:justify-end">
              <TodayPreview />
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="relative z-10 border-t border-[var(--color-border)]/70 bg-[var(--color-bg-soft)]/50">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className={TYPE_EYEBROW}>{t("landing.howEyebrow")}</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">
                {t("landing.howTitle")}
              </h2>
              <p className={`${TYPE_BODY} mt-3`}>{t("landing.howLead")}</p>
            </div>
            <ol className="grid gap-6 sm:grid-cols-3">
              {steps.map((step) => (
                <li key={step.n} className="text-center sm:text-left">
                  <p className="font-mono text-xs font-semibold tracking-[0.12em] text-[var(--color-accent)]">
                    {step.n}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-[var(--color-text)]">
                    {step.title}
                  </h3>
                  <p className={`${TYPE_BODY} mt-1.5 text-sm`}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Qué incluye */}
        <section className="relative z-10 border-t border-[var(--color-border)]/70">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className={TYPE_EYEBROW}>{t("landing.featEyebrow")}</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">
                {t("landing.featTitle")}
              </h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ Icon, title, text }) => (
                <li
                  key={title}
                  className={`${SECTION_CARD} p-4`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 font-display text-base font-semibold text-[var(--color-text)]">
                    {title}
                  </h3>
                  <p className={`${TYPE_BODY} mt-1.5 text-sm`}>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative z-10 border-t border-[var(--color-border)]/70">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="gdh-landing-cta rounded-2xl border border-[var(--color-accent-border)] px-6 py-10 text-center sm:px-10">
              <p className={TYPE_EYEBROW}>{t("landing.finalEyebrow")}</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">
                {t("landing.finalTitle")}
              </h2>
              <p className={`${TYPE_BODY} mx-auto mt-3 max-w-lg`}>{t("landing.finalLead")}</p>
              <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => onEnter("register")}
                  className="min-h-11 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] transition hover:brightness-110 sm:min-w-[12rem]"
                >
                  {t("landing.ctaRegister")}
                </button>
                <button
                  type="button"
                  onClick={() => onEnter("login")}
                  className="min-h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)] px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-panel-elevated)] sm:min-w-[12rem]"
                >
                  {t("landing.ctaLogin")}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--color-border)]/70 py-6 text-center">
        <p className="text-xs text-[var(--color-text-dim)]">{t("landing.footer")}</p>
      </footer>
    </div>
  );
}

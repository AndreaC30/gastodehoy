/**
 * Página de bienvenida antes del login: valor del producto y CTAs.
 */
import { useTranslation } from "react-i18next";
import { IoCheckmark } from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";
import type { AuthEntryTab } from "@/components/login-screen";

type Props = {
  onEnter: (mode: AuthEntryTab) => void;
};

export function LandingPage({ onEnter }: Props) {
  const { t } = useTranslation();

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col px-4 py-6 sm:min-h-screen sm:justify-center sm:py-12">
      <h1 className="m-0 leading-none">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-full cursor-pointer border-0 bg-transparent p-0 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
          aria-label={t("common.back")}
        >
          <BrandLogo variant="hero" />
        </button>
      </h1>
      <p className="mt-4 text-center text-base text-[var(--color-text-muted)]">
        {t("landing.hero")}
      </p>

      <ul className="mt-8 space-y-3 text-sm text-[var(--color-text-muted)]">
        <li className="flex gap-3">
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
            aria-hidden
          >
            <IoCheckmark className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>{t("landing.bullet1")}</span>
        </li>
        <li className="flex gap-3">
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
            aria-hidden
          >
            <IoCheckmark className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>{t("landing.bullet2")}</span>
        </li>
        <li className="flex gap-3">
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
            aria-hidden
          >
            <IoCheckmark className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>{t("landing.bullet3")}</span>
        </li>
      </ul>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => onEnter("register")}
          className="rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-surface)] hover:brightness-110"
        >
          {t("landing.ctaRegister")}
        </button>
        <button
          type="button"
          onClick={() => onEnter("login")}
          className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/60 px-5 py-3 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-panel-elevated)]/60"
        >
          {t("landing.ctaLogin")}
        </button>
      </div>
      <p className="mt-6 text-center text-xs text-[var(--color-text-dim)]">
        {t("landing.footer")}
      </p>
    </main>
  );
}

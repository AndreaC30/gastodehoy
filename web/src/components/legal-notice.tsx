import { useTranslation } from "react-i18next";
import { IoArrowBack } from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";

type Props = { onBack: () => void };

export function LegalNotice({ onBack }: Props) {
  const { t } = useTranslation();

  return (
    <div className="relative z-10 flex min-h-screen flex-col px-4 py-12">
      {/* Top bar */}
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-teal-300 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400"
        >
          <IoArrowBack className="h-4 w-4 shrink-0" aria-hidden />
          {t("common.back")}
        </button>

        <div className="mb-8">
          <BrandLogo variant="hero" />
        </div>

        {/* Content */}
        <div className="prose max-w-3xl leading-relaxed text-slate-300">
          <h1 className="text-2xl font-bold text-slate-100">{t("legal.title")}</h1>
          <p className="text-sm text-slate-500">
            <strong>{t("legal.lastUpdatedLabel")}</strong> {t("legal.lastUpdatedDate")}
          </p>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("legal.section1Title")}</h2>
            <ul className="list-none space-y-1 pl-0 text-base">
              <li><strong>{t("legal.section1Owner")}</strong> {t("legal.section1OwnerValue")}</li>
              <li><strong>{t("legal.section1Email")}</strong> {t("legal.section1EmailValue")}</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("legal.section2Title")}</h2>
            <p className="text-base">
              {t("legal.section2Text")}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("legal.section3Title")}</h2>
            <p className="text-base">
              {t("legal.section3Intro")}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-base">
              <li>{t("legal.section3Item1")}</li>
              <li>{t("legal.section3Item2")}</li>
              <li>{t("legal.section3Item3")}</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("legal.section4Title")}</h2>
            <p className="text-base">
              {t("legal.section4Text")}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("legal.section5Title")}</h2>
            <p className="text-base">
              {t("legal.section5Text")}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("legal.section6Title")}</h2>
            <p className="text-base">
              {t("legal.section6Text")}
            </p>
          </section>

          <section className="mt-6 mb-12">
            <h2 className="text-lg font-semibold text-slate-100">{t("legal.section7Title")}</h2>
            <p className="text-base">
              {t("legal.section7Text")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

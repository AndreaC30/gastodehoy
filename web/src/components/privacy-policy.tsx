import { useTranslation } from "react-i18next";
import { IoArrowBack } from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";

type Props = { onBack: () => void };

export function PrivacyPolicy({ onBack }: Props) {
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
          <h1 className="text-2xl font-bold text-slate-100">{t("privacy.title")}</h1>
          <p className="text-sm text-slate-500">
            <strong>{t("privacy.lastUpdatedLabel")}</strong> {t("privacy.lastUpdatedDate")}
          </p>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("privacy.section1Title")}</h2>
            <ul className="list-none space-y-1 pl-0 text-base">
              <li><strong>{t("privacy.section1Owner")}</strong> {t("privacy.section1OwnerValue")}</li>
              <li><strong>{t("privacy.section1Email")}</strong> {t("privacy.section1EmailValue")}</li>
              <li><strong>{t("privacy.section1Web")}</strong> {t("privacy.section1WebValue")}</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("privacy.section2Title")}</h2>
            <ul className="list-disc space-y-1 pl-5 text-base">
              <li>{t("privacy.section2Item1")}</li>
              <li>{t("privacy.section2Item2")}</li>
              <li>{t("privacy.section2Item3")}</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("privacy.section3Title")}</h2>
            <ul className="list-disc space-y-1 pl-5 text-base">
              <li>{t("privacy.section3Item1")}</li>
              <li>{t("privacy.section3Item2")}</li>
              <li>{t("privacy.section3Item3")}</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("privacy.section4Title")}</h2>
            <ul className="list-disc space-y-1 pl-5 text-base">
              <li>
                <strong>{t("privacy.section4Item1Label")}</strong> {t("privacy.section4Item1Text")}
              </li>
              <li>
                <strong>{t("privacy.section4Item2Label")}</strong> {t("privacy.section4Item2Text")}
              </li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("privacy.section5Title")}</h2>
            <p className="text-base">
              {t("privacy.section5Text")}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("privacy.section6Title")}</h2>
            <p className="text-base">
              {t("privacy.section6Part1")}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-sm text-teal-300">gdh_session</code>
              {t("privacy.section6Part2")}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{t("privacy.section7Title")}</h2>
            <p className="text-base">
              {t("privacy.section7Part1")}{' '}
              <a
                href="mailto:gastodehoy@gmail.com"
                className="text-teal-400 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-300"
              >
                gastodehoy@gmail.com
              </a>
              {t("privacy.section7Part2")}
            </p>
          </section>

          <section className="mt-6 mb-12">
            <h2 className="text-lg font-semibold text-slate-100">{t("privacy.section8Title")}</h2>
            <p className="text-base">
              {t("privacy.section8Text")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

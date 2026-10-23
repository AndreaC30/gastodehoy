import { useTranslation } from "react-i18next";
import { IoArrowBack } from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";
import { LegalProse } from "@/components/legal-prose";

type Props = { onBack: () => void };

export function PrivacyPolicy({ onBack }: Props) {
  const { t } = useTranslation();

  return (
    <div className="relative z-10 flex min-h-full flex-col px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-12">
      {/* Top bar */}
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
        >
          <IoArrowBack className="h-4 w-4 shrink-0" aria-hidden />
          {t("common.back")}
        </button>

        <div className="mb-8">
          <BrandLogo variant="hero" />
        </div>

        {/* Content */}
        <div className="prose mb-12 max-w-3xl leading-relaxed text-[var(--color-text-muted)]">
          <LegalProse group="privacy" />
        </div>
      </div>
    </div>
  );
}

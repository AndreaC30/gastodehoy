import { useTranslation } from "react-i18next";

type Section = { title: string; paragraphs: string[] };

const LINK_RE =
  /(gastodehoy@gmail.com|https:\/\/www\.aepd\.es\/?|https:\/\/gastodehoy\.es\/?)/g;

function RichText({ text }: { text: string }) {
  const parts = text.split(LINK_RE);
  return (
    <>
      {parts.map((part, index) => {
        if (part === "gastodehoy@gmail.com") {
          return (
            <a
              key={index}
              href="mailto:gastodehoy@gmail.com"
              className="text-[var(--color-accent)] underline decoration-[var(--color-accent-border)] underline-offset-2"
            >
              {part}
            </a>
          );
        }
        if (part.startsWith("https://")) {
          return (
            <a
              key={index}
              href={part}
              className="text-[var(--color-accent)] underline decoration-[var(--color-accent-border)] underline-offset-2"
            >
              {part.replace(/\/$/, "")}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export function LegalProse({ group }: { group: "privacy" | "legal" }) {
  const { t } = useTranslation();
  const sections = t(`${group}.sections`, { returnObjects: true }) as Section[];
  const list = Array.isArray(sections) ? sections : [];

  return (
    <>
      <h1 className="text-2xl font-bold text-[var(--color-text)]">{t(`${group}.title`)}</h1>
      <p className="text-sm text-[var(--color-text-dim)]">
        <strong>{t(`${group}.lastUpdatedLabel`)}</strong> {t(`${group}.lastUpdatedDate`)}
        {" · "}
        {t(`${group}.versionLabel`)} {t(`${group}.versionValue`)}
      </p>
      {list.map((section) => (
        <section key={section.title} className="mt-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-base">
              <RichText text={paragraph} />
            </p>
          ))}
        </section>
      ))}
    </>
  );
}

/** Inline tour section - starts the guided tour overlay. */

import { useTranslation } from "react-i18next";
import { IoClose, IoPlay } from "react-icons/io5";

type Props = {
  onStart: () => void;
};

export function TourSection({ onStart }: Props) {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t("nav.guidedTour")}</h2>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'hoy' }))}
          className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
          aria-label="Volver"
        >
          <IoClose className="h-5 w-5" />
        </button>
      </div>

      <div className="text-center py-8 space-y-6">
        <div>
          <div className="h-20 w-20 mx-auto mb-4 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center">
            <IoPlay className="h-10 w-10 text-[var(--color-accent)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
            ¿Nuevo en GastoDeHoy?
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
            El tour guiado te mostrará las funciones principales de la aplicación
            y te ayudará a configurarla por primera vez.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            type="button"
            onClick={() => {
              onStart();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-bg)] hover:brightness-110"
          >
            <IoPlay className="h-4 w-4" />
            Iniciar Tour Guiado
          </button>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'hoy' }));
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-6 py-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-panel)]"
          >
            Ya conozco la app
          </button>
        </div>

        <div className="pt-6 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)]">
            💡 El tour te guiará paso a paso por las secciones principales:
            Hoy, Gastos, Análisis e Histórico.
          </p>
        </div>
      </div>
    </section>
  );
}

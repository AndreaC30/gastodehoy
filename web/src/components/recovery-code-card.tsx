/**
 * One-shot recovery-code display.
 *
 * Used after register and after recover to show the freshly-issued code.
 * Forces the user to tick a "I've saved it" checkbox before continuing,
 * to lower the odds of dismissing the dialog without copying the code.
 */
import { useState } from "react";

type Props = {
  code: string;
  title?: string;
  intro?: string;
  ctaLabel?: string;
  onAcknowledge: () => void;
};

/** Renders the code, a copy-to-clipboard button and the acknowledge gate. */
export function RecoveryCodeCard({
  code,
  title = "Guarda tu código de recuperación",
  intro = "Si olvidas tu contraseña, este código te dejará entrar y elegir una nueva. No volveremos a mostrarlo.",
  ctaLabel = "Lo tengo guardado",
  onAcknowledge,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore: el usuario puede seleccionarlo a mano */
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{intro}</p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">
          Tu código
        </p>
        <p className="mt-2 select-all break-all font-mono text-lg font-semibold text-amber-100">
          {code}
        </p>
        <button
          type="button"
          onClick={copy}
          className="mt-3 rounded-lg border border-amber-500/40 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-500/10"
        >
          {copied ? "Copiado ✓" : "Copiar al portapapeles"}
        </button>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
        <li>Pégalo en tu gestor de contraseñas, o anótalo en papel.</li>
        <li>Cualquiera con este código puede cambiar tu contraseña.</li>
        <li>Se invalida en cuanto lo uses; te daremos uno nuevo.</li>
      </ul>

      <label className="flex items-start gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 accent-teal-500"
        />
        He guardado el código en un sitio seguro.
      </label>

      <button
        type="button"
        onClick={onAcknowledge}
        disabled={!confirmed}
        className="w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

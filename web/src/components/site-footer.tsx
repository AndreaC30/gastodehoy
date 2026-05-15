/** Pie legal del dashboard (sin exponer fórmulas internas). */

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL?.trim() ?? "";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-4 text-center text-xs leading-relaxed text-slate-500">
      <p className="text-slate-400">
        © {year} GastoDeHoy. Todos los derechos reservados.
      </p>
      <p className="mt-2">
        Contenido, diseño y software son propiedad de sus titulares. Queda
        prohibida la copia, reproducción o uso comercial sin autorización
        expresa.
      </p>
      {CONTACT_EMAIL ? (
        <p className="mt-2">
          Contacto:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-teal-400/90 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-300"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      ) : null}
    </footer>
  );
}

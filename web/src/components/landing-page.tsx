/**
 * Página de bienvenida antes del login: valor del producto y CTAs.
 */
import { IoCheckmark } from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";
import type { AuthEntryTab } from "@/components/login-screen";

type Props = {
  /** Ir al login con la pestaña indicada. */
  onEnter: (mode: AuthEntryTab) => void;
};

export function LandingPage({ onEnter }: Props) {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="m-0 leading-none">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-full cursor-pointer border-0 bg-transparent p-0 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400"
          aria-label="Ir al inicio de la página"
        >
          <BrandLogo variant="hero" />
        </button>
      </h1>
      <p className="mt-4 text-center text-base text-slate-300">
        Control de gastos del día a día y del mes, con un tablero que resume
        cuánto puedes gastar hoy y qué te queda en el mes.
      </p>

      <ul className="mt-8 space-y-3 text-sm text-slate-400">
        <li className="flex gap-3">
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-300"
            aria-hidden
          >
            <IoCheckmark className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>
            Anota lo que gastas cada día y revisa cómo se reparte a lo largo del
            mes.
          </span>
        </li>
        <li className="flex gap-3">
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-300"
            aria-hidden
          >
            <IoCheckmark className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>
            Totales y cálculos en la pantalla principal: sin hojas de cálculo
            sueltas.
          </span>
        </li>
        <li className="flex gap-3">
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-300"
            aria-hidden
          >
            <IoCheckmark className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>
            Crea cuenta o entra para guardar tu información en el servidor y no
            perderla al cerrar el navegador.
          </span>
        </li>
      </ul>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => onEnter("register")}
          className="rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 hover:brightness-110"
        >
          Crear cuenta
        </button>
        <button
          type="button"
          onClick={() => onEnter("login")}
          className="rounded-xl border border-slate-600 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-100 hover:border-slate-500 hover:bg-slate-800/60"
        >
          Iniciar sesión
        </button>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Un usuario, una cuenta: tus datos no se mezclan con los de nadie más.
      </p>
    </main>
  );
}

import { IoArrowBack } from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";

type Props = { onBack: () => void };

export function LegalNotice({ onBack }: Props) {
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
          Volver
        </button>

        <div className="mb-8">
          <BrandLogo variant="hero" />
        </div>

        {/* Content */}
        <div className="prose max-w-3xl leading-relaxed text-slate-300">
          <h1 className="text-2xl font-bold text-slate-100">Aviso Legal y Condiciones de Uso</h1>
          <p className="text-sm text-slate-500">
            <strong>Última actualización:</strong> Mayo 2026
          </p>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">1. Titularidad</h2>
            <ul className="list-none space-y-1 pl-0 text-base">
              <li><strong>Titular:</strong> Andrea Cruz</li>
              <li><strong>Email:</strong> gastodehoy@gmail.com</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">2. Condiciones de Uso</h2>
            <p className="text-base">
              El acceso y uso de GastoDeHoy implica la aceptación de estas condiciones. Si no estás de acuerdo,
              no uses el servicio.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">3. Uso del Servicio</h2>
            <p className="text-base">
              GastoDeHoy es una herramienta de gestión de gastos personales. Te comprometes a:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-base">
              <li>No usar el servicio para actividades ilícitas</li>
              <li>Proporcionar información veraz</li>
              <li>No intentar acceder a datos de otros usuarios</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">4. Propiedad Intelectual</h2>
            <p className="text-base">
              El diseño, código fuente, logotipos y contenidos de GastoDeHoy son propiedad de sus titulares.
              Queda prohibida su reproducción sin autorización.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">5. Limitación de Responsabilidad</h2>
            <p className="text-base">
              GastoDeHoy se ofrece &quot;tal cual&quot;. No garantizamos disponibilidad ininterrumpida ni ausencia de
              errores. No somos responsables de decisiones financieras tomadas basándose en los cálculos de la app.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">6. Modificaciones</h2>
            <p className="text-base">
              Nos reservamos el derecho a modificar estas condiciones en cualquier momento. Los cambios se
              notificarán por correo electrónico.
            </p>
          </section>

          <section className="mt-6 mb-12">
            <h2 className="text-lg font-semibold text-slate-100">7. Ley Aplicable</h2>
            <p className="text-base">
              Estas condiciones se rigen por la legislación española. Cualquier disputa se someterá a los
              juzgados de Madrid.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

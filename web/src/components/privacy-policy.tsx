import { IoArrowBack } from "react-icons/io5";
import { BrandLogo } from "@/components/brand-logo";

type Props = { onBack: () => void };

export function PrivacyPolicy({ onBack }: Props) {
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
          <h1 className="text-2xl font-bold text-slate-100">Política de Privacidad</h1>
          <p className="text-sm text-slate-500">
            <strong>Última actualización:</strong> Mayo 2026
          </p>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">1. Responsable del Tratamiento</h2>
            <ul className="list-none space-y-1 pl-0 text-base">
              <li><strong>Titular:</strong> Andrea Cruz</li>
              <li><strong>Email:</strong> gastodehoy@gmail.com</li>
              <li><strong>Web:</strong> gastodehoy.kyadigital.es</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">2. Datos que Recogemos</h2>
            <ul className="list-disc space-y-1 pl-5 text-base">
              <li>Email y nombre (al crear cuenta)</li>
              <li>Datos de gastos e ingresos que introduces voluntariamente</li>
              <li>Datos de uso anónimos (analytics, solo si aceptas cookies)</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">3. Finalidad del Tratamiento</h2>
            <ul className="list-disc space-y-1 pl-5 text-base">
              <li>Prestarte el servicio de gestión de gastos personales</li>
              <li>Autenticarte y mantener tu sesión</li>
              <li>Mejorar la aplicación mediante analytics anónimo (con tu consentimiento)</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">4. Base Legal</h2>
            <ul className="list-disc space-y-1 pl-5 text-base">
              <li>
                <strong>Ejecución del servicio (art. 6.1.b RGPD):</strong> para los datos necesarios para el funcionamiento
              </li>
              <li>
                <strong>Consentimiento (art. 6.1.a RGPD):</strong> para analytics
              </li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">5. Conservación de Datos</h2>
            <p className="text-base">
              Tus datos se conservan mientras mantengas tu cuenta activa. Puedes eliminar tu cuenta y todos tus datos
              en cualquier momento desde Ajustes &gt; Eliminar cuenta.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">6. Cookies</h2>
            <p className="text-base">
              Usamos una cookie técnica de sesión (<code className="rounded bg-slate-800 px-1 py-0.5 text-sm text-teal-300">gdh_session</code>)
              necesaria para mantener tu inicio de sesión. No requiere consentimiento. Si aceptas, usamos analytics
              anónimo (sin cookies de terceros).
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100">7. Tus Derechos</h2>
            <p className="text-base">
              Tienes derecho a acceder, rectificar, suprimir, limitar y oponerte al tratamiento de tus datos.
              Escríbenos a{' '}
              <a
                href="mailto:gastodehoy@gmail.com"
                className="text-teal-400 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-300"
              >
                gastodehoy@gmail.com
              </a>.
            </p>
          </section>

          <section className="mt-6 mb-12">
            <h2 className="text-lg font-semibold text-slate-100">8. Seguridad</h2>
            <p className="text-base">
              Tus datos se almacenan en servidores dentro de la UE con HTTPS y cifrado. No compartimos tus datos
              con terceros.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

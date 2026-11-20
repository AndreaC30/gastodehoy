import { IoAlertCircleOutline } from "react-icons/io5";
import { ALERT_CRIT } from "@/lib/ui-a11y";

type Props = {
  /** Mensaje del servidor; si es null no se pinta nada. */
  message: string | null;
};

/**
 * Error de envío junto al formulario que lo causó. Permanece hasta el
 * siguiente intento (no desaparece solo como un aviso temporal) y se
 * anuncia a los lectores de pantalla al aparecer.
 */
export function FormError({ message }: Props) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`mt-2 flex items-start gap-2 px-3 py-2 text-sm ${ALERT_CRIT}`}
    >
      <IoAlertCircleOutline className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

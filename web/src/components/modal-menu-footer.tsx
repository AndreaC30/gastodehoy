import type { ReactNode } from "react";
import { IoMenuOutline } from "react-icons/io5";
import { BTN_SECONDARY, FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  onBackToMenu?: () => void;
  onClose?: () => void;
  closeLabel?: string;
  children?: ReactNode;
  className?: string;
};

/** Pie de modal con «Volver al menú» + cerrar + acciones principales a la derecha. */
export function ModalMenuFooter({
  onBackToMenu,
  onClose,
  closeLabel = "Cerrar",
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        {onBackToMenu && (
          <button
            type="button"
            onClick={onBackToMenu}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 sm:w-auto ${BTN_SECONDARY}`}
          >
            <IoMenuOutline className="h-5 w-5 shrink-0" aria-hidden />
            Volver al menú
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`min-h-11 w-full sm:w-auto ${BTN_SECONDARY} ${FOCUS_RING}`}
          >
            {closeLabel}
          </button>
        )}
      </div>
      {children ? (
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          {children}
        </div>
      ) : null}
    </div>
  );
}

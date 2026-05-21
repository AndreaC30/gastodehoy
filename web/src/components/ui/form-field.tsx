import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type Props = {
  id?: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  labelClassName?: string;
  children: ReactElement<ControlProps>;
};

/** Label + control with optional hint/error wired for assistive tech. */
export function FormField({
  id: idProp,
  label,
  hint,
  error,
  className,
  labelClassName = "block text-sm font-medium text-slate-300 sm:text-base",
  children,
}: Props) {
  const fallbackId = useId();
  const id = idProp ?? fallbackId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="mt-1.5">{control}</div>
      {hint && (
        <p id={hintId} className="mt-2 text-sm leading-relaxed text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

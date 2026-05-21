/** Icon picker as a compact dropdown beside the expense name field. */
import { useEffect, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import {
  CATEGORY_ICON_PICKER,
  getCategoryIcon,
} from "@/components/dashboard/category-icon";
import { FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  value: string;
  onChange: (name: string) => void;
  className?: string;
};

export function IconSelectDropdown({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const SelectedIcon = getCategoryIcon(value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 min-w-11 items-center justify-center gap-0.5 rounded-lg border border-slate-700 bg-slate-950 px-1.5 hover:border-slate-500 ${FOCUS_RING}`}
        aria-label="Elegir icono"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <SelectedIcon className="h-5 w-5 shrink-0 text-sky-400/90" />
        <IoChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Iconos"
          className="modal-scroll absolute left-0 top-[calc(100%+4px)] z-30 max-h-44 w-[min(14rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-xl shadow-black/40"
        >
          <div className="grid grid-cols-5 gap-1">
            {CATEGORY_ICON_PICKER.map((opt) => {
              const OptIcon = opt.Icon;
              const selected = value === opt.name;
              return (
                <button
                  key={opt.name}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(opt.name)}
                  className={`rounded-md p-2 ${
                    selected
                      ? "bg-sky-500/25 ring-1 ring-sky-500/60"
                      : "hover:bg-slate-800"
                  }`}
                  aria-label={opt.name}
                >
                  <OptIcon className="mx-auto h-4 w-4 text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

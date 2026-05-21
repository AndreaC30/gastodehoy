import { IoChevronDown } from "react-icons/io5";

/** Arrow for expand/collapse lists (rotates when expanded). */
export function ChevronInCircle({ expanded }: { expanded: boolean }) {
  return (
    <IoChevronDown
      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
      aria-hidden
    />
  );
}

import { type ReactNode, useRef, useState, useEffect, useCallback } from "react";
import { INNER_CARD } from "@/lib/ui-a11y";
import { IoChevronBack } from "react-icons/io5";

const SWIPE_THRESHOLD = 80; // px to reveal actions
const MAX_SWIPE = 140; // maximum swipe distance
const TAP_SLOP = 12; // px — below this, treat as tap

type Props = {
  children: ReactNode;
  actions: ReactNode;
  /** Applied to the outer container so `data-[density=compact]:py-1.5` still works */
  density?: string;
  /** Tap on the row (mobile, without swiping) — e.g. open edit. */
  onActivate?: () => void;
};

/**
 * Mobile (narrow + coarse pointer): swipe left to reveal actions; tap opens onActivate.
 * md+ or fine pointer: actions always visible inline.
 */
export function SwipeableRow({ children, actions, density, onActivate }: Props) {
  const [offset, setOffset] = useState(0);
  const [useSwipe, setUseSwipe] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const offsetRef = useRef(0);
  const movedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px) and (pointer: coarse)");
    const sync = () => setUseSwipe(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startX.current = e.touches[0].clientX;
    startOffset.current = offsetRef.current;
    movedRef.current = false;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - startX.current;
    if (Math.abs(deltaX) > TAP_SLOP) movedRef.current = true;
    // Only allow swiping left (negative deltaX → positive offset)
    const newOffset = Math.max(
      0,
      Math.min(MAX_SWIPE, startOffset.current - deltaX),
    );
    offsetRef.current = newOffset;
    setOffset(newOffset);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    const current = offsetRef.current;

    if (!movedRef.current && current < 8 && onActivate) {
      onActivate();
      return;
    }

    if (current > SWIPE_THRESHOLD) {
      offsetRef.current = MAX_SWIPE;
      setOffset(MAX_SWIPE);
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  }, [onActivate]);

  const dismissSwipe = useCallback(() => {
    if (offsetRef.current > 0) {
      offsetRef.current = 0;
      setOffset(0);
    }
  }, []);

  const densityAttr = density ? { "data-density": density } : {};

  if (!useSwipe) {
    return (
      <li
        {...densityAttr}
        className={`flex flex-col gap-2 ${INNER_CARD} px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 data-[density=compact]:py-1.5`}
      >
        {children}
        <div className="flex shrink-0 gap-1.5 self-end sm:self-center">{actions}</div>
      </li>
    );
  }

  const isRevealed = offset > SWIPE_THRESHOLD;
  const showHint = offset < 8;

  return (
    <li
      {...densityAttr}
      className={`relative overflow-hidden ${INNER_CARD}`}
      onClick={isRevealed ? dismissSwipe : undefined}
    >
      <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-3">
        {actions}
      </div>

      <div
        style={{ transform: `translateX(-${offset}px)` }}
        className={`relative z-[1] flex flex-col gap-2 bg-[var(--color-bg-soft)] px-3 py-2.5 pr-8 data-[density=compact]:py-1.5 ${
          swiping ? "" : "transition-transform duration-200 ease-out"
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        {showHint ? (
          <span
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]/50"
            aria-hidden
          >
            <IoChevronBack className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </li>
  );
}

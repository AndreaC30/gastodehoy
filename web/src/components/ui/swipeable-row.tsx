import { type ReactNode, useRef, useState, useEffect, useCallback } from "react";

const SWIPE_THRESHOLD = 80; // px to reveal actions
const MAX_SWIPE = 140; // maximum swipe distance

type Props = {
  children: ReactNode; // the main row content
  actions: ReactNode; // action buttons revealed on swipe
  /** Applied to the outer container so `data-[density=compact]:py-1.5` still works */
  density?: string;
};

export function SwipeableRow({ children, actions, density }: Props) {
  const [offset, setOffset] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX.current = e.touches[0].clientX;
      startOffset.current = offset;
      setSwiping(true);
    },
    [offset],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - startX.current;
      // Only allow swiping left (negative deltaX)
      const newOffset = Math.max(
        0,
        Math.min(MAX_SWIPE, startOffset.current - deltaX),
      );
      setOffset(newOffset);
    },
    [],
  );

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    // Snap: if past threshold, fully reveal; otherwise snap back
    if (offset > SWIPE_THRESHOLD) {
      setOffset(MAX_SWIPE);
    } else {
      setOffset(0);
    }
  }, [offset]);

  // Dismiss swipe on click outside or tap on revealed area
  const dismissSwipe = useCallback(() => {
    if (offset > 0) {
      setOffset(0);
    }
  }, [offset]);

  const densityAttr = density ? { "data-density": density } : {};

  // ---------- Desktop / non-touch render: normal inline layout ----------
  if (!isTouchDevice) {
    return (
      <li
        {...densityAttr}
        className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 data-[density=compact]:py-1.5"
      >
        {children}
        <div className="flex shrink-0 gap-1.5 self-end sm:self-center">
          {actions}
        </div>
      </li>
    );
  }

  // ---------- Touch device: swipeable row ----------
  const isRevealed = offset > SWIPE_THRESHOLD;

  return (
    <li
      {...densityAttr}
      className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
      onClick={isRevealed ? dismissSwipe : undefined}
    >
      {/* Action buttons behind (absolute, right side) */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-3">
        {actions}
      </div>

      {/* Main row (translates left on swipe) */}
      <div
        style={{
          transform: `translateX(-${offset}px)`,
        }}
        className={`flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 data-[density=compact]:py-1.5 ${
          swiping ? "" : "transition-transform duration-200 ease-out"
        } bg-slate-900`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </li>
  );
}

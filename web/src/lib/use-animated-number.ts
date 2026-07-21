/**
 * Animates a number value with an ease-out cubic transition.
 *
 * Returns a formatted currency string via `money()`. The animation runs for
 * ~500 ms each time the target changes.  The visual value is for display
 * only — screen readers should use an aria-label with the raw value.
 */
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";

export function useAnimatedNumber(
  target: number | string | undefined,
  duration = 500,
): string {
  const [displayed, setDisplayed] = useState<number | undefined>(
    target != null ? Number(target) : undefined,
  );

  const animRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (target === undefined || target === null || target === "") {
      setDisplayed(undefined);
      return;
    }

    const numericTarget = Number(target);
    if (!Number.isFinite(numericTarget)) {
      setDisplayed(undefined);
      return;
    }

    // Start from whatever is currently displayed (or 0 for the very first render).
    const start = displayed ?? 0;
    startValueRef.current = start;
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + (numericTarget - start) * eased;
      setDisplayed(current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  if (displayed === undefined || displayed === null) return "—";
  return money(displayed);
}

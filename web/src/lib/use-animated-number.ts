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
  const displayedRef = useRef(displayed);
  displayedRef.current = displayed;

  // Track previous target to detect actual changes
  const prevTargetRef = useRef(target);

  useEffect(() => {
    // Only animate if target genuinely changed
    if (target === prevTargetRef.current) return;
    prevTargetRef.current = target;

    if (target === undefined || target === null || target === "") {
      setDisplayed(undefined);
      return;
    }

    const numericTarget = Number(target);
    if (!Number.isFinite(numericTarget)) {
      setDisplayed(undefined);
      return;
    }

    // Start from the current displayed value (via ref to avoid stale closure)
    const start = displayedRef.current ?? 0;
    const startTime = performance.now();

    // If start and target are the same, skip animation
    if (Math.abs(numericTarget - start) < 0.001) return;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + (numericTarget - start) * eased;
      setDisplayed(current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  if (displayed === undefined || displayed === null) return "—";
  return money(displayed);
}

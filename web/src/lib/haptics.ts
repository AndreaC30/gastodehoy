/** Short haptic tick. Only works on Android/Chrome; iOS Safari doesn't support it. */
export function hapticTick(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(15);
  }
}

/** Slightly longer success pulse. */
export function hapticSuccess(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([10, 50, 20]);
  }
}

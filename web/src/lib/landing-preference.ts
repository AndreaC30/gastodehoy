/** localStorage: si existe, el usuario ya vio la landing y abrimos directo el login. */
const KEY = "gastodehoy_seen_landing";

export function hasSeenLanding(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markLandingSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

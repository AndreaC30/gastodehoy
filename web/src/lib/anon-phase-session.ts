/** sessionStorage: pestaña actual landing vs login (sobrevive a F5, no cruza pestañas). */
const KEY = "gastodehoy_anon_phase";

export type AnonPhase = "landing" | "auth";

export function getStoredAnonPhase(): AnonPhase | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v === "landing" || v === "auth") return v;
  } catch {
    /* private / disabled */
  }
  return null;
}

export function setStoredAnonPhase(phase: AnonPhase): void {
  try {
    sessionStorage.setItem(KEY, phase);
  } catch {
    /* ignore */
  }
}

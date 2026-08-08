const SKIPPED_KEY = "gdh_onboarding_skipped";

/** User chose «configure later»; survives refresh until income is set. */
export function isOnboardingSkipped(): boolean {
  try {
    return localStorage.getItem(SKIPPED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingSkipped(): void {
  try {
    localStorage.setItem(SKIPPED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearOnboardingSkipped(): void {
  try {
    localStorage.removeItem(SKIPPED_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Cookie consent banner — GDPR-aware, loads Umami analytics only after consent.
 *
 * Stores preference in localStorage key `gdh_cookie_consent`:
 *   - `"all"`       — user accepted all cookies (analytics enabled)
 *   - `"necessary"` — user declined non-essential cookies
 *
 * On "accept", the Umami analytics script is injected dynamically.
 * After consent, there is no persistent bottom strip (it overlapped mobile CTAs);
 * users reopen choices via Account → Gestionar cookies.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "gdh_cookie_consent";
const UMAMI_SCRIPT_ID = "umami-analytics-script";
const REVIEW_EVENT = "gdh:cookie-consent-review";

function injectUmamiScript() {
  // Avoid duplicate injection
  if (document.getElementById(UMAMI_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = UMAMI_SCRIPT_ID;
  script.defer = true;
  script.src = "https://umami.kyadigital.es/u/script.js";
  script.setAttribute(
    "data-website-id",
    "cac1b7e0-0363-4df4-b76f-fda83fcf935b",
  );
  script.setAttribute("data-host-url", "https://hermescore.kyadigital.es/u");
  document.head.appendChild(script);
}

function removeUmamiScript() {
  const existing = document.getElementById(UMAMI_SCRIPT_ID);
  if (existing) existing.remove();
  // Also clean up any window.umami if it was set
  if ("umami" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).umami;
    } catch {
      // ignore
    }
  }
}

/** Reopen the consent banner (e.g. from Account preferences). */
export function requestCookieConsentReview() {
  localStorage.removeItem(STORAGE_KEY);
  removeUmamiScript();
  window.dispatchEvent(new Event(REVIEW_EVENT));
}

export function CookieConsentBanner() {
  const { t } = useTranslation();
  // null = not decided yet, "all" | "necessary" = decided
  const [consent, setConsent] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  // If user previously accepted, re-inject on mount (survives refreshes)
  useEffect(() => {
    if (consent === "all") {
      injectUmamiScript();
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onReview() {
      setConsent(null);
    }
    window.addEventListener(REVIEW_EVENT, onReview);
    return () => window.removeEventListener(REVIEW_EVENT, onReview);
  }, []);

  const handleAccept = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "all");
    injectUmamiScript();
    setConsent("all");
  }, []);

  const handleDecline = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "necessary");
    removeUmamiScript();
    setConsent("necessary");
  }, []);

  // Consent already set — no fixed bottom chrome (avoids covering logout / nav).
  if (consent !== null) {
    return null;
  }

  return (
    <div className="gdh-cookie-chrome fixed bottom-[var(--gdh-bottom-chrome-offset,0px)] left-0 right-0 z-[80] border-t border-[var(--color-border-subtle)] bg-[var(--color-panel)]/95 shadow-[var(--shadow-surface)] backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-3">
        {/* Message */}
        <p className="flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
          <span aria-hidden className="mr-1.5">
            🍪
          </span>
          {t("cookieConsent.message")}{" "}
          <span className="text-[var(--color-text-dim)]">
            {t("cookieConsent.privacyLink")}
          </span>
        </p>

        {/* Buttons */}
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
          <button
            type="button"
            onClick={handleDecline}
            className="min-h-11 rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-panel-elevated)]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            {t("cookieConsent.necessaryOnly")}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="min-h-11 rounded-xl bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-surface)] transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            {t("cookieConsent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

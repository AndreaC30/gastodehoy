/**
 * Cookie consent banner — GDPR-aware, loads Umami analytics only after consent.
 *
 * Stores preference in localStorage key `gdh_cookie_consent`:
 *   - `"all"`       — user accepted all cookies (analytics enabled)
 *   - `"necessary"` — user declined non-essential cookies
 *
 * On "accept", the Umami analytics script is injected dynamically.
 * A subtle "Manage cookies" link lets users change their preference later.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gdh_cookie_consent";
const UMAMI_SCRIPT_ID = "umami-analytics-script";

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

export function CookieConsentBanner() {
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

  const handleManageCookies = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    removeUmamiScript();
    setConsent(null);
  }, []);

  // Banner already dismissed
  if (consent !== null) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-end px-4 py-1.5">
          <button
            type="button"
            onClick={handleManageCookies}
            className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            Gestionar cookies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700/80 bg-slate-900/95 shadow-lg shadow-black/30 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-3">
        {/* Message */}
        <p className="flex-1 text-sm leading-relaxed text-slate-300">
          <span aria-hidden className="mr-1.5">
            🍪
          </span>
          GastoDeHoy usa cookies técnicas necesarias para funcionar. Con tu
          permiso, usamos analytics anónimo (sin cookies de terceros) para
          mejorar la app.{" "}
          <span className="text-slate-500">
            Más info en la política de privacidad.
          </span>
        </p>

        {/* Buttons */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={handleDecline}
            className="whitespace-nowrap rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            Solo necesarias
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="whitespace-nowrap rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

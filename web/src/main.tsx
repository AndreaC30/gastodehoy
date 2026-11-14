/**
 * React entry point.
 *
 * Mounts <App /> inside React Query's provider with a single shared
 * client. We keep retries low (one extra try) and refetch on focus so
 * the dashboard auto-syncs when you come back to the tab.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";
import "./fonts/fonts.css";
import "./i18n/index.js";
import "./index.css";
import { installVisualViewport } from "./lib/install-visual-viewport";

installVisualViewport();

if (typeof localStorage !== "undefined") {
  localStorage.removeItem("gdh_cookie_consent");
}

// Clear app icon badge when the app opens (PWA Badging API)
if (typeof navigator !== "undefined" && "clearAppBadge" in navigator) {
  (navigator as any).clearAppBadge?.();
}

// Prevent scroll wheel from changing number inputs (native browser behavior
// can silently increment/decrement while the user types)
document.addEventListener(
  "wheel",
  (e) => {
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "INPUT" && (target as HTMLInputElement).type === "number") {
      e.preventDefault();
    }
  },
  { passive: false },
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

// A new service worker already calls skipWaiting. Reload when it takes
// control so the latest version applies on phone and desktop without a button.
// The first install has no controller yet, so opening the app does not reload.
if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
  let reloading = false;
  const reloadForUpdate = () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    const active = document.activeElement;
    const typing =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable);
    if (!typing) {
      reloadForUpdate();
      return;
    }
    active.addEventListener("blur", reloadForUpdate, { once: true });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") reloadForUpdate();
      },
      { once: true },
    );
  });
}

if ("serviceWorker" in navigator) {
  const lookForUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.update().catch(() => undefined);
    });
  };
  lookForUpdate();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") lookForUpdate();
  });
  window.addEventListener("pageshow", lookForUpdate);
  setInterval(lookForUpdate, 5 * 60 * 1000);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);

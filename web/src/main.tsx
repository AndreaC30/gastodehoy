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
import "./i18n/index.js";
import "./index.css";

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

// ── PWA update detection ──
// When a new service worker is installed, show a reload button so the user
// gets the latest version without manually closing and reopening the PWA.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New version available — show reload banner
          const banner = document.createElement("div");
          banner.className =
            "fixed bottom-4 left-4 right-4 z-[999] flex items-center justify-between gap-3 rounded-xl border border-teal-500/40 bg-teal-950/90 px-4 py-3 text-sm text-teal-100 shadow-2xl backdrop-blur sm:left-auto sm:right-4 sm:max-w-sm";
          banner.innerHTML =
            '<span>Nueva versión disponible.</span>' +
            '<button class="shrink-0 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400">Actualizar</button>';
          banner.querySelector("button")!.addEventListener("click", () => {
            newWorker.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          });
          document.body.appendChild(banner);
        }
      });
    });
    // Check for updates every 5 minutes
    setInterval(() => reg.update(), 5 * 60 * 1000);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

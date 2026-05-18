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
import appleTouch180 from "./assets/gastodehoy-apple-touch-180.png";
import faviconSvgUrl from "./assets/favicon.svg?url";
import favicon16 from "./assets/gastodehoy-favicon-16.png";
import favicon32 from "./assets/gastodehoy-favicon-32.png";
import favicon192 from "./assets/gastodehoy-favicon-192.png";
import favicon512 from "./assets/gastodehoy-favicon.png";
import "./index.css";

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

if (document.documentElement.dataset.gdhFavicons !== "1") {
  document.documentElement.dataset.gdhFavicons = "1";

  const svg = document.createElement("link");
  svg.rel = "icon";
  svg.type = "image/svg+xml";
  svg.href = faviconSvgUrl;
  document.head.appendChild(svg);

  const png = (rel: string, href: string, sizes: string) => {
    const link = document.createElement("link");
    link.rel = rel;
    link.type = "image/png";
    link.href = href;
    link.setAttribute("sizes", sizes);
    document.head.appendChild(link);
  };

  /* SVG primero (nítido); PNG con tamaños que coinciden con el archivo. */
  png("icon", favicon16, "16x16");
  png("icon", favicon32, "32x32");
  png("icon", favicon192, "192x192");
  png("apple-touch-icon", appleTouch180, "180x180");
  png("apple-touch-icon", favicon512, "512x512");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

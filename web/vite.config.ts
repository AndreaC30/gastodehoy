import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import { siteOriginPlugin } from "./vite-plugin-site-origin";

const webDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webDir, "..");

export default defineConfig(({ mode }) => {
  const envRoot = loadEnv(mode, repoRoot, "");
  const envWeb = loadEnv(mode, webDir, "");
  const env = { ...envRoot, ...envWeb };
  const apiTarget =
    env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8000";

  return {
    resolve: {
      alias: {
        "@": path.resolve(webDir, "src"),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      siteOriginPlugin(env.SITE_DOMAIN ?? env.VITE_SITE_ORIGIN, mode),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "GastoDeHoy",
          short_name: "GastoDeHoy",
          description:
            "Descubre cuánto puedes gastar hoy y controla tus gastos diarios con tu presupuesto personal.",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          display: "standalone",
          start_url: "/",
          lang: "es",
          icons: [
            {
              src: "/pwa-launch-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-launch-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/gastodehoy-favicon-16.png",
              sizes: "16x16",
              type: "image/png",
            },
            {
              src: "/gastodehoy-favicon-32.png",
              sizes: "32x32",
              type: "image/png",
            },
            {
              src: "/gastodehoy-favicon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/gastodehoy-app-icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/gastodehoy-app-icon-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/gastodehoy-app-icon-maskable-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/gastodehoy-apple-touch-180.png",
              sizes: "180x180",
              type: "image/png",
            },
          ],
        },
        workbox: {
          // Don't precache HTML — always fetch fresh so splash is never stale
          globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
          // Disable automatic navigation fallback (we use runtimeCaching instead)
          navigateFallback: null,
          importScripts: ["push-handler.js"],
          // Take control immediately on update (no waiting for tabs to close)
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^\/api\//,
              handler: "NetworkOnly",
            },
            {
              // HTML: network-first so we always get the latest splash/markup
              urlPattern: ({ request }) => request.destination === "document",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-cache",
                expiration: { maxEntries: 3, maxAgeSeconds: 300 },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/health": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});

import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

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
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/health": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});

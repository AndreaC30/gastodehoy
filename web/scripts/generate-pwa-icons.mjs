/**
 * Regenerate square PWA / favicon PNGs from src/assets/app-icon.svg.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = path.join(webDir, "src/assets/app-icon.svg");
const svg = readFileSync(svgPath, "utf8");

const sizes = [
  { size: 512, assets: ["gastodehoy-app-icon.png", "gastodehoy-favicon.png"] },
  { size: 192, assets: ["gastodehoy-favicon-192.png"] },
  { size: 180, assets: ["gastodehoy-apple-touch-180.png"] },
  { size: 32, assets: ["gastodehoy-favicon-32.png"] },
  { size: 16, assets: ["gastodehoy-favicon-16.png"] },
];

for (const { size, assets } of sizes) {
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  }).render().asPng();

  for (const name of assets) {
    const assetPath = path.join(webDir, "src/assets", name);
    writeFileSync(assetPath, png);
    const publicPath = path.join(webDir, "public", name);
    if (name.startsWith("gastodehoy-")) {
      writeFileSync(publicPath, png);
    }
  }
}

console.log("PWA icons written:", sizes.map((s) => `${s.size}px`).join(", "));

/**
 * PWA / favicon PNGs from the 3D calendar master asset.
 * Edit: web/src/assets/gastodehoy-calendar-icon-source.png
 * Run: npm run icons
 *
 * Generates:
 *   - any icon (512px) — full bleed with subtle margin
 *   - maskable icon (512px, 192px) — safe-zone padding for adaptive masks
 *   - apple-touch-icon (180px)
 *   - favicons (16, 32, 192px)
 *   - og-image (512px)
 *
 * Background fill uses the app theme color (#0f172a / slate-900) so icons
 * are consistent with the app UI on all platforms.
 * PNGs are RGBA so corners of the 3D design blend naturally into the background.
 */
import { copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(webDir, "src/assets/gastodehoy-calendar-icon-source.png");

// App theme background color (slate-900)
const BG = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a

/**
 * Build a square PNG icon with the 3D calendar centered on theme-colored background.
 * @param {number} canvasSize - output square dimension in px
 * @param {number} contentFraction - fraction of canvas the content occupies (0–1)
 *   - 0.88 → "any" icon (small margin)
 *   - 0.72 → "maskable" icon (safe zone, per adaptive icon spec)
 * @returns {Promise<Buffer>} RGBA PNG buffer
 */
async function squareIcon(canvasSize, contentFraction = 0.88) {
  const contentSize = Math.round(canvasSize * contentFraction);

  // Scale source to fit within contentSize while preserving aspect ratio
  const content = await sharp(sourcePath)
    .resize(contentSize, contentSize, {
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .toBuffer();

  const contentMeta = await sharp(content).metadata();

  // Center on theme-colored canvas
  const left = Math.round((canvasSize - contentMeta.width) / 2);
  const top = Math.round((canvasSize - contentMeta.height) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: content, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function writeAsset(name, png) {
  writeFileSync(path.join(webDir, "src", "assets", name), png);
  if (name.startsWith("gastodehoy-")) {
    writeFileSync(path.join(webDir, "public", name), png);
  }
}

// ── Main ────────────────────────────────────────────────────────────

const sourceMeta = await sharp(sourcePath).metadata();
console.log(
  `Source: ${path.basename(sourcePath)} (${sourceMeta.width}×${sourceMeta.height})`,
);
console.log(`Background: #0f172a (slate-900 — app theme)\n`);

// "any" icon — 512px, content at 88%
const any512 = await squareIcon(512, 0.88);
writeAsset("gastodehoy-app-icon.png", any512);
writeAsset("gastodehoy-favicon.png", any512);
console.log("  any 512px        (content @ 88%)");

// "any" icon — 192px
const any192 = await squareIcon(192, 0.88);
writeAsset("gastodehoy-favicon-192.png", any192);
console.log("  any 192px        (content @ 88%)");

// maskable icon — 512px, content at 72% (safe zone)
const mask512 = await squareIcon(512, 0.72);
writeAsset("gastodehoy-app-icon-maskable.png", mask512);
console.log("  maskable 512px   (content @ 72% — safe zone)");

// maskable icon — 192px
const mask192 = await squareIcon(192, 0.72);
writeAsset("gastodehoy-app-icon-maskable-192.png", mask192);
console.log("  maskable 192px   (content @ 72% — safe zone)");

// apple-touch-icon — 180px
const apple180 = await squareIcon(180, 0.85);
writeAsset("gastodehoy-apple-touch-180.png", apple180);
console.log("  apple-touch 180px (content @ 85%)");

// favicons
const fav32 = await squareIcon(32, 0.88);
writeAsset("gastodehoy-favicon-32.png", fav32);
console.log("  favicon 32px     (content @ 88%)");

const fav16 = await squareIcon(16, 0.88);
writeAsset("gastodehoy-favicon-16.png", fav16);
console.log("  favicon 16px     (content @ 88%)");

// og-image
const og512 = await squareIcon(512, 0.88);
writeFileSync(path.join(webDir, "public", "og-image.png"), og512);
console.log("  og-image 512px   (content @ 88%)");

// Wordmark for boot splash (stable URL /gastodehoy-logo.png in index.html)
const logoSource = path.join(webDir, "src/assets/gastodehoy-logo.png");
copyFileSync(logoSource, path.join(webDir, "public", "gastodehoy-logo.png"));
console.log("  gastodehoy-logo.png (boot splash)");

console.log("\nDone ✓");

/**
 * PWA / favicon PNGs from the glossy 3D calendar master asset.
 * Edit: web/src/assets/gastodehoy-calendar-icon-source.png
 * Run: npm run icons
 *
 * Generates:
 *   - any icon (512px) — full bleed with subtle margin for non-masking platforms
 *   - maskable icon (512px) — ~25% padding for Android/Chrome adaptive masks
 *   - apple-touch-icon (180px)
 *   - favicons (16, 32, 192px)
 *   - og-image (512px, for Open Graph)
 *
 * All icons preserve alpha transparency so platforms can apply their own
 * background/shape instead of baking a black square.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(webDir, "src/assets/gastodehoy-calendar-icon-source.png");

/**
 * Build a square PNG icon.
 * @param {number} canvasSize - output square dimension in px
 * @param {number} contentFraction - fraction of canvas the content occupies (0–1)
 *   - 0.88 → "any" icon (small margin, looks full-bleed)
 *   - 0.75 → "maskable" icon (safe zone per spec: content inside 80% of canvas)
 * @returns {Promise<Buffer>} PNG buffer with alpha
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

  // Place content centered on a transparent square canvas
  const left = Math.round((canvasSize - contentMeta.width) / 2);
  const top = Math.round((canvasSize - contentMeta.height) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // fully transparent
    },
  })
    .composite([{ input: content, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function writeAsset(name, png) {
  writeFileSync(path.join(webDir, "src/assets", name), png);
  if (name.startsWith("gastodehoy-")) {
    writeFileSync(path.join(webDir, "public", name), png);
  }
}

// ── Main ────────────────────────────────────────────────────────────

const sourceMeta = await sharp(sourcePath).metadata();
console.log(
  `Source: ${path.basename(sourcePath)} (${sourceMeta.width}×${sourceMeta.height})`,
);

// "any" icon — 512px, content at 88% (subtle margin)
const anyIcon = await squareIcon(512, 0.88);
writeAsset("gastodehoy-app-icon.png", anyIcon);
// Also use as large favicon (512px)
writeAsset("gastodehoy-favicon.png", anyIcon);
console.log("  any         → 512px (content @ 88%)");

// "maskable" icon — 512px, content at 75% (safe zone with extra margin)
const maskableIcon = await squareIcon(512, 0.75);
writeAsset("gastodehoy-app-icon-maskable.png", maskableIcon);
console.log("  maskable    → 512px (content @ 75%)");

// apple-touch-icon — 180px, content at 85%
const appleIcon = await squareIcon(180, 0.85);
writeAsset("gastodehoy-apple-touch-180.png", appleIcon);
console.log("  apple-touch → 180px (content @ 85%)");

// favicons — standard sizes
const favicon192 = await squareIcon(192, 0.88);
writeAsset("gastodehoy-favicon-192.png", favicon192);
console.log("  favicon     → 192px (content @ 88%)");

const favicon32 = await squareIcon(32, 0.88);
writeAsset("gastodehoy-favicon-32.png", favicon32);
console.log("  favicon     →  32px (content @ 88%)");

const favicon16 = await squareIcon(16, 0.88);
writeAsset("gastodehoy-favicon-16.png", favicon16);
console.log("  favicon     →  16px (content @ 88%)");

// Open Graph image — 512px with "any" layout
const og = await squareIcon(512, 0.88);
writeFileSync(path.join(webDir, "public", "og-image.png"), og);
console.log("  og-image    → 512px");

console.log("Done — all icons have alpha transparency ✓");

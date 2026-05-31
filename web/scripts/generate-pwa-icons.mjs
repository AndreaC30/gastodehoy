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

// App theme background color (slate-900) — must match manifest background_color / theme_color.
const BG = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a

/** Tolerance when removing the baked-in export background from the calendar PNG. */
const SOURCE_BG_TOLERANCE = 6;

let calendarSourcePrepared = null;

/**
 * Calendar export includes its own dark blue fill (~#091421), not #0f172a.
 * Key it out so only the 3D art is composited — avoids a visible square on Android splash.
 */
async function calendarSourceRgba() {
  if (calendarSourcePrepared) return calendarSourcePrepared;

  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const cornerOffsets = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + (width - 1)) * 4];
  let kr = 0;
  let kg = 0;
  let kb = 0;
  for (const o of cornerOffsets) {
    kr += data[o];
    kg += data[o + 1];
    kb += data[o + 2];
  }
  kr = Math.round(kr / 4);
  kg = Math.round(kg / 4);
  kb = Math.round(kb / 4);

  const tol = SOURCE_BG_TOLERANCE;
  for (let i = 0; i < data.length; i += 4) {
    if (
      Math.abs(data[i] - kr) <= tol &&
      Math.abs(data[i + 1] - kg) <= tol &&
      Math.abs(data[i + 2] - kb) <= tol
    ) {
      data[i + 3] = 0;
    }
  }

  calendarSourcePrepared = { data, width, height };
  return calendarSourcePrepared;
}

/**
 * Build a square PNG icon with the 3D calendar centered on theme-colored background.
 * @param {number} canvasSize - output square dimension in px
 * @param {number} contentFraction - fraction of canvas the content occupies (0–1)
 * @param {{ stripExportBg?: boolean }} opts
 *   - stripExportBg: remove baked-in export fill (Android launcher / splash only).
 *     Favicons keep the full export so 16–32px stay crisp.
 * @returns {Promise<Buffer>} RGBA PNG buffer
 */
async function squareIcon(canvasSize, contentFraction = 0.88, opts = {}) {
  const { stripExportBg = false } = opts;
  const contentSize = Math.round(canvasSize * contentFraction);

  let content;
  if (stripExportBg) {
    const src = await calendarSourceRgba();
    content = await sharp(src.data, {
      raw: { width: src.width, height: src.height, channels: 4 },
    })
      .resize(contentSize, contentSize, {
        fit: "inside",
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();
  } else {
    content = await sharp(sourcePath)
      .resize(contentSize, contentSize, {
        fit: "inside",
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();
  }

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

// Launcher / Android splash — strip export background so it matches #0f172a
const any512 = await squareIcon(512, 0.88, { stripExportBg: true });
writeAsset("gastodehoy-app-icon.png", any512);
console.log("  app-icon 512px   (launcher @ 88%, bg keyed)");

const maskable512 = await squareIcon(512, 0.72, { stripExportBg: true });
writeAsset("gastodehoy-app-icon-maskable.png", maskable512);
console.log("  app-icon maskable 512px");

const maskable192 = await squareIcon(192, 0.72, { stripExportBg: true });
writeAsset("gastodehoy-app-icon-maskable-192.png", maskable192);
console.log("  app-icon maskable 192px");

// Favicons / tabs / apple-touch — full export (unchanged look at 16–32px)
const fav512 = await squareIcon(512, 0.88);
writeAsset("gastodehoy-favicon.png", fav512);
console.log("  favicon 512px");

const any192 = await squareIcon(192, 0.88);
writeAsset("gastodehoy-favicon-192.png", any192);
console.log("  favicon 192px");

const apple180 = await squareIcon(180, 0.85);
writeAsset("gastodehoy-apple-touch-180.png", apple180);
console.log("  apple-touch 180px");

const fav32 = await squareIcon(32, 0.88);
writeAsset("gastodehoy-favicon-32.png", fav32);
console.log("  favicon 32px");

const fav16 = await squareIcon(16, 0.88);
writeAsset("gastodehoy-favicon-16.png", fav16);
console.log("  favicon 16px");

const og512 = await squareIcon(512, 0.88);
writeFileSync(path.join(webDir, "public", "og-image.png"), og512);
console.log("  og-image 512px   (content @ 88%)");

// Wordmark for boot splash (stable URL /gastodehoy-logo.png in index.html)
const logoSource = path.join(webDir, "src/assets/gastodehoy-logo.png");
copyFileSync(logoSource, path.join(webDir, "public", "gastodehoy-logo.png"));
console.log("  gastodehoy-logo.png (boot splash)");

console.log("\nDone ✓");

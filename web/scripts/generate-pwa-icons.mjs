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
 * Two deliberate variants (do not mix):
 *   - Favicons (browser tab): transparent, calendar only.
 *   - PWA / apple-touch (install + home screen): #0f172a fill + calendar (matches app theme).
 *   - og-image: solid #0f172a for social previews.
 */
import { copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(webDir, "src/assets/gastodehoy-calendar-icon-source.png");

// App theme background (slate-900) — manifest background_color / Android splash only.
const BG = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Tolerance when removing the baked-in export background from the calendar PNG. */
const SOURCE_BG_TOLERANCE = 6;

/** How much of the canvas the calendar fills (higher = larger icon). */
const FAVICON_FILL = 0.97;
/** Maskable safe zone (Android adaptive icon spec). */
const MASKABLE_FILL = 0.72;

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
 * @param {{ stripExportBg?: boolean; transparentBg?: boolean }} opts
 * @returns {Promise<Buffer>} RGBA PNG buffer
 */
async function squareIcon(canvasSize, contentFraction = 0.88, opts = {}) {
  const { stripExportBg = false, transparentBg = false } = opts;
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

  const left = Math.round((canvasSize - contentMeta.width) / 2);
  const top = Math.round((canvasSize - contentMeta.height) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: transparentBg ? TRANSPARENT : BG,
    },
  })
    .composite([{ input: content, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Browser tab favicon: calendar only, transparent (OS paints the bar). */
async function faviconIcon(canvasSize, contentFraction = FAVICON_FILL) {
  const src = await calendarSourceRgba();
  const maxArt = Math.round(canvasSize * contentFraction);

  const art = await sharp(src.data, {
    raw: { width: src.width, height: src.height, channels: 4 },
  })
    .trim()
    .resize(maxArt, maxArt, {
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  const meta = await sharp(art).metadata();
  const left = Math.round((canvasSize - (meta.width ?? maxArt)) / 2);
  const top = Math.round((canvasSize - (meta.height ?? maxArt)) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: art, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** PWA install / iOS home screen: calendar on #0f172a (never transparent — avoids white tiles). */
async function pwaLauncherIcon(canvasSize, contentFraction = FAVICON_FILL) {
  const src = await calendarSourceRgba();
  const maxArt = Math.round(canvasSize * contentFraction);

  const art = await sharp(src.data, {
    raw: { width: src.width, height: src.height, channels: 4 },
  })
    .trim()
    .resize(maxArt, maxArt, {
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  const meta = await sharp(art).metadata();
  const left = Math.round((canvasSize - (meta.width ?? maxArt)) / 2);
  const top = Math.round((canvasSize - (meta.height ?? maxArt)) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: art, left, top }])
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

// PWA install (Android manifest / WebAPK, iOS apple-touch) — opaque #0f172a
const pwa512 = await pwaLauncherIcon(512);
writeAsset("gastodehoy-app-icon.png", pwa512);
console.log("  app-icon 512px   (#0f172a, PWA install)");

const maskable512 = await pwaLauncherIcon(512, MASKABLE_FILL);
writeAsset("gastodehoy-app-icon-maskable.png", maskable512);
console.log("  app-icon maskable 512px");

const maskable192 = await pwaLauncherIcon(192, MASKABLE_FILL);
writeAsset("gastodehoy-app-icon-maskable-192.png", maskable192);
console.log("  app-icon maskable 192px");

const apple180 = await pwaLauncherIcon(180, FAVICON_FILL);
writeAsset("gastodehoy-apple-touch-180.png", apple180);
console.log("  apple-touch 180px (#0f172a, iOS home screen)");

// Browser tabs / bookmarks only — transparent
const fav512 = await faviconIcon(512);
writeAsset("gastodehoy-favicon.png", fav512);
console.log("  favicon 512px    (transparent, tabs)");

const any192 = await faviconIcon(192);
writeAsset("gastodehoy-favicon-192.png", any192);
console.log("  favicon 192px    (transparent, tabs + push)");

const fav32 = await faviconIcon(32);
writeAsset("gastodehoy-favicon-32.png", fav32);
console.log("  favicon 32px     (transparent)");

const fav16 = await faviconIcon(16);
writeAsset("gastodehoy-favicon-16.png", fav16);
console.log("  favicon 16px     (transparent)");

const og512 = await squareIcon(512, 0.88);
writeFileSync(path.join(webDir, "public", "og-image.png"), og512);
console.log("  og-image 512px   (content @ 88%)");

// Wordmark for boot splash (stable URL /gastodehoy-logo.png in index.html)
const logoSource = path.join(webDir, "src/assets/gastodehoy-logo.png");
copyFileSync(logoSource, path.join(webDir, "public", "gastodehoy-logo.png"));
console.log("  gastodehoy-logo.png (boot splash)");

console.log("\nDone ✓");

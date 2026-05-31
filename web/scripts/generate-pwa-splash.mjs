/**
 * PWA launch screens: iOS apple-touch-startup-image + Android manifest splash icon.
 * Matches the in-app boot splash (dark bg + wordmark + tagline).
 *
 * Run: node scripts/generate-pwa-splash.mjs (also via npm run icons)
 */
import { copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = path.join(webDir, "src/assets/gastodehoy-logo.png");
const publicDir = path.join(webDir, "public");

const BG = { r: 15, g: 23, b: 42, alpha: 1 };
const TAGLINE = "Cada euro que controlas es un paso hacia tu libertad";
const TAGLINE_COLOR = "#94a3b8";

function writePublic(name, buffer) {
  writeFileSync(path.join(publicDir, name), buffer);
  console.log(`  ${name}`);
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTagline(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function taglineSvg(width, taglineLines, fontSize) {
  const lineHeight = Math.round(fontSize * 1.35);
  const taglineH = taglineLines.length * lineHeight + 4;
  return {
    buffer: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${taglineH}">
        ${taglineLines
          .map(
            (line, i) =>
              `<text x="50%" y="${lineHeight * (i + 1)}" text-anchor="middle" fill="${TAGLINE_COLOR}" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="500">${escapeXml(line)}</text>`,
          )
          .join("")}
      </svg>`,
    ),
    height: taglineH,
  };
}

/** Full-screen portrait splash (iOS startup). */
async function portraitLaunch(width, height) {
  const logoMaxW = Math.round(width * 0.72);
  const logoBuf = await sharp(logoPath)
    .resize({ width: logoMaxW, withoutEnlargement: true })
    .toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoW = logoMeta.width ?? logoMaxW;
  const logoH = logoMeta.height ?? Math.round(logoMaxW * 0.23);

  const fontSize = Math.max(14, Math.round(width * 0.036));
  const taglineLines = wrapTagline(TAGLINE, 28);
  const { buffer: taglineBuf, height: taglineH } = taglineSvg(
    width,
    taglineLines,
    fontSize,
  );

  const gap = Math.round(height * 0.035);
  const blockH = logoH + gap + taglineH;
  const top = Math.round((height - blockH) / 2);

  return sharp({
    create: { width, height, channels: 4, background: BG },
  })
    .composite([
      {
        input: logoBuf,
        left: Math.round((width - logoW) / 2),
        top,
      },
      {
        input: taglineBuf,
        left: 0,
        top: top + logoH + gap,
      },
    ])
    .png()
    .toBuffer();
}

/**
 * Square splash for Android cold start (logo + tagline in one image).
 * Android 12+ centers this on background_color — matches the HTML boot splash.
 */
async function squareLaunch(size) {
  const pad = Math.round(size * 0.08);
  const innerW = size - pad * 2;

  const logoMaxW = Math.round(innerW * 0.92);
  const logoBuf = await sharp(logoPath)
    .resize({ width: logoMaxW, withoutEnlargement: true })
    .toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoW = logoMeta.width ?? logoMaxW;
  const logoH = logoMeta.height ?? Math.round(logoMaxW * 0.23);

  const fontSize = Math.max(9, Math.round(size * 0.028));
  const taglineLines = wrapTagline(TAGLINE, size >= 256 ? 32 : 22);
  const { buffer: taglineBuf, height: taglineH } = taglineSvg(
    innerW,
    taglineLines,
    fontSize,
  );

  const gap = Math.round(size * 0.04);
  const blockH = logoH + gap + taglineH;
  const top = Math.round((size - blockH) / 2);

  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([
      {
        input: logoBuf,
        left: pad + Math.round((innerW - logoW) / 2),
        top,
      },
      {
        input: taglineBuf,
        left: pad,
        top: top + logoH + gap,
      },
    ])
    .png()
    .toBuffer();
}

/** Maskable icon with wordmark (Android launcher + splash use maskable on many devices). */
async function maskableLaunch(size) {
  const contentFraction = 0.72;
  const contentSize = Math.round(size * contentFraction);
  const logoBuf = await sharp(logoPath)
    .resize({ width: contentSize, withoutEnlargement: true })
    .toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoW = logoMeta.width ?? contentSize;
  const logoH = logoMeta.height ?? contentSize;

  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([
      {
        input: logoBuf,
        left: Math.round((size - logoW) / 2),
        top: Math.round((size - logoH) / 2),
      },
    ])
    .png()
    .toBuffer();
}

console.log("Generating PWA launch screens…");

const iosSizes = [
  ["pwa-launch-1290x2796.png", 1290, 2796],
  ["pwa-launch-1179x2556.png", 1179, 2556],
  ["pwa-launch-1170x2532.png", 1170, 2532],
  ["pwa-launch-1125x2436.png", 1125, 2436],
  ["pwa-launch-828x1792.png", 828, 1792],
];

for (const [name, w, h] of iosSizes) {
  writePublic(name, await portraitLaunch(w, h));
}

writePublic("pwa-launch-512.png", await squareLaunch(512));
writePublic("pwa-launch-192.png", await squareLaunch(192));
writePublic("pwa-launch-maskable-512.png", await maskableLaunch(512));
writePublic("pwa-launch-maskable-192.png", await maskableLaunch(192));

// Android WebAPK embeds these at install for the OS splash (before HTML loads).
// Must match pwa-launch, NOT the calendar asset from generate-pwa-icons.mjs.
copyFileSync(
  path.join(publicDir, "pwa-launch-512.png"),
  path.join(publicDir, "gastodehoy-app-icon.png"),
);
copyFileSync(
  path.join(publicDir, "pwa-launch-maskable-512.png"),
  path.join(publicDir, "gastodehoy-app-icon-maskable.png"),
);
copyFileSync(
  path.join(publicDir, "pwa-launch-maskable-192.png"),
  path.join(publicDir, "gastodehoy-app-icon-maskable-192.png"),
);
console.log("  gastodehoy-app-icon*.png ← synced from pwa-launch (Android OS splash)");

console.log("Done ✓");

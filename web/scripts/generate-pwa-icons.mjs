/**
 * PWA / favicon PNGs from the glossy 3D calendar master asset.
 * Edit: web/src/assets/gastodehoy-calendar-icon-source.png
 * Run: npm run icons
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(webDir, "src/assets/gastodehoy-calendar-icon-source.png");

async function squareIcon(size) {
  const meta = await sharp(sourcePath).metadata();
  const dim = Math.max(meta.width, meta.height);
  // Pad to square first so the icon fills the entire square without bars
  const squared = await sharp(sourcePath)
    .extend({
      top: Math.floor((dim - meta.height) / 2),
      bottom: Math.ceil((dim - meta.height) / 2),
      left: Math.floor((dim - meta.width) / 2),
      right: Math.ceil((dim - meta.width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .toBuffer();
  return sharp(squared)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

function writeAsset(name, png) {
  writeFileSync(path.join(webDir, "src/assets", name), png);
  if (name.startsWith("gastodehoy-")) {
    writeFileSync(path.join(webDir, "public", name), png);
  }
}

const sizes = [
  { size: 512, assets: ["gastodehoy-app-icon.png", "gastodehoy-favicon.png"] },
  { size: 192, assets: ["gastodehoy-favicon-192.png"] },
  { size: 180, assets: ["gastodehoy-apple-touch-180.png"] },
  { size: 32, assets: ["gastodehoy-favicon-32.png"] },
  { size: 16, assets: ["gastodehoy-favicon-16.png"] },
];

for (const { size, assets } of sizes) {
  const png = await squareIcon(size);
  for (const name of assets) {
    writeAsset(name, png);
  }
}

const maskable = await squareIcon(512);
writeAsset("gastodehoy-app-icon-maskable.png", maskable);

const og = await squareIcon(512);
writeFileSync(path.join(webDir, "public", "og-image.png"), og);

const meta = await sharp(sourcePath).metadata();
console.log(
  `PWA icons OK desde ${path.basename(sourcePath)} (${meta.width}x${meta.height}) →`,
  sizes.map((s) => `${s.size}px`).join(", "),
  "+ maskable + og-image",
);

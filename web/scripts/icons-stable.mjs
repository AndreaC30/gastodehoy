/**
 * Ejecuta los generadores de PNG (splash e iconos PWA) sin ensuciar git.
 *
 * sharp/libvips no garantiza los mismos bytes entre versiones (compresión,
 * metadatos) aunque los píxeles sean idénticos. Para cada PNG de web/public
 * y web/src/assets se guarda el original, se regenera y, si la imagen
 * decodificada (ancho, alto, canales y píxeles) es igual, se restituyen los
 * bytes originales. Si cambió el origen, el PNG nuevo se conserva.
 *
 * No modifica los generadores: los invoca tal cual.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dirs = [path.join(webDir, "public"), path.join(webDir, "src/assets")];

function listPngs() {
  return dirs.flatMap((dir) =>
    readdirSync(dir)
      .filter((n) => n.endsWith(".png"))
      .map((n) => path.join(dir, n)),
  );
}

const before = new Map(listPngs().map((f) => [f, readFileSync(f)]));

for (const script of ["generate-pwa-splash.mjs", "generate-pwa-icons.mjs"]) {
  const r = spawnSync(process.execPath, [path.join(webDir, "scripts", script)], {
    cwd: webDir,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function pixels(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

let restored = 0;
let changed = 0;
for (const file of listPngs()) {
  const old = before.get(file);
  const now = readFileSync(file);
  if (!old) {
    changed++;
    continue;
  }
  if (old.equals(now)) continue;
  const [a, b] = await Promise.all([pixels(old), pixels(now)]);
  if (
    a.info.width === b.info.width &&
    a.info.height === b.info.height &&
    a.info.channels === b.info.channels &&
    a.data.equals(b.data)
  ) {
    writeFileSync(file, old);
    restored++;
  } else {
    changed++;
  }
}
console.log(
  `icons-stable: ${restored} PNG con bytes distintos y mismos píxeles restituidos; ${changed} con contenido nuevo.`,
);

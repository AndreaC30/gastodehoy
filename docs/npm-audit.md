# npm audit (`web/`)

`npm audit fix` se aplicó sin `--force`. `package.json` no cambió de major; el lock solo movió parches y minors dentro del rango ya permitido. Después de eso, `npm audit` sigue reportando **7 hallazgos (2 low, 4 moderate, 1 high)**. No se usó `--force`.

Lo que queda no tiene un arreglo dentro del rango actual. El motivo de dejarlo está en cada entrada. No se afirma que el hallazgo sea inofensivo.

## deepmerge 4.3.1 — low

- Advisory: [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). `mergeObject()` no valida las claves que escribe y permite envenenar el prototipo del objeto devuelto (rango `>=4.2.0 <=4.3.1`).
- Cadena: `vite-plugin-pwa@1.3.0` → `workbox-build@7.4.1` → `@rollup/plugin-node-resolve@16.0.3` → `deepmerge`. DevDependency.
- Por qué se deja: el único arreglo que ofrece `npm audit` es `npm audit fix --force`, que instalaría `vite-plugin-pwa@1.1.0` y npm lo marca `isSemVerMajor` (baja desde 1.3.0).

`@rollup/plugin-node-resolve` sale también como low, sin advisory propio: depende de este `deepmerge`.

## glob 11.1.0 — moderate

- Advisory: [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4). Un walk abortado con `AbortSignal` puede seguir leyendo directorios después del timeout. npm marca el rango `9.0.0–14.0.1`; el texto del advisory reproduce el fallo en glob 13.0.6. La versión instalada, 11.1.0, está dentro del rango que npm sigue reportando.
- Cadena: `workbox-build@7.4.1`. DevDependency. El paquete además depende de `minimatch` vulnerable.
- Por qué se deja: el arreglo que ofrece npm es el mismo `--force` a `vite-plugin-pwa@1.1.0` (`isSemVerMajor`).

`workbox-build` y `vite-plugin-pwa` salen como moderate sin advisory propio: arrastran `glob` y `@rollup/plugin-node-resolve`.

## minimatch 10.2.6 — moderate

- Advisory: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). `firstPhasePreProcess()` puede amplificar `globParts` con un patrón controlado y degradar a denegación de servicio. El texto nombra 10.2.6; el rango npm es `>=7.0.0 <11.0.1`.
- El `npm audit fix` sin `--force` pasó 10.2.5 → 10.2.6. Esa versión sigue dentro del advisory.
- Por qué se deja: npm no ofrece un `minimatch` corregido dentro del rango. El arreglo que propone es otra vez `vite-plugin-pwa@1.1.0` con `--force`.

## sharp 0.34.5 — high

DevDependency directa (`"sharp": "^0.34.2"`, que no admite 0.35.x). La usa la generación de iconos PWA en el build. npm agrupa estos tres advisories como un solo hallazgo high:

- [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj). libvips heredado (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591). Afecta a quien procesa entrada no confiable con sharp `<0.35.0`.
- [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). libheif heredado (GHSA-g89c-p67h-r497 y GHSA-2jg2-4ch7-h545). Puede llevar a ejecución de código en Linux/glibc bajo ciertas condiciones al procesar entrada no confiable con sharp `<0.35.4`.
- [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w). librsvg heredado (CVE-2026-96889). Fallo de memoria que, en condiciones concretas, puede llevar a ejecución de código en Linux/glibc con sharp `<0.35.5`.

Por qué se deja: el arreglo es `sharp@0.35.5`. npm lo marca `isSemVerMajor` y hace falta `npm audit fix --force`. Queda fuera de `^0.34.2`.

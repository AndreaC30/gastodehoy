/** Logo URL at site root (from `web/public`, copied at build). */
export const BOOT_SPLASH_LOGO_SRC = "/gastodehoy-logo.png";

/** Remove the static HTML splash once React has mounted its own. */
export function removeHtmlBootSplash(): void {
  document.getElementById("boot-splash")?.remove();
}

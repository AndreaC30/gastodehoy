/**
 * Aviso tras una actualización automática de la PWA: el service worker nuevo
 * recarga la página sin botón, así que la recarga deja una marca y la pantalla
 * principal la lee una vez para decir que se actualizó.
 */
const KEY = "gdh-app-updated";

export function markAppUpdated(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* sin almacenamiento: simplemente no habrá aviso */
  }
}

/** true una sola vez tras una recarga por actualización. */
export function consumeAppUpdated(): boolean {
  try {
    if (localStorage.getItem(KEY) !== "1") return false;
    localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

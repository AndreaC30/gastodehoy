/** Parámetro con el que /reset-password devuelve al login tras cambiar la contraseña. */
export const PASSWORD_RESET_DONE_PARAM = "contrasena-actualizada";

/** Lee el parámetro y lo quita de la dirección para que F5 no repita el aviso. */
export function consumePasswordResetDone(): boolean {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PASSWORD_RESET_DONE_PARAM)) return false;
    url.searchParams.delete(PASSWORD_RESET_DONE_PARAM);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    return true;
  } catch {
    return false;
  }
}

/**
 * Map known backend Spanish error messages to i18n translation keys.
 * New backend errors should be added here so they get translated.
 */
export const BACKEND_ERROR_MAP: Record<string, string> = {
  "Email o contraseña incorrectos": "errors.emailOrPasswordIncorrect",
  "Demasiados intentos. Espera unos minutos.": "errors.tooManyAttempts",
  "El formato del email no es válido": "errors.invalidEmailFormat",
  "El dominio del email no es válido": "errors.invalidEmailDomain",
  "Ya existe una cuenta con ese email": "errors.accountAlreadyExists",
  "Contraseña actual incorrecta": "errors.currentPasswordIncorrect",
  "Contraseña incorrecta": "errors.passwordIncorrect",
  "Debes aceptar las condiciones vigentes y confirmar que tienes al menos 14 años":
    "errors.termsNotAccepted",
  "La contraseña es demasiado larga para guardarla de forma segura":
    "errors.passwordTooLong",
  "El enlace no es válido o ha caducado.": "errors.resetLinkInvalid",
};

/**
 * Translate a backend error message if it matches a known Spanish string.
 * Falls back to the original message.
 */
export function translateBackendError(
  message: string,
  t: (key: string) => string,
): string {
  const plain = message.replace(/^HTTP \d+:\s*/, "");
  const key = BACKEND_ERROR_MAP[plain] ?? BACKEND_ERROR_MAP[message];
  return key ? t(key) : message;
}

/**
 * Map known backend Spanish error messages to i18n translation keys.
 * New backend errors should be added here so they get translated.
 */
export const BACKEND_ERROR_MAP: Record<string, string> = {
  "Email o contraseña incorrectos": "errors.emailOrPasswordIncorrect",
  "El formato del email no es válido": "errors.invalidEmailFormat",
  "El dominio del email no es válido": "errors.invalidEmailDomain",
  "Ya existe una cuenta con ese email": "errors.accountAlreadyExists",
  "Contraseña actual incorrecta": "errors.currentPasswordIncorrect",
  "Contraseña incorrecta": "errors.passwordIncorrect",
};

/**
 * Translate a backend error message if it matches a known Spanish string.
 * Falls back to the original message.
 */
export function translateBackendError(
  message: string,
  t: (key: string) => string,
): string {
  return BACKEND_ERROR_MAP[message] ? t(BACKEND_ERROR_MAP[message]) : message;
}

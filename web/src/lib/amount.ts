/**
 * Importes escritos por la persona: aceptan coma o punto como separador
 * decimal. El backend (`Decimal` en `schemas.py`) solo entiende el punto,
 * así que se normaliza antes de enviar.
 */

/** Hasta 2 decimales, con coma o punto. Para el atributo `pattern`. */
export const AMOUNT_PATTERN = "\\d{1,12}([.,]\\d{1,2})?";

/** Igual que AMOUNT_PATTERN pero exige un importe mayor que cero. */
export const POSITIVE_AMOUNT_PATTERN = "(?=.*[1-9])\\d{1,12}([.,]\\d{1,2})?";

/** "12,5" → "12.5"; recorta espacios. */
export function normalizeAmount(raw: string): string {
  return raw.trim().replace(",", ".");
}

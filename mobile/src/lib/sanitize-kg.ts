/**
 * Cleans text typed into a whole-kilogram field: digits only, and any fractional part is dropped.
 *
 * - "12.5" becomes "12" (the decimal part is removed, not merged into the number)
 * - a pasted "1,000" becomes "1000"
 * - leading zeros are removed, but a lone "0" is kept so the caller can flag or restore it
 *
 * An exact fractional amount can still be set by code (e.g. "all that is left" when the remainder
 * is 200.5 kg); editing such a value drops its fraction.
 */
export function sanitizeKg(text: string): string {
  return text.replace(/,/g, '').split('.')[0].replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

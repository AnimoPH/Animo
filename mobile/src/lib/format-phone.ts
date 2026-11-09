/**
 * Display-only formatting for Philippine mobile numbers.
 * Accepts 639XXXXXXXXX, +639XXXXXXXXX, 09XXXXXXXXX or 9XXXXXXXXX and returns "+63 9XX XXX XXXX".
 * Anything that is not a recognizable PH mobile number is returned unchanged, so nothing is ever hidden.
 * The stored value is never modified.
 */
export function formatPhilippinePhone(raw: string | null | undefined): string {
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');

  let national: string | null = null;
  if (digits.length === 12 && digits.startsWith('63')) national = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('09')) national = digits.slice(1);
  else if (digits.length === 10 && digits.startsWith('9')) national = digits;

  if (!national || national.length !== 10) return raw;
  return `+63 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

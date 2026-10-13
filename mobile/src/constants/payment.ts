/**
 * Digits in a GCash reference number. The database has its own copy in
 * public.gcash_ref_length() (migration 0039). Change both together.
 */
export const GCASH_REF_LENGTH = 13;

const GCASH_REF_PATTERN = new RegExp(`^[0-9]{${GCASH_REF_LENGTH}}$`);

/** Digits only, exactly GCASH_REF_LENGTH long. Same rule as the database trigger. */
export function isValidGcashReference(value: string): boolean {
  return GCASH_REF_PATTERN.test(value);
}

/** Inline error and wrong-format message on the payment screen. */
export const GCASH_REF_FORMAT_MESSAGE = `Ilagay ang ${GCASH_REF_LENGTH} digit na reference number mula sa resibo ng GCash.`;

/**
 * Crop listing domain types — maps the ANIMO Data Dictionary §5 CROPLISTING
 * table (supabase/migrations/0001_full_data_dictionary_schema.sql) to the
 * shapes the Farmer Crop Listings screens use.
 *
 * `pricePerKg` (DB: computed_price_per_kg) is locked server-side by the
 * `croplisting_lock_price` trigger at insert time from MARKETPRICEFEED +
 * VARIETYPRICEPREMIUM — the client never computes or sends it.
 *
 * There is no listing-verification/AI-grading state in this schema (the
 * Aug 2026 data dictionary revision dropped FraudDetectionRecord) — `status`
 * only ever moves Draft → Available → Sold_Out, or → Cancelled.
 */

export type DeclaredVariety =
  | 'Inbred'
  | 'Hybrid'
  | 'Traditional_or_Heirloom'
  | 'Mix_of_Varieties'
  | 'Others';

export type MoistureType = 'Dry' | 'Wet';

export type PurityGrade = 'A' | 'B' | 'C' | 'Ungraded';

export type ListingStatus = 'Draft' | 'Available' | 'Sold_Out' | 'Cancelled';

/** Options for the "Gumawa ng Listing" form — `value` is exactly what's sent to the DB. */
export const VARIETY_OPTIONS: { value: DeclaredVariety; label: string }[] = [
  { value: 'Inbred', label: 'Inbred' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Traditional_or_Heirloom', label: 'Tradisyonal o Pamana' },
  { value: 'Mix_of_Varieties', label: 'Halo-halong Uri' },
  { value: 'Others', label: 'Iba pa' },
];

export const PURITY_OPTIONS: { value: PurityGrade; label: string }[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'Ungraded', label: 'Walang Grado' },
];

export const MOISTURE_OPTIONS: { value: MoistureType; label: string }[] = [
  { value: 'Dry', label: 'Tuyo (Dry)' },
  { value: 'Wet', label: 'Basa (Wet)' },
];

/** Payload for `createCropListing` — exactly what the "Gumawa ng Listing" form collects. */
export type CreateCropListingInput = {
  declaredVariety: DeclaredVariety;
  /** Required (and only sent) when declaredVariety === 'Others'. */
  customVariety?: string;
  declaredMoisture: MoistureType;
  declaredPurityGrade: PurityGrade;
  grossWeightKg: number;
  tareWeightKg: number;
};

/** A farmer's own crop listing, as shown in Palengke / Listing Detail. */
export type CropListing = {
  id: string;
  dateListed: string;
  declaredVariety: DeclaredVariety;
  declaredVarietyCustom: string | null;
  declaredMoisture: MoistureType;
  declaredPurityGrade: PurityGrade;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  remainingQuantityKg: number;
  /** Smallest quantity a buyer may request off this listing (DB default 50 kg). */
  minimumRequestKg: number;
  /** Null only if the pricing trigger had no MARKETPRICEFEED row to read (see migration 0007). */
  pricePerKg: number | null;
  status: ListingStatus;
};

/** Display label for `declaredVariety`, resolving the free-text custom name when set. */
export function varietyLabel(
  listing: Pick<CropListing, 'declaredVariety' | 'declaredVarietyCustom'>,
): string {
  if (listing.declaredVariety === 'Others') {
    return listing.declaredVarietyCustom?.trim() || 'Ibang Uri';
  }
  return VARIETY_OPTIONS.find((o) => o.value === listing.declaredVariety)?.label ?? listing.declaredVariety;
}

export function purityLabel(grade: PurityGrade): string {
  return grade === 'Ungraded' ? 'Walang Grado' : `Grade ${grade}`;
}

export function moistureLabel(moisture: MoistureType): string {
  return MOISTURE_OPTIONS.find((o) => o.value === moisture)?.label ?? moisture;
}

/** Tagalog label per real DB status — no "Rejected"/"Hinihintay ang Pag-verify" state exists (see file header). */
export const STATUS_LABELS: Record<ListingStatus, string> = {
  Draft: 'Draft',
  Available: 'Available',
  Sold_Out: 'Naubos',
  Cancelled: 'Tinanggal',
};

/**
 * §6 LISTINGPHOTO's `photo_type` — one of 3 slots per listing (unique per
 * listing_id + photo_type; see migration 0001 and the storage bucket added in
 * 0008). `Overview` is preferred as the cover photo shown in list cards.
 */
export type PhotoType = 'BeforeHarvest' | 'AfterHarvestUnsacked' | 'Overview';

/** Capture slots for the "Gumawa ng Listing" form, in the order shown. */
export const PHOTO_SLOTS: { value: PhotoType; label: string }[] = [
  { value: 'Overview', label: 'Pangkalahatang Larawan (Overview)' },
  { value: 'AfterHarvestUnsacked', label: 'Pagkatapos Anihin (Hindi pa Nakasako)' },
  { value: 'BeforeHarvest', label: 'Bago Anihin (Taniman)' },
];

/** Preference order for picking a single cover photo out of whichever slots are filled. */
export const COVER_PHOTO_PREFERENCE: PhotoType[] = ['Overview', 'AfterHarvestUnsacked', 'BeforeHarvest'];

/** A listing's photo, resolved to a short-lived signed URL (the storage bucket is private). */
export type ListingPhoto = {
  photoType: PhotoType;
  url: string;
};

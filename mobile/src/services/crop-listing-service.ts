import { supabase } from '@/lib/supabase';
import {
  COVER_PHOTO_PREFERENCE,
  type CreateCropListingInput,
  type CropListing,
  type DeclaredVariety,
  type ListingPhoto,
  type ListingStatus,
  type MoistureType,
  type PhotoType,
  type PurityGrade,
} from '@/types/crop-listing';

/**
 * Crop listing service — the only file that talks to `croplisting` directly.
 *
 * Unlike auth/registration, this doesn't go through an Edge Function: the
 * "Farmers manage own listings" RLS policy (migration 0001) already enforces
 * `auth.uid() = farmer_id` on every insert/select/update/delete, so a direct
 * client insert is exactly as safe as one routed through a service-role
 * function — Postgres rejects any farmer_id that doesn't match the caller
 * regardless of what the client sends.
 */

/**
 * Exported (along with LISTING_COLUMNS/mapListing/requireAuthUserId) so the
 * buyer read path in `marketplace-service.ts` reads the same columns through
 * the same mapper — two mappers over one table drift apart.
 */
export type CropListingRow = {
  listing_id: string;
  date_listed: string;
  declared_variety: DeclaredVariety;
  declared_variety_custom: string | null;
  declared_moisture: MoistureType;
  declared_purity_grade: PurityGrade;
  gross_weight_kg: number;
  tare_weight_kg: number;
  net_weight_kg: number;
  remaining_quantity_kg: number;
  minimum_request_kg: number;
  computed_price_per_kg: number | null;
  status: ListingStatus;
};

export const LISTING_COLUMNS =
  'listing_id, date_listed, declared_variety, declared_variety_custom, declared_moisture, declared_purity_grade, gross_weight_kg, tare_weight_kg, net_weight_kg, remaining_quantity_kg, minimum_request_kg, computed_price_per_kg, status' as const;

export function mapListing(row: CropListingRow): CropListing {
  return {
    id: row.listing_id,
    dateListed: row.date_listed,
    declaredVariety: row.declared_variety,
    declaredVarietyCustom: row.declared_variety_custom,
    declaredMoisture: row.declared_moisture,
    declaredPurityGrade: row.declared_purity_grade,
    grossWeightKg: Number(row.gross_weight_kg),
    tareWeightKg: Number(row.tare_weight_kg),
    netWeightKg: Number(row.net_weight_kg),
    remainingQuantityKg: Number(row.remaining_quantity_kg),
    minimumRequestKg: Number(row.minimum_request_kg),
    pricePerKg: row.computed_price_per_kg === null ? null : Number(row.computed_price_per_kg),
    status: row.status,
  };
}

export async function requireAuthUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) throw new Error('Kailangan mag-login muli.');
  return authUser.id;
}

/** Fetch the signed-in farmer's own listings, most recent first. RLS restricts this to their rows regardless. */
export async function fetchMyCropListings(): Promise<CropListing[]> {
  const farmerId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('croplisting')
    .select(LISTING_COLUMNS)
    .eq('farmer_id', farmerId)
    .order('date_listed', { ascending: false });

  if (error) throw error;
  return (data as CropListingRow[]).map(mapListing);
}

/**
 * Batched lookup of several listings by id, keyed by listing_id. Used to
 * enrich purchase-request/transaction rows (which only store `listing_id`)
 * with display fields like variety and price without one query per row.
 */
export async function fetchCropListingsByIds(ids: string[]): Promise<Map<string, CropListing>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('croplisting')
    .select(LISTING_COLUMNS)
    .in('listing_id', uniqueIds);

  if (error) throw error;
  const listingById = new Map<string, CropListing>();
  (data as CropListingRow[]).forEach((row) => listingById.set(row.listing_id, mapListing(row)));
  return listingById;
}

/** Fetch one listing by id — RLS lets the owning farmer read it regardless of status (Draft included). */
export async function fetchCropListing(id: string): Promise<CropListing | null> {
  const { data, error } = await supabase
    .from('croplisting')
    .select(LISTING_COLUMNS)
    .eq('listing_id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapListing(data as CropListingRow) : null;
}

/**
 * Creates a new listing for the signed-in farmer. `computed_price_per_kg` is
 * deliberately omitted so the `croplisting_lock_price` trigger fills it in;
 * `status` is set straight to 'Available' since this app has no
 * listing-verification queue (see the Aug 2026 data dictionary revision —
 * FraudDetectionRecord was dropped, and there is no 'Rejected' status).
 */
export async function createCropListing(input: CreateCropListingInput): Promise<CropListing> {
  const farmerId = await requireAuthUserId();

  const netWeightKg = input.grossWeightKg - input.tareWeightKg;
  if (!(netWeightKg > 0)) {
    throw new Error('Dapat mas malaki ang gross weight kaysa sa tare weight.');
  }
  const customVariety = input.customVariety?.trim() || null;
  if (input.declaredVariety === 'Others' && !customVariety) {
    throw new Error('Ilagay ang pangalan ng uri ng palay.');
  }

  const { data, error } = await supabase
    .from('croplisting')
    .insert({
      farmer_id: farmerId,
      declared_variety: input.declaredVariety,
      declared_variety_custom: input.declaredVariety === 'Others' ? customVariety : null,
      declared_moisture: input.declaredMoisture,
      declared_purity_grade: input.declaredPurityGrade,
      gross_weight_kg: input.grossWeightKg,
      tare_weight_kg: input.tareWeightKg,
      remaining_quantity_kg: netWeightKg,
      status: 'Available',
    })
    .select(LISTING_COLUMNS)
    .single();

  if (error) throw error;
  return mapListing(data as CropListingRow);
}

/**
 * §6 LISTINGPHOTO storage (migration 0008). The bucket is PRIVATE — reads go
 * through short-lived signed URLs so listingphoto's own Draft/non-Draft RLS
 * split (0001) is actually honored, unlike a public bucket which would bypass
 * RLS entirely.
 */
const PHOTO_BUCKET = 'listing-photos';
const SIGNED_URL_TTL_SECONDS = 3600;

function photoStoragePath(listingId: string, photoType: PhotoType): string {
  return `${listingId}/${photoType}.jpg`;
}

type ListingPhotoRow = { listing_id: string; photo_type: PhotoType; storage_uri: string };

/**
 * Uploads a (already resized/JPEG-encoded — see creation-listing.tsx) local
 * photo for one of a listing's 3 slots. Both the storage object and the
 * `listingphoto` row are upserted: `listingphoto.(listing_id, photo_type)` is
 * unique, so retaking a slot must replace, not insert-and-conflict.
 */
export async function uploadListingPhoto(
  listingId: string,
  photoType: PhotoType,
  localUri: string,
): Promise<void> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const path = photoStoragePath(listingId, photoType);

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase
    .from('listingphoto')
    .upsert(
      { listing_id: listingId, photo_type: photoType, storage_uri: path },
      { onConflict: 'listing_id,photo_type' },
    );
  if (rowError) throw rowError;
}

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const urlByPath = new Map<string, string>();
  if (paths.length === 0) return urlByPath;

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;

  data.forEach((signed) => {
    if (signed.signedUrl && signed.path) urlByPath.set(signed.path, signed.signedUrl);
  });
  return urlByPath;
}

/** All photos attached to one listing (for the detail screen), as signed URLs. */
export async function fetchListingPhotos(listingId: string): Promise<ListingPhoto[]> {
  const { data, error } = await supabase
    .from('listingphoto')
    .select('listing_id, photo_type, storage_uri')
    .eq('listing_id', listingId);
  if (error) throw error;

  const rows = (data ?? []) as ListingPhotoRow[];
  const urlByPath = await signPaths(rows.map((row) => row.storage_uri));

  return rows
    .map((row) => ({ photoType: row.photo_type, url: urlByPath.get(row.storage_uri) ?? '' }))
    .filter((photo) => photo.url.length > 0);
}

/**
 * One cover photo per listing (for the Palengke card list), preferring
 * Overview > BeforeHarvest > AfterHarvestUnsacked. Batches a single query +
 * a single signed-URL request instead of one per listing (N+1), since
 * palengke.tsx already refetches on every tab focus.
 */
export async function fetchCoverPhotos(listingIds: string[]): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('listingphoto')
    .select('listing_id, photo_type, storage_uri')
    .in('listing_id', listingIds);
  if (error) throw error;

  const rows = (data ?? []) as ListingPhotoRow[];
  const bestPathByListing = new Map<string, string>();
  for (const preferredType of COVER_PHOTO_PREFERENCE) {
    for (const row of rows) {
      if (row.photo_type === preferredType && !bestPathByListing.has(row.listing_id)) {
        bestPathByListing.set(row.listing_id, row.storage_uri);
      }
    }
  }

  const urlByPath = await signPaths([...bestPathByListing.values()]);
  const urlByListing = new Map<string, string>();
  bestPathByListing.forEach((path, listingId) => {
    const url = urlByPath.get(path);
    if (url) urlByListing.set(listingId, url);
  });
  return urlByListing;
}

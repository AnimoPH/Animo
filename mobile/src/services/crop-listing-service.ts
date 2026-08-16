import { supabase } from '@/lib/supabase';
import type {
  CreateCropListingInput,
  CropListing,
  DeclaredVariety,
  ListingStatus,
  MoistureType,
  PurityGrade,
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

type CropListingRow = {
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
  computed_price_per_kg: number | null;
  status: ListingStatus;
};

const LISTING_COLUMNS =
  'listing_id, date_listed, declared_variety, declared_variety_custom, declared_moisture, declared_purity_grade, gross_weight_kg, tare_weight_kg, net_weight_kg, remaining_quantity_kg, computed_price_per_kg, status' as const;

function mapListing(row: CropListingRow): CropListing {
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
    pricePerKg: row.computed_price_per_kg === null ? null : Number(row.computed_price_per_kg),
    status: row.status,
  };
}

async function requireAuthUserId(): Promise<string> {
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

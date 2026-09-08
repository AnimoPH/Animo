import { requireAuthUserId } from '@/services/crop-listing-service';
import { supabase } from '@/lib/supabase';
import type {
  BuyerPreferences,
  UpsertBuyerPreferencesInput,
} from '@/types/buyer-preferences';
import type { DeclaredVariety, MoistureType } from '@/types/crop-listing';

/**
 * Buyer preferences service — the only file that talks to
 * `buyer_preferences` directly. Same direct-client-write posture as
 * `crop-listing-service.ts`: the "Buyers manage own preferences" RLS policy
 * (migration 0023) enforces `auth.uid() = buyer_id` regardless of what the
 * client sends.
 */

type BuyerPreferencesRow = {
  preferred_variety: DeclaredVariety | null;
  preferred_variety_code: string | null;
  preferred_moisture: MoistureType | null;
  typical_quantity_kg: number | null;
  updated_at: string;
};

const BUYER_PREFERENCES_COLUMNS =
  'preferred_variety, preferred_variety_code, preferred_moisture, typical_quantity_kg, updated_at' as const;

function mapBuyerPreferences(row: BuyerPreferencesRow): BuyerPreferences {
  return {
    preferredVariety: row.preferred_variety,
    preferredVarietyCode: row.preferred_variety_code,
    preferredMoisture: row.preferred_moisture,
    typicalQuantityKg: row.typical_quantity_kg === null ? null : Number(row.typical_quantity_kg),
    updatedAt: row.updated_at,
  };
}

/** The signed-in buyer's saved preferences, or `null` if they've never saved any. */
export async function fetchMyBuyerPreferences(): Promise<BuyerPreferences | null> {
  const buyerId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('buyer_preferences')
    .select(BUYER_PREFERENCES_COLUMNS)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapBuyerPreferences(data as BuyerPreferencesRow) : null;
}

/**
 * Creates or replaces the signed-in buyer's preferences row. All four fields
 * are optional — passing every field `null` is valid (an explicit "no
 * preference" row, not an error).
 */
export async function upsertMyBuyerPreferences(
  input: UpsertBuyerPreferencesInput,
): Promise<BuyerPreferences> {
  const buyerId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('buyer_preferences')
    .upsert(
      {
        buyer_id: buyerId,
        preferred_variety: input.preferredVariety,
        preferred_variety_code:
          input.preferredVariety === 'Inbred' || input.preferredVariety === 'Hybrid'
            ? input.preferredVarietyCode
            : null,
        preferred_moisture: input.preferredMoisture,
        typical_quantity_kg: input.typicalQuantityKg,
      },
      { onConflict: 'buyer_id' },
    )
    .select(BUYER_PREFERENCES_COLUMNS)
    .single();

  if (error) throw error;
  return mapBuyerPreferences(data as BuyerPreferencesRow);
}

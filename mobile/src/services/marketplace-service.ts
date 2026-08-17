import {
  LISTING_COLUMNS,
  mapListing,
  requireAuthUserId,
  type CropListingRow,
} from '@/services/crop-listing-service';
import { rankListings } from '@/services/marketplace-ranking';
import { supabase } from '@/lib/supabase';
import type { CropListing } from '@/types/crop-listing';
import type { MarketplaceFilters, RankedListing } from '@/types/marketplace-filter';

/**
 * Buyer marketplace read path over §5 CROPLISTING.
 *
 * Like the farmer write path this talks to the table directly rather than
 * through an Edge Function, and for the same reason: RLS already says exactly
 * what a buyer may see. `"Anyone can view non-draft listings"` (migration 0001)
 * is `using (status <> 'Draft')` with no role gate, so any authenticated buyer
 * can read without a policy change. Note the flip side — that policy also
 * admits `Sold_Out` and `Cancelled`, so pinning `status = 'Available'` is this
 * file's job, not Postgres's.
 *
 * The hard filters (status, price, fulfillable quantity) run as SQL predicates;
 * only the WPM scoring and sort happen in-app (see `marketplace-ranking.ts`).
 * Scoring one page of Available rows is three multiplications per row, so there
 * is no case for pushing it into a server-side function.
 */

function assertValidFilters(filters: MarketplaceFilters): void {
  const { desiredQuantityKg, minPricePerKg, maxPricePerKg } = filters;

  if (desiredQuantityKg !== undefined && desiredQuantityKg < 0) {
    throw new Error('Mali ang dami na hinahanap.');
  }
  if (
    (minPricePerKg !== undefined && minPricePerKg < 0) ||
    (maxPricePerKg !== undefined && maxPricePerKg < 0)
  ) {
    throw new Error('Mali ang saklaw ng presyo.');
  }
  if (
    minPricePerKg !== undefined &&
    maxPricePerKg !== undefined &&
    minPricePerKg > maxPricePerKg
  ) {
    throw new Error('Mali ang saklaw ng presyo.');
  }
}

/**
 * Available listings a buyer can actually purchase, ranked by WPM score
 * descending with ties broken oldest-listing-first. RLS lets any authenticated
 * account read these — the buyer tab group's own auth guard is what restricts
 * who reaches this screen.
 */
export async function fetchMarketplaceListings(
  filters: MarketplaceFilters,
): Promise<RankedListing[]> {
  assertValidFilters(filters);
  // Not an RLS requirement (the read policy admits anon too) — it keeps the
  // buyer path behind the same "Kailangan mag-login muli." contract as every
  // other service call.
  await requireAuthUserId();

  let query = supabase
    .from('croplisting')
    .select(LISTING_COLUMNS)
    .eq('status', 'Available')
    // An unpriced listing can't be WPM-scored and isn't purchasable. `> 0` also
    // drops rows locked at ₱0 by the pricing trigger before migration 0007
    // seeded MARKETPRICEFEED — otherwise they'd rank first as "cheapest".
    .not('computed_price_per_kg', 'is', null)
    .gt('computed_price_per_kg', 0);

  // Hard quantity pre-filter, both bounds: the listing must have enough left
  // AND its own minimum request must not exceed what the buyer wants.
  const desiredQuantityKg = filters.desiredQuantityKg;
  if (desiredQuantityKg !== undefined && desiredQuantityKg > 0) {
    query = query
      .gte('remaining_quantity_kg', desiredQuantityKg)
      .lte('minimum_request_kg', desiredQuantityKg);
  }

  if (filters.minPricePerKg !== undefined) {
    query = query.gte('computed_price_per_kg', filters.minPricePerKg);
  }
  if (filters.maxPricePerKg !== undefined) {
    query = query.lte('computed_price_per_kg', filters.maxPricePerKg);
  }

  // Variety and moisture are deliberately NOT predicates here — they are
  // ranking preferences, so a mismatch is downgraded by the WPM score instead.

  // Oldest first, which `rankListings` relies on for its stable tiebreak;
  // listing_id is a deterministic last resort for identical timestamps.
  const { data, error } = await query
    .order('date_listed', { ascending: true })
    .order('listing_id', { ascending: true });

  if (error) throw error;

  const listings = (data as CropListingRow[]).map(mapListing);
  return rankListings(listings, filters);
}

/**
 * One listing for the buyer detail screen. Unlike `fetchCropListing` this pins
 * `status = 'Available'`, so a listing cancelled or sold out between browse and
 * tap reads as missing rather than rendering as purchasable.
 */
export async function fetchMarketplaceListing(id: string): Promise<CropListing | null> {
  const { data, error } = await supabase
    .from('croplisting')
    .select(LISTING_COLUMNS)
    .eq('listing_id', id)
    .eq('status', 'Available')
    .maybeSingle();

  if (error) throw error;
  return data ? mapListing(data as CropListingRow) : null;
}

import { mergeSort } from '@/lib/merge-sort';
import type { CropListing, DeclaredVariety, MoistureType } from '@/types/crop-listing';
import {
  SCORE_FLOOR,
  WPM_WEIGHTS,
  type MarketplaceFilters,
  type RankedListing,
  type WpmBreakdown,
} from '@/types/marketplace-filter';

/**
 * Weighted Product Model ranking for the buyer marketplace — Price 0.40,
 * Moisture 0.30, Variety 0.30.
 *
 * Deliberately free of Supabase and React Native imports: this is pure
 * arithmetic over already-fetched rows, so it stays independently runnable and
 * the hard filters (quantity, price band, status) stay in the SQL query where
 * Postgres can index them.
 */

/** Ties within this margin are treated as equal so float noise can't reorder rows. */
const SCORE_EPSILON = 1e-9;

/**
 * Price sub-score, min-max normalized and inverted — cheapest listing in the
 * candidate set scores 1, dearest scores the floor.
 *
 * The score is set-relative (standard WPM normalization): the same listing
 * scores differently against different competition, which is the point — it
 * ranks within the result set rather than against an absolute price scale.
 */
export function priceScore(price: number, minPrice: number, maxPrice: number): number {
  if (!(maxPrice > minPrice)) return 1;
  return SCORE_FLOOR + (1 - SCORE_FLOOR) * ((maxPrice - price) / (maxPrice - minPrice));
}

/** Binary match/no-match against the buyer's moisture preference, not a graded score. */
export function moistureScore(
  moisture: MoistureType,
  preference: MoistureType | undefined,
): number {
  if (!preference) return 1;
  return moisture === preference ? 1 : SCORE_FLOOR;
}

/**
 * Exact match on the declared variety category scores 1; everything else is a
 * soft mismatch at the floor. `Others` takes that same mismatch path — the free
 * text in `declaredVarietyCustom` is never string-compared against the filter.
 */
export function varietyScore(
  variety: DeclaredVariety,
  preference: DeclaredVariety | undefined,
): number {
  if (!preference) return 1;
  return variety === preference ? 1 : SCORE_FLOOR;
}

/** WPM: the weighted geometric product of the sub-scores. */
export function wpmScore(breakdown: WpmBreakdown): number {
  return (
    breakdown.price ** WPM_WEIGHTS.price *
    breakdown.moisture ** WPM_WEIGHTS.moisture *
    breakdown.variety ** WPM_WEIGHTS.variety
  );
}

/**
 * Scores every candidate and returns them best-match first.
 *
 * `listings` must already be ordered oldest `dateListed` first — the comparator
 * only compares scores, and `mergeSort`'s stability is what turns that incoming
 * order into the required "oldest listing first" tiebreak.
 */
export function rankListings(
  listings: readonly CropListing[],
  filters: MarketplaceFilters,
): RankedListing[] {
  if (listings.length === 0) return [];

  // A null price is filtered out before this point (it cannot be scored), so
  // the ?? 0 is only here to satisfy the nullable type.
  const prices = listings.map((listing) => listing.pricePerKg ?? 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const scored = listings.map((listing) => {
    const breakdown: WpmBreakdown = {
      price: priceScore(listing.pricePerKg ?? 0, minPrice, maxPrice),
      moisture: moistureScore(listing.declaredMoisture, filters.moisture),
      variety: varietyScore(listing.declaredVariety, filters.variety),
    };
    return { listing, breakdown, score: wpmScore(breakdown) };
  });

  return mergeSort(scored, (a, b) => {
    const difference = b.score - a.score;
    return Math.abs(difference) < SCORE_EPSILON ? 0 : difference;
  });
}

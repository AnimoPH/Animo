import { mergeSort } from '@/lib/merge-sort';
import type { CropListing, DeclaredVariety, MoistureType } from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';
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

/**
 * Weighted Product Model ranking for a farmer's pending purchase requests —
 * Trust 0.50, Quantity 0.30, Recency 0.20. Same shape as the listing ranking
 * above: pure arithmetic over already-fetched rows, no I/O.
 *
 * This is purely a display-order aid for the farmer's Orders tab — it never
 * excludes or blocks acceptance of any request, matching the buyer-side WPM's
 * "never excludes" philosophy.
 */
export type RequestWpmBreakdown = { trust: number; quantity: number; recency: number };

export const REQUEST_WPM_WEIGHTS = { trust: 0.5, quantity: 0.3, recency: 0.2 } as const;

export type RankedPurchaseRequest = {
  request: PurchaseRequest;
  score: number;
  breakdown: RequestWpmBreakdown;
};

/** Buyer reliability, min-max normalized within the candidate set — same shape as `priceScore`. */
export function trustScore(reliability: number, minReliability: number, maxReliability: number): number {
  if (!(maxReliability > minReliability)) return 1;
  return SCORE_FLOOR + (1 - SCORE_FLOOR) * ((reliability - minReliability) / (maxReliability - minReliability));
}

/** Larger requests score higher — a farmer clearing a listing prefers fewer, bigger buyers. */
export function quantityScore(requestedKg: number, minKg: number, maxKg: number): number {
  if (!(maxKg > minKg)) return 1;
  return SCORE_FLOOR + (1 - SCORE_FLOOR) * ((requestedKg - minKg) / (maxKg - minKg));
}

/** Older (earlier-submitted) requests score higher — FIFO fairness among otherwise-equal buyers. */
export function recencyScore(submittedAt: string, oldestMs: number, newestMs: number): number {
  if (!(newestMs > oldestMs)) return 1;
  const submittedMs = new Date(submittedAt).getTime();
  return SCORE_FLOOR + (1 - SCORE_FLOOR) * ((newestMs - submittedMs) / (newestMs - oldestMs));
}

/** WPM: the weighted geometric product of the request sub-scores. */
export function requestWpmScore(breakdown: RequestWpmBreakdown): number {
  return (
    breakdown.trust ** REQUEST_WPM_WEIGHTS.trust *
    breakdown.quantity ** REQUEST_WPM_WEIGHTS.quantity *
    breakdown.recency ** REQUEST_WPM_WEIGHTS.recency
  );
}

/**
 * Ranks a listing's pending purchase requests, best-match first.
 * `requests` must already be ordered oldest `submittedAt` first, same
 * tiebreak convention as `rankListings`.
 */
export function rankPurchaseRequests(
  requests: readonly { request: PurchaseRequest; reliabilityScore: number }[],
): RankedPurchaseRequest[] {
  if (requests.length === 0) return [];

  const reliabilities = requests.map((r) => r.reliabilityScore);
  const minReliability = Math.min(...reliabilities);
  const maxReliability = Math.max(...reliabilities);

  const quantities = requests.map((r) => r.request.requestedQuantityKg);
  const minKg = Math.min(...quantities);
  const maxKg = Math.max(...quantities);

  const timestamps = requests.map((r) => new Date(r.request.submittedAt).getTime());
  const oldestMs = Math.min(...timestamps);
  const newestMs = Math.max(...timestamps);

  const scored = requests.map(({ request, reliabilityScore }) => {
    const breakdown: RequestWpmBreakdown = {
      trust: trustScore(reliabilityScore, minReliability, maxReliability),
      quantity: quantityScore(request.requestedQuantityKg, minKg, maxKg),
      recency: recencyScore(request.submittedAt, oldestMs, newestMs),
    };
    return { request, breakdown, score: requestWpmScore(breakdown) };
  });

  return mergeSort(scored, (a, b) => {
    const difference = b.score - a.score;
    return Math.abs(difference) < SCORE_EPSILON ? 0 : difference;
  });
}

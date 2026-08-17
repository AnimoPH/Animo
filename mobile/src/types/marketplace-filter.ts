/**
 * Buyer marketplace browse/filter domain types.
 *
 * Named `marketplace-filter` rather than `marketplace` because
 * `@/constants/marketplace` is the (still-live) frontend mock module and
 * exports its own `Listing` type — the two must not shadow each other.
 *
 * Only quantity and price are hard filters. Variety and moisture are ranking
 * preferences: a non-matching listing is downgraded, never removed, which is
 * what keeps their WPM weights meaningful (a hard variety filter would leave
 * every survivor an exact match and pin that sub-score at 1.0).
 */

import type { CropListing, DeclaredVariety, MoistureType } from '@/types/crop-listing';

export type MarketplaceFilters = {
  /**
   * Hard pre-filter, not a weighted criterion: a listing that cannot fulfill
   * this quantity is dropped before any ranking runs. Omit (or 0) to browse
   * everything Available.
   */
  desiredQuantityKg?: number;
  /** Hard filter on the listing's locked price. */
  minPricePerKg?: number;
  /** Hard filter on the listing's locked price. */
  maxPricePerKg?: number;
  /** Ranking preference only — never excludes. Curated enum, never free text. */
  variety?: DeclaredVariety;
  /** Ranking preference only — never excludes. */
  moisture?: MoistureType;
};

/** The three normalized sub-scores behind a WPM score, kept for explainability. */
export type WpmBreakdown = {
  price: number;
  moisture: number;
  variety: number;
};

export type RankedListing = {
  listing: CropListing;
  /** Weighted Product Model score in (0, 1]. Higher is a better match. */
  score: number;
  breakdown: WpmBreakdown;
};

/** WPM criterion weights. Must sum to 1. */
export const WPM_WEIGHTS = {
  price: 0.4,
  moisture: 0.3,
  variety: 0.3,
} as const;

/**
 * Sub-scores are normalized to a floor-to-1 range, never a true 0: a product
 * model multiplies, so a single 0 would annihilate the whole score. The floor
 * downgrades a weak criterion instead (0.05 ** 0.3 ≈ 0.42, i.e. a mismatched
 * variety costs a listing ~58% of its score without erasing it).
 */
export const SCORE_FLOOR = 0.05;

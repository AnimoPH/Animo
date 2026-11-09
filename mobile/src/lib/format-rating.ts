/**
 * Formats an average star rating for display: one decimal ("4.3", "5.0").
 *
 * The database stores the plain `avg(score)` (e.g. 4.3333333333333333), so it must be rounded
 * before it is shown. Round here, at display time, not in the data layer: the star icons use
 * `Math.round(average)`, and rounding to one decimal first could double-round
 * (4.46 -> 4.5 -> 5 stars instead of 4).
 *
 * With no reviews yet it returns "0" (not "0.0", which would read like a real score of zero). Pass
 * `hasReviews` when the caller already knows the review count.
 */
export function formatRating(average: number, hasReviews = true): string {
  if (!hasReviews || !Number.isFinite(average) || average <= 0) return '0';
  return average.toFixed(1);
}

// The harvest advice rule, kept free of Deno and Supabase imports so the edge
// function and the tests run the same code (Research Notes Sec. L).

// PAGASA Yellow rainfall warning level, sustained across the 24-48h window.
export const RAIN_THRESHOLD_MM_H = 7.5;
export const WINDOW_START_HOURS = 24;
export const WINDOW_END_HOURS = 48;

// Maturity days per rice_type_category. Organic is an unconfirmed assumption
// pending agriculture-specialist review.
export const MATURITY_DAYS: Record<string, number> = {
  Hybrid: 110,
  Inbred: 120,
  Organic: 120,
  Specialty: 122,
};

export const RIPENESS_CUTOFF = 0.85;

export type RecommendedAction = 'Advance_Cut' | 'Delayed_Harvest' | 'No_Action_Needed';

export type OwmForecastEntry = {
  dt: number;
  rain?: { '3h'?: number };
};

/** Max mm/h across 3-hour forecast slots landing in [nowMs+24h, nowMs+48h]. */
export function maxRainInWindow(entries: OwmForecastEntry[], nowMs: number): number {
  const windowStart = nowMs + WINDOW_START_HOURS * 60 * 60 * 1000;
  const windowEnd = nowMs + WINDOW_END_HOURS * 60 * 60 * 1000;
  let max = 0;
  for (const entry of entries) {
    const entryMs = entry.dt * 1000;
    if (entryMs < windowStart || entryMs > windowEnd) continue;
    const mm3h = entry.rain?.['3h'] ?? 0;
    const mmPerHour = mm3h / 3;
    if (mmPerHour > max) max = mmPerHour;
  }
  return max;
}

/** Days since planting divided by the maturity days, or null when the category is unknown. */
export function ripenessPct(plantingDate: string, riceTypeCategory: string, today: Date): number | null {
  const maturityDays = MATURITY_DAYS[riceTypeCategory];
  if (!maturityDays) return null;
  const planted = new Date(`${plantingDate}T00:00:00Z`);
  const daysSince = (today.getTime() - planted.getTime()) / (24 * 60 * 60 * 1000);
  return daysSince / maturityDays;
}

export function isRainExpected(precipitationMmH: number): boolean {
  return precipitationMmH >= RAIN_THRESHOLD_MM_H;
}

/** Rain at or above 7.5 mm/h with ripeness at or above 85% is Advance Cut, below 85% Delayed Harvest, less rain No Action Needed. */
export function decideAdvisory(rainExpected: boolean, ripeness: number): RecommendedAction {
  if (!rainExpected) return 'No_Action_Needed';
  return ripeness >= RIPENESS_CUTOFF ? 'Advance_Cut' : 'Delayed_Harvest';
}

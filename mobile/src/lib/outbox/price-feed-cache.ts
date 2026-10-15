import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import type { MoistureType, PurityGrade, VarietyCode } from '@/types/crop-listing';

const CACHE_KEY = 'animo.priceFeedCache.v1';

export type PriceFeedCache = {
  dryBasePerKg: number | null;
  wetBasePerKg: number;
  effectiveDate: string;
  premiums: { varietyCode: string; grade: string; premiumPerKg: number | null }[];
  savedAt: number;
};

/** Reads the latest feed row and the premium table and keeps them on the phone. Call while online. */
export async function refreshPriceFeedCache(): Promise<PriceFeedCache | null> {
  const { data: feed, error: feedError } = await supabase
    .from('marketpricefeed')
    .select('dry_base_price_per_kg, wet_base_price_per_kg, effective_date')
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (feedError || !feed) return null;

  const { data: premiums, error: premiumError } = await supabase
    .from('varietypricepremium')
    .select('variety_code, grade, premium_per_kg');
  if (premiumError) return null;

  const cache: PriceFeedCache = {
    dryBasePerKg: feed.dry_base_price_per_kg === null ? null : Number(feed.dry_base_price_per_kg),
    wetBasePerKg: Number(feed.wet_base_price_per_kg),
    effectiveDate: feed.effective_date,
    premiums: (premiums ?? []).map((row) => ({
      varietyCode: row.variety_code,
      grade: row.grade,
      premiumPerKg: row.premium_per_kg === null ? null : Number(row.premium_per_kg),
    })),
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return cache;
}

export async function getCachedPriceFeed(): Promise<PriceFeedCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PriceFeedCache) : null;
  } catch {
    return null;
  }
}

/**
 * The same arithmetic as croplisting_compute_locked_price in the database:
 * the wet or dry base from the feed plus the premium for that variety code
 * and grade, falling back to the OTHER / Ungraded premium. The server stays
 * the source of truth, this only shows the farmer the peso while offline.
 */
export function computeLockedPrice(
  feed: PriceFeedCache,
  moisture: MoistureType,
  varietyCode: VarietyCode,
  grade: PurityGrade,
): number {
  const base = moisture === 'Wet' ? feed.wetBasePerKg : feed.dryBasePerKg;
  const find = (code: string, g: string) =>
    feed.premiums.find((row) => row.varietyCode === code && row.grade === g)?.premiumPerKg ?? null;
  const premium = find(varietyCode, grade) ?? find('OTHER', 'Ungraded');
  return (base ?? 0) + (premium ?? 0);
}

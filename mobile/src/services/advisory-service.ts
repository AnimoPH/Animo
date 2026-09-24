import { supabase } from '@/lib/supabase';
import { requireAuthUserId } from '@/services/crop-listing-service';

/**
 * Payo sa Bukid — Research Notes Sec. L, Project Context Sec. 5.1/7.3.
 * cropcycle/advisoryrecommendation are read/written directly (not through an
 * RPC): RLS already scopes both to the signed-in farmer's own farm, the same
 * way farmer-public-profile.ts relies on RLS rather than server-side
 * filtering. The rule engine itself lives in the refresh-advisory edge
 * function (migration 0025) — ripenessPct here is display-only, mirroring
 * that function's formula so the rationale card can show the same number,
 * not a second source of truth for the decision.
 */

export type RiceTypeCategory = 'Hybrid' | 'Inbred' | 'Organic' | 'Specialty';

export const RICE_TYPE_OPTIONS: { value: RiceTypeCategory; label: string }[] = [
  { value: 'Inbred', label: 'Inbred' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Organic', label: 'Organic' },
  { value: 'Specialty', label: 'Specialty' },
];

const MATURITY_DAYS: Record<RiceTypeCategory, number> = {
  Hybrid: 110,
  Inbred: 120,
  Organic: 120,
  Specialty: 122,
};

export type RecommendedAction = 'Advance_Cut' | 'Delayed_Harvest' | 'No_Action_Needed';

const ACTION_LABELS: Record<RecommendedAction, string> = {
  Advance_Cut: 'Maagang Anihin',
  Delayed_Harvest: 'Antalahin ang Anihan',
  No_Action_Needed: 'Walang Kailangang Gawin',
};

const ACTION_LABELS_EN: Record<RecommendedAction, string> = {
  Advance_Cut: 'Early Harvest (Advance Cut)',
  Delayed_Harvest: 'Delay Harvest',
  No_Action_Needed: 'No Action Needed',
};

export function actionLabel(action: RecommendedAction, lang: 'tl' | 'en' = 'tl'): string {
  const dict = lang === 'en' ? ACTION_LABELS_EN : ACTION_LABELS;
  return dict[action] ?? action;
}

/** Fraction of maturity days elapsed since planting — display-only, same formula refresh-advisory uses to decide. */
export function ripenessPct(plantingDate: string, riceTypeCategory: RiceTypeCategory): number {
  const maturityDays = MATURITY_DAYS[riceTypeCategory];
  const planted = new Date(`${plantingDate}T00:00:00Z`);
  const daysSince = (Date.now() - planted.getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.min(1, daysSince / maturityDays));
}

export type CurrentAdvisory = {
  cropcycleId: string;
  riceTypeCategory: RiceTypeCategory;
  plantingDate: string;
  recommendedAction: RecommendedAction;
  dateIssued: string;
  precipitationMmH: number;
  isStale: boolean;
  forecastFetchedAt: string;
};

/**
 * Three distinct states the UI must tell apart — collapsing the latter two
 * into one "empty" card reads as "your planting didn't save" when it's
 * really just waiting on the next 6h refresh (Research Notes Sec. L: the
 * rule engine batches all cropcycles per tick rather than running per-insert).
 */
export type AdvisoryState =
  | { kind: 'no_cropcycle' }
  | { kind: 'awaiting_advisory'; cropcycleId: string; riceTypeCategory: RiceTypeCategory; plantingDate: string }
  | { kind: 'active'; advisory: CurrentAdvisory };

export async function fetchCurrentAdvisory(): Promise<AdvisoryState> {
  const { data: cropcycle, error: cropcycleError } = await supabase
    .from('cropcycle')
    .select('cropcycle_id, planting_date, rice_type_category')
    .eq('status', 'Growing')
    .not('planting_date', 'is', null)
    .not('rice_type_category', 'is', null)
    .order('planting_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cropcycleError) throw cropcycleError;
  if (!cropcycle) return { kind: 'no_cropcycle' };

  const [{ data: advisory, error: advisoryError }, { data: feed, error: feedError }] = await Promise.all([
    supabase
      .from('advisoryrecommendation')
      .select('recommended_action, date_issued')
      .eq('cropcycle_id', cropcycle.cropcycle_id)
      .order('date_issued', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('weather_forecast_feed')
      .select('precipitation_mm_h, is_stale, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (advisoryError) throw advisoryError;
  if (feedError) throw feedError;
  // Cropcycle logged after the last 6h tick — real state, not an empty one.
  if (!advisory) {
    return {
      kind: 'awaiting_advisory',
      cropcycleId: cropcycle.cropcycle_id,
      riceTypeCategory: cropcycle.rice_type_category as RiceTypeCategory,
      plantingDate: cropcycle.planting_date as string,
    };
  }

  return {
    kind: 'active',
    advisory: {
      cropcycleId: cropcycle.cropcycle_id,
      riceTypeCategory: cropcycle.rice_type_category as RiceTypeCategory,
      plantingDate: cropcycle.planting_date as string,
      recommendedAction: advisory.recommended_action as RecommendedAction,
      dateIssued: advisory.date_issued,
      precipitationMmH: Number(feed?.precipitation_mm_h) || 0,
      isStale: feed?.is_stale ?? false,
      forecastFetchedAt: feed?.fetched_at ?? '',
    },
  };
}

export type AdvisoryHistoryEntry = {
  advisoryId: string;
  recommendedAction: RecommendedAction;
  dateIssued: string;
  cropcycleId: string;
  riceTypeCategory: RiceTypeCategory | null;
  plantingDate: string | null;
};

type AdvisoryHistoryRow = {
  advisory_id: string;
  recommended_action: string;
  date_issued: string;
  cropcycle_id: string;
  cropcycle: { rice_type_category: RiceTypeCategory | null; planting_date: string | null } | null;
};

/**
 * RLS already scopes this to the signed-in farmer's own cropcycle(s), but a
 * farmer can have more than one Growing cropcycle at once — the embedded
 * cropcycle fields let the UI tag which planting each entry belongs to
 * instead of silently interleaving them.
 */
export async function fetchAdvisoryHistory(): Promise<AdvisoryHistoryEntry[]> {
  const { data, error } = await supabase
    .from('advisoryrecommendation')
    .select('advisory_id, recommended_action, date_issued, cropcycle_id, cropcycle(rice_type_category, planting_date)')
    .order('date_issued', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as AdvisoryHistoryRow[]).map((row) => ({
    advisoryId: row.advisory_id,
    recommendedAction: row.recommended_action as RecommendedAction,
    dateIssued: row.date_issued,
    cropcycleId: row.cropcycle_id,
    riceTypeCategory: row.cropcycle?.rice_type_category ?? null,
    plantingDate: row.cropcycle?.planting_date ?? null,
  }));
}

async function getOrCreateFarmId(farmerId: string): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from('farm')
    .select('farm_id')
    .eq('farmer_id', farmerId)
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.farm_id;

  const { data: created, error: insertError } = await supabase
    .from('farm')
    .insert({ farmer_id: farmerId })
    .select('farm_id')
    .single();
  if (insertError) throw insertError;
  return created.farm_id;
}

/** The 2-step wizard's only write — creates the farmer's farm row on first use, then one Growing cropcycle. */
export async function logPlanting(riceTypeCategory: RiceTypeCategory, plantingDate: string): Promise<void> {
  const farmerId = await requireAuthUserId();
  const farmId = await getOrCreateFarmId(farmerId);

  const { error } = await supabase.from('cropcycle').insert({
    farm_id: farmId,
    planting_date: plantingDate,
    rice_type_category: riceTypeCategory,
  });
  if (error) throw error;
}

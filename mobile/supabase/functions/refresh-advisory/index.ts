// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy refresh-advisory
//
// Service-role only, invoked every 6 hours by trigger_advisory_refresh()
// (migration 0024). Two steps in one invocation since they always run
// together: (1) fetch a rain forecast for Antipolo from OpenWeatherMap and
// write weather_forecast_feed; (2) for every Growing cropcycle, combine its
// ripeness with that forecast and insert one new advisoryrecommendation row
// (Research Notes Sec. L, Project Context Sec. 5.1/7.3).
//
// On an OpenWeatherMap failure this repeats the last successful feed row
// with is_stale=true (FR-ADV-01) rather than skipping the run — farmers
// still see an advisory, visibly marked as based on older data.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Antipolo City, Rizal — one shared forecast for the whole service area,
// not per-farm (Research Notes: "retrieve rainfall forecast for Antipolo",
// not per-farmer geolocation; farm.location/farmer.barangay are free text,
// not coordinates, and aren't used here).
const ANTIPOLO_LAT = 14.5842;
const ANTIPOLO_LON = 121.1763;

// PAGASA Yellow rainfall warning level, sustained across the 24-48h window —
// locked in Research Notes Sec. L.
const RAIN_THRESHOLD_MM_H = 7.5;
const WINDOW_START_HOURS = 24;
const WINDOW_END_HOURS = 48;

// Locked maturity-day constants per rice_type_category. Organic is flagged
// in the docs as an unconfirmed assumption pending agriculture-specialist
// review — kept as documented for v1, not a build blocker.
const MATURITY_DAYS: Record<string, number> = {
  Hybrid: 110,
  Inbred: 120,
  Organic: 120,
  Specialty: 122,
};

const RIPENESS_CUTOFF = 0.85;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

type OwmForecastEntry = {
  dt: number;
  rain?: { '3h'?: number };
};
type OwmForecastResponse = { list?: OwmForecastEntry[] };

/** Max mm/h across 3-hour forecast slots landing in [nowMs+24h, nowMs+48h]. */
function maxRainInWindow(entries: OwmForecastEntry[], nowMs: number): number {
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

type CropcycleRow = {
  cropcycle_id: string;
  planting_date: string | null;
  rice_type_category: string | null;
  farm_id: string;
};

function ripenessPct(plantingDate: string, riceTypeCategory: string, today: Date): number | null {
  const maturityDays = MATURITY_DAYS[riceTypeCategory];
  if (!maturityDays) return null;
  const planted = new Date(`${plantingDate}T00:00:00Z`);
  const daysSince = (today.getTime() - planted.getTime()) / (24 * 60 * 60 * 1000);
  return daysSince / maturityDays;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing Authorization header' }, 401);

  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (bearerToken !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return jsonResponse({ error: 'service role required' }, 403);
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  const owmApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');

  let precipitationMmH: number;
  let isStale: boolean;

  if (!owmApiKey) {
    console.error('refresh-advisory: OPENWEATHERMAP_API_KEY is not configured; reusing last feed as stale');
    isStale = true;
    precipitationMmH = await lastPrecipitation(adminClient);
  } else {
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${ANTIPOLO_LAT}&lon=${ANTIPOLO_LON}&appid=${owmApiKey}&units=metric`;
      const response = await fetch(url);
      const body = (await response.json()) as OwmForecastResponse;
      if (!response.ok || !Array.isArray(body.list)) {
        throw new Error(`OpenWeatherMap request failed: ${response.status}`);
      }
      precipitationMmH = maxRainInWindow(body.list, now.getTime());
      isStale = false;
    } catch (err) {
      console.error('refresh-advisory: OpenWeatherMap unreachable; reusing last feed as stale', err);
      isStale = true;
      precipitationMmH = await lastPrecipitation(adminClient);
    }
  }

  const rainExpected = precipitationMmH >= RAIN_THRESHOLD_MM_H;

  const { error: feedError } = await adminClient.from('weather_forecast_feed').insert({
    precipitation_mm_h: precipitationMmH,
    rain_expected: rainExpected,
    is_stale: isStale,
  });
  if (feedError) {
    console.error('refresh-advisory: weather_forecast_feed insert failed', feedError.message);
    return jsonResponse({ error: feedError.message }, 500);
  }

  const { data: cropcycles, error: cropcycleError } = await adminClient
    .from('cropcycle')
    .select('cropcycle_id, planting_date, rice_type_category, farm_id')
    .eq('status', 'Growing');
  if (cropcycleError) {
    console.error('refresh-advisory: cropcycle query failed', cropcycleError.message);
    return jsonResponse({ error: cropcycleError.message }, 500);
  }

  const rows = (cropcycles as CropcycleRow[]) ?? [];
  const advisories = rows
    .map((row) => {
      if (!row.planting_date || !row.rice_type_category) return null;
      const ripeness = ripenessPct(row.planting_date, row.rice_type_category, now);
      if (ripeness === null) return null;

      const recommendedAction = !rainExpected
        ? 'No_Action_Needed'
        : ripeness >= RIPENESS_CUTOFF
          ? 'Advance_Cut'
          : 'Delayed_Harvest';

      return {
        cropcycle_id: row.cropcycle_id,
        type: 'RainAdvisory',
        trigger_source: 'WeatherFeed',
        recommended_action: recommendedAction,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (advisories.length > 0) {
    // upsert + ignoreDuplicates, not insert: a re-run within the same day
    // (manual retrigger, or the cron somehow double-firing) must not create
    // a second same-day row per cropcycle — see 0026's unique constraint.
    const { error: insertError } = await adminClient
      .from('advisoryrecommendation')
      .upsert(advisories, {
        onConflict: 'cropcycle_id,date_issued,type,trigger_source',
        ignoreDuplicates: true,
      });
    if (insertError) {
      console.error('refresh-advisory: advisoryrecommendation insert failed', insertError.message);
      return jsonResponse({ error: insertError.message }, 500);
    }
  }

  return jsonResponse(
    { precipitation_mm_h: precipitationMmH, rain_expected: rainExpected, is_stale: isStale, advisories_written: advisories.length },
    200,
  );
});

async function lastPrecipitation(adminClient: ReturnType<typeof createClient>): Promise<number> {
  const { data } = await adminClient
    .from('weather_forecast_feed')
    .select('precipitation_mm_h')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number(data?.precipitation_mm_h) || 0;
}

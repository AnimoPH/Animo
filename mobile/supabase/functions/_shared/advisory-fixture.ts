// Demo and test support for refresh-advisory. A fixture swaps the
// OpenWeatherMap rain for a chosen value for ONE crop cycle, then runs the
// real rule, so Advance Cut and Delayed Harvest can be shown on demand.
// Ripeness is never faked, it still comes from the planting date.
//
// Off unless the secret ADVISORY_FIXTURES_ENABLED is exactly "true", and only
// reachable with the service role key like the rest of refresh-advisory.

import { decideAdvisory, isRainExpected, ripenessPct, type RecommendedAction } from './advisory-rule.ts';

export type FixtureCommand =
  | { kind: 'none' }
  | { kind: 'invalid'; error: string }
  | { kind: 'fixture'; cropcycleId: string; precipitationMmH: number }
  | { kind: 'reset'; cropcycleId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MM_H = 500;

export function fixturesEnabled(flag: string | null | undefined): boolean {
  return flag === 'true';
}

/** Reads the request body. A body with no fixture or reset key is the normal cron call. */
export function parseFixtureCommand(body: unknown): FixtureCommand {
  if (!body || typeof body !== 'object') return { kind: 'none' };
  const b = body as Record<string, unknown>;
  const hasFixture = 'fixture' in b;
  const hasReset = 'reset' in b;
  if (!hasFixture && !hasReset) return { kind: 'none' };
  if (hasFixture && hasReset) return { kind: 'invalid', error: 'send either fixture or reset, not both' };

  if (hasReset) {
    const cropcycleId = b.cropcycle_id;
    if (typeof cropcycleId !== 'string' || !UUID.test(cropcycleId)) {
      return { kind: 'invalid', error: 'reset needs a cropcycle_id' };
    }
    return { kind: 'reset', cropcycleId };
  }

  const fixture = b.fixture as Record<string, unknown> | null;
  if (!fixture || typeof fixture !== 'object') return { kind: 'invalid', error: 'fixture must be an object' };
  const cropcycleId = fixture.cropcycle_id;
  const rain = fixture.precipitation_mm_h;
  if (typeof cropcycleId !== 'string' || !UUID.test(cropcycleId)) {
    return { kind: 'invalid', error: 'fixture needs a cropcycle_id' };
  }
  if (typeof rain !== 'number' || !Number.isFinite(rain) || rain < 0 || rain > MAX_MM_H) {
    return { kind: 'invalid', error: `precipitation_mm_h must be a number from 0 to ${MAX_MM_H}` };
  }
  return { kind: 'fixture', cropcycleId, precipitationMmH: rain };
}

export type FixtureStore = {
  getCropcycle(id: string): Promise<{ planting_date: string | null; rice_type_category: string | null; status: string } | null>;
  insertForecast(row: { precipitation_mm_h: number; rain_expected: boolean; is_stale: boolean }): Promise<void>;
  deleteTodaysAdvisory(cropcycleId: string, date: string): Promise<void>;
  insertAdvisory(row: {
    cropcycle_id: string;
    type: 'RainAdvisory';
    trigger_source: 'WeatherFeed';
    recommended_action: RecommendedAction;
    date_issued: string;
  }): Promise<void>;
};

export type FixtureResult =
  | { ok: true; cropcycle_id: string; precipitation_mm_h: number; rain_expected: boolean; ripeness_pct: number; recommended_action: RecommendedAction }
  | { ok: false; status: number; error: string };

/** Removes today's advisory for one crop so the next normal run writes the real one. */
export async function resetFixture(store: FixtureStore, cropcycleId: string, now: Date): Promise<void> {
  await store.deleteTodaysAdvisory(cropcycleId, now.toISOString().slice(0, 10));
}

export async function runFixture(
  store: FixtureStore,
  command: { cropcycleId: string; precipitationMmH: number },
  now: Date,
): Promise<FixtureResult> {
  const cycle = await store.getCropcycle(command.cropcycleId);
  if (!cycle) return { ok: false, status: 404, error: 'crop cycle not found' };
  if (cycle.status !== 'Growing') return { ok: false, status: 409, error: 'crop cycle is not Growing' };
  if (!cycle.planting_date || !cycle.rice_type_category) {
    return { ok: false, status: 409, error: 'crop cycle has no planting date or variety category' };
  }
  const ripeness = ripenessPct(cycle.planting_date, cycle.rice_type_category, now);
  if (ripeness === null) return { ok: false, status: 409, error: 'unknown variety category' };

  const rainExpected = isRainExpected(command.precipitationMmH);
  const action = decideAdvisory(rainExpected, ripeness);
  const today = now.toISOString().slice(0, 10);

  // The card reads rain from the feed, so the feed gets the same value.
  await store.insertForecast({
    precipitation_mm_h: command.precipitationMmH,
    rain_expected: rainExpected,
    is_stale: false,
  });
  await store.deleteTodaysAdvisory(command.cropcycleId, today);
  await store.insertAdvisory({
    cropcycle_id: command.cropcycleId,
    type: 'RainAdvisory',
    trigger_source: 'WeatherFeed',
    recommended_action: action,
    date_issued: today,
  });

  return {
    ok: true,
    cropcycle_id: command.cropcycleId,
    precipitation_mm_h: command.precipitationMmH,
    rain_expected: rainExpected,
    ripeness_pct: ripeness,
    recommended_action: action,
  };
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fixturesEnabled,
  parseFixtureCommand,
  resetFixture,
  runFixture,
  type FixtureStore,
} from '../supabase/functions/_shared/advisory-fixture.ts';

const ID = '9d963496-1111-4222-8333-444455556666';
const NOW = new Date('2026-12-01T05:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString().slice(0, 10);

function fakeStore(cycle: { planting_date: string | null; rice_type_category: string | null; status: string } | null) {
  const calls: string[] = [];
  const advisories: Record<string, unknown>[] = [];
  const forecasts: Record<string, unknown>[] = [];
  const store: FixtureStore = {
    async getCropcycle() { calls.push('get'); return cycle; },
    async insertForecast(row) { calls.push('forecast'); forecasts.push(row); },
    async deleteTodaysAdvisory(id, date) { calls.push(`delete:${id}:${date}`); },
    async insertAdvisory(row) { calls.push('advisory'); advisories.push(row); },
  };
  return { store, calls, advisories, forecasts };
}

describe('the fixtures switch', () => {
  it('is on only for the exact secret value "true"', () => {
    assert.equal(fixturesEnabled('true'), true);
    for (const v of [undefined, null, '', 'false', 'TRUE', '1', 'yes', ' true']) {
      assert.equal(fixturesEnabled(v as string | undefined), false, String(v));
    }
  });
});

describe('reading the request body', () => {
  it('a normal cron call (no body, empty body, other keys) is not a fixture', () => {
    for (const body of [null, undefined, {}, { foo: 1 }, 'text', 5]) {
      assert.deepEqual(parseFixtureCommand(body), { kind: 'none' });
    }
  });

  it('reads a fixture for one crop cycle', () => {
    assert.deepEqual(
      parseFixtureCommand({ fixture: { cropcycle_id: ID, precipitation_mm_h: 9 } }),
      { kind: 'fixture', cropcycleId: ID, precipitationMmH: 9 },
    );
    assert.equal(parseFixtureCommand({ fixture: { cropcycle_id: ID, precipitation_mm_h: 0 } }).kind, 'fixture');
  });

  it('refuses a fixture with no crop cycle, a bad id, or rain that is missing, negative, huge or not a number', () => {
    const bad = [
      { fixture: { precipitation_mm_h: 9 } },
      { fixture: { cropcycle_id: 'not-an-id', precipitation_mm_h: 9 } },
      { fixture: { cropcycle_id: ID } },
      { fixture: { cropcycle_id: ID, precipitation_mm_h: -1 } },
      { fixture: { cropcycle_id: ID, precipitation_mm_h: 501 } },
      { fixture: { cropcycle_id: ID, precipitation_mm_h: '9' } },
      { fixture: { cropcycle_id: ID, precipitation_mm_h: Number.NaN } },
      { fixture: null },
    ];
    for (const body of bad) assert.equal(parseFixtureCommand(body).kind, 'invalid', JSON.stringify(body));
  });

  it('reads a reset only with a crop cycle, and refuses fixture and reset together', () => {
    assert.deepEqual(parseFixtureCommand({ reset: true, cropcycle_id: ID }), { kind: 'reset', cropcycleId: ID });
    assert.equal(parseFixtureCommand({ reset: true }).kind, 'invalid');
    assert.equal(
      parseFixtureCommand({ reset: true, cropcycle_id: ID, fixture: { cropcycle_id: ID, precipitation_mm_h: 9 } }).kind,
      'invalid',
    );
  });
});

describe('running a fixture with the real rule', () => {
  const cycle = (days: number) => ({ planting_date: daysAgo(days), rice_type_category: 'Inbred', status: 'Growing' });

  it('Advance Cut: 9 mm/h on an Inbred crop planted 102 days ago (85% ripe)', async () => {
    const { store, advisories } = fakeStore(cycle(102));
    const r = await runFixture(store, { cropcycleId: ID, precipitationMmH: 9 }, NOW);
    assert.ok(r.ok && r.recommended_action === 'Advance_Cut' && r.rain_expected && r.ripeness_pct >= 0.85);
    assert.equal(advisories[0].recommended_action, 'Advance_Cut');
  });

  it('Delayed Harvest: the same rain on a crop planted 60 days ago (50% ripe)', async () => {
    const { store } = fakeStore(cycle(60));
    const r = await runFixture(store, { cropcycleId: ID, precipitationMmH: 9 }, NOW);
    assert.ok(r.ok && r.recommended_action === 'Delayed_Harvest' && r.ripeness_pct > 0.5 && r.ripeness_pct < 0.51);
  });

  it('No Action Needed: 2 mm/h on a ripe crop', async () => {
    const { store } = fakeStore(cycle(110));
    const r = await runFixture(store, { cropcycleId: ID, precipitationMmH: 2 }, NOW);
    assert.ok(r.ok && r.recommended_action === 'No_Action_Needed' && !r.rain_expected);
  });

  it('the 7.5 mm/h line holds: 7.49 is No Action, 7.5 is Advance Cut on a ripe crop', async () => {
    const low = await runFixture(fakeStore(cycle(110)).store, { cropcycleId: ID, precipitationMmH: 7.49 }, NOW);
    const edge = await runFixture(fakeStore(cycle(110)).store, { cropcycleId: ID, precipitationMmH: 7.5 }, NOW);
    assert.ok(low.ok && low.recommended_action === 'No_Action_Needed');
    assert.ok(edge.ok && edge.recommended_action === 'Advance_Cut');
  });

  it('writes the same rain to the feed (not stale), replaces only that crop\'s advisory for today, in that order', async () => {
    const { store, calls, forecasts, advisories } = fakeStore(cycle(102));
    await runFixture(store, { cropcycleId: ID, precipitationMmH: 9 }, NOW);
    assert.deepEqual(calls, ['get', 'forecast', `delete:${ID}:2026-12-01`, 'advisory']);
    assert.deepEqual(forecasts[0], { precipitation_mm_h: 9, rain_expected: true, is_stale: false });
    assert.deepEqual(advisories[0], {
      cropcycle_id: ID, type: 'RainAdvisory', trigger_source: 'WeatherFeed',
      recommended_action: 'Advance_Cut', date_issued: '2026-12-01',
    });
  });

  it('refuses without writing anything: crop not found, not Growing, no planting date, unknown category', async () => {
    const cases: [Parameters<typeof fakeStore>[0], number][] = [
      [null, 404],
      [{ planting_date: daysAgo(100), rice_type_category: 'Inbred', status: 'Harvested' }, 409],
      [{ planting_date: null, rice_type_category: 'Inbred', status: 'Growing' }, 409],
      [{ planting_date: daysAgo(100), rice_type_category: 'Traditional', status: 'Growing' }, 409],
      [{ planting_date: daysAgo(100), rice_type_category: 'Organic', status: 'Growing' }, 409],
    ];
    for (const [c, status] of cases) {
      const { store, calls } = fakeStore(c);
      const r = await runFixture(store, { cropcycleId: ID, precipitationMmH: 9 }, NOW);
      assert.ok(!r.ok && r.status === status);
      assert.deepEqual(calls, ['get']);
    }
  });

  it('a reset only deletes today\'s advisory for that one crop', async () => {
    const { store, calls } = fakeStore(null);
    await resetFixture(store, ID, NOW);
    assert.deepEqual(calls, [`delete:${ID}:2026-12-01`]);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decideAdvisory,
  isRainExpected,
  maxRainInWindow,
  ripenessPct,
  MATURITY_DAYS,
} from '../supabase/functions/_shared/advisory-rule.ts';

// FT-06 and objective 4d: the rule changes at exactly 85% ripeness and
// exactly 7.5 mm of rain per hour.
describe('advisory rule, the two boundary lines', () => {
  it('rain exactly at 7.5 mm/h with ripeness exactly 85% is Advance Cut', () => {
    assert.equal(isRainExpected(7.5), true);
    assert.equal(decideAdvisory(isRainExpected(7.5), 0.85), 'Advance_Cut');
  });

  it('rain just under 7.5 mm/h is No Action Needed at any ripeness', () => {
    assert.equal(isRainExpected(7.49), false);
    for (const ripeness of [0, 0.5, 0.85, 1, 1.2]) {
      assert.equal(decideAdvisory(isRainExpected(7.49), ripeness), 'No_Action_Needed');
    }
  });

  it('rain at 7.5 mm/h with ripeness just under 85% is Delayed Harvest', () => {
    assert.equal(decideAdvisory(true, 0.8499), 'Delayed_Harvest');
    assert.equal(decideAdvisory(true, 0), 'Delayed_Harvest');
  });

  it('heavy rain with a ripe or over-ripe crop is Advance Cut', () => {
    assert.equal(decideAdvisory(isRainExpected(25), 0.95), 'Advance_Cut');
    assert.equal(decideAdvisory(isRainExpected(25), 1.4), 'Advance_Cut');
  });

  it('no rain at all is No Action Needed', () => {
    assert.equal(decideAdvisory(isRainExpected(0), 0.9), 'No_Action_Needed');
  });
});

describe('ripeness from the planting date and the variety category', () => {
  const today = new Date('2026-12-01T00:00:00Z');
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10);

  it('uses the maturity days Hybrid 110, Inbred 120, Specialty 122', () => {
    assert.deepEqual(MATURITY_DAYS, { Hybrid: 110, Inbred: 120, Specialty: 122 });
  });

  it('is days since planting over maturity days', () => {
    assert.equal(ripenessPct(daysAgo(60), 'Inbred', today), 0.5);
    assert.equal(ripenessPct(daysAgo(110), 'Hybrid', today), 1);
  });

  it('crosses 85% on day 94 for Hybrid, day 102 for Inbred and day 104 for Specialty', () => {
    assert.ok((ripenessPct(daysAgo(93), 'Hybrid', today) ?? 0) < 0.85);
    assert.ok((ripenessPct(daysAgo(94), 'Hybrid', today) ?? 0) >= 0.85);
    assert.ok((ripenessPct(daysAgo(101), 'Inbred', today) ?? 0) < 0.85);
    assert.ok((ripenessPct(daysAgo(102), 'Inbred', today) ?? 0) >= 0.85);
    assert.ok((ripenessPct(daysAgo(103), 'Specialty', today) ?? 0) < 0.85);
    assert.ok((ripenessPct(daysAgo(104), 'Specialty', today) ?? 0) >= 0.85);
  });

  it('is null for a category with no maturity days, so no advisory is written', () => {
    assert.equal(ripenessPct(daysAgo(100), 'Traditional', today), null);
    assert.equal(ripenessPct(daysAgo(100), 'Organic', today), null);
    assert.equal(ripenessPct(daysAgo(100), '', today), null);
  });

  it('the paired cases end to end: same rain, different planting dates', () => {
    const rain = isRainExpected(9);
    assert.equal(decideAdvisory(rain, ripenessPct(daysAgo(102), 'Inbred', today)!), 'Advance_Cut');
    assert.equal(decideAdvisory(rain, ripenessPct(daysAgo(60), 'Inbred', today)!), 'Delayed_Harvest');
  });
});

describe('rain window from the forecast slots', () => {
  const now = Date.UTC(2026, 11, 1, 0, 0, 0);
  const slot = (hoursAhead: number, mm3h: number) => ({
    dt: (now + hoursAhead * 3_600_000) / 1000,
    rain: { '3h': mm3h },
  });

  it('converts a 3 hour amount to mm per hour', () => {
    assert.equal(maxRainInWindow([slot(30, 22.5)], now), 7.5);
  });

  it('takes the heaviest slot inside the 24 to 48 hour window', () => {
    assert.equal(maxRainInWindow([slot(30, 3), slot(36, 30), slot(40, 6)], now), 10);
  });

  it('counts the window edges at exactly 24 and 48 hours', () => {
    assert.equal(maxRainInWindow([slot(24, 21)], now), 7);
    assert.equal(maxRainInWindow([slot(48, 21)], now), 7);
  });

  it('ignores slots before 24 hours and after 48 hours', () => {
    assert.equal(maxRainInWindow([slot(23.9, 90), slot(48.1, 90)], now), 0);
  });

  it('treats a slot with no rain field as zero and an empty forecast as zero', () => {
    assert.equal(maxRainInWindow([{ dt: (now + 30 * 3_600_000) / 1000 }], now), 0);
    assert.equal(maxRainInWindow([], now), 0);
  });

  it('a window max of exactly 7.5 mm/h triggers the rain rule', () => {
    assert.equal(isRainExpected(maxRainInWindow([slot(30, 22.5)], now)), true);
    assert.equal(isRainExpected(maxRainInWindow([slot(30, 22.4)], now)), false);
  });
});

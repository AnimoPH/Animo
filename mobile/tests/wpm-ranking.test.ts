import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeSort } from '../src/lib/merge-sort';
import {
  moistureScore,
  priceScore,
  rankListings,
  varietyScore,
  wpmScore,
} from '../src/services/marketplace-ranking';
import { SCORE_FLOOR, WPM_WEIGHTS } from '../src/types/marketplace-filter';
import type { CropListing } from '../src/types/crop-listing';

const listing = (
  id: string,
  pricePerKg: number,
  declaredMoisture: 'Wet' | 'Dry',
  declaredVariety: string,
): CropListing =>
  ({ id, pricePerKg, declaredMoisture, declaredVariety }) as unknown as CropListing;

const order = (ranked: { listing: CropListing }[]) => ranked.map((r) => r.listing.id);

// FT-04 and FT-05, objective 4c: exact scores and exact order.
describe('weighted product model', () => {
  it('uses the weights price 0.40, moisture 0.30, variety 0.30 and the 0.05 floor', () => {
    assert.deepEqual(WPM_WEIGHTS, { price: 0.4, moisture: 0.3, variety: 0.3 });
    assert.equal(SCORE_FLOOR, 0.05);
  });

  it('a full match scores 1 and the match tiers are x1.000, x0.407 and x0.166', () => {
    const score = (m: number, v: number) => wpmScore({ price: 1, moisture: m, variety: v });
    assert.equal(score(1, 1), 1);
    assert.ok(Math.abs(score(SCORE_FLOOR, 1) - 0.05 ** 0.3) < 1e-12);
    assert.ok(Math.abs(score(1, SCORE_FLOOR) - 0.05 ** 0.3) < 1e-12);
    assert.ok(Math.abs(score(SCORE_FLOOR, SCORE_FLOOR) - 0.05 ** 0.6) < 1e-12);
    assert.equal(score(SCORE_FLOOR, 1).toFixed(3), '0.407');
    assert.equal(score(SCORE_FLOOR, SCORE_FLOOR).toFixed(3), '0.166');
  });

  it('hand computed score: price 0.40 x moisture 0.30 x variety 0.30', () => {
    const expected = 0.5 ** 0.4 * 1 ** 0.3 * 0.05 ** 0.3;
    assert.ok(Math.abs(wpmScore({ price: 0.5, moisture: 1, variety: 0.05 }) - expected) < 1e-12);
  });

  it('price score is min-max across the result set: cheapest 1, dearest the floor, equal prices 1', () => {
    assert.equal(priceScore(10, 10, 20), 1);
    assert.equal(priceScore(20, 10, 20), SCORE_FLOOR);
    assert.ok(Math.abs(priceScore(15, 10, 20) - (SCORE_FLOOR + (1 - SCORE_FLOOR) * 0.5)) < 1e-12);
    assert.equal(priceScore(12, 12, 12), 1);
  });

  it('moisture and variety score 1 on a match or when there is no preference, the floor on a miss', () => {
    assert.equal(moistureScore('Dry', 'Dry'), 1);
    assert.equal(moistureScore('Wet', 'Dry'), SCORE_FLOOR);
    assert.equal(moistureScore('Wet', undefined), 1);
    assert.equal(varietyScore('Inbred', 'Inbred'), 1);
    assert.equal(varietyScore('Hybrid', 'Inbred'), SCORE_FLOOR);
    assert.equal(varietyScore('Others', 'Inbred'), SCORE_FLOOR);
  });
});

describe('ranking order', () => {
  it('ranks a full match above one mismatch above two mismatches at the same price', () => {
    const ranked = rankListings(
      [
        listing('both-miss', 15, 'Wet', 'Hybrid'),
        listing('one-miss', 15, 'Dry', 'Hybrid'),
        listing('match', 15, 'Dry', 'Inbred'),
      ],
      { moisture: 'Dry', variety: 'Inbred' } as never,
    );
    assert.deepEqual(order(ranked), ['match', 'one-miss', 'both-miss']);
    assert.equal(ranked[0].score, 1);
    assert.equal(ranked[1].score.toFixed(3), '0.407');
    assert.equal(ranked[2].score.toFixed(3), '0.166');
  });

  it('within a match tier the cheaper listing comes first', () => {
    const ranked = rankListings(
      [listing('dear', 18, 'Dry', 'Inbred'), listing('cheap', 14, 'Dry', 'Inbred'), listing('mid', 16, 'Dry', 'Inbred')],
      { moisture: 'Dry', variety: 'Inbred' } as never,
    );
    assert.deepEqual(order(ranked), ['cheap', 'mid', 'dear']);
  });

  it('a tie keeps the older listing first (input is oldest first)', () => {
    const ranked = rankListings(
      [listing('older', 15, 'Dry', 'Inbred'), listing('newer', 15, 'Dry', 'Inbred')],
      { moisture: 'Dry', variety: 'Inbred' } as never,
    );
    assert.equal(ranked[0].score, ranked[1].score);
    assert.deepEqual(order(ranked), ['older', 'newer']);
  });

  it('the exact order of a mixed set, scores hand computed', () => {
    // prices 14..18, so price scores are 1, .7625, .525, .2875, .05
    const ranked = rankListings(
      [
        listing('a', 14, 'Wet', 'Inbred'), // moisture miss
        listing('b', 15, 'Dry', 'Inbred'), // match
        listing('c', 16, 'Dry', 'Hybrid'), // variety miss
        listing('d', 17, 'Dry', 'Inbred'), // match
        listing('e', 18, 'Wet', 'Hybrid'), // both miss
      ],
      { moisture: 'Dry', variety: 'Inbred' } as never,
    );
    const price = (p: number) => SCORE_FLOOR + (1 - SCORE_FLOOR) * ((18 - p) / 4);
    const expected: Record<string, number> = {
      a: price(14) ** 0.4 * SCORE_FLOOR ** 0.3,
      b: price(15) ** 0.4,
      c: price(16) ** 0.4 * SCORE_FLOOR ** 0.3,
      d: price(17) ** 0.4,
      e: price(18) ** 0.4 * SCORE_FLOOR ** 0.6,
    };
    for (const r of ranked) assert.ok(Math.abs(r.score - expected[r.listing.id]) < 1e-12, r.listing.id);
    // hand computed: b 0.8972, d 0.6074, a 0.4071, c 0.3146, e 0.0500
    assert.deepEqual(order(ranked), ['b', 'd', 'a', 'c', 'e']);
  });

  it('an empty list and a single listing', () => {
    assert.deepEqual(rankListings([], {} as never), []);
    assert.deepEqual(order(rankListings([listing('only', 15, 'Dry', 'Inbred')], {} as never)), ['only']);
  });
});

describe('merge sort', () => {
  it('sorts and is stable', () => {
    const items = [
      { k: 3, n: 'a' }, { k: 1, n: 'b' }, { k: 3, n: 'c' }, { k: 2, n: 'd' }, { k: 1, n: 'e' }, { k: 3, n: 'f' },
    ];
    const sorted = mergeSort(items, (x, y) => x.k - y.k);
    assert.deepEqual(sorted.map((i) => i.n), ['b', 'e', 'd', 'a', 'c', 'f']);
  });

  it('matches Array.sort on random data and does not change its input', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const data = Array.from({ length: 500 }, () => Math.floor(rand() * 50));
    const copy = [...data];
    assert.deepEqual(mergeSort(data, (x, y) => x - y), [...data].sort((x, y) => x - y));
    assert.deepEqual(data, copy);
  });
});

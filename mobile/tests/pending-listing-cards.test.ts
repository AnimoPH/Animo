import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pendingListingCards } from '../src/lib/outbox/pending-listing-cards.ts';
import type { OutboxItem } from '../src/lib/outbox/types.ts';

function listing(id: string, status: OutboxItem['status'], createdAt: number, name = 'Palay A'): OutboxItem {
  return {
    id,
    userId: 'u1',
    kind: 'create_listing',
    status,
    attempts: 0,
    lastError: null,
    createdAt,
    payload: {
      seenPricePerKg: 18.82,
      photos: [{ type: 'Overview', uri: 'file:///photo.jpg' }],
      input: {
        listingName: name,
        declaredVariety: 'Inbred',
        varietyCode: 'OTHER',
        declaredMoisture: 'Dry',
        declaredPurityGrade: 'Ungraded',
        grossWeightKg: 520,
        tareWeightKg: 20,
      },
    },
  } as OutboxItem;
}

describe('listings waiting on the phone', () => {
  it('shows a saved listing with its name, net weight, price and photo', () => {
    const [card] = pendingListingCards([listing('a', 'pending', 1, '  Palay A ')]);
    assert.equal(card.name, 'Palay A');
    assert.equal(card.netWeightKg, 500);
    assert.equal(card.seenPricePerKg, 18.82);
    assert.equal(card.coverUri, 'file:///photo.jpg');
    assert.equal(card.state, 'waiting');
  });

  it('treats a send in progress as waiting', () => {
    assert.equal(pendingListingCards([listing('a', 'sending', 1)])[0].state, 'waiting');
  });

  it('marks a price change for review and a refused listing as failed', () => {
    const cards = pendingListingCards([listing('a', 'needs_review', 2), listing('b', 'failed', 1)]);
    assert.deepEqual(cards.map((c) => c.state), ['review', 'failed']);
  });

  it('lists the newest first', () => {
    const cards = pendingListingCards([listing('old', 'pending', 1), listing('new', 'pending', 9)]);
    assert.deepEqual(cards.map((c) => c.id), ['new', 'old']);
  });

  it('ignores saved actions that are not listings', () => {
    const request = { ...listing('r', 'pending', 5), kind: 'purchase_request', payload: { listingId: 'x', requestedQuantityKg: 50 } } as OutboxItem;
    assert.deepEqual(pendingListingCards([request]), []);
  });

  it('has no cards when nothing is waiting', () => {
    assert.deepEqual(pendingListingCards([]), []);
  });
});

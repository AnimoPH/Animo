import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { noticeTarget } from '../src/lib/notification-target.ts';

// The buyer's transaction screen is keyed by the purchase request, not the transaction.
describe('where an inbox row opens', () => {
  it('sends a buyer to the request id, never the transaction id', () => {
    assert.equal(
      noticeTarget('buyer', 'purchase_request_accepted', { transactionId: 't1', requestId: 'r1' }),
      '/(buyer)/transaksyon/r1',
    );
    assert.equal(
      noticeTarget('buyer', 'transaction_completed', { transactionId: 't1', requestId: 'r1' }),
      '/(buyer)/transaksyon/r1',
    );
  });

  it('opens nothing for a buyer row whose request id is unknown', () => {
    assert.equal(noticeTarget('buyer', 'transaction_completed', { transactionId: 't1' }), null);
  });

  it('sends a farmer to the transaction id', () => {
    assert.equal(
      noticeTarget('farmer', 'transaction_completed', { transactionId: 't1', requestId: 'r1' }),
      '/(farmer)/transaksyon/t1',
    );
  });

  it('keeps the farmer advisory and request notices', () => {
    assert.equal(noticeTarget('farmer', 'advisory', {}), '/(farmer)/advisory');
    assert.equal(noticeTarget('farmer', 'purchase_request_received', {}), '/(farmer)/(tabs)/transaksyon');
    assert.equal(noticeTarget('farmer', 'purchase_request_cancelled', {}), '/(farmer)/(tabs)/transaksyon');
  });

  it('opens nothing for kinds with no screen', () => {
    assert.equal(noticeTarget('buyer', 'purchase_request_rejected', { requestId: 'r1' }), null);
    assert.equal(noticeTarget('buyer', 'account_suspended', {}), null);
  });

  it('opens the trade from the payment and rating notices', () => {
    const ids = { transactionId: 't1', requestId: 'r1' };
    assert.equal(noticeTarget('farmer', 'payment_sent', ids), '/(farmer)/transaksyon/t1');
    assert.equal(noticeTarget('buyer', 'payment_confirmed', ids), '/(buyer)/transaksyon/r1');
    assert.equal(noticeTarget('farmer', 'rating_received', ids), '/(farmer)/transaksyon/t1');
    assert.equal(noticeTarget('buyer', 'rating_received', ids), '/(buyer)/transaksyon/r1');
  });
});

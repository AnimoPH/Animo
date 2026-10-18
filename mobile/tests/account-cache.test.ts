import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSession } from '../src/lib/account-cache.ts';
import type { Account } from '../src/types/auth.ts';

const farmer: Account = {
  id: 'u1',
  role: 'magsasaka',
  fullName: 'Test Farmer',
  phone: '09171234567',
  barangay: 'San Jose',
  gcashNumber: null,
  walletAddress: null,
  accountStatus: 'Active',
  dateRegistered: '2026-10-18',
};

// A weak signal or an offline app open must not look like being signed out.
describe('session after a profile check', () => {
  it('signs in with the account the server returned', () => {
    const view = resolveSession({ kind: 'ok', account: farmer }, null, 'u1');
    assert.equal(view.status, 'authenticated');
  });

  it('sends a verified number with no profile to registration', () => {
    const view = resolveSession({ kind: 'ok', account: null }, farmer, 'u1');
    assert.equal(view.status, 'needs-profile');
    assert.equal(view.account, null);
  });

  it('keeps the saved account when the check fails', () => {
    const view = resolveSession({ kind: 'failed' }, farmer, 'u1');
    assert.equal(view.status, 'authenticated');
    assert.equal(view.account?.id, 'u1');
  });

  it('does not reuse a saved account that belongs to someone else', () => {
    const view = resolveSession({ kind: 'failed' }, farmer, 'other-user');
    assert.equal(view.status, 'guest');
  });

  it('shows login when the check fails and nothing is saved', () => {
    const view = resolveSession({ kind: 'failed' }, null, 'u1');
    assert.equal(view.status, 'guest');
  });
});

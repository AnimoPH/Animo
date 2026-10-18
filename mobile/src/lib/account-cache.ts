import type { Account, SessionStatus } from '../types/auth.ts';

// What the app shows after it asks the server who the signed-in user is. A
// failed check (weak signal, app opened offline) must not look like "signed
// out", so the last good account stays on the phone and is used instead.

export type ProfileCheck = { kind: 'ok'; account: Account | null } | { kind: 'failed' };

export type SessionView =
  | { status: 'authenticated'; account: Account }
  | { status: Exclude<SessionStatus, 'authenticated'>; account: null };

export function resolveSession(
  check: ProfileCheck,
  cached: Account | null,
  userId: string,
): SessionView {
  if (check.kind === 'ok') {
    return check.account
      ? { status: 'authenticated', account: check.account }
      : { status: 'needs-profile', account: null };
  }
  if (cached && cached.id === userId) return { status: 'authenticated', account: cached };
  return { status: 'guest', account: null };
}

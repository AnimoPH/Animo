/**
 * A suspended account can look at everything, but the server refuses anything new
 * (listings, requests, payments, ratings...). The refusal used to reach the screen as
 * a raw database sentence, or a fixed line with no reason. This turns it into a
 * message that says the account is suspended, why, and who to contact.
 */

let current: { suspended: boolean; reason: string | null } = { suspended: false, reason: null };

/** The session calls this whenever it learns the account's status. */
export function setSuspension(suspended: boolean, reason: string | null | undefined): void {
  current = { suspended, reason: reason?.trim() ? reason.trim() : null };
}

export function suspensionState() {
  return current;
}

const NOTICE_START = 'Na-suspend ang iyong account';

export function suspensionMessage(reason: string | null): string {
  const tl = `${NOTICE_START}, kaya hindi ito magagawa.${reason ? ` Dahilan: ${reason}.` : ''} Makipag-ugnayan sa LGU.`;
  const en = `Your account is suspended, so this can't be done.${reason ? ` Reason: ${reason}.` : ''} Contact the LGU.`;
  return `${tl} (${en})`;
}

/** True for text produced by suspensionMessage. */
export function isSuspensionNotice(text: string): boolean {
  return text.includes(NOTICE_START);
}

/**
 * The error body the database sent, rewritten when it is a suspension refusal.
 * Returns null to leave the error alone. A row-level-security refusal is only
 * treated as a suspension when the session knows the account is suspended.
 */
export function rewriteSuspensionBody(
  body: unknown,
  state: { suspended: boolean; reason: string | null } = current,
): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message : '';
  if (!message || isSuspensionNotice(message)) return null;

  const saidSuspended = /account is suspended/i.test(message);
  const rlsRefusal = state.suspended && (record.code === '42501' || /row-level security/i.test(message));
  if (!saidSuspended && !rlsRefusal) return null;

  return { ...record, message: suspensionMessage(state.reason) };
}

/**
 * Wraps a fetch so that, when the database refuses an action because the account is
 * suspended, the error body carries suspensionMessage instead of a raw database sentence.
 * Anything it cannot read is returned untouched.
 */
export function withSuspensionMessages(fetchImpl: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await fetchImpl(input, init);
    if (response.ok) return response;
    try {
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('json')) return response;
      const next = rewriteSuspensionBody(JSON.parse(await response.clone().text()));
      if (!next) return response;
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      return new Response(JSON.stringify(next), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return response;
    }
  };
}

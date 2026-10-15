import type { OutboxHandlers, OutboxItem, OutboxStore } from './types';

export type FlushResult = {
  sent: number;
  failed: number;
  needsReview: number;
  /** True when the run stopped because there was no signal or a send hit a network error. */
  stoppedOffline: boolean;
};

export type ErrorClass = 'transient' | 'price_changed' | 'permanent';

const TRANSIENT_MESSAGE =
  /network request failed|failed to fetch|fetch failed|networkerror|network error|timed? ?out|econn|enotfound|offline/i;
const TRANSIENT_CODES = new Set(['57014', '08000', '08003', '08006', '53300']);

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

/**
 * transient: the signal dropped or the server could not be reached, keep the
 * item and try again. price_changed: the server refused the listing because
 * the peso on the feed is no longer the one the farmer saw. permanent: the
 * server answered no (validation, suspended account, reused GCash number),
 * retrying will not change that.
 */
export function classifyError(error: unknown): ErrorClass {
  const message = messageOf(error);
  if (message.toLowerCase().startsWith('price changed')) return 'price_changed';

  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (TRANSIENT_CODES.has(code)) return 'transient';

  const status =
    error && typeof error === 'object' && 'status' in error ? Number(error.status) : NaN;
  if (Number.isFinite(status) && status >= 500) return 'transient';

  if (TRANSIENT_MESSAGE.test(message)) return 'transient';
  return 'permanent';
}

type EngineDeps = {
  store: OutboxStore;
  handlers: OutboxHandlers;
  isOnline: () => Promise<boolean>;
  /** Network errors allowed per item before it is marked failed. */
  maxAttempts?: number;
};

/**
 * Sends saved actions in the order they were saved. One flush at a time: a
 * second call while one is running gets the same result back, so a reconnect
 * event and an app-foreground event cannot send an item twice. A network
 * error stops the run (the rest would fail the same way). Any other refusal
 * marks that item and moves on.
 */
export function createOutboxEngine({ store, handlers, isOnline, maxAttempts = 5 }: EngineDeps) {
  let running: Promise<FlushResult> | null = null;
  let recovered = false;

  async function sendOne(item: OutboxItem): Promise<'sent' | 'failed' | 'needs_review' | 'offline'> {
    await store.markSending(item.id);
    try {
      const handler = handlers[item.kind] as (payload: unknown, id: string) => Promise<void>;
      await handler(item.payload, item.id);
      await store.remove(item.id);
      return 'sent';
    } catch (error) {
      const message = messageOf(error);
      const kind = classifyError(error);
      if (kind === 'transient') {
        const attempts = item.attempts + 1;
        if (attempts >= maxAttempts) {
          await store.markFailed(item.id, attempts, message);
          return 'failed';
        }
        await store.markPending(item.id, attempts, message);
        return 'offline';
      }
      if (kind === 'price_changed') {
        await store.markNeedsReview(item.id, message);
        return 'needs_review';
      }
      await store.markFailed(item.id, item.attempts + 1, message);
      return 'failed';
    }
  }

  async function run(userId: string): Promise<FlushResult> {
    const result: FlushResult = { sent: 0, failed: 0, needsReview: 0, stoppedOffline: false };

    if (!recovered) {
      await store.resetSending();
      recovered = true;
    }
    if (!(await isOnline())) {
      result.stoppedOffline = true;
      return result;
    }

    const items = await store.listPending(userId);
    for (const item of items) {
      const outcome = await sendOne(item);
      if (outcome === 'sent') result.sent += 1;
      else if (outcome === 'failed') result.failed += 1;
      else if (outcome === 'needs_review') result.needsReview += 1;
      else {
        result.stoppedOffline = true;
        break;
      }
    }
    return result;
  }

  function flush(userId: string): Promise<FlushResult> {
    if (running) return running;
    running = run(userId).finally(() => {
      running = null;
    });
    return running;
  }

  return { flush };
}

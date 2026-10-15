import NetInfo from '@react-native-community/netinfo';

import { createOutboxEngine, type FlushResult } from './outbox-engine';
import { outboxHandlers } from './outbox-handlers';
import { openOutboxStore } from './outbox-store';
import type { NewOutboxItem, OutboxItem, OutboxStore } from './types';

let storePromise: Promise<OutboxStore> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** Calls back whenever the saved items change. Returns the unsubscribe function. */
export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
let engine: ReturnType<typeof createOutboxEngine> | null = null;

function getStore(): Promise<OutboxStore> {
  if (!storePromise) storePromise = openOutboxStore();
  return storePromise;
}

async function getEngine() {
  if (!engine) {
    engine = createOutboxEngine({
      store: await getStore(),
      handlers: outboxHandlers,
      isOnline: async () => {
        const state = await NetInfo.fetch();
        return Boolean(state.isConnected) && state.isInternetReachable !== false;
      },
    });
  }
  return engine;
}

/** Saves an action on the phone. The same id saved twice is kept once. */
export async function enqueueOutboxItem(item: NewOutboxItem): Promise<void> {
  await (await getStore()).enqueue(item);
  notify();
}

/** What is still on the phone for this user, for the pending banner. */
export async function listOutboxItems(userId: string): Promise<OutboxItem[]> {
  return (await getStore()).listAll(userId);
}

export async function removeOutboxItem(id: string): Promise<void> {
  await (await getStore()).remove(id);
  notify();
}

/** Sends a listing again with the new peso the farmer just confirmed. */
export async function resendListingWithPrice(item: OutboxItem<'create_listing'>, seenPricePerKg: number): Promise<void> {
  await (await getStore()).requeue(item.id, { ...item.payload, seenPricePerKg });
  notify();
}

export async function flushOutbox(userId: string): Promise<FlushResult> {
  const result = await (await getEngine()).flush(userId);
  notify();
  return result;
}

export { computeLockedPrice, getCachedPriceFeed, refreshPriceFeedCache } from './price-feed-cache';
export type { PriceFeedCache } from './price-feed-cache';
export type { OutboxItem, OutboxKind, OutboxPayloads } from './types';

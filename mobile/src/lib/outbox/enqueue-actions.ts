import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';

import type { CreateCropListingInput, PhotoType } from '@/types/crop-listing';

import { classifyError } from './outbox-engine';
import { enqueueOutboxItem } from './index';
import { keepOutboxPhotos } from './photo-files';
import type { OutboxPayloads } from './types';

export async function isOnlineNow(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

/** True when a failed call looks like a dropped signal, so the action can be saved instead. */
export function isSignalError(error: unknown): boolean {
  return classifyError(error) === 'transient';
}

export function newRequestId(): string {
  return Crypto.randomUUID();
}

export async function saveListingOffline(
  userId: string,
  input: CreateCropListingInput,
  photos: Partial<Record<PhotoType, string>>,
  seenPricePerKg: number | null,
  requestId?: string,
): Promise<void> {
  const id = requestId ?? newRequestId();
  const kept = await keepOutboxPhotos(id, photos);
  await enqueueOutboxItem({
    id,
    userId,
    kind: 'create_listing',
    payload: { seenPricePerKg, input, photos: kept },
  });
}

export async function savePurchaseRequestOffline(
  userId: string,
  payload: OutboxPayloads['purchase_request'],
  requestId?: string,
): Promise<void> {
  await enqueueOutboxItem({ id: requestId ?? newRequestId(), userId, kind: 'purchase_request', payload });
}

export async function saveBuyerPaymentOffline(
  userId: string,
  payload: OutboxPayloads['buyer_payment'],
  requestId?: string,
): Promise<void> {
  await enqueueOutboxItem({ id: requestId ?? newRequestId(), userId, kind: 'buyer_payment', payload });
}

export async function saveBuyerConfirmOffline(userId: string, paymentId: string): Promise<void> {
  // The payment id is the key: confirming the same payment twice is one action.
  await enqueueOutboxItem({
    id: `buyer-confirm-${paymentId}`,
    userId,
    kind: 'buyer_confirm_payment',
    payload: { paymentId },
  });
}

export async function saveFarmerConfirmOffline(userId: string, paymentId: string): Promise<void> {
  await enqueueOutboxItem({
    id: `farmer-confirm-${paymentId}`,
    userId,
    kind: 'farmer_confirm_payment',
    payload: { paymentId },
  });
}

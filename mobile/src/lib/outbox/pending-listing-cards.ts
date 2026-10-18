import type { OutboxItem } from './types.ts';

// Listings the farmer saved offline that the server does not have yet. Aking Ani
// shows them as cards so a saved listing does not look like it vanished.

export type PendingListingState = 'waiting' | 'review' | 'failed';

export type PendingListingCard = {
  id: string;
  name: string;
  netWeightKg: number;
  seenPricePerKg: number | null;
  coverUri: string | null;
  state: PendingListingState;
};

export function pendingListingCards(items: OutboxItem[]): PendingListingCard[] {
  return items
    .filter((item): item is OutboxItem<'create_listing'> => item.kind === 'create_listing')
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((item) => {
      const { input, photos, seenPricePerKg } = item.payload;
      return {
        id: item.id,
        name: input.listingName.trim(),
        netWeightKg: Math.max(0, input.grossWeightKg - input.tareWeightKg),
        seenPricePerKg,
        coverUri: photos[0]?.uri ?? null,
        state:
          item.status === 'needs_review' ? 'review' : item.status === 'failed' ? 'failed' : 'waiting',
      };
    });
}

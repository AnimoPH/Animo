import * as FileSystem from 'expo-file-system/legacy';

import type { PhotoType } from '@/types/crop-listing';

/**
 * Listing photos picked while offline sit in the cache folder, which the system
 * may clear. They are copied next to the outbox row and deleted once the
 * listing is sent.
 */
function folderFor(requestId: string): string {
  return `${FileSystem.documentDirectory}outbox/${requestId}/`;
}

export async function keepOutboxPhotos(
  requestId: string,
  photos: Partial<Record<PhotoType, string>>,
): Promise<{ type: PhotoType; uri: string }[]> {
  const folder = folderFor(requestId);
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });

  const kept: { type: PhotoType; uri: string }[] = [];
  for (const type of Object.keys(photos) as PhotoType[]) {
    const from = photos[type];
    if (!from) continue;
    const to = `${folder}${type}.jpg`;
    await FileSystem.copyAsync({ from, to });
    kept.push({ type, uri: to });
  }
  return kept;
}

export async function deleteOutboxPhotos(requestId: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(folderFor(requestId), { idempotent: true });
  } catch {
    // A leftover folder is harmless, the listing is already sent.
  }
}

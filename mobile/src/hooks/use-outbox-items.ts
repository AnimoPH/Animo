import { useCallback, useEffect, useState } from 'react';

import { listOutboxItems, subscribeOutbox, type OutboxItem } from '@/lib/outbox';

/** The actions this user's phone still has to send, kept in step with the outbox. */
export function useOutboxItems(userId: string | null): OutboxItem[] {
  const [items, setItems] = useState<OutboxItem[]>([]);

  const load = useCallback(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    listOutboxItems(userId)
      .then(setItems)
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    load();
    return subscribeOutbox(load);
  }, [load]);

  return items;
}

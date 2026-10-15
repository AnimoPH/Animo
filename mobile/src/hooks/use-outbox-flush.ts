import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { flushOutbox, refreshPriceFeedCache } from '@/lib/outbox';

/**
 * Sends what the phone saved offline and refreshes the cached price feed:
 * once after sign-in, when the signal comes back, and when the app returns to
 * the foreground. Failures are swallowed here, the items stay on the phone.
 */
export function useOutboxFlush(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const run = () => {
      refreshPriceFeedCache().catch(() => {});
      flushOutbox(userId).catch(() => {});
    };

    run();
    let wasConnected = true;
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected) && state.isInternetReachable !== false;
      if (connected && !wasConnected) run();
      wasConnected = connected;
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });

    return () => {
      unsubscribeNet();
      appState.remove();
    };
  }, [userId]);
}

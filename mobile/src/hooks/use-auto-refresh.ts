import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 20_000;

/**
 * Refetches `onRefresh` on a timer while the screen is focused, and
 * immediately when connectivity is restored after a drop — so a screen the
 * user is already looking at picks up new data without them navigating
 * away and back or pulling to refresh. Both of those still work
 * independently; this only adds the "nothing needed at all" path reviewers
 * asked for (Sec. 21.12 / AG.12 — Oris, Nuez, Malulan).
 *
 * Deliberately not Supabase Realtime: a polling interval + reconnect
 * listener reuses each screen's existing RLS-protected fetch function
 * as-is, with no new data-exposure surface to review. `onRefresh` should be
 * safe to call repeatedly and cheap to no-op if a fetch is already in
 * flight — screens already guard this via `latestRequestId`/`cancelled`
 * patterns for pull-to-refresh, so no new guard is added here.
 *
 * Focus is tracked internally via `useFocusEffect` (same one every screen
 * already uses for its initial load) rather than `useIsFocused`, which
 * isn't re-exported by `expo-router` or `@react-navigation/native` here.
 */
export function useAutoRefresh(onRefresh: () => void, intervalMs: number = DEFAULT_INTERVAL_MS) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => onRefreshRef.current(), intervalMs);

      let wasConnected = true;
      const unsubscribe = NetInfo.addEventListener((state) => {
        const isConnected = state.isConnected ?? true;
        if (isConnected && !wasConnected) {
          onRefreshRef.current();
        }
        wasConnected = isConnected;
      });

      return () => {
        clearInterval(interval);
        unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalMs]),
  );
}

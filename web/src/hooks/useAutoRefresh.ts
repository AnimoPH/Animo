import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 20_000;

/**
 * Refetches `onRefresh` on a timer while the page is mounted, and
 * immediately when the browser regains connectivity after a drop — so an
 * open LGU console page picks up new data without the user reloading or
 * navigating away and back. Mirrors mobile's `useAutoRefresh`
 * (mobile/src/hooks/use-auto-refresh.ts) — same reasoning, browser
 * equivalents: `setInterval` + the `online` window event instead of
 * `useFocusEffect` + NetInfo.
 *
 * Deliberately not Supabase Realtime — reuses each page's existing
 * RLS-protected fetch function as-is, no new data-exposure surface.
 */
export function useAutoRefresh(onRefresh: () => void, intervalMs: number = DEFAULT_INTERVAL_MS) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const interval = window.setInterval(() => onRefreshRef.current(), intervalMs);

    const handleOnline = () => onRefreshRef.current();
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [intervalMs]);
}

import { Redirect, Tabs, useFocusEffect } from 'expo-router';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';

import { AnimoTabBar, type TabItem } from '@/components/animo/animo-tab-bar';
import { homeRouteForRole } from '@/constants/roles';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useSession } from '@/hooks/use-session';
import { fetchBuyerPurchaseOutcomes } from '@/services/transaction-service';
import { deriveDisplayStage, isBuyerNeedsActionStage } from '@/types/transaction';

/** Bottom navigation for the buyer (Mamimili) module. */
const BUYER_TAB_DEFS: Omit<TabItem, 'showBadge'>[] = [
  { name: 'index', label: 'Tahanan', labelKey: 'tab.home', icon: { outline: 'home-outline', filled: 'home' } },
  {
    name: 'palengke',
    label: 'Palengke',
    labelKey: 'tab.market',
    icon: { outline: 'bag-handle-outline', filled: 'bag-handle' },
    rootScreen: 'index',
  },
  { name: 'transaksyon', label: 'Transaksyon', labelKey: 'tab.transactions', icon: { outline: 'receipt-outline', filled: 'receipt' } },
  { name: 'profile', label: 'Profile', labelKey: 'tab.profile', icon: { outline: 'person-outline', filled: 'person' } },
];

/**
 * Sub-screens inside the Palengke stack that are focused sub-flows and should
 * hide the tab bar (they have their own bottom action button).
 */
const PALENGKE_FULLSCREEN = ['[id]', 'bid', 'magsasaka/[id]', 'magsasaka'];

/**
 * Transaction sub-screens that own their own bottom action button, so the tab
 * bar steps aside. Only the history list keeps it.
 */
const TRANSAKSYON_FULLSCREEN = ['[id]'];

export default function BuyerLayout() {
  const { status, account } = useSession();
  const [transaksyonNeedsAction, setTransaksyonNeedsAction] = useState(false);

  const isBuyerSession = status === 'authenticated' && account?.role === 'mamimili';

  const checkNeedsAction = useCallback(async () => {
    if (!isBuyerSession) return;
    try {
      const outcomes = await fetchBuyerPurchaseOutcomes();
      setTransaksyonNeedsAction(
        outcomes.some((outcome) => isBuyerNeedsActionStage(deriveDisplayStage(outcome))),
      );
    } catch {
      // Keep the last known badge state on transient failures.
    }
  }, [isBuyerSession]);

  useFocusEffect(
    useCallback(() => {
      void checkNeedsAction();
    }, [checkNeedsAction]),
  );

  useAutoRefresh(
    useCallback(() => {
      void checkNeedsAction();
    }, [checkNeedsAction]),
  );

  const items = useMemo<TabItem[]>(
    () =>
      BUYER_TAB_DEFS.map((tab) =>
        tab.name === 'transaksyon' ? { ...tab, showBadge: transaksyonNeedsAction } : tab,
      ),
    [transaksyonNeedsAction],
  );

  // Guards the group against deep-links — an unauthenticated user or a
  // signed-in farmer landing here gets bounced to the right screen instead of
  // seeing the buyer module.
  if (status !== 'authenticated' || !account) {
    return <Redirect href="/login" />;
  }
  if (account.role !== 'mamimili') {
    return <Redirect href={homeRouteForRole(account.role)} />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimoTabBar {...props} items={items} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen
        name="palengke"
        options={({ route }) => {
          // Hide the tab bar on listing detail / bid, keep it on the list.
          const focused = getFocusedRouteNameFromRoute(route) ?? 'index';
          return { tabBarStyle: PALENGKE_FULLSCREEN.includes(focused) ? { display: 'none' } : undefined };
        }}
      />
      <Tabs.Screen
        name="transaksyon"
        options={({ route }) => {
          // Hide the tab bar on a request's status + payment flow.
          const focused = getFocusedRouteNameFromRoute(route) ?? 'index';
          return {
            tabBarStyle: TRANSAKSYON_FULLSCREEN.includes(focused)
              ? { display: 'none' }
              : undefined,
          };
        }}
      />
      <Tabs.Screen name="profile" />
      <Tabs.Screen
        name="notipikasyon"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

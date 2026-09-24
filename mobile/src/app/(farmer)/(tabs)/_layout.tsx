import { Redirect, Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { AnimoTabBar, type TabItem } from '@/components/animo/animo-tab-bar';
import { homeRouteForRole } from '@/constants/roles';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useSession } from '@/hooks/use-session';
import { fetchPendingPurchaseRequestCountsByListing } from '@/services/purchase-request-service';

/** Bottom navigation for the farmer (Magsasaka) module. */
const FARMER_TAB_DEFS: Omit<TabItem, 'showBadge'>[] = [
  { name: 'index', label: 'Tahanan', labelKey: 'tab.home', icon: { outline: 'home-outline', filled: 'home' } },
  { name: 'palengke', label: 'Aking Ani', labelKey: 'tab.myHarvest', icon: { outline: 'leaf-outline', filled: 'leaf' } },
  { name: 'transaksyon', label: 'Transaksyon', labelKey: 'tab.transactions', icon: { outline: 'receipt-outline', filled: 'receipt' } },
  { name: 'profile', label: 'Profile', labelKey: 'tab.profile', icon: { outline: 'person-outline', filled: 'person' } },
];

export default function FarmerLayout() {
  const { status, account } = useSession();
  const [transaksyonNeedsAction, setTransaksyonNeedsAction] = useState(false);

  const isFarmerSession = status === 'authenticated' && account?.role === 'magsasaka';

  const checkNeedsAction = useCallback(async () => {
    if (!isFarmerSession) return;
    try {
      const counts = await fetchPendingPurchaseRequestCountsByListing();
      let any = false;
      for (const n of counts.values()) {
        if (n > 0) {
          any = true;
          break;
        }
      }
      setTransaksyonNeedsAction(any);
    } catch {
      // Keep the last known badge state on transient failures.
    }
  }, [isFarmerSession]);

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
      FARMER_TAB_DEFS.map((tab) =>
        tab.name === 'transaksyon' ? { ...tab, showBadge: transaksyonNeedsAction } : tab,
      ),
    [transaksyonNeedsAction],
  );

  // Guards the group against deep-links — an unauthenticated user or a
  // signed-in buyer landing here gets bounced to the right screen instead of
  // seeing the farmer module.
  if (status !== 'authenticated' || !account) {
    return <Redirect href="/login" />;
  }
  if (account.role !== 'magsasaka') {
    return <Redirect href={homeRouteForRole(account.role)} />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimoTabBar {...props} items={items} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="palengke" />
      <Tabs.Screen name="transaksyon" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

import { Redirect, Tabs, useFocusEffect, useSegments } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Home, Receipt, Sprout, User } from 'lucide-react-native';
import { View } from 'react-native';

import { AnimoTabBar, type TabItem } from '@/components/animo/animo-tab-bar';
import { OutboxBanner } from '@/components/animo/outbox-banner';
import { homeRouteForRole } from '@/constants/roles';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useSession } from '@/hooks/use-session';
import { fetchPendingPurchaseRequestCountsByListing } from '@/services/purchase-request-service';
import { fetchFarmerTransactions } from '@/services/transaction-service';
import { displayStageForMatch, isFarmerNeedsActionStage } from '@/types/transaction';

/** Bottom navigation for the farmer (Magsasaka) module. */
const FARMER_TAB_DEFS: Omit<TabItem, 'showBadge' | 'badgeCount'>[] = [
  { name: 'index', label: 'Tahanan', labelKey: 'tab.home', icon: { outline: 'home-outline', filled: 'home' }, lucide: Home },
  { name: 'palengke', label: 'Aking Ani', labelKey: 'tab.myHarvest', icon: { outline: 'leaf-outline', filled: 'leaf' }, lucide: Sprout },
  { name: 'transaksyon', label: 'Transaksyon', labelKey: 'tab.transactions', icon: { outline: 'receipt-outline', filled: 'receipt' }, lucide: Receipt },
  { name: 'profile', label: 'Profile', labelKey: 'tab.profile', icon: { outline: 'person-outline', filled: 'person' }, lucide: User },
];

/** Clears the tab bar (~110) plus the sticky 76px button area on Aking Ani. */
const AKING_ANI_BANNER_BOTTOM = 196;

export default function FarmerLayout() {
  const { status, account } = useSession();
  const segments = useSegments();
  const onAkingAni = segments[segments.length - 1] === 'palengke';
  const [transaksyonNeedsAction, setTransaksyonNeedsAction] = useState(false);
  /** Pending purchase requests across all listings (red count badge on Aking Ani). */
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const isFarmerSession = status === 'authenticated' && account?.role === 'magsasaka';

  const checkNeedsAction = useCallback(async () => {
    if (!isFarmerSession) return;
    try {
      const [counts, transactions] = await Promise.all([
        fetchPendingPurchaseRequestCountsByListing(),
        fetchFarmerTransactions().catch(() => []),
      ]);
      setPendingRequestCount([...counts.values()].reduce((sum, n) => sum + n, 0));
      setTransaksyonNeedsAction(
        transactions.some((tx) => isFarmerNeedsActionStage(displayStageForMatch(tx))),
      );
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
      FARMER_TAB_DEFS.map((tab) => {
        if (tab.name === 'transaksyon') return { ...tab, showBadge: transaksyonNeedsAction };
        if (tab.name === 'palengke') return { ...tab, badgeCount: pendingRequestCount };
        return tab;
      }),
    [transaksyonNeedsAction, pendingRequestCount],
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
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <AnimoTabBar {...props} items={items} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="palengke" />
        <Tabs.Screen name="transaksyon" />
        <Tabs.Screen name="profile" />
      </Tabs>
      {/* On Aking Ani the sticky "Bagong Listing" button sits above the tab bar, so lift the banner over it. */}
      <OutboxBanner bottomOffset={onAkingAni ? AKING_ANI_BANNER_BOTTOM : undefined} />
    </View>
  );
}

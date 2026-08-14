import { Tabs } from 'expo-router';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Home, ShoppingBag, ReceiptText, User } from 'lucide-react-native';

import { AnimoTabBar, type TabItem } from '@/components/animo/animo-tab-bar';

/** Bottom navigation for the buyer (Mamimili) module. */
const BUYER_TABS: TabItem[] = [
  { name: 'index', label: 'Tahanan', icon: Home },
  { name: 'palengke', label: 'Palengke', icon: ShoppingBag, rootScreen: 'index' },
  { name: 'transaksyon', label: 'Transaksyon', icon: ReceiptText },
  { name: 'profile', label: 'Profile', icon: User },
];

/**
 * Sub-screens inside the Palengke stack that are focused sub-flows and should
 * hide the tab bar (they have their own bottom action button).
 */
const PALENGKE_FULLSCREEN = ['[id]', 'bid'];

/**
 * Transaction sub-screens that own their own bottom action button, so the tab
 * bar steps aside. Only the history list keeps it.
 */
const TRANSAKSYON_FULLSCREEN = ['[id]'];

export default function BuyerLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimoTabBar {...props} items={BUYER_TABS} />}>
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

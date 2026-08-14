import { Redirect, Tabs } from 'expo-router';
import { Home, ReceiptText, Sprout, User } from 'lucide-react-native';

import { AnimoTabBar, type TabItem } from '@/components/animo/animo-tab-bar';
import { homeRouteForRole } from '@/constants/roles';
import { useSession } from '@/hooks/use-session';

/** Bottom navigation for the farmer (Magsasaka) module. */
const FARMER_TABS: TabItem[] = [
  { name: 'index', label: 'Tahanan', icon: Home },
  { name: 'listings', label: 'Aking Ani', icon: Sprout },
  { name: 'transaksyon', label: 'Transaksyon', icon: ReceiptText },
  { name: 'profile', label: 'Profile', icon: User },
];

export default function FarmerLayout() {
  const { status, account } = useSession();

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
      tabBar={(props) => <AnimoTabBar {...props} items={FARMER_TABS} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="listings" />
      <Tabs.Screen name="transaksyon" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

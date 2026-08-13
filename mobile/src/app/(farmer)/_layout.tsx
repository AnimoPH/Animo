import { Tabs } from 'expo-router';
import { Home, ReceiptText, Sprout, User } from 'lucide-react-native';

import { AnimoTabBar, type TabItem } from '@/components/animo/animo-tab-bar';

/** Bottom navigation for the farmer (Magsasaka) module. */
const FARMER_TABS: TabItem[] = [
  { name: 'index', label: 'Tahanan', icon: Home },
  { name: 'palengke', label: 'Aking Ani', icon: Sprout },
  { name: 'transaksyon', label: 'Transaksyon', icon: ReceiptText },
  { name: 'profile', label: 'Profile', icon: User },
];

export default function FarmerLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimoTabBar {...props} items={FARMER_TABS} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="palengke" />
      <Tabs.Screen name="transaksyon" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

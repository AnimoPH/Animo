import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Megaphone,
  ShoppingBag,
  Star,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { FilterChips } from '@/components/animo/filter-chips';
import { BackHeader } from '@/components/animo/back-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

type NotificationCategory = 'lahat' | 'transaksyon' | 'palengke' | 'sistema';

type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timeAgo: string;
  read: boolean;
  type: 'accepted' | 'schedule' | 'payment' | 'review' | 'listing' | 'system';
  targetRoute?: string;
};

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    category: 'transaksyon',
    title: 'Tinanggap ang iyong Order!',
    message: 'Tinanggap ni Juan Dela Cruz ang iyong order para sa 500 kg ng Palay RC160.',
    timeAgo: '5 minuto ang nakalipas',
    read: false,
    type: 'accepted',
    targetRoute: '/(buyer)/transaksyon/pr-scheduled/pickup',
  },
  {
    id: 'n-2',
    category: 'transaksyon',
    title: 'Nakaiskedyul ang Pickup',
    message: 'Nakatakda ang pickup bukas, Okt 18 sa ganap na 8:00 AM - 10:00 AM sa Bukid 1A, Antipolo.',
    timeAgo: '1 oras ang nakalipas',
    read: false,
    type: 'schedule',
    targetRoute: '/(buyer)/transaksyon/pr-scheduled/pickup',
  },
  {
    id: 'n-3',
    category: 'transaksyon',
    title: 'Nakumpirma ang Bayad',
    message: 'Matagumpay na natanggap ang ₱8,000.00 sa pamamagitan ng GCash (GC-8846702).',
    timeAgo: '2 oras ang nakalipas',
    read: false,
    type: 'payment',
    targetRoute: '/(buyer)/transaksyon/pr-completed/resibo',
  },
  {
    id: 'n-4',
    category: 'transaksyon',
    title: 'Mag-iwan ng Review',
    message: 'Kumpleto na ang iyong transaksyon kay Juan Dela Cruz. Ibahagi ang iyong karanasan!',
    timeAgo: '1 araw ang nakalipas',
    read: true,
    type: 'review',
    targetRoute: '/(buyer)/transaksyon/pr-completed/review',
  },
  {
    id: 'n-5',
    category: 'palengke',
    title: 'Bagong Ani sa Palengke',
    message: 'Naglista si Pedro Ramos ng 200 kg na Palay RC 638 SR sa Antipolo sa halagang ₱15.50/kg.',
    timeAgo: '1 araw ang nakalipas',
    read: true,
    type: 'listing',
    targetRoute: '/(buyer)/palengke',
  },
  {
    id: 'n-6',
    category: 'sistema',
    title: 'Opisyal na Presyo ng LGU',
    message: 'Inilabas na ng Tanggapan ng Pagsasaka ang opisyal na suggested retail price ng palay para sa linggong ito sa Antipolo at Rizal.',
    timeAgo: '3 araw ang nakalipas',
    read: true,
    type: 'system',
  },
];

const CATEGORY_FILTERS: { value: NotificationCategory; label: string }[] = [
  { value: 'lahat', label: 'Lahat' },
  { value: 'transaksyon', label: 'Transaksyon' },
  { value: 'palengke', label: 'Palengke' },
  { value: 'sistema', label: 'Sistema' },
];

/**
 * Mga Notipikasyon — Buyer notifications screen with filter chips and sample updates.
 */
export default function NotificationsScreen() {
  const [filter, setFilter] = useState<NotificationCategory>('lahat');
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

  const filteredItems = notifications.filter(
    (n) => filter === 'lahat' || n.category === filter
  );

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    if (item.targetRoute) {
      router.push(item.targetRoute as any);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'accepted':
        return <CheckCircle2 size={20} color={AnimoColors.green} />;
      case 'schedule':
        return <CalendarDays size={20} color="#2563A8" />;
      case 'payment':
        return <CreditCard size={20} color={AnimoColors.green} />;
      case 'review':
        return <Star size={20} color="#F5A623" fill="#F5A623" />;
      case 'listing':
        return <ShoppingBag size={20} color={AnimoColors.green} />;
      case 'system':
        return <Megaphone size={20} color="#B4791A" />;
    }
  };

  const getIconBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'accepted':
      case 'payment':
      case 'listing':
        return AnimoColors.greenTint;
      case 'schedule':
        return '#EAF2FB';
      case 'review':
        return '#FFF6E5';
      case 'system':
        return '#FDF6E4';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackHeader title="Mga Notipikasyon" />

      <View style={styles.filterBar}>
        <FilterChips
          options={CATEGORY_FILTERS}
          value={filter}
          onChange={setFilter}
        />
        <Pressable onPress={handleMarkAllAsRead} hitSlop={8} style={styles.readAllButton}>
          <AnimoText variant="caption" color={AnimoColors.green}>
            Basahin Lahat
          </AnimoText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {filteredItems.map((item) => (
          <Pressable
            key={item.id}
            style={[
              styles.notificationCard,
              !item.read && styles.unreadCard,
            ]}
            onPress={() => handleNotificationPress(item)}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: getIconBg(item.type) },
              ]}>
              {getIcon(item.type)}
            </View>

            <View style={styles.textWrap}>
              <View style={styles.topRow}>
                <AnimoText
                  variant="bodyEmphasis"
                  color={AnimoColors.black}
                  style={styles.flex}>
                  {item.title}
                </AnimoText>
                {!item.read && <View style={styles.unreadDot} />}
              </View>

              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                {item.message}
              </AnimoText>

              <AnimoText variant="tag" color={AnimoColors.muted}>
                {item.timeAgo}
              </AnimoText>
            </View>

            {item.targetRoute && (
              <ChevronRight size={18} color={AnimoColors.muted} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  filterBar: {
    paddingVertical: AnimoSpacing.sm,
    gap: AnimoSpacing.xs,
  },
  readAllButton: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.xs,
    alignSelf: 'flex-end',
  },
  list: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.white,
  },
  unreadCard: {
    borderColor: AnimoColors.green,
    backgroundColor: '#F7FCF7',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AnimoColors.green,
  },
});

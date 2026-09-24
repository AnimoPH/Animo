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
import { BackHeader } from '@/components/animo/back-header';
import { FilterChips } from '@/components/animo/filter-chips';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

import { useLanguage } from '@/hooks/use-language';

type NotificationCategory = 'lahat' | 'transaksyon' | 'palengke' | 'sistema';

type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timeAgo: string;
  read: boolean;
  type: 'request' | 'schedule' | 'payment' | 'review' | 'market' | 'system';
  targetRoute?: string;
};

const SAMPLE_FARMER_NOTIFICATIONS_TL: NotificationItem[] = [
  {
    id: 'fn-1',
    category: 'transaksyon',
    title: 'Bagong Purchase Request!',
    message: 'Nagpadala si Mateo Santos ng kahilingan sa pagbili para sa 300 kg ng Inbred (RC 218).',
    timeAgo: '5 minuto ang nakalipas',
    read: false,
    type: 'request',
    targetRoute: '/(farmer)/transaksyon/t-1',
  },
  {
    id: 'fn-2',
    category: 'transaksyon',
    title: 'Itinakda ang Iskedyul ng Pickup',
    message: 'Nakatakda ang pickup at inspeksyon bukas, 08:00 AM - 10:00 AM sa iyong bukid sa Brgy. San Jose, Antipolo.',
    timeAgo: '1 oras ang nakalipas',
    read: false,
    type: 'schedule',
    targetRoute: '/(farmer)/transaksyon/t-1',
  },
  {
    id: 'fn-3',
    category: 'transaksyon',
    title: 'Nakumpirma ang Bayad ng Mamimili',
    message: 'Matagumpay na natanggap ang ₱13,800.00 mula kay Bulacan Rice Traders sa pamamagitan ng GCash.',
    timeAgo: '3 oras ang nakalipas',
    read: false,
    type: 'payment',
    targetRoute: '/(farmer)/transaksyon/t-2',
  },
  {
    id: 'fn-4',
    category: 'transaksyon',
    title: 'Bagong Rating at Feedback',
    message: 'Nag-iwan si Maria Santos ng 5.0 ★ review: "Napakaganda ng kalidad at eksakto ang timbang ng sako."',
    timeAgo: '1 araw ang nakalipas',
    read: true,
    type: 'review',
    targetRoute: '/(farmer)/(tabs)/profile',
  },
  {
    id: 'fn-5',
    category: 'palengke',
    title: 'Mataas na Demand sa Palay',
    message: 'Mataas ang demand para sa tuyong Palay RC 160 at NSIC Rc222 sa Antipolo at karatig-bayan ngayong linggo.',
    timeAgo: '1 araw ang nakalipas',
    read: true,
    type: 'market',
    targetRoute: '/(farmer)/(tabs)/palengke',
  },
  {
    id: 'fn-6',
    category: 'sistema',
    title: 'Opisyal na Presyo ng LGU Antipolo',
    message: 'Inilabas na ng Tanggapan ng Pagsasaka ang pinakabagong suggested farmgate price bulletin para sa palay sa Rizal.',
    timeAgo: '3 araw ang nakalipas',
    read: true,
    type: 'system',
    targetRoute: '/(farmer)/advisory',
  },
];

const SAMPLE_FARMER_NOTIFICATIONS_EN: NotificationItem[] = [
  {
    id: 'fn-1',
    category: 'transaksyon',
    title: 'New Purchase Request!',
    message: 'Mateo Santos submitted a purchase request for 300 kg of Inbred (RC 218).',
    timeAgo: '5 minutes ago',
    read: false,
    type: 'request',
    targetRoute: '/(farmer)/transaksyon/t-1',
  },
  {
    id: 'fn-2',
    category: 'transaksyon',
    title: 'Pickup Schedule Set',
    message: 'Pickup and inspection scheduled tomorrow, 08:00 AM - 10:00 AM at your farm in Brgy. San Jose, Antipolo.',
    timeAgo: '1 hour ago',
    read: false,
    type: 'schedule',
    targetRoute: '/(farmer)/transaksyon/t-1',
  },
  {
    id: 'fn-3',
    category: 'transaksyon',
    title: 'Buyer Payment Confirmed',
    message: 'Successfully received ₱13,800.00 from Bulacan Rice Traders via GCash.',
    timeAgo: '3 hours ago',
    read: false,
    type: 'payment',
    targetRoute: '/(farmer)/transaksyon/t-2',
  },
  {
    id: 'fn-4',
    category: 'transaksyon',
    title: 'New Rating and Feedback',
    message: 'Maria Santos left a 5.0 ★ review: "Excellent quality and accurate sack weight."',
    timeAgo: '1 day ago',
    read: true,
    type: 'review',
    targetRoute: '/(farmer)/(tabs)/profile',
  },
  {
    id: 'fn-5',
    category: 'palengke',
    title: 'High Demand for Palay',
    message: 'High demand for dry Palay RC 160 and NSIC Rc222 in Antipolo and surrounding areas this week.',
    timeAgo: '1 day ago',
    read: true,
    type: 'market',
    targetRoute: '/(farmer)/(tabs)/palengke',
  },
  {
    id: 'fn-6',
    category: 'sistema',
    title: 'Official LGU Antipolo Price',
    message: 'The Agriculture Office released the latest suggested farmgate price bulletin for palay in Rizal.',
    timeAgo: '3 days ago',
    read: true,
    type: 'system',
    targetRoute: '/(farmer)/advisory',
  },
];

/**
 * Mga Notipikasyon — Farmer notifications screen formatted identically to the buyer module.
 */
export default function FarmerNotificationsScreen() {
  const { isTagalog } = useLanguage();
  const [filter, setFilter] = useState<NotificationCategory>('lahat');
  const [readIds, setReadIds] = useState<Set<string>>(new Set(['fn-4', 'fn-5', 'fn-6']));

  const baseNotifications = isTagalog ? SAMPLE_FARMER_NOTIFICATIONS_TL : SAMPLE_FARMER_NOTIFICATIONS_EN;
  const notifications = baseNotifications.map((n) => ({
    ...n,
    read: readIds.has(n.id),
  }));

  const categoryFilters: { value: NotificationCategory; label: string }[] = isTagalog
    ? [
        { value: 'lahat', label: 'Lahat' },
        { value: 'transaksyon', label: 'Transaksyon' },
        { value: 'palengke', label: 'Palengke' },
        { value: 'sistema', label: 'Sistema' },
      ]
    : [
        { value: 'lahat', label: 'All' },
        { value: 'transaksyon', label: 'Transactions' },
        { value: 'palengke', label: 'Marketplace' },
        { value: 'sistema', label: 'System' },
      ];

  const filteredItems = notifications.filter(
    (n) => filter === 'lahat' || n.category === filter
  );

  const handleMarkAllAsRead = () => {
    setReadIds(new Set(baseNotifications.map((n) => n.id)));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    setReadIds((prev) => new Set([...prev, item.id]));
    if (item.targetRoute) {
      router.push(item.targetRoute as any);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'request':
        return <CheckCircle2 size={20} color={AnimoColors.accentPrimary} />;
      case 'schedule':
        return <CalendarDays size={20} color="#2563A8" />;
      case 'payment':
        return <CreditCard size={20} color={AnimoColors.accentPrimary} />;
      case 'review':
        return <Star size={20} color="#F5A623" fill="#F5A623" />;
      case 'market':
        return <ShoppingBag size={20} color={AnimoColors.accentPrimary} />;
      case 'system':
        return <Megaphone size={20} color="#B4791A" />;
    }
  };

  const getIconBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'request':
      case 'payment':
      case 'market':
        return AnimoColors.accentPrimaryLight;
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
      <BackHeader title={isTagalog ? 'Mga Notipikasyon' : 'Notifications'} />

      <View style={styles.filterBar}>
        <FilterChips
          options={categoryFilters}
          value={filter}
          onChange={setFilter}
        />
        <Pressable onPress={handleMarkAllAsRead} hitSlop={8} style={styles.readAllButton}>
          <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
            {isTagalog ? 'Basahin Lahat' : 'Mark all as read'}
          </AnimoText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {filteredItems.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.title}
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
                  color={AnimoColors.textHighEmphasis}
                  style={styles.flex}>
                  {item.title}
                </AnimoText>
                {!item.read && <View style={styles.unreadDot} />}
              </View>

              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                {item.message}
              </AnimoText>

              <AnimoText variant="tag" color={AnimoColors.textLowEmphasis}>
                {item.timeAgo}
              </AnimoText>
            </View>

            {item.targetRoute && (
              <ChevronRight size={18} color={AnimoColors.objectLowEmphasis} />
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
    backgroundColor: AnimoColors.appBackground,
  },
  filterBar: {
    paddingVertical: AnimoSpacing.sm,
    gap: AnimoSpacing.xs,
  },
  readAllButton: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.xs,
    alignSelf: 'flex-end',
  },
  list: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  unreadCard: {
    borderColor: AnimoColors.accentPrimary,
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
    backgroundColor: AnimoColors.accentPrimary,
  },
});

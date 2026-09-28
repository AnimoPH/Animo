import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, ChevronRight, Megaphone } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { BackHeader } from '@/components/animo/back-header';
import { FilterChips } from '@/components/animo/filter-chips';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import {
  fetchMyNotifications,
  formatNotificationTime,
  markAllNotificationsRead,
  markNotificationRead,
  notificationText,
  type InboxNotification,
  type NotificationCategory,
} from '@/services/notification-service';

const CATEGORY_FILTERS_TL: { value: NotificationCategory; label: string }[] = [
  { value: 'lahat', label: 'Lahat' },
  { value: 'transaksyon', label: 'Transaksyon' },
  { value: 'palengke', label: 'Palengke' },
  { value: 'sistema', label: 'Sistema' },
];

const CATEGORY_FILTERS_EN: { value: NotificationCategory; label: string }[] = [
  { value: 'lahat', label: 'All' },
  { value: 'transaksyon', label: 'Transactions' },
  { value: 'palengke', label: 'Marketplace' },
  { value: 'sistema', label: 'System' },
];

/**
 * Mga Notipikasyon — buyer inbox. Rows come from push_notification_queue.
 * Titles and bodies are the Tagalog text the queue stored.
 */
export default function NotificationsScreen() {
  const { isTagalog } = useLanguage();
  const [filter, setFilter] = useState<NotificationCategory>('lahat');
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    return fetchMyNotifications('buyer')
      .then(setNotifications)
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Error');
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const categoryFilters = isTagalog ? CATEGORY_FILTERS_TL : CATEGORY_FILTERS_EN;
  const filteredItems = notifications.filter((item) => filter === 'lahat' || item.category === filter);

  const handleMarkAllAsRead = () => {
    void markAllNotificationsRead()
      .then(() => {
        setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Error');
      });
  };

  const handleNotificationPress = (item: InboxNotification) => {
    setNotifications((prev) => prev.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
    void markNotificationRead(item.id);
    if (item.targetRoute) router.push(item.targetRoute as never);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackHeader title={isTagalog ? 'Mga Notipikasyon' : 'Notifications'} />

      <View style={styles.filterBar}>
        <FilterChips options={categoryFilters} value={filter} onChange={setFilter} />
        <Pressable onPress={handleMarkAllAsRead} hitSlop={8} style={styles.readAllButton}>
          <AnimoText variant="caption" color={AnimoColors.green}>
            {isTagalog ? 'Basahin Lahat' : 'Mark all as read'}
          </AnimoText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <AnimoText variant="body" color={AnimoColors.muted}>
            {isTagalog ? 'Naglo-load...' : 'Loading...'}
          </AnimoText>
        ) : null}
        {loadError ? (
          <AnimoText variant="body" color={AnimoColors.danger}>
            {loadError}
          </AnimoText>
        ) : null}
        {!loading && filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <AnimoText variant="body" color={AnimoColors.muted} style={styles.emptyText}>
              {isTagalog ? 'Walang mga notipikasyon sa kategoryang ito.' : 'No notifications in this category.'}
            </AnimoText>
          </View>
        ) : (
          filteredItems.map((item) => {
            const text = notificationText(item, isTagalog);
            return (
            <Pressable
              key={item.id}
              style={[styles.notificationCard, !item.read && styles.unreadCard]}
              onPress={() => handleNotificationPress(item)}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      item.category === 'transaksyon' ? AnimoColors.greenTint : '#FDF6E4',
                  },
                ]}>
                {item.category === 'transaksyon' ? (
                  <CheckCircle2 size={20} color={AnimoColors.green} />
                ) : (
                  <Megaphone size={20} color="#B4791A" />
                )}
              </View>
              <View style={styles.textWrap}>
                <View style={styles.topRow}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.flex}>
                    {text.title}
                  </AnimoText>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                  <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                    {text.body}
                  </AnimoText>
                <AnimoText variant="tag" color={AnimoColors.textLowEmphasis}>
                  {formatNotificationTime(item.createdAt, isTagalog)}
                </AnimoText>
              </View>
              {item.targetRoute ? <ChevronRight size={18} color={AnimoColors.muted} /> : null}
            </Pressable>
            );
          })
        )}
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
  emptyState: {
    paddingVertical: AnimoSpacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});

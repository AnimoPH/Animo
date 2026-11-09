import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, CloudRain, Megaphone, ShoppingBasket, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { Mascot } from '@/components/animo/ui/mascot';
import { NotificationRow } from '@/components/animo/ui/notification-row';
import { V2BackHeader } from '@/components/animo/ui/screen-bits';
import { AnimoV2Colors, AnimoV2Size, AnimoV2Spacing, type StatusTone } from '@/constants/animo';
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

/** Icon and tone for a queue row. Advisories read as caution, transactions as success. */
function rowVisual(item: InboxNotification): { icon: LucideIcon; tone: StatusTone } {
  if (item.kind === 'advisory') return { icon: CloudRain, tone: 'caution' };
  if (item.kind === 'purchase_request_received') return { icon: ShoppingBasket, tone: 'warning' };
  if (item.category === 'transaksyon') return { icon: CheckCircle2, tone: 'success' };
  return { icon: Megaphone, tone: 'warning' };
}

/**
 * Mensahe: farmer inbox. Rows come from push_notification_queue.
 * Titles and bodies are the Tagalog text the queue stored.
 */
export default function FarmerNotificationsScreen() {
  const { t, isTagalog } = useLanguage();
  const [filter, setFilter] = useState<NotificationCategory>('lahat');
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    return fetchMyNotifications('farmer')
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

  const categoryFilters: { value: NotificationCategory; label: string }[] = [
    { value: 'lahat', label: t('common.all') },
    { value: 'transaksyon', label: t('inbox.filterTransactions') },
    { value: 'palengke', label: t('inbox.filterMarketplace') },
    { value: 'sistema', label: t('inbox.filterSystem') },
  ];

  const filteredItems = notifications.filter((item) => filter === 'lahat' || item.category === filter);
  const hasUnread = notifications.some((item) => !item.read);

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
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <V2BackHeader
        title={t('inbox.title')}
        onBack={() => router.back()}
        backLabel={t('common.back')}
        right={
          hasUnread ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('inbox.readAll')}
              onPress={handleMarkAllAsRead}
              hitSlop={8}
              style={styles.readAll}>
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.textBrand}>
                {t('inbox.readAll')}
              </AnimoText>
            </Pressable>
          ) : null
        }
      />

      <View style={styles.chipWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {categoryFilters.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              selected={filter === option.value}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={AnimoV2Colors.actionPrimary} accessibilityLabel={t('common.loading')} />
          </View>
        ) : null}
        {loadError ? (
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
            {loadError}
          </AnimoText>
        ) : null}
        {!loading && filteredItems.length === 0 ? (
          <View style={styles.empty}>
            <Mascot size={112} />
            {notifications.length === 0 ? (
              <>
                <AnimoText variant="title" style={styles.centerText}>
                  {t('inbox.emptyTitle')}
                </AnimoText>
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                  {t('inbox.emptyBody')}
                </AnimoText>
              </>
            ) : (
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {t('inbox.emptyCategory')}
              </AnimoText>
            )}
          </View>
        ) : (
          filteredItems.map((item) => {
            const text = notificationText(item, isTagalog);
            const { icon, tone } = rowVisual(item);
            return (
              <NotificationRow
                key={item.id}
                icon={icon}
                tone={tone}
                title={text.title}
                body={text.body.replace(/\s*\n\s*/g, ' ')}
                time={formatNotificationTime(item.createdAt, isTagalog)}
                unread={!item.read}
                unreadLabel={t('inbox.unread')}
                accessibilityLabel={`${item.read ? '' : `${t('inbox.unread')}. `}${text.title}. ${text.body}`}
                onPress={() => handleNotificationPress(item)}
              />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  readAll: { minHeight: AnimoV2Size.iconButton, justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.md },
  chipWrap: { flexGrow: 0 },
  chipRow: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.sm,
    gap: AnimoV2Spacing.sm,
  },
  list: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xxl,
    gap: AnimoV2Spacing.md,
  },
  centered: { paddingVertical: AnimoV2Spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  empty: {
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    paddingTop: AnimoV2Spacing.xxxl,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
  centerText: { textAlign: 'center' },
});

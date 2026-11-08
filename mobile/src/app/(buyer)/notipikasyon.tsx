import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, Megaphone, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { Mascot } from '@/components/animo/ui/mascot';
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

const UNREAD_DOT = 12;

/** Icon and tone for a queue row: transactions read as success, system messages as warning. */
function rowVisual(item: InboxNotification): { icon: LucideIcon; tone: StatusTone } {
  if (item.category === 'transaksyon') return { icon: CheckCircle2, tone: 'success' };
  return { icon: Megaphone, tone: 'warning' };
}

/**
 * Mensahe: buyer inbox. Rows come from push_notification_queue.
 * Titles and bodies are the Tagalog text the queue stored.
 */
export default function NotificationsScreen() {
  const { t, isTagalog } = useLanguage();
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
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
                  {t('buyInboxV2.emptyBody')}
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
              <DepthCard
                key={item.id}
                depth="flat"
                radius="lg"
                onPress={() => handleNotificationPress(item)}
                accessibilityLabel={`${item.read ? '' : `${t('inbox.unread')}. `}${text.title}. ${text.body}`}
                backgroundColor={item.read ? AnimoV2Colors.surfaceCard : AnimoV2Colors.surfaceBrandSubtle}
                borderColor={item.read ? AnimoV2Colors.borderDefault : AnimoV2Colors.actionPrimary}
                style={styles.row}>
                <IconTile icon={icon} tone={tone} />
                <View style={styles.textWrap}>
                  <AnimoText variant="bodyStrong">{text.title}</AnimoText>
                  <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                    {text.body.replace(/\s*\n\s*/g, ' ')}
                  </AnimoText>
                  <AnimoText variant="tagV2" color={AnimoV2Colors.textTertiary} style={styles.time}>
                    {formatNotificationTime(item.createdAt, isTagalog)}
                  </AnimoText>
                </View>
                {!item.read ? <View style={styles.unreadDot} accessibilityLabel={t('inbox.unread')} /> : null}
              </DepthCard>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
  },
  textWrap: { flex: 1, minWidth: 0, gap: 2 },
  time: { marginTop: AnimoV2Spacing.xs },
  unreadDot: {
    width: UNREAD_DOT,
    height: UNREAD_DOT,
    borderRadius: UNREAD_DOT / 2,
    backgroundColor: AnimoV2Colors.actionPrimary,
    marginTop: AnimoV2Spacing.xs,
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

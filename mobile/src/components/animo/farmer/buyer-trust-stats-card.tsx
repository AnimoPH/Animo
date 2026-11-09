import { ChevronRight, MessageSquare, Package, Receipt } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { BuyerTrustStats } from '@/services/farmer-public-profile';

export type BuyerTrustStatsCardProps = {
  stats: BuyerTrustStats;
  /** Kept for backwards compatibility; language now comes from `useLanguage`. */
  lang?: 'tl' | 'en';
  onPressProfile?: () => void;
};

function formatVolumeKg(kg: number): string {
  if (kg >= 1000) {
    const thousands = kg / 1000;
    return `${Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1)}k`;
  }
  return kg.toLocaleString('en-PH');
}

/** Compact pre-match buyer record: transactions, reviews, kg bought (v2 muted tile). */
export function BuyerTrustStatsCard({ stats, onPressProfile }: BuyerTrustStatsCardProps) {
  const { t } = useLanguage();

  const metrics = [
    { key: 'tx', icon: Receipt, value: String(stats.completedTransactionsCount), label: t('ordersV2.transactions') },
    { key: 'rv', icon: MessageSquare, value: String(stats.totalReviews), label: t('ordersV2.reviews') },
    { key: 'kg', icon: Package, value: formatVolumeKg(stats.totalBoughtKg), label: t('ordersV2.boughtKg') },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {t('ordersV2.record')}
        </AnimoText>
        {onPressProfile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ordersV2.viewProfile')}
            hitSlop={8}
            onPress={onPressProfile}
            style={styles.linkRow}>
            <AnimoText variant="tagV2" color={AnimoV2Colors.textBrand}>
              {t('ordersV2.fullProfile')}
            </AnimoText>
            <ChevronRight size={16} color={AnimoV2Colors.textBrand} strokeWidth={2.75} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metricsRow}>
        {metrics.map(({ key, icon: Icon, value, label }) => (
          <View key={key} style={styles.metric} accessible accessibilityLabel={`${value} ${label}`}>
            <View style={styles.valueRow}>
              <Icon size={18} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
              <AnimoText variant="bodyStrong" numberOfLines={1}>
                {value}
              </AnimoText>
            </View>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.metricLabel}>
              {label}
            </AnimoText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AnimoV2Colors.surfaceMuted,
    borderRadius: AnimoV2Radius.md,
    padding: AnimoV2Spacing.md,
    gap: AnimoV2Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  metricsRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  metricLabel: { textAlign: 'center' },
});

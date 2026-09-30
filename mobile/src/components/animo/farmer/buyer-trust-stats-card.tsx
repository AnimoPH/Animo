import { ChevronRight, MessageCircle, Package, ShoppingCart } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import type { BuyerTrustStats } from '@/services/farmer-public-profile';

export type BuyerTrustStatsCardProps = {
  stats: BuyerTrustStats;
  lang?: 'tl' | 'en';
  onPressProfile?: () => void;
};

function formatVolumeKg(kg: number): string {
  if (kg >= 1000) {
    const thousands = kg / 1000;
    const label = Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1);
    return `${label}k (kg)`;
  }
  return `${kg.toLocaleString()} (kg)`;
}

/** Compact pre-match buyer trust summary for a purchase request row. */
export function BuyerTrustStatsCard({ stats, lang = 'tl', onPressProfile }: BuyerTrustStatsCardProps) {
  const isEn = lang === 'en';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
          {isEn ? 'Buyer record' : 'Talaan ng Mamimili'}
        </AnimoText>
        {onPressProfile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isEn ? 'View full buyer profile' : 'Tingnan ang buong profile ng mamimili'}
            hitSlop={8}
            onPress={onPressProfile}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
            <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
              {isEn ? 'Full profile' : 'Buong Profile'}
            </AnimoText>
            <ChevronRight size={14} color={AnimoColors.accentPrimary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <ShoppingCart size={18} color={AnimoColors.accentPrimary} />
          <AnimoText variant="h3" color={AnimoColors.accentPrimary}>
            {stats.completedTransactionsCount}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            {isEn ? 'Transactions' : 'Transaksyon'}
          </AnimoText>
        </View>

        <View style={styles.metric}>
          <MessageCircle size={18} color={AnimoColors.accentPrimary} />
          <AnimoText variant="h3" color={AnimoColors.accentPrimary}>
            {stats.totalReviews}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Reviews
          </AnimoText>
        </View>

        <View style={styles.metric}>
          <Package size={18} color={AnimoColors.accentPrimary} />
          <AnimoText variant="h3" color={AnimoColors.accentPrimary} numberOfLines={1}>
            {formatVolumeKg(stats.totalBoughtKg)}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.metricLabel}>
            {isEn ? 'Amount bought' : 'Dami ng nabili'}
          </AnimoText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AnimoColors.surfaceSecondary,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.sm,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  metricLabel: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});

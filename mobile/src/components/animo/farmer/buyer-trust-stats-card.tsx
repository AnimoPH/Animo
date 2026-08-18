import { ChevronRight, PackageCheck, Scale, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import type { BuyerTrustStats } from '@/services/farmer-public-profile';

export type BuyerTrustStatsCardProps = {
  stats: BuyerTrustStats;
  onPressProfile?: () => void;
};

function formatVolumeKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${kg.toLocaleString()} kg`;
}

/** Compact pre-match buyer trust summary for a purchase request row. */
export function BuyerTrustStatsCard({ stats, onPressProfile }: BuyerTrustStatsCardProps) {
  const reliabilityPct = Math.round(stats.reliabilityScore * 100);
  const hasHistory = stats.completedTransactionsCount > 0 || stats.totalReviews > 0;

  const content = (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
          Talaan ng Mamimili
        </AnimoText>
        {onPressProfile ? (
          <View style={styles.linkRow}>
            <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
              Buong profile
            </AnimoText>
            <ChevronRight size={14} color={AnimoColors.accentPrimary} />
          </View>
        ) : null}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <PackageCheck size={16} color={AnimoColors.accentPrimary} />
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {stats.completedTransactionsCount}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Transaksyon
          </AnimoText>
        </View>

        <View style={styles.metric}>
          <Star
            size={16}
            color="#F59E0B"
            fill={stats.totalReviews > 0 ? '#F59E0B' : 'transparent'}
          />
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {stats.totalReviews > 0 ? stats.averageRating : '—'}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            {stats.totalReviews} review
          </AnimoText>
        </View>

        <View style={styles.metric}>
          <Scale size={16} color={AnimoColors.accentPrimary} />
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} numberOfLines={1}>
            {formatVolumeKg(stats.totalBoughtKg)}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Nabili
          </AnimoText>
        </View>
      </View>

      {hasHistory ? (
        <View style={styles.reliabilityBadge}>
          <AnimoText variant="caption" color="#166534">
            Maasahan: {reliabilityPct}%
          </AnimoText>
        </View>
      ) : (
        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          Bagong mamimili — wala pang nakumpletong transaksyon.
        </AnimoText>
      )}
    </View>
  );

  if (!onPressProfile) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tingnan ang buong profile ng mamimili"
      onPress={onPressProfile}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
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
  reliabilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.9,
  },
});

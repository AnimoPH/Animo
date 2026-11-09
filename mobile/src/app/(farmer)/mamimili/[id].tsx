import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Clock, MessageSquareQuote, ShieldCheck, ShoppingBag, Star, UserRound } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { V2BackHeader, StickyFooter } from '@/components/animo/ui/screen-bits';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { formatRating } from '@/lib/format-rating';
import { fetchBuyerRatingComments, fetchBuyerTrustStats, type BuyerTrustStats } from '@/services/farmer-public-profile';

/**
 * Buyer profile: pre-match, so the buyer's real identity is not readable
 * (RLS reveals "user" contact/name only once a transaction match exists, per
 * the "Counterpart contact revealed after a transaction match" policy in
 * migration 0001). What's shown here is purely aggregate trust: completed
 * sales to this buyer and their public ratings, read from `user_trust_profile`
 * (migration 0022).
 */
export default function BuyerProfileScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; quantityKg?: string; total?: string }>();
  const buyerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const quantityKg = params.quantityKg ? Number(params.quantityKg) : null;
  const total = params.total ? Number(params.total) : null;

  const [stats, setStats] = useState<BuyerTrustStats | null>(null);
  const [comments, setComments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!buyerId) return;
    setLoading(true);
    setError(null);
    try {
      const [statsResult, commentsResult] = await Promise.all([
        fetchBuyerTrustStats(buyerId),
        fetchBuyerRatingComments(buyerId),
      ]);
      setStats(statsResult);
      setComments(commentsResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('buyerV2.loadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId]);

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <V2BackHeader title={t('buyerV2.title')} backLabel={t('common.back')} onBack={() => router.back()} />
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        {header}
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </View>
    );
  }

  if (!stats || error) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        {header}
        <View style={styles.centerState}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {error ?? t('buyerV2.loadError')}
          </AnimoText>
        </View>
      </View>
    );
  }

  const volumeLabel =
    stats.totalBoughtKg >= 1000 ? `${(stats.totalBoughtKg / 1000).toFixed(1)}k` : `${stats.totalBoughtKg}`;
  const hasRating = stats.totalReviews > 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {header}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <UserRound size={44} color={AnimoV2Colors.textBrand} strokeWidth={2.25} />
          </View>
          <AnimoText variant="heading" color={AnimoV2Colors.textOnBrand} style={styles.centerText}>
            {t('buyerV2.unknownName')}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand} style={styles.centerText}>
            {t('buyerV2.unknownSub')}
          </AnimoText>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statEdge}>
            <View style={styles.stat}>
              <AnimoText variant="title">{stats.completedTransactionsCount}</AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {t('buyerV2.transactions')}
              </AnimoText>
            </View>
          </View>
          <View style={styles.statEdge}>
            <View style={styles.stat}>
              <View style={styles.ratingRow}>
                <AnimoText variant="title">{formatRating(stats.averageRating, hasRating)}</AnimoText>
                {hasRating ? (
                  <Star size={20} strokeWidth={2.5} color={AnimoV2Colors.warningSolid} fill={AnimoV2Colors.warningSolid} />
                ) : null}
              </View>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {t('buyerV2.reviewsCount', { count: stats.totalReviews })}
              </AnimoText>
            </View>
          </View>
          <View style={styles.statEdge}>
            <View style={styles.stat}>
              <AnimoText variant="title">{volumeLabel}</AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {t('buyerV2.kgBought')}
              </AnimoText>
            </View>
          </View>
        </View>

        <DepthCard depth="flat" style={styles.card}>
          <View style={styles.cardHeader}>
            <IconTile icon={ShieldCheck} tone="success" size={36} />
            <AnimoText variant="subheading" accessibilityRole="header">
              {t('buyerV2.credibility')}
            </AnimoText>
          </View>
          <View style={styles.tableRow}>
            <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
              {t('buyerV2.completed')}
            </AnimoText>
            <AnimoText variant="bodyStrong">{stats.completedTransactionsCount}</AnimoText>
          </View>
          <View style={styles.tableRow}>
            <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
              {t('buyerV2.rating')}
            </AnimoText>
            {hasRating ? (
              <StatusPill tone="success" label={`${formatRating(stats.averageRating)} / 5.0`} />
            ) : (
              <AnimoText variant="bodyStrong">—</AnimoText>
            )}
          </View>
        </DepthCard>

        {comments.length > 0 ? (
          <DepthCard depth="flat" style={styles.card}>
            <View style={styles.cardHeader}>
              <IconTile icon={ShoppingBag} tone="success" size={36} />
              <AnimoText variant="subheading" style={styles.flex} accessibilityRole="header">
                {t('buyerV2.comments')}
              </AnimoText>
            </View>
            {comments.map((comment) => (
              <View key={comment} style={styles.comment}>
                <MessageSquareQuote size={18} color={AnimoV2Colors.textBrand} strokeWidth={2.25} />
                <AnimoText variant="bodyV2" style={styles.flex}>
                  &quot;{comment}&quot;
                </AnimoText>
              </View>
            ))}
          </DepthCard>
        ) : null}

        {quantityKg !== null && total !== null ? (
          <DepthCard depth="flat" style={styles.card}>
            <AnimoText variant="subheading">{t('buyerV2.currentRequest')}</AnimoText>
            <View style={styles.metricsRow}>
              <View style={styles.flex}>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {t('buyerV2.qty')}
                </AnimoText>
                <AnimoText variant="heading">{quantityKg} kg</AnimoText>
              </View>
              <View style={styles.metricRight}>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {t('buyerV2.value')}
                </AnimoText>
                <AnimoText variant="heading" color={AnimoV2Colors.textBrand}>
                  {formatPeso(total)}
                </AnimoText>
              </View>
            </View>
            <View style={styles.pendingRow}>
              <Clock size={18} color={AnimoV2Colors.textSecondary} strokeWidth={2.25} />
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
                {t('buyerV2.pendingNote')}
              </AnimoText>
            </View>
          </DepthCard>
        ) : null}

        <DepthCard
          depth="flat"
          backgroundColor={AnimoV2Colors.surfaceBrandSubtle}
          borderColor={AnimoV2Colors.brandLight}
          style={styles.note}>
          <IconTile icon={ShieldCheck} tone="success" size={36} />
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
            {t('buyerV2.privacy')}
          </AnimoText>
        </DepthCard>
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom }}>
        <StickyFooter>
          <ChunkyButton label={t('buyerV2.backToListing')} onPress={() => router.back()} />
        </StickyFooter>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  centerText: { textAlign: 'center' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: AnimoV2Spacing.lg, paddingBottom: AnimoV2Spacing.xl, gap: AnimoV2Spacing.lg },
  hero: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    borderRadius: AnimoV2Radius.xl,
    paddingVertical: AnimoV2Spacing.xl,
    paddingHorizontal: AnimoV2Spacing.lg,
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: AnimoV2Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm },
  statEdge: { flex: 1, borderRadius: AnimoV2Radius.lg, backgroundColor: AnimoV2Colors.brandDark, paddingBottom: 4 },
  stat: {
    flex: 1,
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderRadius: AnimoV2Radius.lg,
    padding: AnimoV2Spacing.md,
    alignItems: 'center',
    gap: AnimoV2Spacing.xs,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  card: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  tableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.md, minHeight: 32 },
  comment: {
    flexDirection: 'row',
    gap: AnimoV2Spacing.sm,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.surfaceMuted,
  },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metricRight: { alignItems: 'flex-end' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  note: { padding: AnimoV2Spacing.md, flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
});

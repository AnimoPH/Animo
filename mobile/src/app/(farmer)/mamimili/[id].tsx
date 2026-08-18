import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Clock, MessageSquareQuote, ShieldCheck, ShoppingBag, Star, UserRound } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { BackHeader } from '@/components/animo/back-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { fetchBuyerRatingComments, fetchBuyerTrustStats, type BuyerTrustStats } from '@/services/farmer-public-profile';

/**
 * Buyer profile — pre-match, so the buyer's real identity is not readable
 * (RLS reveals "user" contact/name only once a transaction match exists, per
 * the "Counterpart contact revealed after a transaction match" policy in
 * migration 0001). What's shown here is purely aggregate trust: completed
 * sales to this buyer and their public ratings, computed on the fly since no
 * buyer-side `credibilityscore`-equivalent table exists.
 */
export default function BuyerProfileScreen() {
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
      setError(e instanceof Error ? e.message : 'Hindi ma-load ang profile ng mamimili.');
    } finally {
      setLoading(false);
    }
  }, [buyerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <BackHeader title="Profile ng Mamimili" />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <BackHeader title="Profile ng Mamimili" />
        <View style={styles.centerState}>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.centerText}>
            {error ?? 'Hindi ma-load ang profile ng mamimili.'}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const reliabilityPct = Math.round(stats.reliabilityScore * 100);
  const volumeLabel =
    stats.totalBoughtKg >= 1000
      ? `${(stats.totalBoughtKg / 1000).toFixed(1)}k`
      : `${stats.totalBoughtKg}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackHeader title="Profile ng Mamimili" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.greenBanner}>
          <View style={styles.avatarCircle}>
            <UserRound size={44} color={AnimoColors.accentPrimary} />
          </View>
          <AnimoText variant="h2" color={AnimoColors.white} style={styles.bannerBuyerName}>
            Hindi pa Nakikilalang Mamimili
          </AnimoText>
          <AnimoText variant="body" color="rgba(255, 255, 255, 0.9)" style={styles.memberSubtitle}>
            Makikita ang buong pangalan kapag tinanggap mo ang kahilingan.
          </AnimoText>
        </View>

        <View style={styles.floatingStatsRow}>
          <View style={styles.statCard}>
            <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.statNumber}>
              {stats.completedTransactionsCount}
            </AnimoText>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.statLabel}>
              Transaksyon
            </AnimoText>
          </View>

          <View style={styles.statCard}>
            <View style={styles.ratingNumberRow}>
              <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.statNumber}>
                {stats.averageRating || '—'}
              </AnimoText>
              {stats.averageRating > 0 ? <Star size={18} color="#F59E0B" fill="#F59E0B" /> : null}
            </View>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.statLabel}>
              {stats.totalReviews} reviews
            </AnimoText>
          </View>

          <View style={styles.statCard}>
            <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.statNumber}>
              {volumeLabel}
            </AnimoText>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.statLabel}>
              Kilo na Nabili
            </AnimoText>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <ShieldCheck size={22} color={AnimoColors.accentPrimary} />
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.cardHeaderTitle}>
              Kredibilidad
            </AnimoText>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Natapos na Transaksyon
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                {stats.completedTransactionsCount}
              </AnimoText>
            </View>

            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Maasahang Mamimili
              </AnimoText>
              <View style={styles.greenBadge}>
                <AnimoText variant="bodyEmphasis" color="#166534" style={styles.greenBadgeText}>
                  {stats.completedTransactionsCount > 0 || stats.totalReviews > 0 ? `${reliabilityPct}%` : '—'}
                </AnimoText>
              </View>
            </View>
          </View>
        </View>

        {comments.length > 0 ? (
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <ShoppingBag size={22} color={AnimoColors.accentPrimary} />
              <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.cardHeaderTitle}>
                Mga Komento mula sa Ibang Magsasaka
              </AnimoText>
            </View>
            <View style={styles.cardBody}>
              {comments.map((comment) => (
                <View key={comment} style={styles.reviewCommentCard}>
                  <View style={styles.reviewCommentHeader}>
                    <MessageSquareQuote size={15} color={AnimoColors.accentPrimary} />
                  </View>
                  <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.reviewQuoteText}>
                    &quot;{comment}&quot;
                  </AnimoText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {quantityKg !== null && total !== null ? (
          <View style={styles.listingCardOutline}>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
              Kasalukuyang Kahilingan
            </AnimoText>
            <View style={styles.listingMetricsRow}>
              <View style={styles.listingMetricCol}>
                <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                  Dami
                </AnimoText>
                <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
                  {quantityKg} kg
                </AnimoText>
              </View>
              <View style={styles.listingMetricColRight}>
                <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                  Halaga
                </AnimoText>
                <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
                  {formatPeso(total)}
                </AnimoText>
              </View>
            </View>
            <View style={styles.listingTimeRight}>
              <Clock size={14} color={AnimoColors.textMediumEmphasis} />
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                Nakabinbing kahilingan sa listing na ito.
              </AnimoText>
            </View>
          </View>
        ) : null}

        <View style={styles.privacyNoteBox}>
          <ShieldCheck size={18} color={AnimoColors.accentPrimary} />
          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={styles.privacyNoteText}>
            Ligtas na Transaksyon: Ibibigay ang numero ng mamimili kapag tinanggap mo ang kahilingan.
          </AnimoText>
        </View>
      </ScrollView>

      <View style={styles.bottomFooter}>
        <AnimoButton label="Bumalik sa Listing" variant="primary" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FBF9F4' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoSpacing.xl },
  centerText: { textAlign: 'center' },
  scrollContent: { paddingBottom: AnimoSpacing.xl, gap: AnimoSpacing.md },
  greenBanner: {
    backgroundColor: AnimoColors.accentPrimary,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: 48,
    paddingHorizontal: AnimoSpacing.xl,
    alignItems: 'center',
    gap: 8,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBuyerName: { textAlign: 'center', marginTop: 4 },
  memberSubtitle: { textAlign: 'center', fontSize: 14.5, marginTop: 2 },
  floatingStatsRow: { flexDirection: 'row', gap: 12, marginTop: -30, paddingHorizontal: AnimoSpacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 3,
  },
  statNumber: { fontSize: 26, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 30 },
  ratingNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 14, textAlign: 'center', color: AnimoColors.textMediumEmphasis },
  infoCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginHorizontal: AnimoSpacing.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeaderTitle: { fontSize: 18.5, fontFamily: 'PlusJakartaSans_700Bold' },
  cardBody: { gap: AnimoSpacing.sm, paddingTop: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 16, color: AnimoColors.blackSecondary, flex: 1 },
  greenBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: AnimoRadius.pill },
  greenBadgeText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  reviewCommentCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: AnimoRadius.sm,
    padding: AnimoSpacing.md,
    gap: 4,
    backgroundColor: '#F9FAFB',
  },
  reviewCommentHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewQuoteText: { fontStyle: 'italic', fontSize: 15.5, lineHeight: 22 },
  listingCardOutline: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginHorizontal: AnimoSpacing.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  listingMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  listingMetricCol: { gap: 3, flex: 1 },
  listingMetricColRight: { gap: 3, alignItems: 'flex-end' },
  listingTimeRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  privacyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginHorizontal: AnimoSpacing.lg,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
  },
  privacyNoteText: { flex: 1, fontSize: 14.5, lineHeight: 20 },
  bottomFooter: { paddingHorizontal: AnimoSpacing.xl, paddingTop: AnimoSpacing.md, paddingBottom: AnimoSpacing.md, backgroundColor: '#FBF9F4' },
});

import { useFocusEffect, router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { V2BackHeader } from '@/components/animo/ui/screen-bits';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import {
  averageReviewScore,
  fetchListingPalayReviews,
  type PalayReview,
} from '@/services/palay-review-service';

const PREVIEW_COUNT = 3;

type StarFilter = 'all' | 1 | 2 | 3 | 4 | 5;

function formatQuantity(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1);
}

function Stars({ score, size = 16 }: { score: number; size?: number }) {
  return (
    <View style={styles.starRow} accessible accessibilityLabel={`${score.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = score >= star - 0.25;
        return (
          <Star
            key={star}
            size={size}
            strokeWidth={2.5}
            color={filled ? AnimoV2Colors.warningSolid : AnimoV2Colors.edgeSoft}
            fill={filled ? AnimoV2Colors.warningSolid : 'transparent'}
          />
        );
      })}
    </View>
  );
}

function ReviewRow({ review }: { review: PalayReview }) {
  const { t } = useLanguage();
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewTop}>
        <AnimoText variant="bodyStrong">{review.maskedName}</AnimoText>
        <Stars score={review.score} />
      </View>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
        {t('reviewsV2.quantity', { kg: formatQuantity(review.quantityKg) })}
      </AnimoText>
      <AnimoText variant="bodyV2">
        {review.comment?.trim() || t('reviewsV2.noComment')}
      </AnimoText>
    </View>
  );
}

/** Farmer v2 listing-detail reviews card: average, count and the three newest reviews. */
export function PalayReviewsCardV2({ listingId, onPress }: { listingId: string; onPress: () => void }) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<PalayReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setReviews(await fetchListingPalayReviews(listingId));
    } catch {
      setError(true);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const average = averageReviewScore(reviews);
  const preview = reviews.slice(0, PREVIEW_COUNT);

  return (
    <DepthCard depth="flat" style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('reviewsV2.viewAll')}
        disabled={reviews.length === 0}
        onPress={onPress}
        style={styles.cardHeader}>
        <View style={styles.avgRow}>
          <AnimoText variant="heading">{average !== null ? average.toFixed(1) : '—'}</AnimoText>
          <Star size={22} strokeWidth={2.5} color={AnimoV2Colors.warningSolid} fill={AnimoV2Colors.warningSolid} />
        </View>
        <AnimoText variant="bodyStrong" color={AnimoV2Colors.textSecondary}>
          {t('reviewsV2.title')} ({reviews.length})
        </AnimoText>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={AnimoV2Colors.actionPrimary} style={styles.loader} />
      ) : error ? (
        <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
          {t('reviewsV2.loadError')}
        </AnimoText>
      ) : preview.length === 0 ? (
        <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
          {t('reviewsV2.none')}
        </AnimoText>
      ) : (
        preview.map((review) => (
          <View key={review.id}>
            <View style={styles.divider} />
            <ReviewRow review={review} />
          </View>
        ))
      )}
    </DepthCard>
  );
}

/** Farmer v2 full reviews list with a 1 to 5 star filter. */
export function PalayReviewsScreenV2({ listingId }: { listingId: string }) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<PalayReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StarFilter>('all');

  const load = useCallback(async () => {
    if (!listingId) {
      setError(t('reviewsV2.missingId'));
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setReviews(await fetchListingPalayReviews(listingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reviewsV2.loadError'));
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [listingId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const average = averageReviewScore(reviews);
  const counts = ([5, 4, 3, 2, 1] as const).map((star) => ({
    star,
    count: reviews.filter((review) => review.score === star).length,
  }));
  const visible = filter === 'all' ? reviews : reviews.filter((review) => review.score === filter);

  return (
    <View style={styles.screen}>
      <V2BackHeader title={t('reviewsV2.title')} backLabel={t('common.back')} onBack={() => router.back()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
            {error}
          </AnimoText>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(review) => review.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.pageHeader}>
              <View style={styles.avgRow}>
                <AnimoText variant="title">{average !== null ? `${average.toFixed(1)} / 5` : '—'}</AnimoText>
                {average !== null ? <Stars score={average} size={22} /> : null}
              </View>
              <View style={styles.chips}>
                <FilterChip label={t('reviewsV2.all')} selected={filter === 'all'} count={reviews.length} onPress={() => setFilter('all')} />
                {counts.map(({ star, count }) => (
                  <FilterChip
                    key={star}
                    label={t('reviewsV2.stars', { n: star })}
                    selected={filter === star}
                    count={count}
                    onPress={() => setFilter(star)}
                  />
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <DepthCard depth="flat" radius="lg" style={styles.reviewCard}>
              <ReviewRow review={item} />
            </DepthCard>
          )}
          ItemSeparatorComponent={() => <View style={{ height: AnimoV2Spacing.md }} />}
          ListEmptyComponent={
            <AnimoText variant="bodyV2" color={AnimoV2Colors.textTertiary} style={styles.empty}>
              {reviews.length === 0 ? t('reviewsV2.none') : t('reviewsV2.noneForRating')}
            </AnimoText>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: AnimoV2Spacing.lg },
  list: { paddingHorizontal: AnimoV2Spacing.lg, paddingBottom: AnimoV2Spacing.xxl },
  pageHeader: { gap: AnimoV2Spacing.lg, paddingTop: AnimoV2Spacing.md, paddingBottom: AnimoV2Spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
  card: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.sm, minHeight: 48 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm, flexWrap: 'wrap' },
  loader: { alignSelf: 'flex-start' },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.borderDefault, marginBottom: AnimoV2Spacing.md },
  reviewRow: { gap: AnimoV2Spacing.xs },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.sm },
  reviewCard: { padding: AnimoV2Spacing.lg },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  empty: { textAlign: 'center', marginTop: AnimoV2Spacing.xl },
});

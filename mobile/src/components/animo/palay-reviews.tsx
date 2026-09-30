import { useFocusEffect } from 'expo-router';
import { Star, UserRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { BackHeader } from '@/components/animo/back-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import {
  averageReviewScore,
  fetchListingPalayReviews,
  type PalayReview,
} from '@/services/palay-review-service';

const PREVIEW_COUNT = 3;
const STAR_SIZE = 14;

type StarFilter = 'all' | 1 | 2 | 3 | 4 | 5;

function formatQuantity(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1);
}

function formatAverage(score: number): string {
  return score.toFixed(1);
}

export function ReviewStars({ score, size = STAR_SIZE }: { score: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = score >= star - 0.25;
        return (
          <Star
            key={star}
            size={size}
            color={filled ? AnimoColors.accentPrimary : AnimoColors.borderLowEmphasis}
            fill={filled ? AnimoColors.accentPrimary : 'transparent'}
          />
        );
      })}
    </View>
  );
}

export function PalayReviewRow({ review, isTagalog }: { review: PalayReview; isTagalog: boolean }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewTop}>
        <View style={styles.reviewIdentity}>
          <View style={styles.avatar}>
            <UserRound size={16} color={AnimoColors.textMediumEmphasis} />
          </View>
          <View style={styles.reviewMeta}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
              {review.maskedName}
            </AnimoText>
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
              {isTagalog ? 'Dami (kg):' : 'Quantity (kg):'} {formatQuantity(review.quantityKg)}kg
            </AnimoText>
          </View>
        </View>
        <ReviewStars score={review.score} />
      </View>
      <AnimoText variant="body" color={AnimoColors.textHighEmphasis}>
        {review.comment?.trim() ||
          (isTagalog ? 'Walang nakasaad na komento.' : 'No comment provided.')}
      </AnimoText>
    </View>
  );
}

/** Listing-detail card: average, count, and the three newest buyer reviews. */
export function PalayReviewsCard({
  listingId,
  onPress,
}: {
  listingId: string;
  onPress: () => void;
}) {
  const { isTagalog } = useLanguage();
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
  const canOpen = reviews.length > 0;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isTagalog ? 'Tingnan ang lahat ng review' : 'View all reviews'}
        disabled={!canOpen}
        onPress={onPress}
        style={styles.cardHeader}>
        <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
          {average !== null ? formatAverage(average) : '—'}
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.cardTitle}>
          {isTagalog ? 'Mga Review ng Palay' : 'Palay Reviews'} ({reviews.length})
        </AnimoText>
        {average !== null ? <ReviewStars score={average} /> : null}
      </Pressable>

      {loading ? (
        <ActivityIndicator color={AnimoColors.accentPrimary} style={styles.loader} />
      ) : error ? (
        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          {isTagalog ? 'Hindi ma-load ang mga review.' : 'Could not load reviews.'}
        </AnimoText>
      ) : preview.length === 0 ? (
        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          {isTagalog ? 'Wala pang review para sa palay na ito.' : 'No reviews for this palay yet.'}
        </AnimoText>
      ) : (
        preview.map((review, index) => (
          <View key={review.id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <PalayReviewRow review={review} isTagalog={isTagalog} />
          </View>
        ))
      )}
    </View>
  );
}

/** Full list with a 1–5 star filter. Shared by the farmer and buyer routes. */
export function PalayReviewsScreen({ listingId }: { listingId: string }) {
  const { isTagalog } = useLanguage();
  const [reviews, setReviews] = useState<PalayReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StarFilter>('all');

  const load = useCallback(async () => {
    if (!listingId) {
      setError(isTagalog ? 'Walang listing ID.' : 'Missing listing ID.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setReviews(await fetchListingPalayReviews(listingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : isTagalog ? 'Hindi ma-load ang mga review.' : 'Could not load reviews.');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [listingId, isTagalog]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const average = averageReviewScore(reviews);
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star: star as Exclude<StarFilter, 'all'>,
    count: reviews.filter((review) => review.score === star).length,
  }));
  const visible = filter === 'all' ? reviews : reviews.filter((review) => review.score === filter);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <BackHeader title={isTagalog ? 'Mga Review ng Palay' : 'Palay Reviews'} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AnimoText variant="body" color={AnimoColors.danger}>
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
              <View style={styles.summaryRow}>
                <AnimoText variant="h1" color={AnimoColors.accentPrimary}>
                  {average !== null ? `${formatAverage(average)} / 5` : '—'}
                </AnimoText>
                {average !== null ? <ReviewStars score={average} size={18} /> : null}
              </View>
              <View style={styles.chips}>
                <FilterChip
                  label={isTagalog ? 'Lahat' : 'All'}
                  active={filter === 'all'}
                  onPress={() => setFilter('all')}
                />
                {counts.map(({ star, count }) => (
                  <FilterChip
                    key={star}
                    label={`${count}`}
                    star={star}
                    active={filter === star}
                    onPress={() => setFilter(star)}
                  />
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.pageReview}>
              <PalayReviewRow review={item} isTagalog={isTagalog} />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={
            <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.empty}>
              {reviews.length === 0
                ? isTagalog
                  ? 'Wala pang review para sa palay na ito.'
                  : 'No reviews for this palay yet.'
                : isTagalog
                  ? 'Walang review sa markang ito.'
                  : 'No reviews for this rating.'}
            </AnimoText>
          }
        />
      )}
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  star,
  active,
  onPress,
}: {
  label: string;
  star?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}>
      {star ? (
        <Star
          size={12}
          color={active ? AnimoColors.white : AnimoColors.textMediumEmphasis}
          fill={active ? AnimoColors.white : 'transparent'}
        />
      ) : null}
      <AnimoText variant="caption" color={active ? AnimoColors.white : AnimoColors.textHighEmphasis}>
        {star ? `${star} (${label})` : label}
      </AnimoText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  cardTitle: {
    flex: 1,
  },
  loader: {
    alignSelf: 'flex-start',
  },
  reviewRow: {
    gap: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.sm,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
  },
  reviewIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewMeta: {
    flex: 1,
    gap: 2,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  screen: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: AnimoSpacing.lg,
  },
  list: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
  },
  pageHeader: {
    gap: AnimoSpacing.md,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
  },
  chipActive: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  chipIdle: {
    backgroundColor: AnimoColors.surfaceTertiary,
  },
  pageReview: {
    paddingVertical: AnimoSpacing.xs,
  },
  empty: {
    textAlign: 'center',
    marginTop: AnimoSpacing.xl,
  },
});

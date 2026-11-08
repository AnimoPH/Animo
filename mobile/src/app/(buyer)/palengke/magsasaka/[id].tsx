import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageSquareQuote,
  PackageCheck,
  Scale,
  ShieldCheck,
  Sprout,
  Star,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Dialog, V2Sheet } from '@/components/animo/ui/dialog';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { IconButton, StickyFooter, V2BackHeader } from '@/components/animo/ui/screen-bits';
import { StatusPill } from '@/components/animo/ui/status-pill';
import {
  AnimoV2Colors,
  AnimoV2Radius,
  AnimoV2Size,
  AnimoV2Spacing,
  type StatusTone,
} from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { fetchFarmerPublicProfile, type FarmerPublicProfile } from '@/services/farmer-public-profile';
import { fetchMarketplaceListing } from '@/services/marketplace-service';
import {
  moistureLabel,
  translateVarietyName,
  varietyLabel,
  type CropListing,
} from '@/types/crop-listing';

function StatTile({
  icon,
  tone,
  value,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: LucideIcon;
  tone: StatusTone;
  value: string;
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
}) {
  return (
    <DepthCard
      depth="raised"
      radius="lg"
      onPress={onPress}
      accessibilityLabel={`${accessibilityLabel}: ${value} ${label}`}
      wrapperStyle={styles.flex}
      style={styles.statTile}>
      <IconTile icon={icon} tone={tone} size={40} />
      <AnimoText variant="title">{value}</AnimoText>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={2}>
        {label}
      </AnimoText>
    </DepthCard>
  );
}

function DataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.dataRow}>
      <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.dataLabel}>
        {label}
      </AnimoText>
      {children}
    </View>
  );
}

function Stars({ rating, size }: { rating: number; size: number }) {
  return (
    <View style={styles.starRow} accessible accessibilityLabel={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          strokeWidth={2.5}
          color={s <= rating ? AnimoV2Colors.warningSolid : AnimoV2Colors.edgeSoft}
          fill={s <= rating ? AnimoV2Colors.warningSolid : 'transparent'}
        />
      ))}
    </View>
  );
}

/** Farmer public profile for a buyer: trust record, sales info and the current listing. */
export default function FarmerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, language, isTagalog } = useLanguage();

  const [listing, setListing] = useState<CropListing | null>(null);
  const [profile, setProfile] = useState<FarmerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Transaction and feedback summaries
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(undefined);

    fetchMarketplaceListing(id)
      .then(async (resListing) => {
        if (cancelled) return;
        setListing(resListing);
        const farmerData = await fetchFarmerPublicProfile(id, resListing);
        if (!cancelled) {
          setProfile(farmerData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : isTagalog
                ? 'Hindi ma-load ang profile ng magsasaka.'
                : 'Failed to load farmer profile.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isTagalog]);

  const header = <V2BackHeader title={t('buyFarmerV2.title')} backLabel={t('common.back')} onBack={() => router.back()} />;

  if (loading) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} accessibilityLabel={t('common.loading')} />
        </View>
      </View>
    );
  }

  if (errorMessage || !profile) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centerState}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {errorMessage ?? t('buyFarmerV2.notFound')}
          </AnimoText>
        </View>
      </View>
    );
  }

  const averagePerTransaction =
    profile.completedTransactionsCount > 0
      ? Math.round(profile.totalSoldKg / profile.completedTransactionsCount)
      : 0;
  const soldVolumeLabel =
    profile.totalSoldKg >= 1000 ? `${(profile.totalSoldKg / 1000).toFixed(1)}k` : `${profile.totalSoldKg}`;
  const hasReviews = profile.totalReviews > 0;
  const roundedRating = hasReviews ? Math.round(profile.averageRating) : 0;
  const reviewsLabel = t(profile.totalReviews === 1 ? 'buyDetailV2.reviewOne' : 'buyDetailV2.reviewMany', {
    count: profile.totalReviews,
  });

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero: extends under the status bar */}
        <View style={[styles.hero, { paddingTop: insets.top + AnimoV2Spacing.sm }]}>
          <View style={styles.heroTopRow}>
            <IconButton
              icon={<ChevronLeft size={28} color={AnimoV2Colors.textBrand} strokeWidth={2.75} />}
              label={t('common.back')}
              onPress={() => router.back()}
              backgroundColor={AnimoV2Colors.surfaceCard}
            />
          </View>
          <View style={styles.avatar}>
            <AnimoText variant="display" color={AnimoV2Colors.textBrand}>
              {profile.name[0]?.toUpperCase() || 'M'}
            </AnimoText>
          </View>
          <AnimoText variant="title" color={AnimoV2Colors.textOnBrand} style={styles.centerText} accessibilityRole="header">
            {profile.name}
          </AnimoText>
          {profile.location ? (
            <View style={styles.locationRow}>
              <MapPin size={18} color={AnimoV2Colors.textOnBrand} strokeWidth={2.5} />
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand} style={styles.centerText}>
                {profile.location}
              </AnimoText>
            </View>
          ) : null}
          {profile.memberSince ? (
            <AnimoText variant="captionV2" color={AnimoV2Colors.brandLight} style={styles.centerText}>
              {t('buyFarmerV2.memberSince', { date: profile.memberSince })}
            </AnimoText>
          ) : null}
        </View>

        <View style={styles.body}>
          {/* Stat grid */}
          <View style={styles.statRow}>
            <StatTile
              icon={PackageCheck}
              tone="success"
              value={String(profile.completedTransactionsCount)}
              label={t('buyFarmerV2.statTransactions')}
              accessibilityLabel={t('buyFarmerV2.viewTx')}
              onPress={() => setShowTransactionsModal(true)}
            />
            <StatTile
              icon={Star}
              tone="warning"
              value={hasReviews ? String(profile.averageRating) : '—'}
              label={reviewsLabel}
              accessibilityLabel={t('buyFarmerV2.viewReviews')}
              onPress={() => setShowFeedbackModal(true)}
            />
          </View>
          <View style={styles.statRow}>
            <StatTile
              icon={Scale}
              tone="caution"
              value={soldVolumeLabel}
              label={t('buyFarmerV2.statSold')}
              accessibilityLabel={t('buyFarmerV2.viewTx')}
              onPress={() => setShowTransactionsModal(true)}
            />
            <StatTile
              icon={ThumbsUp}
              tone="success"
              value={profile.positiveFeedbackPct != null ? `${profile.positiveFeedbackPct}%` : '—'}
              label={t('buyFarmerV2.statPositive')}
              accessibilityLabel={t('buyFarmerV2.viewReviews')}
              onPress={() => setShowFeedbackModal(true)}
            />
          </View>

          {/* Kredibilidad */}
          <DepthCard depth="flat" style={styles.cardPad}>
            <AnimoText variant="subheading" accessibilityRole="header">
              {t('buyFarmerV2.credibility')}
            </AnimoText>
            <DataRow label={t('buyFarmerV2.completedTx')}>
              <AnimoText variant="bodyStrong">{profile.completedTransactionsCount}</AnimoText>
            </DataRow>
            <View style={styles.divider} />
            <DataRow label={t('buyFarmerV2.avgRating')}>
              <View style={styles.ratingValue}>
                <AnimoText variant="bodyStrong">{hasReviews ? `${profile.averageRating} / 5.0` : '—'}</AnimoText>
                <Stars rating={roundedRating} size={16} />
              </View>
            </DataRow>
          </DepthCard>

          {/* Impormasyon sa Pagbebenta */}
          <DepthCard depth="flat" style={styles.cardPad}>
            <AnimoText variant="subheading" accessibilityRole="header">
              {t('buyFarmerV2.salesInfo')}
            </AnimoText>
            <DataRow label={t('buyFarmerV2.mainVariety')}>
              <AnimoText variant="bodyStrong" style={styles.dataValue} numberOfLines={2}>
                {translateVarietyName(profile.commonlySoldVarieties[0], isTagalog) || '—'}
              </AnimoText>
            </DataRow>
            <View style={styles.divider} />
            <View style={styles.dataColumn}>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                {t('buyFarmerV2.otherVarieties')}
              </AnimoText>
              <View style={styles.pillWrap}>
                {profile.commonlySoldVarieties.length > 0 ? (
                  profile.commonlySoldVarieties.map((variety) => (
                    <StatusPill
                      key={variety}
                      tone="success"
                      icon={Sprout}
                      label={translateVarietyName(variety, isTagalog)}
                    />
                  ))
                ) : (
                  <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
                    {t('buyFarmerV2.noRecords')}
                  </AnimoText>
                )}
              </View>
            </View>
            <View style={styles.divider} />
            <DataRow label={t('buyFarmerV2.moistureQuality')}>
              <AnimoText variant="bodyStrong">
                {listing ? moistureLabel(listing.declaredMoisture, language) : '—'}
              </AnimoText>
            </DataRow>
            <View style={styles.divider} />
            <DataRow label={t('buyFarmerV2.avgVolume')}>
              <AnimoText variant="bodyStrong">
                {profile.completedTransactionsCount > 0 ? `~${averagePerTransaction.toLocaleString()} kg` : '—'}
              </AnimoText>
            </DataRow>
            <View style={styles.divider} />
            <DataRow label={t('buyFarmerV2.totalSold')}>
              <AnimoText variant="bodyStrong">~{profile.totalSoldKg.toLocaleString()} kg</AnimoText>
            </DataRow>
          </DepthCard>

          {/* Current listing: tapping goes back to the full listing */}
          {listing ? (
            <DepthCard
              depth="flat"
              onPress={() => router.back()}
              accessibilityLabel={t('buyFarmerV2.openListing')}
              style={styles.cardPad}>
              <View style={styles.listingHead}>
                <AnimoText variant="subheading" style={styles.flex} accessibilityRole="header">
                  {t('buyFarmerV2.currentListing')}
                </AnimoText>
                <ChevronRight size={24} color={AnimoV2Colors.textSecondary} strokeWidth={2.75} />
              </View>
              <AnimoText variant="heading" numberOfLines={2}>
                {varietyLabel(listing, language)}
              </AnimoText>
              <View style={styles.listingMetrics}>
                <View style={styles.listingMetric}>
                  <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                    {t('buyFarmerV2.price')}
                  </AnimoText>
                  <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand}>
                    {formatPeso(listing.pricePerKg ?? 0)}
                    <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                      {' '}/ kg
                    </AnimoText>
                  </AnimoText>
                </View>
                <View style={styles.listingMetric}>
                  <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                    {t('buyFarmerV2.availableQty')}
                  </AnimoText>
                  <AnimoText variant="priceV2">{listing.remainingQuantityKg.toLocaleString('en-PH')} kg</AnimoText>
                </View>
              </View>
            </DepthCard>
          ) : null}

          {/* Privacy note */}
          <View style={styles.note}>
            <ShieldCheck size={22} color={AnimoV2Colors.successFg} strokeWidth={2.5} />
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
              {t('buyFarmerV2.privacy')}
            </AnimoText>
          </View>
        </View>
      </ScrollView>

      <StickyFooter>
        <ChunkyButton label={t('buyFarmerV2.backToListing')} onPress={() => router.back()} />
        <View style={{ height: insets.bottom }} />
      </StickyFooter>

      {/* Transaction summary */}
      <V2Dialog
        visible={showTransactionsModal}
        onClose={() => setShowTransactionsModal(false)}
        icon={PackageCheck}
        iconTone="success"
        title={t('buyFarmerV2.txSummary')}
        message={
          profile.completedTransactionsCount === 0
            ? t('buyFarmerV2.noTx')
            : t('buyFarmerV2.txRecorded', {
                count: profile.completedTransactionsCount,
                kg: profile.totalSoldKg.toLocaleString(),
              })
        }
        actions={<ChunkyButton label={t('common.close')} variant="secondary" onPress={() => setShowTransactionsModal(false)} />}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('buyFarmerV2.completedDeals')}
            </AnimoText>
            <AnimoText variant="title">{profile.completedTransactionsCount}</AnimoText>
          </View>
          <View style={styles.summaryBox}>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('buyFarmerV2.totalSoldVolume')}
            </AnimoText>
            <AnimoText variant="title" color={AnimoV2Colors.textBrand}>
              {profile.totalSoldKg.toLocaleString()} kg
            </AnimoText>
          </View>
        </View>
      </V2Dialog>

      {/* Rating and feedback */}
      <V2Sheet visible={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} title={t('buyFarmerV2.ratingFeedback')}>
        <View style={styles.feedbackHead}>
          <View style={styles.ratingValue}>
            <AnimoText variant="display">{hasReviews ? profile.averageRating : '—'}</AnimoText>
            <Star
              size={30}
              strokeWidth={2.5}
              color={AnimoV2Colors.warningSolid}
              fill={hasReviews ? AnimoV2Colors.warningSolid : 'transparent'}
            />
          </View>
          <Stars rating={roundedRating} size={22} />
          <AnimoText variant="bodyStrong">{t('buyFarmerV2.buyerReviews', { count: profile.totalReviews })}</AnimoText>
          {profile.positiveFeedbackPct != null ? (
            <StatusPill
              tone="success"
              icon={ThumbsUp}
              label={t('buyFarmerV2.positivePct', { pct: profile.positiveFeedbackPct })}
            />
          ) : null}
        </View>

        <AnimoText variant="subheading">{t('buyFarmerV2.commentsTitle')}</AnimoText>
        {profile.comments.length === 0 ? (
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
            {t('buyFarmerV2.noComments')}
          </AnimoText>
        ) : (
          profile.comments.map((comment, index) => (
            <DepthCard key={`${comment}-${index}`} depth="flat" radius="lg" style={styles.commentCard}>
              <View style={styles.commentHead}>
                <MessageSquareQuote size={18} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {t('buyFarmerV2.buyer')}
                </AnimoText>
              </View>
              <AnimoText variant="bodyV2">&quot;{comment}&quot;</AnimoText>
            </DepthCard>
          ))
        )}
        <ChunkyButton label={t('common.close')} variant="secondary" onPress={() => setShowFeedbackModal(false)} />
      </V2Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  centerText: { textAlign: 'center' },
  scrollContent: { paddingBottom: AnimoV2Spacing.xl },
  hero: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.xl,
    borderBottomLeftRadius: AnimoV2Radius.xl,
    borderBottomRightRadius: AnimoV2Radius.xl,
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
  },
  heroTopRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-start' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AnimoV2Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  body: { paddingHorizontal: AnimoV2Spacing.lg, paddingTop: AnimoV2Spacing.xl, gap: AnimoV2Spacing.lg },
  statRow: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  statTile: { padding: AnimoV2Spacing.md, gap: AnimoV2Spacing.xs, minHeight: AnimoV2Size.controlHeight * 2 },
  cardPad: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.borderDefault },
  dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.md },
  dataLabel: { flex: 1 },
  dataValue: { flexShrink: 1, maxWidth: '50%', textAlign: 'right' },
  dataColumn: { gap: AnimoV2Spacing.sm },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
  ratingValue: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  listingHead: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  listingMetrics: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  listingMetric: { flex: 1, gap: 2 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
    borderWidth: 2,
    borderColor: AnimoV2Colors.brandLight,
    borderRadius: AnimoV2Radius.lg,
    padding: AnimoV2Spacing.md,
  },
  summaryRow: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  summaryBox: {
    flex: 1,
    gap: AnimoV2Spacing.xs,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.lg,
    backgroundColor: AnimoV2Colors.surfaceMuted,
  },
  feedbackHead: { alignItems: 'center', gap: AnimoV2Spacing.sm },
  commentCard: { padding: AnimoV2Spacing.md, gap: AnimoV2Spacing.sm },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
});

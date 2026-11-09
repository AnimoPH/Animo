import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  Droplets,
  Lock,
  MapPin,
  Minus,
  Scale,
  ShieldCheck,
  Sprout,
  Star,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { PalayReviewsCard } from '@/components/animo/palay-reviews';
import { priceRationaleRows, type PriceRationaleIcon } from '@/components/animo/price-rationale';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { PhotoGallery, type PhotoGalleryItem } from '@/components/animo/ui/photo-gallery';
import { StickyFooter, V2BackHeader } from '@/components/animo/ui/screen-bits';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing, type StatusTone } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { formatRating } from '@/lib/format-rating';
import type { TranslationKey } from '@/i18n/translations';
import { fetchListingPhotos } from '@/services/crop-listing-service';
import { fetchFarmerPublicProfile, type FarmerPublicProfile } from '@/services/farmer-public-profile';
import { fetchMarketplaceListing } from '@/services/marketplace-service';
import { fetchMyActiveRequestForListing } from '@/services/purchase-request-service';
import {
  listingTitle,
  moistureLabel,
  purityLabel,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
  type ListingPhoto,
  type PhotoType,
} from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';

const DEFAULT_PALAY_PHOTOS: Record<PhotoType, string> = {
  Overview:
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200&auto=format&fit=crop&q=80',
  BeforeHarvest:
    'https://images.unsplash.com/photo-1536657464919-892534f60d6e?w=1200&auto=format&fit=crop&q=80',
  AfterHarvestUnsacked:
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80',
};

const PHOTO_SLOTS: { type: PhotoType; title: TranslationKey; short: TranslationKey; sub: TranslationKey }[] = [
  { type: 'Overview', title: 'detailV2.photoOverviewTitle', short: 'detailV2.photoOverviewShort', sub: 'detailV2.photoOverviewSub' },
  { type: 'BeforeHarvest', title: 'detailV2.photoBeforeTitle', short: 'detailV2.photoBeforeShort', sub: 'detailV2.photoBeforeSub' },
  { type: 'AfterHarvestUnsacked', title: 'detailV2.photoGrainTitle', short: 'detailV2.photoGrainShort', sub: 'detailV2.photoGrainSub' },
];

const RATIONALE_ICON: Record<PriceRationaleIcon, { icon: LucideIcon; tone: StatusTone }> = {
  lock: { icon: Lock, tone: 'success' },
  moisture: { icon: Droplets, tone: 'warning' },
  premium: { icon: TrendingUp, tone: 'caution' },
  noPremium: { icon: Minus, tone: 'neutral' },
};

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.infoRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon size={22} color={AnimoV2Colors.textBrand} strokeWidth={2.25} />
      <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.infoLabel}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyStrong" style={styles.infoValue} numberOfLines={2}>
        {value}
      </AnimoText>
    </View>
  );
}

function TrustStat({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View style={styles.trustStat}>
      {children}
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
        {label}
      </AnimoText>
    </View>
  );
}

/**
 * Detalye ng Listing: one real `croplisting` row for a buyer. Three-angle gallery, the locked
 * Patas na Presyo, quality data, the farmer's public record and a sticky purchase-request action.
 */
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, language, isTagalog } = useLanguage();

  const [listing, setListing] = useState<CropListing | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerPublicProfile | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [activeRequest, setActiveRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(undefined);
    fetchMarketplaceListing(id)
      .then(async (result) => {
        if (cancelled) return;
        setListing(result);
        if (!result) return;

        // Fetch photos, farmer public stats, and the buyer's own active
        // request (if any) on this listing in parallel.
        try {
          const [listingPhotos, profile, existingRequest] = await Promise.all([
            fetchListingPhotos(result.id).catch(() => []),
            fetchFarmerPublicProfile(result.id, result).catch(() => null),
            fetchMyActiveRequestForListing(result.id).catch(() => null),
          ]);
          if (!cancelled) {
            setPhotos(listingPhotos);
            setFarmerProfile(profile);
            setActiveRequest(existingRequest);
          }
        } catch {
          // Display falls back gracefully
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : isTagalog ? 'Hindi ma-load ang listing.' : 'Failed to load listing.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isTagalog]);

  // Three angles, with real photos or the stock fallbacks.
  const galleryItems: PhotoGalleryItem[] = useMemo(
    () =>
      PHOTO_SLOTS.map((slot) => {
        const found = photos.find((p) => p.photoType === slot.type);
        return {
          key: slot.type,
          title: t(slot.title),
          shortLabel: t(slot.short),
          subtitle: t(slot.sub),
          url: found?.url || DEFAULT_PALAY_PHOTOS[slot.type],
        };
      }),
    [photos, t],
  );

  const header = <V2BackHeader title={t('buyDetailV2.title')} backLabel={t('common.back')} onBack={() => router.back()} />;

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

  if (errorMessage || !listing) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centerState}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {errorMessage ?? t('buyDetailV2.notFound')}
          </AnimoText>
        </View>
      </View>
    );
  }

  const specificVariety = specificVarietyDisplay(listing, language);
  const rationale = priceRationaleRows(listing);

  const infoRows: { key: string; icon: LucideIcon; label: string; value: string }[] = [
    { key: 'variety', icon: Sprout, label: t('detailV2.rowVariety'), value: varietyLabel(listing, language) },
    ...(specificVariety
      ? [{ key: 'specific', icon: Sprout, label: t('detailV2.rowSpecific'), value: specificVariety }]
      : []),
    { key: 'moisture', icon: Droplets, label: t('detailV2.rowMoisture'), value: moistureLabel(listing.declaredMoisture, language) },
    { key: 'purity', icon: ShieldCheck, label: t('detailV2.rowPurity'), value: purityLabel(listing.declaredPurityGrade, language) },
    { key: 'available', icon: Scale, label: t('buyDetailV2.rowAvailable'), value: `${listing.remainingQuantityKg.toLocaleString('en-PH')} kg` },
    { key: 'weight', icon: Scale, label: t('detailV2.rowWeight'), value: `${listing.netWeightKg.toLocaleString('en-PH')} kg` },
  ];

  const reviewLabel = farmerProfile
    ? t(farmerProfile.totalReviews === 1 ? 'buyDetailV2.reviewOne' : 'buyDetailV2.reviewMany', {
        count: farmerProfile.totalReviews,
      })
    : '';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {header}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PhotoGallery items={galleryItems} />

        {/* Title */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <AnimoText variant="heading" accessibilityRole="header">
              {listingTitle(listing)}
            </AnimoText>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('buyDetailV2.availableKg', { kg: listing.remainingQuantityKg.toLocaleString('en-PH') })}
            </AnimoText>
          </View>
          {specificVariety ? <StatusPill tone="neutral" label={specificVariety} icon={Sprout} /> : null}
        </View>

        {/* Locked fair price */}
        <View style={styles.revealEdge}>
          <View style={styles.reveal}>
            <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand} style={styles.revealTag}>
              {t('detailV2.fairPrice')}
            </AnimoText>
            <View style={styles.priceRow}>
              <AnimoText variant="priceHero" color={AnimoV2Colors.textOnBrand}>
                {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg) : '—'}
              </AnimoText>
              <AnimoText variant="subheading" color={AnimoV2Colors.textOnBrand}>
                {t('detailV2.perKg')}
              </AnimoText>
            </View>
            <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand}>
              {t('detailV2.totalValue', { kg: listing.remainingQuantityKg })}{' '}
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand}>
                {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg * listing.remainingQuantityKg) : '—'}
              </AnimoText>
            </AnimoText>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textOnBrand}>
              {t('buyDetailV2.minOrder', { kg: listing.minimumRequestKg })}
            </AnimoText>
          </View>
        </View>

        {/* Why this price (only facts the listing supports) */}
        {rationale ? (
          <DepthCard depth="flat" style={styles.cardPad}>
            {rationale.map((row, index) => {
              const meta = RATIONALE_ICON[row.icon];
              return (
                <View key={row.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.factorRow}>
                    <IconTile icon={meta.icon} tone={meta.tone} size={36} />
                    <View style={styles.factorCopy}>
                      <AnimoText variant="bodyStrong">{t(row.label)}</AnimoText>
                      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                        {t(row.detail)}
                      </AnimoText>
                    </View>
                  </View>
                </View>
              );
            })}
          </DepthCard>
        ) : null}

        {/* Datos ng Kalidad */}
        <DepthCard depth="flat" style={styles.cardPad}>
          <AnimoText variant="subheading" accessibilityRole="header">
            {t('buyDetailV2.qualityTitle')}
          </AnimoText>
          {infoRows.map((row) => (
            <InfoRow key={row.key} icon={row.icon} label={row.label} value={row.value} />
          ))}
        </DepthCard>

        {/* Farmer trust card: opens the full farmer profile */}
        {farmerProfile ? (
          <DepthCard
            depth="flat"
            onPress={() =>
              router.push({
                pathname: '/(buyer)/palengke/magsasaka/[id]',
                params: { id: listing.id },
              })
            }
            accessibilityLabel={t('buyDetailV2.viewFarmer')}
            style={styles.cardPad}>
            <AnimoText variant="subheading" accessibilityRole="header">
              {t('buyDetailV2.farmerTitle')}
            </AnimoText>
            <View style={styles.farmerTop}>
              <View style={styles.avatar}>
                <AnimoText variant="heading" color={AnimoV2Colors.textBrand}>
                  {farmerProfile.name[0]?.toUpperCase() || 'M'}
                </AnimoText>
              </View>
              <View style={styles.farmerCopy}>
                <AnimoText variant="bodyStrong" numberOfLines={1}>
                  {farmerProfile.name}
                </AnimoText>
                {farmerProfile.location ? (
                  <View style={styles.locationRow}>
                    <MapPin size={16} color={AnimoV2Colors.textSecondary} strokeWidth={2.5} />
                    <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
                      {farmerProfile.location}
                    </AnimoText>
                  </View>
                ) : null}
              </View>
              <ChevronRight size={24} color={AnimoV2Colors.textSecondary} strokeWidth={2.75} />
            </View>

            <View style={styles.divider} />

            <View style={styles.trustRow}>
              <TrustStat label={reviewLabel}>
                <View style={styles.ratingRow}>
                  <AnimoText variant="heading">
                    {formatRating(farmerProfile.averageRating, farmerProfile.totalReviews > 0)}
                  </AnimoText>
                  <Star
                    size={18}
                    strokeWidth={2.5}
                    color={AnimoV2Colors.warningSolid}
                    fill={farmerProfile.totalReviews > 0 ? AnimoV2Colors.warningSolid : 'transparent'}
                  />
                </View>
              </TrustStat>
              <TrustStat label={t('buyDetailV2.statTransactions')}>
                <AnimoText variant="heading">{farmerProfile.completedTransactionsCount}</AnimoText>
              </TrustStat>
              <TrustStat label={t('buyDetailV2.statPositive')}>
                <AnimoText variant="heading">
                  {farmerProfile.positiveFeedbackPct != null ? `${farmerProfile.positiveFeedbackPct}%` : '—'}
                </AnimoText>
              </TrustStat>
            </View>
          </DepthCard>
        ) : null}

        <PalayReviewsCard
          v2
          listingId={listing.id}
          onPress={() =>
            router.push({
              pathname: '/(buyer)/palengke/reviews',
              params: { id: listing.id },
            })
          }
        />
      </ScrollView>

      <StickyFooter>
        {activeRequest ? (
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {t('buyDetailV2.activeRequestNote')}
          </AnimoText>
        ) : null}
        <ChunkyButton
          label={activeRequest ? t('buyDetailV2.hasActive') : t('buyDetailV2.submit')}
          disabled={activeRequest !== null}
          onPress={() =>
            router.push({
              pathname: '/(buyer)/palengke/bid',
              params: { id: listing.id },
            })
          }
        />
        <View style={{ height: insets.bottom }} />
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  centerText: { textAlign: 'center' },
  content: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xs,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: AnimoV2Spacing.md },
  titleCol: { flex: 1, gap: 2 },
  revealEdge: { borderRadius: AnimoV2Radius.xl, backgroundColor: AnimoV2Colors.actionPrimaryDepth, paddingBottom: 6 },
  reveal: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    borderRadius: AnimoV2Radius.xl,
    padding: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.md,
  },
  revealTag: { opacity: 0.9 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
  cardPad: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.borderDefault, marginBottom: AnimoV2Spacing.md },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: AnimoV2Spacing.md },
  factorCopy: { flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  infoLabel: { flex: 1 },
  infoValue: { flexShrink: 1, maxWidth: '50%', textAlign: 'right' },
  farmerTop: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerCopy: { flex: 1, gap: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  trustRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm },
  trustStat: { flex: 1, alignItems: 'center', gap: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  ChartNoAxesCombined,
  Flame,
  ImageIcon,
  Scale,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { SuspensionNotice } from '@/components/animo/suspension-notice';
import {
  SpotlightTour,
  type SpotlightStep,
  TUTORIAL_STORAGE_KEY,
} from '@/components/animo/spotlight-tour';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { Mascot } from '@/components/animo/ui/mascot';
import { SeeAllLink } from '@/components/animo/ui/see-all-link';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { fetchMyBuyerPreferences } from '@/services/buyer-preferences-service';
import { fetchCoverPhotos } from '@/services/crop-listing-service';
import {
  fetchMarketPopularityInsights,
  type MarketPopularityInsight,
} from '@/services/farmer-public-profile';
import { fetchMarketplaceListings } from '@/services/marketplace-service';
import { fetchUnreadNotificationCount } from '@/services/notification-service';
import {
  listingTitle,
  moistureLabel,
  specificVarietyDisplay,
  translateVarietyName,
  type CropListing,
} from '@/types/crop-listing';
import type { RankedListing } from '@/types/marketplace-filter';

/** How many ranked listings go into the "Mga Rekomendasyon" row. */
const RECOMMENDED_COUNT = 4;
/** How many listings the "Mga Bagong Listing" grid shows. */
const NEWEST_COUNT = 6;
/** Sub-score at or above which a ranking criterion counts as a match (exact match scores 1). */
const MATCH_THRESHOLD = 0.99;
const MAX_REASONS = 3;
const RECO_CARD_WIDTH = 232;

/** Tahanan: buyer home. Greeting hero, recommendations, newest listings and the fair-price promise. */
export default function BuyerHomeScreen() {
  const { t, isTagalog } = useLanguage();
  const { account } = useSession();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ startTour?: string }>();
  const [recommended, setRecommended] = useState<RankedListing[]>([]);
  const [newest, setNewest] = useState<CropListing[]>([]);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [insights, setInsights] = useState<MarketPopularityInsight | null>(null);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Spotlight target refs
  const marketTrendsRef = useRef<View>(null);
  const searchRef = useRef<View>(null);
  const bellRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const load = useCallback(() => {
    fetchUnreadNotificationCount()
      .then(setUnread)
      .catch(() => {});
    fetchMarketPopularityInsights()
      .then((data) => {
        setInsights(data);
      })
      .catch(() => {
        setInsights(null);
      });
    return fetchMyBuyerPreferences()
      .catch(() => null)
      .then(async (preferences) => {
        setHasPreferences(Boolean(preferences?.preferredVariety || preferences?.preferredMoisture));
        const ranked = await fetchMarketplaceListings({
          variety: preferences?.preferredVariety ?? undefined,
          moisture: preferences?.preferredMoisture ?? undefined,
        });
        const top = ranked.slice(0, RECOMMENDED_COUNT);
        const fresh = ranked
          .map((item) => item.listing)
          .sort((a, b) => b.dateListed.localeCompare(a.dateListed))
          .slice(0, NEWEST_COUNT);
        setRecommended(top);
        setNewest(fresh);
        try {
          const ids = Array.from(new Set([...top.map((item) => item.listing.id), ...fresh.map((l) => l.id)]));
          const photos = await fetchCoverPhotos(ids);
          setCoverPhotos(photos);
        } catch {
          // fallback: cards render without photos
        }
      })
      .catch(() => {});
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      let active = true;
      if (params.startTour === 'true') {
        setShowTutorial(true);
      } else {
        AsyncStorage.getItem(TUTORIAL_STORAGE_KEY).then((seen) => {
          if (active) setShowTutorial(seen !== 'true');
        });
      }
      return () => {
        active = false;
      };
    }, [load, params.startTour]),
  );

  useAutoRefresh(() => {
    void load();
  });

  // Newest listings: stacked columns of natural height. With an odd count the last
  // one is pulled out and shown full width below instead of leaving a gap.
  const soloListing = newest.length % 2 === 1 ? newest[newest.length - 1] : null;
  const stackedListings = soloListing ? newest.slice(0, -1) : newest;
  const leftListings = useMemo(() => stackedListings.filter((_, idx) => idx % 2 === 0), [stackedListings]);
  const rightListings = useMemo(() => stackedListings.filter((_, idx) => idx % 2 === 1), [stackedListings]);

  const buyerTourSteps: SpotlightStep[] = [
    {
      id: 'buyer-market-trends',
      title: t('spotlight.buyer.step1Title'),
      description: t('spotlight.buyer.step1Desc'),
      icon: Flame,
      targetRef: marketTrendsRef,
      shape: 'rectangle',
      borderRadius: AnimoV2Radius.xl,
      padding: 6,
    },
    {
      id: 'buyer-quick-actions',
      title: t('spotlight.buyer.step2Title'),
      description: t('spotlight.buyer.step2Desc'),
      icon: ShoppingBag,
      targetRef: searchRef,
      shape: 'rectangle',
      borderRadius: AnimoV2Radius.md,
      padding: 6,
    },
    {
      id: 'buyer-bell',
      title: t('spotlight.buyer.step4Title'),
      description: t('spotlight.buyer.step4Desc'),
      icon: Bell,
      targetRef: bellRef,
      shape: 'circle',
      padding: 6,
    },
  ];

  const fullName = account?.fullName?.trim() || t('role.buyer');
  const goPalengke = () => router.push('/(buyer)/palengke');
  const openListing = (id: string) => router.push(`/(buyer)/palengke/${id}`);

  /** Up to three reasons a listing ranked well, from the WPM sub-scores. Only meaningful once preferences are saved. */
  const reasonsFor = (item: RankedListing): string[] => {
    if (!hasPreferences) return [];
    const reasons: string[] = [];
    if (item.breakdown.variety >= MATCH_THRESHOLD) reasons.push(t('buyHomeV2.reasonVariety'));
    if (item.breakdown.moisture >= MATCH_THRESHOLD) reasons.push(t('buyHomeV2.reasonMoisture'));
    if (item.breakdown.price >= MATCH_THRESHOLD) reasons.push(t('buyHomeV2.reasonPrice'));
    return reasons.slice(0, MAX_REASONS);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AnimoV2Colors.actionPrimary]}
          />
        }>
        {/* Hero: extends under the status bar */}
        <View style={[styles.hero, { paddingTop: insets.top + AnimoV2Spacing.lg }]}>
          <View style={styles.greetingRow}>
            <Mascot size={52} tile={false} />
            <View style={styles.flex}>
              <AnimoText variant="title" color={AnimoV2Colors.textOnBrand} numberOfLines={1} accessibilityRole="header">
                {t('home.greeting', { name: fullName })}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textOnBrand} numberOfLines={2}>
                {t('buyHomeV2.subtitle')}
              </AnimoText>
            </View>
            <View ref={bellRef} collapsable={false}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  unread > 0 ? t('home.bellLabel', { count: unread }) : t('home.bellLabelNone')
                }
                onPress={() => router.push('/(buyer)/notipikasyon')}
                style={styles.bell}>
                <Bell size={26} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
                {unread > 0 ? <View style={styles.bellDot} /> : null}
              </Pressable>
            </View>
          </View>

          <View ref={searchRef} collapsable={false}>
            <Pressable
              accessibilityRole="search"
              accessibilityLabel={t('buyHomeV2.searchLabel')}
              onPress={goPalengke}
              style={styles.searchButton}>
              <Search size={22} color={AnimoV2Colors.textTertiary} strokeWidth={2.5} />
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textTertiary} numberOfLines={1} style={styles.flex}>
                {t('buyHomeV2.searchHint')}
              </AnimoText>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <SuspensionNotice />

          {/* Market highlights */}
          <View ref={marketTrendsRef} collapsable={false}>
            {insights ? (
              <DepthCard style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <IconTile icon={Flame} tone="caution" size={44} solid />
                  <AnimoText variant="heading" style={styles.flex}>
                    {t('buyer.marketTrends')}
                  </AnimoText>
                </View>

                <View style={styles.insightRow}>
                  <View style={styles.insightCol}>
                    <AnimoText variant="bodyStrong" color={AnimoV2Colors.successFg}>
                      {t('buyer.mostSold')}
                    </AnimoText>
                    <AnimoText variant="heading" color={AnimoV2Colors.textBrand} numberOfLines={2}>
                      {translateVarietyName(insights.topVariety, isTagalog)}
                    </AnimoText>
                  </View>
                  <View style={styles.insightCol}>
                    <AnimoText variant="bodyStrong" color={AnimoV2Colors.successFg}>
                      {t('buyer.averagePrice')}
                    </AnimoText>
                    <AnimoText variant="heading" color={AnimoV2Colors.textBrand} numberOfLines={1}>
                      {`₱${insights.averagePricePerKg.toFixed(2)}`}
                      <AnimoText variant="bodyStrong" color={AnimoV2Colors.successFg}>{` ${t('common.perKg')}`}</AnimoText>
                    </AnimoText>
                  </View>
                </View>

                <View style={styles.insightFoot}>
                  <ChartNoAxesCombined size={18} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
                  <AnimoText variant="tagV2" color={AnimoV2Colors.textBrand}>
                    {t('buyer.stablePrice')}
                  </AnimoText>
                </View>
              </DepthCard>
            ) : null}
          </View>

          {/* Mga Rekomendasyon */}
          {recommended.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title={t('buyer.recommendations')} actionLabel={t('farmer.activitiesView')} onAction={goPalengke} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                style={styles.bleed}>
                {recommended.map((item) => (
                  <HomeListingCard
                    key={item.listing.id}
                    listing={item.listing}
                    coverPhotoUrl={coverPhotos.get(item.listing.id)}
                    onPress={() => openListing(item.listing.id)}
                    width={RECO_CARD_WIDTH}
                    matchPct={hasPreferences ? Math.round(item.score * 100) : undefined}
                    reasons={reasonsFor(item)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Mga Bagong Listing */}
          {newest.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title={t('buyHomeV2.newTitle')} actionLabel={t('farmer.activitiesView')} onAction={goPalengke} />
              <View style={styles.masonryRow}>
                <View style={styles.masonryColumn}>
                  {leftListings.map((listing) => (
                    <HomeListingCard
                      key={listing.id}
                      listing={listing}
                      coverPhotoUrl={coverPhotos.get(listing.id)}
                      onPress={() => openListing(listing.id)}
                    />
                  ))}
                </View>
                <View style={styles.masonryColumn}>
                  {rightListings.map((listing) => (
                    <HomeListingCard
                      key={listing.id}
                      listing={listing}
                      coverPhotoUrl={coverPhotos.get(listing.id)}
                      onPress={() => openListing(listing.id)}
                    />
                  ))}
                </View>
              </View>
              {soloListing ? (
                <HomeListingCard
                  wide
                  listing={soloListing}
                  coverPhotoUrl={coverPhotos.get(soloListing.id)}
                  onPress={() => openListing(soloListing.id)}
                />
              ) : null}
            </View>
          ) : null}

          {/* Patas na Presyo reassurance (fixed prices, no bidding) */}
          <DepthCard
            depth="flat"
            backgroundColor={AnimoV2Colors.surfaceBrandSubtle}
            borderColor={AnimoV2Colors.actionPrimary}
            style={styles.fairCard}>
            <IconTile icon={Scale} tone="success" size={56} solid shape="rounded" />
            <View style={styles.flex}>
              <AnimoText variant="heading">{t('buyHomeV2.fairTitle')}</AnimoText>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                {t('buyHomeV2.fairBody')}
              </AnimoText>
            </View>
          </DepthCard>
        </View>
      </ScrollView>

      {/* GCash-style Interactive Spotlight Tour for Buyers */}
      <SpotlightTour
        visible={showTutorial}
        role="mamimili"
        steps={buyerTourSteps}
        scrollViewRef={scrollViewRef}
        storageKey={TUTORIAL_STORAGE_KEY}
        onClose={() => {
          setShowTutorial(false);
          AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true').catch(() => {});
          // Drop the replay flag, otherwise coming back to this tab would
          // re-open the tour because startTour is still on the route.
          if (params.startTour === 'true') {
            router.setParams({ startTour: undefined });
          }
        }}
      />
    </View>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AnimoText variant="heading" accessibilityRole="header" style={styles.flex}>
        {title}
      </AnimoText>
      <SeeAllLink label={actionLabel} onPress={onAction} />
    </View>
  );
}

/** Home listing card: photo with moisture tag (and match %), name, price and kg left. Natural height. */
function HomeListingCard({
  listing,
  coverPhotoUrl,
  onPress,
  width,
  wide = false,
  matchPct,
  reasons = [],
}: {
  listing: CropListing;
  coverPhotoUrl: string | undefined;
  onPress: () => void;
  /** Fixed width for horizontal lists; omit to fill the column. */
  width?: number;
  /** Alone on its row: full width with a wider photo. */
  wide?: boolean;
  matchPct?: number;
  reasons?: string[];
}) {
  const { t, language } = useLanguage();
  const name = listingTitle(listing);
  const variety = specificVarietyDisplay(listing, language);
  const soldOut = listing.remainingQuantityKg <= 0;
  const horizontal = width !== undefined;

  return (
    <DepthCard
      radius="lg"
      onPress={onPress}
      accessibilityLabel={t('buyHomeV2.openListing', { name })}
      wrapperStyle={width !== undefined ? { width } : styles.cardWrapper}
      style={styles.card}>
      <View style={[styles.photoArea, horizontal ? styles.photoAreaHorizontal : wide ? styles.photoAreaWide : null]}>
        {coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <ImageIcon size={36} color={AnimoV2Colors.textTertiary} />
        )}
        <View style={styles.moistureTag}>
          <AnimoText variant="tagV2">{moistureLabel(listing.declaredMoisture, language)}</AnimoText>
        </View>
        {matchPct !== undefined ? (
          <View style={styles.matchTag}>
            <Sparkles size={14} color={AnimoV2Colors.textOnBrand} strokeWidth={2.75} />
            <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand}>
              {t('buyHomeV2.match', { pct: matchPct })}
            </AnimoText>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <AnimoText variant="bodyStrong" numberOfLines={2} style={styles.cardName}>
          {name}
        </AnimoText>
        {variety ? (
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
            {variety}
          </AnimoText>
        ) : null}
        <AnimoText variant="priceV2" color={soldOut ? AnimoV2Colors.textDisabled : AnimoV2Colors.textBrand} numberOfLines={1}>
          {listing.pricePerKg !== null ? `${formatPeso(listing.pricePerKg)}${t('aniV2.perKg')}` : '—'}
        </AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
          {t('aniV2.kgLeft', { n: listing.remainingQuantityKg.toLocaleString('en-PH') })}
        </AnimoText>
        {reasons.length > 0 ? (
          <View style={styles.pillRow}>
            {reasons.map((reason) => (
              <StatusPill key={reason} tone="success" label={reason} />
            ))}
          </View>
        ) : null}
      </View>
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: AnimoV2Spacing.xxl },
  hero: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.xl,
    borderBottomLeftRadius: AnimoV2Radius.xl,
    borderBottomRightRadius: AnimoV2Radius.xl,
    gap: AnimoV2Spacing.lg,
    overflow: 'hidden',
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  bell: {
    width: AnimoV2Size.iconButton,
    height: AnimoV2Size.iconButton,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: AnimoV2Colors.dangerSolid,
    borderWidth: 2,
    borderColor: AnimoV2Colors.surfaceCard,
  },
  searchButton: {
    height: AnimoV2Size.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    paddingHorizontal: AnimoV2Spacing.lg,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  body: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.xl,
  },
  insightCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  insightRow: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  insightCol: {
    flex: 1,
    minWidth: 0,
    gap: AnimoV2Spacing.xs,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.lg,
    borderWidth: 2,
    borderColor: AnimoV2Colors.actionPrimary,
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
  },
  insightFoot: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  section: { gap: AnimoV2Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.md },
  /** Lets a horizontal list scroll edge to edge while the page keeps its side padding. */
  bleed: { marginHorizontal: -AnimoV2Spacing.lg },
  horizontalList: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.xs,
    gap: AnimoV2Spacing.md,
    alignItems: 'flex-start',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.xs },
  masonryRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm, alignItems: 'flex-start' },
  masonryColumn: { flex: 1, gap: AnimoV2Spacing.sm },
  cardWrapper: { width: '100%' },
  card: { padding: 0 },
  photoArea: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoAreaHorizontal: { aspectRatio: 4 / 3 },
  photoAreaWide: { aspectRatio: 2 },
  photoImage: { ...StyleSheet.absoluteFillObject },
  moistureTag: {
    position: 'absolute',
    left: AnimoV2Spacing.sm,
    bottom: AnimoV2Spacing.sm,
    backgroundColor: AnimoV2Colors.surfaceCard,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingVertical: 4,
    borderRadius: AnimoV2Radius.full,
  },
  matchTag: {
    position: 'absolute',
    top: AnimoV2Spacing.sm,
    left: AnimoV2Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AnimoV2Colors.actionPrimary,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingVertical: 4,
    borderRadius: AnimoV2Radius.full,
  },
  cardBody: { padding: AnimoV2Spacing.md, gap: AnimoV2Spacing.xs },
  cardName: { minHeight: 24 },
  fairCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.lg,
  },
});

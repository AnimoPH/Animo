import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Search, Star, Users } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimoText } from '@/components/animo/animo-text';
import {
  BuyerFilterSheet,
  type BuyerMoistureChoice,
  type BuyerVarietyChoice,
} from '@/components/animo/buyer/buyer-filter-sheet';
import { MarketplaceListingCard } from '@/components/animo/buyer/marketplace-listing-card';
import {
  BUYER_PALENGKE_TUTORIAL_KEY,
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { CollapsingHeader } from '@/components/animo/ui/collapsing-header';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { Mascot } from '@/components/animo/ui/mascot';
import { V2SearchBar } from '@/components/animo/ui/search-bar';
import { SegmentedTabs } from '@/components/animo/ui/segmented-tabs';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useCollapsingHeader } from '@/hooks/use-collapsing-header';
import { useLanguage } from '@/hooks/use-language';
import { fetchCoverPhotos } from '@/services/crop-listing-service';
import {
  fetchTopRankedFarmers,
  type RankedFarmer,
} from '@/services/farmer-public-profile';
import { fetchMarketplaceListings } from '@/services/marketplace-service';
import { moistureLabel, purityLabel, varietyLabel } from '@/types/crop-listing';
import type { MarketplaceFilters, RankedListing } from '@/types/marketplace-filter';

type TabMode = 'palay' | 'magsasaka';

/** Quick chips above the grid. Display-only: they narrow what is already loaded. */
type QuickFilter = 'all' | 'Inbred' | 'Hybrid' | 'Dry' | 'Wet';

/** Parses a filter text field, treating blank/garbage as "not set" rather than 0. */
function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Palengke — the buyer's marketplace and farmer directory.
 *
 * Supports searching both crop listings and farmer profiles with ranking insights.
 */
export default function MarketplaceScreen() {
  const { t, isTagalog } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabMode>('palay');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [showTutorial, setShowTutorial] = useState(false);

  // Draft filter state (committed when user taps "Ilapat" in the sheet)
  const [quantityText, setQuantityText] = useState('');
  const [minPriceText, setMinPriceText] = useState('');
  const [maxPriceText, setMaxPriceText] = useState('');
  const [variety, setVariety] = useState<BuyerVarietyChoice>('Lahat');
  const [moisture, setMoisture] = useState<BuyerMoistureChoice>('Lahat');

  const [filters, setFilters] = useState<MarketplaceFilters>({});

  const [ranked, setRanked] = useState<RankedListing[]>([]);
  const [farmers, setFarmers] = useState<RankedFarmer[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const searchRowRef = useRef<View>(null);
  const tabBarRef = useRef<View>(null);

  // Collapsing top block (title, search, tabs, chips): slides away on scroll down, and returns as
  // just the compact controls on scroll up. Pinned open while the spotlight tutorial runs, since
  // it measures the search row and tabs by position.
  const header = useCollapsingHeader({ locked: showTutorial });
  const { headerHeight, showHeader } = header;

  const latestRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setErrorMessage(undefined);
    try {
      const result = await fetchMarketplaceListings(filters);
      if (latestRequestId.current !== requestId) return;
      // Keep the WPM order from fetchMarketplaceListings: highest score first,
      // older listing first on a tie.
      setRanked(result);

      try {
        const farmerResult = await fetchTopRankedFarmers();
        if (latestRequestId.current === requestId) setFarmers(farmerResult);
      } catch {
        if (latestRequestId.current === requestId) setFarmers([]);
      }

      try {
        const photos = await fetchCoverPhotos(result.map((item) => item.listing.id));
        if (latestRequestId.current === requestId) setCoverPhotos(photos);
      } catch {
        // Cards fall back to the placeholder icon.
      }
    } catch (err) {
      if (latestRequestId.current === requestId) {
        setErrorMessage(
          err instanceof Error ? err.message : (isTagalog ? 'Hindi ma-load ang mga listing.' : 'Failed to load listings.'),
        );
      }
    } finally {
      if (latestRequestId.current === requestId) setLoading(false);
    }
  }, [filters, isTagalog]);

  useFocusEffect(
    useCallback(() => {
      load();
      let active = true;
      AsyncStorage.getItem(BUYER_PALENGKE_TUTORIAL_KEY).then((seen) => {
        if (active) setShowTutorial(seen !== 'true');
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  useAutoRefresh(load);

  const applyFilters = () => {
    setLoading(true);
    setFilters({
      desiredQuantityKg: parseNumber(quantityText),
      minPricePerKg: parseNumber(minPriceText),
      maxPricePerKg: parseNumber(maxPriceText),
      variety: variety === 'Lahat' ? undefined : variety,
      moisture: moisture === 'Lahat' ? undefined : moisture,
    });
    setModalOpen(false);
  };

  const resetFilters = () => {
    setQuantityText('');
    setMinPriceText('');
    setMaxPriceText('');
    setVariety('Lahat');
    setMoisture('Lahat');
    setLoading(true);
    setFilters({});
    setModalOpen(false);
  };

  const activeFilterCount = useMemo(
    () =>
      [
        filters.desiredQuantityKg,
        filters.minPricePerKg,
        filters.maxPricePerKg,
        filters.variety,
        filters.moisture,
      ].filter((value) => value !== undefined).length,
    [filters],
  );

  // Filter listings by search query (variety label, custom variety, moisture, purity, etc.)
  const searchedListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ranked;

    const terms = query
      .split(/\s+/)
      .filter((t) => t.length > 0 && !['ng', 'ang', 'mga', 'sa'].includes(t));

    if (terms.length === 0) return ranked;

    return ranked.filter((item) => {
      const l = item.listing;
      const vLabel = varietyLabel(l).toLowerCase();
      const rawVariety = l.declaredVariety.toLowerCase();
      const custom = l.declaredVarietyCustom?.toLowerCase() || '';
      const name = l.listingName.toLowerCase();
      const moisture = l.declaredMoisture.toLowerCase(); // 'dry' or 'wet'
      const mLabel = moistureLabel(l.declaredMoisture).toLowerCase(); // 'tuyo (dry)' or 'basa (wet)'
      const purity = purityLabel(l.declaredPurityGrade).toLowerCase();

      return terms.every((term) => {
        if (term === 'palay') return true;
        if (term === 'dry' || term === 'tuyo' || term === 'tuyong') {
          return l.declaredMoisture === 'Dry';
        }
        if (term === 'wet' || term === 'basa' || term === 'basang') {
          return l.declaredMoisture === 'Wet';
        }
        return (
          name.includes(term) ||
          vLabel.includes(term) ||
          rawVariety.includes(term) ||
          custom.includes(term) ||
          moisture.includes(term) ||
          mLabel.includes(term) ||
          purity.includes(term)
        );
      });
    });
  }, [ranked, searchQuery]);

  const displayedListings = useMemo(() => {
    if (quickFilter === 'all') return searchedListings;
    return searchedListings.filter(({ listing }) =>
      quickFilter === 'Dry' || quickFilter === 'Wet'
        ? listing.declaredMoisture === quickFilter
        : listing.declaredVariety === quickFilter,
    );
  }, [searchedListings, quickFilter]);

  const isListEmpty = displayedListings.length === 0;
  // Loading / error / empty states aren't scrollable, so they get their top offset from the
  // container; scrollable lists take it as content padding so they slide under the header.
  const listScrolls = activeTab === 'magsasaka' || (!loading && !errorMessage && !isListEmpty);

  // A fresh list (tab switch, or a state with nothing to scroll) always starts with the header shown.
  useEffect(() => {
    showHeader(true);
  }, [activeTab, loading, errorMessage, isListEmpty, showHeader]);

  const displayedFarmers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return farmers;

    return farmers.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query) ||
        f.commonlySoldVarieties.some((v) => v.toLowerCase().includes(query)),
    );
  }, [farmers, searchQuery]);

  // Stacked (masonry) columns keep each card at its natural height. With an odd count the last
  // listing is pulled out and rendered full width below, instead of leaving a gap beside it.
  const soloListing =
    displayedListings.length % 2 === 1 ? displayedListings[displayedListings.length - 1] : null;
  const stackedListings = soloListing ? displayedListings.slice(0, -1) : displayedListings;
  const leftListings = useMemo(
    () => stackedListings.filter((_, idx) => idx % 2 === 0),
    [stackedListings],
  );
  const rightListings = useMemo(
    () => stackedListings.filter((_, idx) => idx % 2 === 1),
    [stackedListings],
  );

  const quickChips: { value: QuickFilter; label: string }[] = [
    { value: 'all', label: t('common.all') },
    { value: 'Inbred', label: t('buyPalV2.chipInbred') },
    { value: 'Hybrid', label: t('buyPalV2.chipHybrid') },
    { value: 'Dry', label: t('buyPalV2.chipDry') },
    { value: 'Wet', label: t('buyPalV2.chipWet') },
  ];

  const buyerPalengkeTourSteps: SpotlightStep[] = [
    {
      id: 'buyer-palengke-search',
      title: t('spotlight.buyerPalengke.step1Title'),
      description: t('spotlight.buyerPalengke.step1Desc'),
      icon: Search,
      targetRef: searchRowRef,
      shape: 'rectangle',
      borderRadius: AnimoV2Radius.md,
      padding: 6,
    },
    {
      id: 'buyer-palengke-tabs',
      title: t('spotlight.buyerPalengke.step2Title'),
      description: t('spotlight.buyerPalengke.step2Desc'),
      icon: Users,
      targetRef: tabBarRef,
      shape: 'rectangle',
      borderRadius: AnimoV2Radius.md,
      padding: 6,
    },
  ];

  const openListing = (id: string) => router.push(`/(buyer)/palengke/${id}`);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SpotlightTour
        steps={buyerPalengkeTourSteps}
        visible={showTutorial}
        storageKey={BUYER_PALENGKE_TUTORIAL_KEY}
        onClose={() => {
          setShowTutorial(false);
          AsyncStorage.setItem(BUYER_PALENGKE_TUTORIAL_KEY, 'true').catch(() => {});
        }}
      />

      <BuyerFilterSheet
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        quantityText={quantityText}
        onQuantityChange={setQuantityText}
        minPriceText={minPriceText}
        onMinPriceChange={setMinPriceText}
        maxPriceText={maxPriceText}
        onMaxPriceChange={setMaxPriceText}
        variety={variety}
        onVarietyChange={setVariety}
        moisture={moisture}
        onMoistureChange={setMoisture}
      />

      {/* Main content */}
      <View style={[styles.listContainer, !listScrolls && { paddingTop: headerHeight }]}>
        {activeTab === 'palay' ? (
          loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
            </View>
          ) : errorMessage ? (
            <View style={styles.centerState}>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
                {errorMessage}
              </AnimoText>
              <ChunkyButton
                label={t('buyPalV2.retry')}
                variant="secondary"
                onPress={load}
                style={styles.stretch}
              />
            </View>
          ) : displayedListings.length === 0 ? (
            <View style={styles.centerState}>
              <Mascot size={96} />
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {searchQuery.trim().length > 0
                  ? t('buyPalV2.emptySearch', { q: searchQuery })
                  : activeFilterCount > 0 || quickFilter !== 'all'
                    ? t('buyPalV2.emptyFilters')
                    : t('buyPalV2.emptyNone')}
              </AnimoText>
            </View>
          ) : (
            <Animated.ScrollView
              onScroll={header.onScroll}
              scrollEventThrottle={16}
              keyboardDismissMode="on-drag"
              contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + AnimoV2Spacing.xs }]}
              showsVerticalScrollIndicator={false}>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.resultCount}>
                {t('buyPalV2.resultCount', { n: displayedListings.length })}
              </AnimoText>
              <View style={styles.masonryRow}>
                <View style={styles.masonryColumn}>
                  {leftListings.map((item) => (
                    <MarketplaceListingCard
                      key={item.listing.id}
                      spaced={false}
                      listing={item.listing}
                      coverPhotoUrl={coverPhotos.get(item.listing.id)}
                      onPress={() => openListing(item.listing.id)}
                    />
                  ))}
                </View>
                <View style={styles.masonryColumn}>
                  {rightListings.map((item) => (
                    <MarketplaceListingCard
                      key={item.listing.id}
                      spaced={false}
                      listing={item.listing}
                      coverPhotoUrl={coverPhotos.get(item.listing.id)}
                      onPress={() => openListing(item.listing.id)}
                    />
                  ))}
                </View>
              </View>
              {soloListing ? (
                <View style={styles.soloRow}>
                  <MarketplaceListingCard
                    wide
                    spaced={false}
                    listing={soloListing.listing}
                    coverPhotoUrl={coverPhotos.get(soloListing.listing.id)}
                    onPress={() => openListing(soloListing.listing.id)}
                  />
                </View>
              ) : null}
            </Animated.ScrollView>
          )
        ) : (
          /* Farmer profiles & directory */
          <Animated.FlatList
            key="magsasaka-list"
            data={displayedFarmers}
            keyExtractor={(item) => item.farmerId}
            onScroll={header.onScroll}
            scrollEventThrottle={16}
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.farmersDirectoryList, { paddingTop: headerHeight + AnimoV2Spacing.md }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Mascot size={96} />
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                  {searchQuery.trim().length > 0
                    ? t('buyPalV2.farmersEmptySearch', { q: searchQuery })
                    : t('buyPalV2.farmersEmptyNone')}
                </AnimoText>
              </View>
            }
            renderItem={({ item }) => (
              <FarmerDirectoryCard
                farmer={item}
                onPress={() =>
                  router.push({
                    pathname: '/(buyer)/palengke/magsasaka/[id]',
                    params: { id: item.listingId },
                  })
                }
              />
            )}
          />
        )}
      </View>

      {/* Collapsing top block: overlays the list, slides away on scroll down and returns on scroll up. */}
      <CollapsingHeader header={header}>
        {/* Screen header (same pattern as Aking Ani) */}
        <View
          onLayout={header.onTitleLayout}
          style={[styles.headerRow, { paddingTop: insets.top + AnimoV2Spacing.sm }]}>
          <View style={styles.headerTitleCol}>
            <AnimoText variant="title" accessibilityRole="header" style={styles.headerTitle}>
              {t('tab.market')}
            </AnimoText>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('buyPalV2.subtitle')}
            </AnimoText>
          </View>
        </View>

        {/* Search + filter button */}
        <View ref={searchRowRef} collapsable={false} style={styles.padded}>
          <V2SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={activeTab === 'palay' ? t('buyPalV2.searchListings') : t('buyPalV2.searchFarmers')}
            clearLabel={t('buyPalV2.clearSearch')}
            filterLabel={t('buyPalV2.filters')}
            activeFilterCount={activeFilterCount}
            onFilterPress={activeTab === 'palay' ? () => setModalOpen(true) : undefined}
          />
        </View>

        {/* Mga Palay vs Mga Magsasaka */}
        <View ref={tabBarRef} collapsable={false} style={[styles.padded, styles.tabsWrap]}>
          <SegmentedTabs<TabMode>
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { key: 'palay', label: `Palay (${displayedListings.length})` },
              {
                key: 'magsasaka',
                label: `${isTagalog ? 'Magsasaka' : 'Farmers'} (${displayedFarmers.length})`,
              },
            ]}
          />
        </View>

        {activeTab === 'palay' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}>
            {quickChips.map((chip) => (
              <FilterChip
                key={chip.value}
                label={chip.label}
                selected={quickFilter === chip.value}
                onPress={() => setQuickFilter(chip.value)}
              />
            ))}
          </ScrollView>
        ) : null}
      </CollapsingHeader>
    </View>
  );
}

function FarmerDirectoryCard({ farmer, onPress }: { farmer: RankedFarmer; onPress: () => void }) {
  const { t } = useLanguage();
  const hasReviews = farmer.totalReviews > 0;
  return (
    <DepthCard
      radius="lg"
      onPress={onPress}
      accessibilityLabel={t('buyPalV2.openFarmer', { name: farmer.name })}
      style={styles.farmerCard}>
      <View style={styles.farmerRow}>
        <View style={styles.farmerAvatar}>
          <AnimoText variant="heading" color={AnimoV2Colors.textBrand}>
            {farmer.name[0] || 'M'}
          </AnimoText>
        </View>

        <View style={styles.farmerInfo}>
          <AnimoText variant="subheading" numberOfLines={1}>
            {farmer.name}
          </AnimoText>
          <View style={styles.ratingRow}>
            <Star
              size={18}
              color={hasReviews ? AnimoV2Colors.warningSolid : AnimoV2Colors.edgeSoft}
              fill={hasReviews ? AnimoV2Colors.warningSolid : 'none'}
              strokeWidth={2.5}
            />
            <AnimoText variant="bodyStrong">{hasReviews ? farmer.averageRating : '—'}</AnimoText>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('buyPalV2.reviewsCount', { n: farmer.totalReviews })}
            </AnimoText>
          </View>
        </View>
      </View>

      <View style={styles.farmerStats}>
        <View style={styles.farmerStat}>
          <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
            {t('buyPalV2.sold')}
          </AnimoText>
          <AnimoText variant="bodyStrong">{farmer.totalSoldKg.toLocaleString()} kg</AnimoText>
        </View>
        <View style={styles.farmerStat}>
          <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
            {t('buyPalV2.transactions')}
          </AnimoText>
          <AnimoText variant="bodyStrong">{farmer.completedTransactionsCount}</AnimoText>
        </View>
      </View>
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  padded: { paddingHorizontal: AnimoV2Spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.md,
  },
  headerTitleCol: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 24, lineHeight: 30 },
  tabsWrap: { marginTop: AnimoV2Spacing.md },
  chipScroll: { flexGrow: 0 },
  chipRow: {
    flexDirection: 'row',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.md,
    paddingBottom: AnimoV2Spacing.xs,
  },
  listContainer: { flex: 1 },
  listContent: {
    paddingHorizontal: AnimoV2Spacing.md,
    paddingTop: AnimoV2Spacing.xs,
    paddingBottom: AnimoV2Spacing.xxl,
  },
  resultCount: { paddingHorizontal: AnimoV2Spacing.xs, paddingBottom: AnimoV2Spacing.sm },
  masonryRow: {
    flexDirection: 'row',
    gap: AnimoV2Spacing.sm,
    alignItems: 'flex-start',
  },
  masonryColumn: {
    flex: 1,
    gap: AnimoV2Spacing.sm,
  },
  soloRow: { marginTop: AnimoV2Spacing.sm },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoV2Spacing.xl,
    paddingVertical: AnimoV2Spacing.xxl,
    gap: AnimoV2Spacing.lg,
  },
  centerText: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
  farmersDirectoryList: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.md,
    paddingBottom: AnimoV2Spacing.xxl,
    gap: AnimoV2Spacing.md,
  },
  farmerCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  farmerRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  farmerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerInfo: { flex: 1, minWidth: 0, gap: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  farmerStats: {
    flexDirection: 'row',
    gap: AnimoV2Spacing.md,
    paddingTop: AnimoV2Spacing.md,
    borderTopWidth: 2,
    borderTopColor: AnimoV2Colors.borderDefault,
  },
  farmerStat: { flex: 1 },
});

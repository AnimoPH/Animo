import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { ImageIcon, Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { FilterModal } from '@/components/animo/filter-modal';
import { LabeledInput } from '@/components/animo/labeled-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FARMER_PALENGKE_TUTORIAL_KEY,
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { CollapsingHeader } from '@/components/animo/ui/collapsing-header';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { Mascot } from '@/components/animo/ui/mascot';
import { ProgressBar } from '@/components/animo/ui/progress-bar';
import { V2SearchBar } from '@/components/animo/ui/search-bar';
import { StatusPill } from '@/components/animo/ui/status-pill';
import {
  AnimoColors,
  AnimoSpacing,
  AnimoV2Colors,
  AnimoV2Radius,
  AnimoV2Spacing,
  type StatusTone,
} from '@/constants/animo';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useCollapsingHeader } from '@/hooks/use-collapsing-header';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { useOutboxItems } from '@/hooks/use-outbox-items';
import { useSession } from '@/hooks/use-session';
import { pendingListingCards, type PendingListingCard } from '@/lib/outbox/pending-listing-cards';
import { fetchCoverPhotos, fetchMyCropListings } from '@/services/crop-listing-service';
import { fetchPendingPurchaseRequestCountsByListing } from '@/services/purchase-request-service';
import {
  MOISTURE_OPTIONS,
  VARIETY_OPTIONS,
  getStatusLabel,
  listingTitle,
  moistureLabel,
  purityLabel,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
  type DeclaredVariety,
  type ListingStatus,
  type MoistureType,
} from '@/types/crop-listing';

type StatusFilterKey = 'Lahat' | Extract<ListingStatus, 'Available' | 'Sold_Out' | 'Cancelled' | 'Archived'>;
type VarietyChoice = 'Lahat' | DeclaredVariety;
type MoistureChoice = 'Lahat' | MoistureType;

type PalengkeFilterDraft = {
  status: StatusFilterKey;
  quantityText: string;
  minPriceText: string;
  maxPriceText: string;
  variety: VarietyChoice;
  moisture: MoistureChoice;
};

const EMPTY_FILTERS: PalengkeFilterDraft = {
  status: 'Lahat',
  quantityText: '',
  minPriceText: '',
  maxPriceText: '',
  variety: 'Lahat',
  moisture: 'Lahat',
};

const STATUS_FILTER_OPTIONS: { value: StatusFilterKey; label: string }[] = [
  { value: 'Lahat', label: 'Lahat' },
  { value: 'Available', label: 'Available' },
  { value: 'Sold_Out', label: 'Naubos' },
  { value: 'Cancelled', label: 'Tinanggal' },
  { value: 'Archived', label: 'Naka-archive' },
];

const VARIETY_CHOICES: { value: VarietyChoice; label: string }[] = [
  { value: 'Lahat', label: 'Lahat' },
  ...VARIETY_OPTIONS,
];

const MOISTURE_CHOICES: { value: MoistureChoice; label: string }[] = [
  { value: 'Lahat', label: 'Lahat' },
  ...MOISTURE_OPTIONS,
];

const STATUS_TONES: Record<ListingStatus, StatusTone> = {
  Draft: 'neutral',
  Available: 'success',
  Sold_Out: 'neutral',
  Cancelled: 'danger',
  Archived: 'neutral',
};

/** Parses a filter text field, treating blank/garbage as "not set" rather than 0. */
function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

function countActiveFilters(filters: PalengkeFilterDraft): number {
  return [
    filters.status !== 'Lahat' ? true : undefined,
    parseNumber(filters.quantityText),
    parseNumber(filters.minPriceText),
    parseNumber(filters.maxPriceText),
    filters.variety !== 'Lahat' ? true : undefined,
    filters.moisture !== 'Lahat' ? true : undefined,
  ].filter((value) => value !== undefined).length;
}

function listingMatchesFilters(listing: CropListing, filters: PalengkeFilterDraft): boolean {
  if (filters.status !== 'Lahat' && listing.status !== filters.status) {
    return false;
  }

  const minQty = parseNumber(filters.quantityText);
  if (minQty !== undefined && listing.remainingQuantityKg < minQty) {
    return false;
  }

  const minPricePerKg = parseNumber(filters.minPriceText);
  const maxPricePerKg = parseNumber(filters.maxPriceText);
  if (minPricePerKg !== undefined) {
    if (listing.pricePerKg === null || listing.pricePerKg < minPricePerKg) {
      return false;
    }
  }
  if (maxPricePerKg !== undefined) {
    if (listing.pricePerKg === null || listing.pricePerKg > maxPricePerKg) {
      return false;
    }
  }

  if (filters.variety !== 'Lahat' && listing.declaredVariety !== filters.variety) {
    return false;
  }
  if (filters.moisture !== 'Lahat' && listing.declaredMoisture !== filters.moisture) {
    return false;
  }

  return true;
}

function listingMatchesSearch(listing: CropListing, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;

  const terms = query
    .split(/\s+/)
    .filter((t) => t.length > 0 && !['ng', 'ang', 'mga', 'sa'].includes(t));
  if (terms.length === 0) return true;

  const vLabel = varietyLabel(listing).toLowerCase();
  const rawVariety = listing.declaredVariety.toLowerCase();
  const custom = listing.declaredVarietyCustom?.toLowerCase() || '';
  const name = listing.listingName.toLowerCase();
  const moisture = listing.declaredMoisture.toLowerCase();
  const mLabel = moistureLabel(listing.declaredMoisture).toLowerCase();
  const purity = purityLabel(listing.declaredPurityGrade).toLowerCase();

  return terms.every((term) => {
    if (term === 'palay') return true;
    if (term === 'dry' || term === 'tuyo' || term === 'tuyong') {
      return listing.declaredMoisture === 'Dry';
    }
    if (term === 'wet' || term === 'basa' || term === 'basang') {
      return listing.declaredMoisture === 'Wet';
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
}

/**
 * Aking Ani (Farmer Palengke) — own listings with reusable search/filter chrome
 * and marketplace-style cards.
 */
export default function FarmerPalengkeScreen() {
  const { t, language, isTagalog } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const sidePadding = AnimoV2Spacing.md;
  const cardGap = AnimoV2Spacing.sm;
  const cardWidth = (windowWidth - sidePadding * 2 - cardGap) / 2;
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<PalengkeFilterDraft>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PalengkeFilterDraft>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const [listings, setListings] = useState<CropListing[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [pendingCounts, setPendingCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const searchBarRef = useRef<View>(null);
  const fabRef = useRef<View>(null);

  // Collapsing top block (title, search, status chips): slides away on scroll down, and returns as
  // just the search and chips on scroll up. Pinned open while the spotlight tutorial runs, since it
  // measures the search bar by position. `followOverscroll` keeps the pull-to-refresh spinner
  // visible on iOS instead of letting it hide behind the block.
  const header = useCollapsingHeader({ locked: showTutorial, followOverscroll: true });
  const { headerHeight, showHeader } = header;

  const latestRequestId = useRef(0);

  const { account } = useSession();
  const waitingCards = pendingListingCards(useOutboxItems(account?.id ?? null));

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setErrorMessage(undefined);
    try {
      const [result, counts] = await Promise.all([
        fetchMyCropListings(),
        fetchPendingPurchaseRequestCountsByListing().catch(() => new Map<string, number>()),
      ]);
      if (latestRequestId.current !== requestId) return;
      setListings(result);
      setPendingCounts(counts);

      try {
        const photos = await fetchCoverPhotos(result.map((l) => l.id));
        if (latestRequestId.current === requestId) setCoverPhotos(photos);
      } catch {
        // Cards fall back to the placeholder icon.
      }
    } catch (err) {
      if (latestRequestId.current === requestId) {
        setErrorMessage(
          err instanceof Error ? err.message : (isTagalog ? 'Hindi ma-load ang mga listing.' : 'Could not load listings.'),
        );
      }
    } finally {
      if (latestRequestId.current === requestId) setLoading(false);
    }
  }, [isTagalog]);

  useFocusEffect(
    useCallback(() => {
      load();
      let active = true;
      AsyncStorage.getItem(FARMER_PALENGKE_TUTORIAL_KEY).then((seen) => {
        if (active) setShowTutorial(seen !== 'true');
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  useAutoRefresh(load);

  // A saved listing that was just sent is now on the server: fetch the list again
  // instead of waiting for the next timer tick.
  const waitingCount = waitingCards.length;
  const previousWaiting = useRef(waitingCount);
  useEffect(() => {
    if (waitingCount < previousWaiting.current) load();
    previousWaiting.current = waitingCount;
  }, [waitingCount, load]);

  const activeFilterCount = countActiveFilters(appliedFilters);

  const displayedListings = useMemo(() => {
    return listings.filter(
      (listing) =>
        listingMatchesFilters(listing, appliedFilters) &&
        listingMatchesSearch(listing, searchQuery),
    );
  }, [listings, appliedFilters, searchQuery]);

  // Only a populated list scrolls. Loading / error / empty states don't, so they get their top
  // offset from the container; the list takes it as content padding so it slides under the header.
  const listScrolls = !loading && !errorMessage && displayedListings.length > 0;

  // A list that has just mounted (or a state with nothing to scroll) starts with the header shown.
  useEffect(() => {
    showHeader(true);
  }, [listScrolls, showHeader]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Stacked (masonry) columns keep each card at its natural height. With an odd count the last
  // listing is pulled out and rendered full width below, instead of leaving a gap beside it.
  const soloListing = displayedListings.length % 2 === 1 ? displayedListings[displayedListings.length - 1] : null;
  const stackedListings = soloListing ? displayedListings.slice(0, -1) : displayedListings;
  const leftListings = useMemo(
    () => stackedListings.filter((_, idx) => idx % 2 === 0),
    [stackedListings],
  );
  const rightListings = useMemo(
    () => stackedListings.filter((_, idx) => idx % 2 === 1),
    [stackedListings],
  );

  const emptyMessage =
    searchQuery.trim().length > 0
      ? t('aniV2.noSearchMatch', { q: searchQuery })
      : t('aniV2.noFilterMatch');

  // Status chips (Lahat / Aktibo / Naubos) drive the same applied `status` filter as the modal.
  const chipDefs: { value: StatusFilterKey; label: string; count: number }[] = [
    { value: 'Lahat', label: t('aniV2.filterAll'), count: listings.length },
    { value: 'Available', label: t('aniV2.filterActive'), count: listings.filter((l) => l.status === 'Available').length },
    { value: 'Sold_Out', label: t('aniV2.filterSold'), count: listings.filter((l) => l.status === 'Sold_Out').length },
  ];
  // The chips already show the status choice, so the filter-button badge leaves it out.
  const badgeFilterCount = countActiveFilters({
    ...appliedFilters,
    status:
      appliedFilters.status === 'Available' || appliedFilters.status === 'Sold_Out' ? 'Lahat' : appliedFilters.status,
  });

  const openModal = () => {
    setDraftFilters(appliedFilters);
    setModalOpen(true);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setModalOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setModalOpen(false);
  };

  const palengkeTourSteps: SpotlightStep[] = [
    {
      id: 'farmer-palengke-search',
      title: t('spotlight.farmerPalengke.step1Title'),
      description: t('spotlight.farmerPalengke.step1Desc'),
      icon: Search,
      targetRef: searchBarRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
    {
      id: 'farmer-palengke-fab',
      title: t('spotlight.farmerPalengke.step2Title'),
      description: t('spotlight.farmerPalengke.step2Desc'),
      icon: Plus,
      targetRef: fabRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
  ];

  const filterModalChildren = (
    <>
        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? "Katayuan" : "Status"}
          </AnimoText>
          <View style={styles.chipsWrap}>
            {STATUS_FILTER_OPTIONS.map((choice) => {
              const label =
                choice.value === 'Lahat'
                  ? (isTagalog ? 'Lahat' : 'All')
                  : choice.value === 'Sold_Out'
                    ? (isTagalog ? 'Naubos' : 'Sold Out')
                    : choice.value === 'Cancelled'
                      ? (isTagalog ? 'Tinanggal' : 'Cancelled')
                      : choice.value === 'Archived'
                        ? (isTagalog ? 'Naka-archive' : 'Archived')
                        : getStatusLabel('Available', language);
              return (
                <FilterChoiceChip
                  key={choice.value}
                  label={label}
                  active={draftFilters.status === choice.value}
                  onPress={() =>
                    setDraftFilters((prev) => ({ ...prev, status: choice.value }))
                  }
                />
              );
            })}
          </View>
        </View>

        <View style={styles.filterSection}>
          <LabeledInput
            label={isTagalog ? "Pinakamababang Dami (kg)" : "Minimum Quantity (kg)"}
            hint={isTagalog ? "Ipakita lamang ang mga listing na may natitirang timbang na ito." : "Only show listings with at least this remaining weight."}
            keyboardType="numeric"
            suffixText="kg"
            placeholder={isTagalog ? "Halimbawa: 100" : "e.g. 100"}
            value={draftFilters.quantityText}
            onChangeText={(quantityText) =>
              setDraftFilters((prev) => ({ ...prev, quantityText }))
            }
          />
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? "Presyo bawat Kilo (₱)" : "Price per Kilogram (₱)"}
          </AnimoText>
          <View style={styles.filterPriceRow}>
            <View style={styles.filterPriceField}>
              <LabeledInput
                label={isTagalog ? "Pinakamababa" : "Minimum"}
                keyboardType="numeric"
                prefixText="₱"
                placeholder={isTagalog ? "Halimbawa: 15" : "e.g. 15"}
                value={draftFilters.minPriceText}
                onChangeText={(minPriceText) =>
                  setDraftFilters((prev) => ({ ...prev, minPriceText }))
                }
              />
            </View>
            <View style={styles.filterPriceField}>
              <LabeledInput
                label={isTagalog ? "Pinakamataas" : "Maximum"}
                keyboardType="numeric"
                prefixText="₱"
                placeholder={isTagalog ? "Halimbawa: 25" : "e.g. 25"}
                value={draftFilters.maxPriceText}
                onChangeText={(maxPriceText) =>
                  setDraftFilters((prev) => ({ ...prev, maxPriceText }))
                }
              />
            </View>
          </View>
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? "Uri ng Palay" : "Rice Variety"}
          </AnimoText>
          <View style={styles.chipsWrap}>
            {VARIETY_CHOICES.map((choice) => {
              const label =
                choice.value === 'Lahat'
                  ? (isTagalog ? 'Lahat' : 'All')
                  : choice.value === 'Traditional_or_Heirloom'
                    ? (isTagalog ? 'Tradisyonal o Pamana' : 'Traditional / Heirloom')
                    : choice.value === 'Mix_of_Varieties'
                      ? (isTagalog ? 'Halo-halong Uri' : 'Mixed Varieties')
                      : choice.value === 'Others'
                        ? (isTagalog ? 'Iba pa' : 'Others')
                        : choice.label;
              return (
                <FilterChoiceChip
                  key={choice.value}
                  label={label}
                  active={draftFilters.variety === choice.value}
                  onPress={() =>
                    setDraftFilters((prev) => ({ ...prev, variety: choice.value }))
                  }
                />
              );
            })}
          </View>
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? "Antas ng Moisture" : "Moisture Level"}
          </AnimoText>
          <View style={styles.chipsWrap}>
            {MOISTURE_CHOICES.map((choice) => {
              const label =
                choice.value === 'Lahat'
                  ? (isTagalog ? 'Lahat' : 'All')
                  : choice.value === 'Dry'
                    ? (isTagalog ? 'Tuyo (Dry)' : 'Dry')
                    : choice.value === 'Wet'
                      ? (isTagalog ? 'Basa (Wet)' : 'Wet')
                      : choice.label;
              return (
                <FilterChoiceChip
                  key={choice.value}
                  label={label}
                  active={draftFilters.moisture === choice.value}
                  onPress={() =>
                    setDraftFilters((prev) => ({ ...prev, moisture: choice.value }))
                  }
                />
              );
            })}
          </View>
        </View>
    </>
  );

  const hasNoListingsAtAll =
    listings.length === 0 &&
    searchQuery.trim().length === 0 &&
    activeFilterCount === 0 &&
    waitingCards.length === 0;
  const showFooter = !loading && !errorMessage && !hasNoListingsAtAll;

  const goCreate = () => router.push('/(farmer)/creation-listing');

  // Saved-on-the-phone listings. Inside the scrolling list they travel with it (so nothing is left
  // behind when the header slides away); in the non-scrolling states they sit above the message.
  const waitingBlock =
    waitingCards.length > 0 ? (
      <View style={[styles.waitingList, listScrolls && styles.waitingListInScroll]}>
        {waitingCards.slice(0, 3).map((card) => (
          <WaitingListingRow key={card.id} card={card} />
        ))}
        {waitingCards.length > 3 ? (
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {t('aniV2.waitingMore', { n: waitingCards.length - 3 })}
          </AnimoText>
        ) : null}
      </View>
    ) : null;

  return (
    <View style={styles.screen}>
      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={activeFilterCount}
      >
        {filterModalChildren}
      </FilterModal>

      <View style={[styles.listContainer, !listScrolls && { paddingTop: headerHeight }]}>
        {!listScrolls ? waitingBlock : null}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <AnimoText variant="bodyV2" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
              {errorMessage}
            </AnimoText>
            <ChunkyButton label={t('aniV2.retry')} variant="secondary" onPress={load} style={styles.retryBtn} />
          </View>
        ) : displayedListings.length === 0 ? (
          hasNoListingsAtAll ? (
            <View style={styles.centerState}>
              <Mascot size={120} />
              <AnimoText variant="title" style={styles.centerText}>
                {t('aniV2.emptyTitle')}
              </AnimoText>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {t('aniV2.emptyBody')}
              </AnimoText>
              <View ref={fabRef} collapsable={false} style={styles.emptyButtonWrap}>
                <ChunkyButton label={t('aniV2.emptyButton')} onPress={goCreate} />
              </View>
            </View>
          ) : (
            <View style={styles.centerState}>
              <Mascot size={96} />
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {emptyMessage}
              </AnimoText>
            </View>
          )
        ) : (
          <Animated.ScrollView
            onScroll={header.onScroll}
            scrollEventThrottle={16}
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + AnimoV2Spacing.xs }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[AnimoV2Colors.actionPrimary]}
                progressViewOffset={headerHeight}
              />
            }>
            {waitingBlock}
            <View style={styles.masonryRow}>
              <View style={styles.masonryColumn}>
                {leftListings.map((item) => (
                    <FarmerListingCard
                      key={item.id}
                      listing={item}
                      coverPhotoUrl={coverPhotos.get(item.id)}
                      pendingCount={pendingCounts.get(item.id) ?? 0}
                      onPress={() =>
                        router.push({
                          pathname: '/(farmer)/listing-detail',
                          params: { id: item.id },
                        })
                      }
                      onPressOrders={() =>
                        router.push({
                          pathname: '/(farmer)/listing-detail',
                          params: { id: item.id, tab: 'orders' },
                        })
                      }
                    />
                ))}
              </View>
              <View style={styles.masonryColumn}>
                {rightListings.map((item) => (
                    <FarmerListingCard
                      key={item.id}
                      listing={item}
                      coverPhotoUrl={coverPhotos.get(item.id)}
                      pendingCount={pendingCounts.get(item.id) ?? 0}
                      onPress={() =>
                        router.push({
                          pathname: '/(farmer)/listing-detail',
                          params: { id: item.id },
                        })
                      }
                      onPressOrders={() =>
                        router.push({
                          pathname: '/(farmer)/listing-detail',
                          params: { id: item.id, tab: 'orders' },
                        })
                      }
                    />
                ))}
              </View>
            </View>
            {soloListing ? (
              <View style={styles.soloRow}>
                {[soloListing].map((item) => (
                  <FarmerListingCard
                    key={item.id}
                    wide
                    listing={item}
                    coverPhotoUrl={coverPhotos.get(item.id)}
                    pendingCount={pendingCounts.get(item.id) ?? 0}
                    onPress={() =>
                      router.push({
                        pathname: '/(farmer)/listing-detail',
                        params: { id: item.id },
                      })
                    }
                    onPressOrders={() =>
                      router.push({
                        pathname: '/(farmer)/listing-detail',
                        params: { id: item.id, tab: 'orders' },
                      })
                    }
                  />
                ))}
              </View>
            ) : null}
          </Animated.ScrollView>
        )}
      </View>

      {/* Collapsing top block: overlays the list, slides away on scroll down and returns on scroll up. */}
      <CollapsingHeader header={header}>
        {/* Screen Header */}
        <View
          onLayout={header.onTitleLayout}
          style={[styles.header, { paddingTop: insets.top + AnimoV2Spacing.sm }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <AnimoText variant="title" color={AnimoV2Colors.textPrimary} style={styles.headerTitle}>
                {t('tab.myHarvest')}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                {t('aniV2.subtitle')}
              </AnimoText>
            </View>
          </View>
        </View>

        <View ref={searchBarRef} collapsable={false} style={styles.searchWrap}>
          <V2SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('aniV2.searchPlaceholder')}
            clearLabel={t('aniV2.clearSearch')}
            filterLabel={t('aniV2.filters')}
            activeFilterCount={badgeFilterCount}
            onFilterPress={openModal}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}>
          {chipDefs.map((chip) => (
            <FilterChip
              key={chip.value}
              label={chip.label}
              count={chip.count}
              compact
              selected={appliedFilters.status === chip.value}
              onPress={() => setAppliedFilters((prev) => ({ ...prev, status: chip.value }))}
            />
          ))}
        </ScrollView>
      </CollapsingHeader>

      {showFooter ? (
        <View style={styles.fabWrap} pointerEvents="box-none">
          <View ref={fabRef} collapsable={false}>
            <ChunkyButton
              label={t('aniV2.newListing')}
              icon={Plus}
              onPress={goCreate}
              style={styles.fab}
            />
          </View>
        </View>
      ) : null}

      <SpotlightTour
        visible={showTutorial}
        steps={palengkeTourSteps}
        role="magsasaka"
        storageKey={FARMER_PALENGKE_TUTORIAL_KEY}
        onClose={() => {
          setShowTutorial(false);
          AsyncStorage.setItem(FARMER_PALENGKE_TUTORIAL_KEY, 'true').catch(() => {});
        }}
      />
    </View>
  );
}

function FilterChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chipItem, active && styles.chipItemActive]}>
      <AnimoText
        variant="body"
        color={active ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
        style={active ? styles.chipTextActive : undefined}>
        {label}
      </AnimoText>
    </Pressable>
  );
}

/** A listing saved on the phone that the server does not have yet. */
function WaitingListingRow({ card }: { card: PendingListingCard }) {
  const { t } = useLanguage();
  const label =
    card.state === 'review'
      ? t('aniV2.waitingReview')
      : card.state === 'failed'
        ? t('aniV2.waitingFailed')
        : t('aniV2.waitingSignal');
  const tone: StatusTone = card.state === 'waiting' ? 'warning' : card.state === 'review' ? 'caution' : 'danger';

  return (
    <DepthCard depth="flat" radius="lg" style={styles.waitingRow}>
      <View style={styles.waitingPhoto}>
        {card.coverUri ? (
          <Image source={{ uri: card.coverUri }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <ImageIcon size={24} color={AnimoV2Colors.textTertiary} />
        )}
      </View>
      <View style={styles.waitingBody}>
        <AnimoText variant="bodyStrong" numberOfLines={1}>
          {card.name}
        </AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {card.netWeightKg} kg
          {card.seenPricePerKg !== null ? ` · ${formatPeso(card.seenPricePerKg)}${t('aniV2.perKg')}` : ''}
        </AnimoText>
        <StatusPill tone={tone} label={label} />
      </View>
    </DepthCard>
  );
}

/** Aking Ani grid card: Senior farmer-friendly (50+ yo) with large legible typography, 1:1 square photo, stock progress bar and no tiny text. */
function FarmerListingCard({
  wide = false,
  listing,
  coverPhotoUrl,
  pendingCount,
  onPress,
  onPressOrders,
}: {
  /** Alone on its row: full width with a wider photo instead of a huge square. */
  wide?: boolean;
  listing: CropListing;
  coverPhotoUrl: string | undefined;
  pendingCount: number;
  onPress: () => void;
  onPressOrders: () => void;
}) {
  const { t, language, isTagalog } = useLanguage();
  const soldOut = listing.status === 'Sold_Out' || listing.remainingQuantityKg <= 0;
  const name = listingTitle(listing);
  const specificVariety = specificVarietyDisplay(listing, language);
  const displayVariety = specificVariety || varietyLabel(listing, language);

  const totalKg = listing.netWeightKg > 0 ? listing.netWeightKg : listing.remainingQuantityKg;
  const remainingKg = Math.max(0, listing.remainingQuantityKg);
  const stockRatio = totalKg > 0 ? Math.min(1, remainingKg / totalKg) : 0;

  return (
    <DepthCard
      onPress={onPress}
      accessibilityLabel={t('aniV2.openListing', { name })}
      wrapperStyle={styles.cardWrapper}
      depth="raised"
      radius="lg"
      style={styles.card}>
      {/* 1:1 Square Photo area */}
      <View style={[styles.photoArea, wide && styles.photoAreaWide]}>
        {coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <ImageIcon size={36} color={AnimoV2Colors.textTertiary} />
        )}

        {/* Sold out scrim */}
        {soldOut ? <View style={styles.soldOutScrim} /> : null}

        {/* Top-left Status Pill */}
        <View style={styles.photoOverlay} pointerEvents="none">
          <StatusPill tone={STATUS_TONES[listing.status]} label={getStatusLabel(listing.status, language)} />
        </View>

        {/* Bottom-left Moisture Tag */}
        <View style={styles.moistureOverlay}>
          <AnimoText variant="bodyStrong" color="#FFFFFF" style={styles.moistureText}>
            {listing.declaredMoisture === 'Dry'
              ? (isTagalog ? 'Tuyo' : 'Dry')
              : (isTagalog ? 'Basa' : 'Wet')}
          </AnimoText>
        </View>
      </View>

      {/* Card Content Body */}
      <View style={styles.cardBody}>
        {/* Listing Title (Emphasized for 50+ age audience) */}
        <AnimoText variant="heading" numberOfLines={2} style={styles.cardName}>
          {name}
        </AnimoText>

        {/* Variety / Quality Tag */}
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1} style={styles.cardVariety}>
          {displayVariety}
        </AnimoText>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <AnimoText
            variant="heading"
            color={soldOut ? AnimoV2Colors.textDisabled : AnimoV2Colors.actionPrimary}
            style={styles.currencySymbol}>
            ₱
          </AnimoText>
          <AnimoText
            variant="h2"
            color={soldOut ? AnimoV2Colors.textDisabled : AnimoV2Colors.actionPrimary}
            style={styles.priceAmount}>
            {listing.pricePerKg !== null ? listing.pricePerKg.toFixed(2) : '—'}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.perKg}>
            {t('aniV2.perKg')}
          </AnimoText>
        </View>

        {/* Remaining stock text */}
        <AnimoText
          variant="bodyStrong"
          color={soldOut ? AnimoV2Colors.textDisabled : AnimoV2Colors.textPrimary}
          numberOfLines={1}
          style={styles.stockText}>
          {soldOut
            ? t('aniV2.soldOutShort')
            : t('aniV2.kgLeft', { n: listing.remainingQuantityKg.toLocaleString('en-PH') })}
        </AnimoText>

        {/* Remaining stock progress bar */}
        <View style={styles.progressWrap}>
          <ProgressBar
            value={stockRatio}
            height={8}
            fill={soldOut ? AnimoV2Colors.textDisabled : stockRatio <= 0.2 ? AnimoV2Colors.warningSolid : AnimoV2Colors.actionPrimary}
            track={AnimoV2Colors.surfaceMuted}
          />
        </View>

        {/* Pending Orders Action Prompt */}
        {pendingCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('aniV2.viewRequests')}
            onPress={onPressOrders}
            hitSlop={8}
            style={styles.pendingOrderBanner}>
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.warningFg} style={styles.pendingOrderBannerText}>
              {t('aniV2.pendingPill', { n: pendingCount })} →
            </AnimoText>
          </Pressable>
        ) : null}
      </View>
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  header: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: AnimoV2Spacing.xs,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Nunito_800ExtraBold',
  },
  searchWrap: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xs,
    paddingBottom: AnimoV2Spacing.xs,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: AnimoV2Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.xs,
  },
  waitingList: {
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.sm,
  },
  // Inside the scrolling list (whose content already has side padding) so the rows keep the same
  // screen-edge inset as when they sit outside it.
  waitingListInScroll: { marginHorizontal: -AnimoV2Spacing.md },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.sm,
  },
  waitingPhoto: {
    width: 64,
    height: 64,
    borderRadius: AnimoV2Spacing.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AnimoV2Colors.surfaceMuted,
  },
  waitingBody: { flex: 1, gap: AnimoV2Spacing.xs, alignItems: 'flex-start' },
  filterSection: { gap: AnimoSpacing.sm },
  filterPriceRow: { flexDirection: 'row', gap: AnimoSpacing.md },
  filterPriceField: { flex: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoSpacing.sm, marginTop: 2 },
  chipItem: {
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  chipItemActive: {
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  chipTextActive: {
    fontFamily: 'Nunito_600SemiBold',
    color: AnimoColors.accentPrimary,
  },
  listContainer: { flex: 1 },
  listContent: {
    paddingHorizontal: AnimoV2Spacing.md,
    paddingTop: AnimoV2Spacing.xs,
    paddingBottom: 112,
  },
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
    gap: AnimoV2Spacing.lg,
  },
  centerText: { textAlign: 'center' },
  retryBtn: { alignSelf: 'stretch' },
  emptyButtonWrap: { alignSelf: 'stretch' },
  cardWrapper: { width: '100%' },
  card: { padding: 0 },
  photoArea: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  photoAreaWide: { aspectRatio: 2 },
  photoImage: { ...StyleSheet.absoluteFillObject },
  soldOutScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  photoOverlay: {
    position: 'absolute',
    top: AnimoV2Spacing.sm,
    left: AnimoV2Spacing.sm,
    right: AnimoV2Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  moistureOverlay: {
    position: 'absolute',
    bottom: AnimoV2Spacing.sm,
    left: AnimoV2Spacing.sm,
    backgroundColor: 'rgba(17, 41, 20, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AnimoV2Radius.sm,
  },
  moistureText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Nunito_700Bold',
  },
  cardBody: {
    padding: AnimoV2Spacing.md,
    gap: 4,
  },
  cardName: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Nunito_800ExtraBold',
    color: AnimoV2Colors.textPrimary,
  },
  cardVariety: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Nunito_600SemiBold',
    color: AnimoV2Colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 4,
  },
  currencySymbol: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    lineHeight: 22,
  },
  priceAmount: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    lineHeight: 28,
  },
  perKg: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 2,
  },
  stockText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Nunito_700Bold',
    marginTop: 2,
  },
  progressWrap: {
    marginTop: 3,
    marginBottom: 4,
  },
  pendingOrderBanner: {
    marginTop: 6,
    backgroundColor: AnimoV2Colors.warningBg,
    borderRadius: AnimoV2Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: AnimoV2Colors.warningSolid,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  pendingOrderBannerText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  fabWrap: {
    position: 'absolute',
    right: AnimoV2Spacing.lg,
    bottom: AnimoV2Spacing.lg,
    alignItems: 'flex-end',
    zIndex: 99,
  },
  fab: {
    minWidth: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
});

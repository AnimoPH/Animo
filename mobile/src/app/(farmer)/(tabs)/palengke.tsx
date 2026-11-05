import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { ImageIcon, Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { FilterModal } from '@/components/animo/filter-modal';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SearchFilterBar } from '@/components/animo/search-filter-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FARMER_PALENGKE_TUTORIAL_KEY,
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { Mascot } from '@/components/animo/ui/mascot';
import { StickyFooter } from '@/components/animo/ui/screen-bits';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoColors, AnimoSpacing, AnimoV2Colors, AnimoV2Spacing, type StatusTone } from '@/constants/animo';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
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

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top + AnimoV2Spacing.sm }} />

      <View ref={searchBarRef} collapsable={false}>
        <SearchFilterBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('aniV2.searchPlaceholder')}
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
            selected={appliedFilters.status === chip.value}
            onPress={() => setAppliedFilters((prev) => ({ ...prev, status: chip.value }))}
          />
        ))}
      </ScrollView>

      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={activeFilterCount}
      >
        {filterModalChildren}
      </FilterModal>

      <View style={styles.listContainer}>
        {waitingCards.length > 0 ? (
          <View style={styles.waitingList}>
            {waitingCards.slice(0, 3).map((card) => (
              <WaitingListingRow key={card.id} card={card} />
            ))}
            {waitingCards.length > 3 ? (
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                {t('aniV2.waitingMore', { n: waitingCards.length - 3 })}
              </AnimoText>
            ) : null}
          </View>
        ) : null}
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
          <FlatList
            data={displayedListings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <FarmerListingCard
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
            )}
          />
        )}
      </View>

      {showFooter ? (
        <StickyFooter>
          <View ref={fabRef} collapsable={false}>
            <ChunkyButton label={t('aniV2.newListing')} icon={Plus} onPress={goCreate} />
          </View>
        </StickyFooter>
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

/** Aking Ani listing card: photo with status + request pills, name, specs, price, kg left, action row. */
function FarmerListingCard({
  listing,
  coverPhotoUrl,
  pendingCount,
  onPress,
  onPressOrders,
}: {
  listing: CropListing;
  coverPhotoUrl: string | undefined;
  pendingCount: number;
  onPress: () => void;
  onPressOrders: () => void;
}) {
  const { t, language } = useLanguage();
  const soldOut = listing.status === 'Sold_Out' || listing.remainingQuantityKg <= 0;
  const specs = [
    varietyLabel(listing, language),
    purityLabel(listing.declaredPurityGrade, language),
    moistureLabel(listing.declaredMoisture, language),
  ].join(', ');
  const name = listingTitle(listing);

  return (
    <DepthCard
      onPress={onPress}
      accessibilityLabel={t('aniV2.openListing', { name })}
      style={styles.card}>
      <View style={styles.photoArea}>
        {coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <ImageIcon size={32} color={AnimoV2Colors.textTertiary} />
        )}
        <View style={styles.photoOverlay} pointerEvents="none">
          <StatusPill tone={STATUS_TONES[listing.status]} label={getStatusLabel(listing.status, language)} />
          {pendingCount > 0 ? (
            <StatusPill tone="warning" label={t('aniV2.pendingPill', { n: pendingCount })} />
          ) : null}
        </View>
      </View>

      <View style={styles.cardBody}>
        <AnimoText variant="subheading" numberOfLines={2}>
          {name}
        </AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={2}>
          {specs}
        </AnimoText>
        <View style={styles.priceRow}>
          <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand}>
            {listing.pricePerKg !== null ? `${formatPeso(listing.pricePerKg)}${t('aniV2.perKg')}` : '—'}
          </AnimoText>
          <AnimoText variant="bodyStrong">
            {soldOut
              ? t('aniV2.soldOutShort')
              : t('aniV2.kgLeft', { n: listing.remainingQuantityKg.toLocaleString('en-PH') })}
          </AnimoText>
        </View>
        <ChunkyButton
          size="sm"
          variant={pendingCount > 0 ? 'primary' : 'secondary'}
          label={pendingCount > 0 ? t('aniV2.viewRequests') : t('aniV2.viewDetails')}
          onPress={pendingCount > 0 ? onPressOrders : onPress}
          style={styles.cardAction}
        />
      </View>
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  chipScroll: { flexGrow: 0 },
  chipRow: {
    flexDirection: 'row',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xs,
  },
  waitingList: {
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.sm,
  },
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
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.lg,
  },
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
  card: { padding: 0 },
  photoArea: {
    width: '100%',
    height: 150,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: { ...StyleSheet.absoluteFillObject },
  photoOverlay: {
    position: 'absolute',
    top: AnimoV2Spacing.md,
    left: AnimoV2Spacing.md,
    right: AnimoV2Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBody: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.md,
    paddingBottom: AnimoV2Spacing.md,
    gap: AnimoV2Spacing.xs,
  },
  cardAction: { alignSelf: 'stretch', marginTop: AnimoV2Spacing.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: AnimoV2Spacing.sm },

});

import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  Users,
  Wheat,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { MarketplaceListingCard } from '@/components/animo/buyer/marketplace-listing-card';
import { LabeledInput } from '@/components/animo/labeled-input';
import {
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useLanguage } from '@/hooks/use-language';
import { fetchCoverPhotos } from '@/services/crop-listing-service';
import {
  fetchTopRankedFarmers,
  type RankedFarmer,
} from '@/services/farmer-public-profile';
import { fetchMarketplaceListings } from '@/services/marketplace-service';
import {
  MOISTURE_OPTIONS,
  VARIETY_OPTIONS,
  moistureLabel,
  purityLabel,
  varietyLabel,
  type DeclaredVariety,
  type MoistureType,
} from '@/types/crop-listing';
import type { MarketplaceFilters, RankedListing } from '@/types/marketplace-filter';

type TabMode = 'palay' | 'magsasaka';
type VarietyChoice = 'Lahat' | DeclaredVariety;
type MoistureChoice = 'Lahat' | MoistureType;

const VARIETY_CHOICES: { value: VarietyChoice; label: string }[] = [
  { value: 'Lahat', label: 'Lahat' },
  ...VARIETY_OPTIONS,
];

const MOISTURE_CHOICES: { value: MoistureChoice; label: string }[] = [
  { value: 'Lahat', label: 'Lahat' },
  ...MOISTURE_OPTIONS,
];

/** Parses a filter text field, treating blank/garbage as "not set" rather than 0. */
function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/** Palengke browse is recency-first so a newly posted listing is on top. */
function newestListingsFirst(items: RankedListing[]): RankedListing[] {
  return [...items].sort((a, b) => {
    if (a.listing.dateListed !== b.listing.dateListed) {
      return a.listing.dateListed < b.listing.dateListed ? 1 : -1;
    }
    return a.listing.id < b.listing.id ? 1 : -1;
  });
}

/**
 * Palengke — the buyer's marketplace and farmer directory.
 *
 * Supports searching both crop listings and farmer profiles with ranking insights.
 */
export default function MarketplaceScreen() {
  const { t, isTagalog } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabMode>('palay');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTutorial, setShowTutorial] = useState(true);

  // Draft filter state (committed when user taps "Ilapat" in modal)
  const [quantityText, setQuantityText] = useState('');
  const [minPriceText, setMinPriceText] = useState('');
  const [maxPriceText, setMaxPriceText] = useState('');
  const [variety, setVariety] = useState<VarietyChoice>('Lahat');
  const [moisture, setMoisture] = useState<MoistureChoice>('Lahat');

  const [filters, setFilters] = useState<MarketplaceFilters>({});

  const [ranked, setRanked] = useState<RankedListing[]>([]);
  const [farmers, setFarmers] = useState<RankedFarmer[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const searchRowRef = useRef<View>(null);
  const tabBarRef = useRef<View>(null);
  const bellRef = useRef<View>(null);

  const latestRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setErrorMessage(undefined);
    try {
      const result = await fetchMarketplaceListings(filters);
      if (latestRequestId.current !== requestId) return;
      setRanked(newestListingsFirst(result));

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
  const displayedListings = useMemo(() => {
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

  const buyerPalengkeTourSteps: SpotlightStep[] = [
    {
      id: 'buyer-palengke-search',
      title: t('spotlight.buyerPalengke.step1Title'),
      description: t('spotlight.buyerPalengke.step1Desc'),
      icon: Search,
      targetRef: searchRowRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
    {
      id: 'buyer-palengke-tabs',
      title: t('spotlight.buyerPalengke.step2Title'),
      description: t('spotlight.buyerPalengke.step2Desc'),
      icon: Users,
      targetRef: tabBarRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
    {
      id: 'buyer-palengke-bell',
      title: t('spotlight.buyerPalengke.step3Title'),
      description: t('spotlight.buyerPalengke.step3Desc'),
      icon: Bell,
      targetRef: bellRef,
      shape: 'circle',
      padding: 6,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader
        bellRef={bellRef}
        onPressBell={() => router.push('/(buyer)/notipikasyon')}
      />

      <SpotlightTour
        steps={buyerPalengkeTourSteps}
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      {/* Top Search Bar & Filter Icon Side-by-Side */}
      <View ref={searchRowRef} collapsable={false} style={styles.searchFilterRow}>
        <View style={styles.searchBar}>
          <Search size={18} color={AnimoColors.objectMediumEmphasis} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'palay'
                ? (isTagalog ? 'Maghanap ng palay, uri...' : 'Search palay, variety...')
                : (isTagalog ? 'Maghanap ng magsasaka, bayan, uri...' : 'Search farmers, location, variety...')
            }
            placeholderTextColor={AnimoColors.textLowEmphasis}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              style={styles.clearSearchBtn}>
              <X size={16} color={AnimoColors.objectLowEmphasis} />
            </Pressable>
          ) : null}
        </View>

        {activeTab === 'palay' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setModalOpen(true)}
            style={[
              styles.filterIconButton,
              activeFilterCount > 0 && styles.filterIconButtonActive,
            ]}>
            <SlidersHorizontal
              size={18}
              color={activeFilterCount > 0 ? AnimoColors.white : AnimoColors.accentPrimary}
            />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <AnimoText variant="tag" color={AnimoColors.white} style={styles.filterBadgeText}>
                  {activeFilterCount}
                </AnimoText>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {/* Segment Tab Switcher: Mga Palay vs Mga Magsasaka */}
      <View ref={tabBarRef} collapsable={false} style={styles.tabBarContainer}>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('palay')}
          style={[styles.tabItem, activeTab === 'palay' && styles.tabItemActive]}>
          <Wheat
            size={16}
            color={activeTab === 'palay' ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
          />
          <AnimoText
            variant="bodyEmphasis"
            color={activeTab === 'palay' ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
            style={styles.tabText}>
            Palay ({displayedListings.length})
          </AnimoText>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('magsasaka')}
          style={[styles.tabItem, activeTab === 'magsasaka' && styles.tabItemActive]}>
          <Users
            size={16}
            color={activeTab === 'magsasaka' ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
          />
          <AnimoText
            variant="bodyEmphasis"
            color={activeTab === 'magsasaka' ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
            style={styles.tabText}>
            {isTagalog ? 'Magsasaka' : 'Farmers'} ({displayedFarmers.length})
          </AnimoText>
        </Pressable>
      </View>

      {/* Floating Filter Window / Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.floatingWindow} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <SlidersHorizontal size={20} color={AnimoColors.accentPrimary} />
                <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
                  {isTagalog ? 'Mga Filter' : 'Filters'}
                </AnimoText>
                {activeFilterCount > 0 ? (
                  <View style={styles.modalActiveBadge}>
                    <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                      {activeFilterCount} {isTagalog ? 'aktibo' : 'active'}
                    </AnimoText>
                  </View>
                ) : null}
              </View>

              <Pressable
                onPress={() => setModalOpen(false)}
                hitSlop={10}
                style={styles.closeBtn}>
                <X size={20} color={AnimoColors.objectMediumEmphasis} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Desired quantity */}
              <View style={styles.inputCard}>
                <LabeledInput
                  label={isTagalog ? "Gustong Dami" : "Desired Quantity"}
                  hint={isTagalog ? "Itatago ang mga listing na hindi kayang punan ang dami na ito." : "Hides listings that cannot meet this quantity."}
                  keyboardType="numeric"
                  suffixText="kg"
                  placeholder={isTagalog ? "Halimbawa: 100" : "e.g. 100"}
                  value={quantityText}
                  onChangeText={setQuantityText}
                />
              </View>

              {/* Price range */}
              <View style={styles.inputCard}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  {isTagalog ? "Presyo bawat Kilo (₱)" : "Price per Kilogram (₱)"}
                </AnimoText>
                <View style={styles.modalPriceRow}>
                  <View style={styles.modalPriceField}>
                    <LabeledInput
                      label={isTagalog ? "Pinakamababa" : "Minimum"}
                      keyboardType="numeric"
                      prefixText="₱"
                      placeholder={isTagalog ? "Hal: 15" : "e.g. 15"}
                      value={minPriceText}
                      onChangeText={setMinPriceText}
                    />
                  </View>
                  <View style={styles.modalPriceField}>
                    <LabeledInput
                      label={isTagalog ? "Pinakamataas" : "Maximum"}
                      keyboardType="numeric"
                      prefixText="₱"
                      placeholder={isTagalog ? "Hal: 25" : "e.g. 25"}
                      value={maxPriceText}
                      onChangeText={setMaxPriceText}
                    />
                  </View>
                </View>
              </View>

              {/* Rice variety chips */}
              <View style={styles.inputCard}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  {isTagalog ? "Uri ng Palay" : "Rice Variety"}
                </AnimoText>
                <View style={styles.chipsWrapContainer}>
                  {VARIETY_CHOICES.map((choice) => {
                    const active = variety === choice.value;
                    const label = choice.value === 'Lahat' ? (isTagalog ? 'Lahat' : 'All') : choice.label;
                    return (
                      <Pressable
                        key={choice.value}
                        onPress={() => setVariety(choice.value)}
                        style={[styles.chipItem, active && styles.chipItemActive]}>
                        <AnimoText
                          variant="body"
                          color={active ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
                          style={active && styles.chipTextActive}>
                          {label}
                        </AnimoText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Moisture level chips */}
              <View style={styles.inputCard}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  {isTagalog ? "Antas ng Moisture" : "Moisture Level"}
                </AnimoText>
                <View style={styles.chipsWrapContainer}>
                  {MOISTURE_CHOICES.map((choice) => {
                    const active = moisture === choice.value;
                    const label = choice.value === 'Lahat' ? (isTagalog ? 'Lahat' : 'All') : choice.label;
                    return (
                      <Pressable
                        key={choice.value}
                        onPress={() => setMoisture(choice.value)}
                        style={[styles.chipItem, active && styles.chipItemActive]}>
                        <AnimoText
                          variant="body"
                          color={active ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
                          style={active && styles.chipTextActive}>
                          {label}
                        </AnimoText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
                {isTagalog
                  ? "Ang uri at moisture ay pang-ranggo lang — mas mataas ang tugma, ngunit hindi nawawala ang iba pang resulta."
                  : "Variety and moisture filters prioritize ranked matches while keeping remaining listings visible."}
              </AnimoText>
            </ScrollView>

            {/* Modal actions: Equal width Reset (with grey outline) & Apply */}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={resetFilters}
                style={styles.resetButton}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  {isTagalog ? "I-reset" : "Reset"}
                </AnimoText>
              </Pressable>
              <Pressable
                onPress={applyFilters}
                style={styles.applyButton}>
                <AnimoText variant="button" color={AnimoColors.white}>
                  {isTagalog ? "Ilapat ang Filter" : "Apply Filters"}
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Main Content Area */}
      <View style={styles.listContainer}>
        {activeTab === 'palay' ? (
          /* TAB 1: CROP LISTINGS */
          loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={AnimoColors.accentPrimary} />
            </View>
          ) : errorMessage ? (
            <View style={styles.centerState}>
              <AnimoText variant="body" color={AnimoColors.danger} style={styles.centerText}>
                {errorMessage}
              </AnimoText>
              <Pressable onPress={load}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.accentPrimary}>
                  {isTagalog ? "Subukan ulit" : "Try again"}
                </AnimoText>
              </Pressable>
            </View>
          ) : displayedListings.length === 0 ? (
            <View style={styles.centerState}>
              <AnimoText
                variant="body"
                color={AnimoColors.textMediumEmphasis}
                style={styles.centerText}>
                {searchQuery.trim().length > 0
                  ? (isTagalog ? `Walang nakitang listing para sa "${searchQuery}".` : `No listings found for "${searchQuery}".`)
                  : activeFilterCount > 0
                    ? (isTagalog ? 'Walang listing na tumutugma sa mga napiling filter.' : 'No listings match the selected filters.')
                    : (isTagalog ? 'Wala pang available na listing ng palay.' : 'No palay listings available yet.')}
              </AnimoText>
            </View>
          ) : (
            <FlatList
              data={displayedListings}
              keyExtractor={(item) => item.listing.id}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.gridItem}>
                  <MarketplaceListingCard
                    listing={item.listing}
                    coverPhotoUrl={coverPhotos.get(item.listing.id)}
                    onPress={() => router.push(`/(buyer)/palengke/${item.listing.id}`)}
                  />
                </View>
              )}
            />
          )
        ) : (
          /* TAB 2: FARMER PROFILES & DIRECTORY */
          <FlatList
            data={displayedFarmers}
            keyExtractor={(item) => item.farmerId}
            contentContainerStyle={styles.farmersDirectoryList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.centerText}>
                  {searchQuery.trim().length > 0
                    ? (isTagalog ? `Walang nakitang magsasaka para sa "${searchQuery}".` : `No farmers found for "${searchQuery}".`)
                    : (isTagalog ? 'Wala pang magsasaka sa palengke.' : 'No farmers in the directory yet.')}
                </AnimoText>
              </View>
            }
            renderItem={({ item }) => (
              <FarmerDirectoryCard
                farmer={item}
                lang={isTagalog ? 'tl' : 'en'}
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
    </SafeAreaView>
  );
}

function FarmerDirectoryCard({
  farmer,
  lang = 'tl',
  onPress,
}: {
  farmer: RankedFarmer;
  lang?: 'tl' | 'en';
  onPress: () => void;
}) {
  const isEn = lang === 'en';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.farmerDirectoryCard}>
      {/* Farmer Core Profile Row with Ratings on the Right */}
      <View style={styles.farmerProfileMain}>
        <View style={styles.farmerAvatarWrap}>
          <Store size={28} color={AnimoColors.accentPrimary} />
        </View>

        <View style={styles.farmerInfoCol}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.farmerNameText}>
            {farmer.name}
          </AnimoText>
          {farmer.location ? (
            <View style={styles.farmerLocRow}>
              <MapPin size={13} color={AnimoColors.textMediumEmphasis} />
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                {farmer.location}
              </AnimoText>
            </View>
          ) : null}
        </View>

        {/* Reviews and Rating placed on the right */}
        <View style={styles.farmerRatingRightCol}>
          <View style={styles.farmerRatingRow}>
            <Star
              size={14}
              color="#F59E0B"
              fill={farmer.totalReviews > 0 ? '#F59E0B' : 'transparent'}
            />
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.ratingNumberBold}>
              {farmer.totalReviews > 0 ? farmer.averageRating : '—'}
            </AnimoText>
          </View>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            ({farmer.totalReviews} {isEn ? 'reviews' : 'reviews'})
          </AnimoText>
        </View>
      </View>

      {/* Stats Divider & Footer */}
      <View style={styles.farmerCardFooter}>
        <View style={styles.farmerFooterStat}>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            {isEn ? 'Sold:' : 'Naibenta:'}
          </AnimoText>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {farmer.totalSoldKg.toLocaleString()} kg
          </AnimoText>
        </View>

        <View style={styles.footerDividerDot} />

        <View style={styles.farmerFooterStat}>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            {isEn ? 'Transactions:' : 'Transaksyon:'}
          </AnimoText>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {farmer.completedTransactionsCount}
          </AnimoText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.sm,
    gap: AnimoSpacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    height: 50,
  },
  searchIcon: {
    marginRight: AnimoSpacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: AnimoColors.textHighEmphasis,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterIconButton: {
    width: 50,
    height: 50,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterIconButtonActive: {
    backgroundColor: AnimoColors.accentPrimary,
    borderColor: AnimoColors.accentPrimary,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 12,
  },
  tabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.sm,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  tabItemActive: {
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  tabText: {
    fontSize: 14.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.xl,
  },
  floatingWindow: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.borderLowEmphasis,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  modalActiveBadge: {
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
    borderRadius: AnimoRadius.pill,
    marginLeft: AnimoSpacing.xs,
  },
  closeBtn: {
    padding: 4,
  },
  modalScrollContent: {
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.lg,
  },
  inputCard: {
    gap: AnimoSpacing.sm,
  },
  chipsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.sm,
    marginTop: 2,
  },
  chipItem: {
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 10,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  chipItemActive: {
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  chipTextActive: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: AnimoColors.accentPrimary,
  },
  modalPriceRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
    alignItems: 'flex-start',
    marginTop: 2,
  },
  modalPriceField: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.xxl,
  },
  columnWrapper: {
    gap: AnimoSpacing.md,
  },
  gridItem: {
    flex: 1,
  },
  farmersDirectoryList: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.md,
  },
  farmerDirectoryCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  farmerProfileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  farmerAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerInfoCol: {
    flex: 1,
    gap: 2,
  },
  farmerNameText: {
    fontSize: 17.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  farmerLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  farmerRatingRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  farmerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingNumberBold: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  farmerCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: AnimoSpacing.md,
  },
  farmerFooterStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerDividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.xxl,
    gap: AnimoSpacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
});

import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
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
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { fetchCoverPhotos } from '@/services/crop-listing-service';
import {
  DEMO_RANKED_FARMERS,
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

/**
 * Palengke — the buyer's marketplace and farmer directory.
 *
 * Supports searching both crop listings and farmer profiles with ranking insights.
 */
export default function MarketplaceScreen() {
  const [activeTab, setActiveTab] = useState<TabMode>('palay');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Draft filter state (committed when user taps "Ilapat" in modal)
  const [quantityText, setQuantityText] = useState('');
  const [minPriceText, setMinPriceText] = useState('');
  const [maxPriceText, setMaxPriceText] = useState('');
  const [variety, setVariety] = useState<VarietyChoice>('Lahat');
  const [moisture, setMoisture] = useState<MoistureChoice>('Lahat');

  const [filters, setFilters] = useState<MarketplaceFilters>({});

  const [ranked, setRanked] = useState<RankedListing[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const latestRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setErrorMessage(undefined);
    try {
      const result = await fetchMarketplaceListings(filters);
      if (latestRequestId.current !== requestId) return;
      setRanked(result);

      try {
        const photos = await fetchCoverPhotos(result.map((item) => item.listing.id));
        if (latestRequestId.current === requestId) setCoverPhotos(photos);
      } catch {
        // Cards fall back to the placeholder icon.
      }
    } catch (err) {
      if (latestRequestId.current === requestId) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Hindi ma-load ang mga listing.',
        );
      }
    } finally {
      if (latestRequestId.current === requestId) setLoading(false);
    }
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

  // Filter farmers by search query
  const displayedFarmers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return DEMO_RANKED_FARMERS;

    return DEMO_RANKED_FARMERS.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query) ||
        f.commonlySoldVarieties.some((v) => v.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader />

      {/* Top Search Bar & Filter Icon Side-by-Side */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchBar}>
          <Search size={18} color={AnimoColors.objectMediumEmphasis} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'palay'
                ? 'Maghanap ng palay, uri...'
                : 'Maghanap ng magsasaka, bayan, uri...'
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
      <View style={styles.tabBarContainer}>
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
            Magsasaka ({displayedFarmers.length})
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
                  Mga Filter
                </AnimoText>
                {activeFilterCount > 0 ? (
                  <View style={styles.modalActiveBadge}>
                    <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                      {activeFilterCount} aktibo
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
                  label="Gustong Dami"
                  hint="Itatago ang mga listing na hindi kayang punan ang dami na ito."
                  keyboardType="numeric"
                  suffixText="kg"
                  placeholder="Halimbawa: 100"
                  value={quantityText}
                  onChangeText={setQuantityText}
                />
              </View>

              {/* Price range */}
              <View style={styles.inputCard}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  Presyo bawat Kilo (₱)
                </AnimoText>
                <View style={styles.modalPriceRow}>
                  <View style={styles.modalPriceField}>
                    <LabeledInput
                      label="Pinakamababa"
                      keyboardType="numeric"
                      prefixText="₱"
                      placeholder="Hal: 15"
                      value={minPriceText}
                      onChangeText={setMinPriceText}
                    />
                  </View>
                  <View style={styles.modalPriceField}>
                    <LabeledInput
                      label="Pinakamataas"
                      keyboardType="numeric"
                      prefixText="₱"
                      placeholder="Hal: 25"
                      value={maxPriceText}
                      onChangeText={setMaxPriceText}
                    />
                  </View>
                </View>
              </View>

              {/* Rice variety chips */}
              <View style={styles.inputCard}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  Uri ng Palay
                </AnimoText>
                <View style={styles.chipsWrapContainer}>
                  {VARIETY_CHOICES.map((choice) => {
                    const active = variety === choice.value;
                    return (
                      <Pressable
                        key={choice.value}
                        onPress={() => setVariety(choice.value)}
                        style={[styles.chipItem, active && styles.chipItemActive]}>
                        <AnimoText
                          variant="body"
                          color={active ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
                          style={active && styles.chipTextActive}>
                          {choice.label}
                        </AnimoText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Moisture level chips */}
              <View style={styles.inputCard}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  Antas ng Moisture
                </AnimoText>
                <View style={styles.chipsWrapContainer}>
                  {MOISTURE_CHOICES.map((choice) => {
                    const active = moisture === choice.value;
                    return (
                      <Pressable
                        key={choice.value}
                        onPress={() => setMoisture(choice.value)}
                        style={[styles.chipItem, active && styles.chipItemActive]}>
                        <AnimoText
                          variant="body"
                          color={active ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
                          style={active && styles.chipTextActive}>
                          {choice.label}
                        </AnimoText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
                Ang uri at moisture ay pang-ranggo lang — mas mataas ang tugma, ngunit
                hindi nawawala ang iba pang resulta.
              </AnimoText>
            </ScrollView>

            {/* Modal actions: Equal width Reset (with grey outline) & Apply */}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={resetFilters}
                style={styles.resetButton}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  I-reset
                </AnimoText>
              </Pressable>
              <Pressable
                onPress={applyFilters}
                style={styles.applyButton}>
                <AnimoText variant="button" color={AnimoColors.white}>
                  Ilapat ang Filter
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
                  Subukan ulit
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
                  ? `Walang nakitang listing para sa "${searchQuery}".`
                  : activeFilterCount > 0
                    ? 'Walang listing na tumutugma sa mga napiling filter.'
                    : 'Wala pang available na listing ng palay.'}
              </AnimoText>
            </View>
          ) : (
            <FlatList
              data={displayedListings}
              keyExtractor={(item) => item.listing.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <MarketplaceListingCard
                  listing={item.listing}
                  coverPhotoUrl={coverPhotos.get(item.listing.id)}
                  onPress={() => router.push(`/(buyer)/palengke/${item.listing.id}`)}
                />
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
                  Walang nakitang magsasaka para sa &quot;{searchQuery}&quot;.
                </AnimoText>
              </View>
            }
            renderItem={({ item }) => (
              <FarmerDirectoryCard
                farmer={item}
                onPress={() =>
                  router.push({
                    pathname: '/(buyer)/palengke/magsasaka/[id]',
                    params: { id: ranked[0]?.listing.id || '1' },
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
  onPress,
}: {
  farmer: RankedFarmer;
  onPress: () => void;
}) {
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
          <View style={styles.farmerLocRow}>
            <MapPin size={13} color={AnimoColors.textMediumEmphasis} />
            <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
              {farmer.location}
            </AnimoText>
          </View>
        </View>

        {/* Reviews and Rating placed on the right */}
        <View style={styles.farmerRatingRightCol}>
          <View style={styles.farmerRatingRow}>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.ratingNumberBold}>
              {farmer.averageRating}
            </AnimoText>
          </View>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            ({farmer.totalReviews} reviews)
          </AnimoText>
        </View>
      </View>

      {/* Stats Divider & Footer */}
      <View style={styles.farmerCardFooter}>
        <View style={styles.farmerFooterStat}>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Naibenta:
          </AnimoText>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {farmer.totalSoldKg.toLocaleString()} kg
          </AnimoText>
        </View>

        <View style={styles.footerDividerDot} />

        <View style={styles.farmerFooterStat}>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Transaksyon:
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

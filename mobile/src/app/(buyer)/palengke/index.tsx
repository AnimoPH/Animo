import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
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
import { fetchMarketplaceListings } from '@/services/marketplace-service';
import {
  MOISTURE_OPTIONS,
  VARIETY_OPTIONS,
  varietyLabel,
  type DeclaredVariety,
  type MoistureType,
} from '@/types/crop-listing';
import type { MarketplaceFilters, RankedListing } from '@/types/marketplace-filter';

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
 * Palengke — the buyer's marketplace, fetched live from `croplisting`.
 *
 * Includes search bar and filter icon side-by-side, plus a floating filter modal.
 */
export default function MarketplaceScreen() {
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

  // Filter listings by search query (variety label, custom variety, etc.)
  const displayedListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ranked;

    return ranked.filter((item) => {
      const vLabel = varietyLabel(item.listing).toLowerCase();
      const rawVariety = item.listing.declaredVariety.toLowerCase();
      const custom = item.listing.declaredVarietyCustom?.toLowerCase() || '';
      return (
        vLabel.includes(query) ||
        rawVariety.includes(query) ||
        custom.includes(query)
      );
    });
  }, [ranked, searchQuery]);

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
            placeholder="Maghanap ng palay, uri..."
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
                <View style={styles.priceRow}>
                  <View style={styles.priceField}>
                    <LabeledInput
                      label="Pinakamurang presyo"
                      keyboardType="numeric"
                      prefixText="₱"
                      placeholder="0"
                      value={minPriceText}
                      onChangeText={setMinPriceText}
                    />
                  </View>
                  <View style={styles.priceField}>
                    <LabeledInput
                      label="Pinakamahal na presyo"
                      keyboardType="numeric"
                      prefixText="₱"
                      placeholder="0"
                      value={maxPriceText}
                      onChangeText={setMaxPriceText}
                    />
                  </View>
                </View>
              </View>

              {/* Variety selection (all displayed, no slider) */}
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

              {/* Moisture selection (all displayed, no slider) */}
              <View style={styles.inputCard}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  Moisture
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

      {/* Listings List */}
      <View style={styles.listContainer}>
        {loading ? (
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
        )}
      </View>
    </SafeAreaView>
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
    fontSize: 15,
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
    borderWidth: 1,
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.surfacePrimary,
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
    top: -4,
    right: -4,
    backgroundColor: AnimoColors.caution,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: AnimoSpacing.lg,
  },
  floatingWindow: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    overflow: 'hidden',
    shadowColor: AnimoColors.darkBackground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.borderLowEmphasis,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.xs,
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
  priceRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  priceField: {
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
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
    gap: AnimoSpacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
});


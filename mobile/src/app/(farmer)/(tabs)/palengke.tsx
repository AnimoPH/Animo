import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Bell, Droplets, ImageIcon, Plus, Scale, Search, ShieldCheck } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { FilterModal } from '@/components/animo/filter-modal';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SearchFilterBar } from '@/components/animo/search-filter-bar';
import {
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { StatusBadge, type BadgeTone } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { fetchCoverPhotos, fetchMyCropListings } from '@/services/crop-listing-service';
import {
  MOISTURE_OPTIONS,
  STATUS_LABELS,
  VARIETY_OPTIONS,
  moistureLabel,
  purityLabel,
  varietyLabel,
  type CropListing,
  type DeclaredVariety,
  type ListingStatus,
  type MoistureType,
} from '@/types/crop-listing';

type StatusFilterKey = 'Lahat' | Extract<ListingStatus, 'Available' | 'Sold_Out' | 'Cancelled'>;
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
];

const VARIETY_CHOICES: { value: VarietyChoice; label: string }[] = [
  { value: 'Lahat', label: 'Lahat' },
  ...VARIETY_OPTIONS,
];

const MOISTURE_CHOICES: { value: MoistureChoice; label: string }[] = [
  { value: 'Lahat', label: 'Lahat' },
  ...MOISTURE_OPTIONS,
];

const STATUS_TONES: Record<ListingStatus, BadgeTone> = {
  Draft: 'neutral',
  Available: 'success',
  Sold_Out: 'neutral',
  Cancelled: 'danger',
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
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<PalengkeFilterDraft>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PalengkeFilterDraft>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const [listings, setListings] = useState<CropListing[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const searchBarRef = useRef<View>(null);
  const fabRef = useRef<View>(null);
  const bellRef = useRef<View>(null);

  const latestRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setErrorMessage(undefined);
    try {
      const result = await fetchMyCropListings();
      if (latestRequestId.current !== requestId) return;
      setListings(result);

      try {
        const photos = await fetchCoverPhotos(result.map((l) => l.id));
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
      ? `Walang nakitang listing para sa "${searchQuery}".`
      : activeFilterCount > 0
        ? 'Walang listing sa filter na ito.'
        : 'Wala ka pang listing. Gumawa ng una mong listing ng palay.';

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
      shape: 'circle',
      padding: 6,
    },
    {
      id: 'farmer-palengke-bell',
      title: t('spotlight.farmerPalengke.step3Title'),
      description: t('spotlight.farmerPalengke.step3Desc'),
      icon: Bell,
      targetRef: bellRef,
      shape: 'circle',
      padding: 6,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        bellRef={bellRef}
        onPressBell={() => router.push('/(farmer)/notipikasyon')}
      />

      <View ref={searchBarRef} collapsable={false}>
        <SearchFilterBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Maghanap ng ani, uri, at..."
          activeFilterCount={activeFilterCount}
          onFilterPress={openModal}
        />
      </View>

      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={activeFilterCount}
        title="Mga Filter ng Ani"
      >
        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            Katayuan
          </AnimoText>
          <View style={styles.chipsWrap}>
            {STATUS_FILTER_OPTIONS.map((choice) => (
              <FilterChoiceChip
                key={choice.value}
                label={choice.label}
                active={draftFilters.status === choice.value}
                onPress={() =>
                  setDraftFilters((prev) => ({ ...prev, status: choice.value }))
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <LabeledInput
            label="Pinakamababang Dami (kg)"
            hint="Ipakita lamang ang mga listing na may natitirang timbang na ito."
            keyboardType="numeric"
            suffixText="kg"
            placeholder="Halimbawa: 100"
            value={draftFilters.quantityText}
            onChangeText={(quantityText) =>
              setDraftFilters((prev) => ({ ...prev, quantityText }))
            }
          />
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            Presyo bawat Kilo (₱)
          </AnimoText>
          <View style={styles.filterPriceRow}>
            <View style={styles.filterPriceField}>
              <LabeledInput
                label="Pinakamababa"
                keyboardType="numeric"
                prefixText="₱"
                placeholder="Halimbawa: 15"
                value={draftFilters.minPriceText}
                onChangeText={(minPriceText) =>
                  setDraftFilters((prev) => ({ ...prev, minPriceText }))
                }
              />
            </View>
            <View style={styles.filterPriceField}>
              <LabeledInput
                label="Pinakamataas"
                keyboardType="numeric"
                prefixText="₱"
                placeholder="Halimbawa: 25"
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
            Uri ng Palay
          </AnimoText>
          <View style={styles.chipsWrap}>
            {VARIETY_CHOICES.map((choice) => (
              <FilterChoiceChip
                key={choice.value}
                label={choice.label}
                active={draftFilters.variety === choice.value}
                onPress={() =>
                  setDraftFilters((prev) => ({ ...prev, variety: choice.value }))
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            Antas ng Moisture
          </AnimoText>
          <View style={styles.chipsWrap}>
            {MOISTURE_CHOICES.map((choice) => (
              <FilterChoiceChip
                key={choice.value}
                label={choice.label}
                active={draftFilters.moisture === choice.value}
                onPress={() =>
                  setDraftFilters((prev) => ({ ...prev, moisture: choice.value }))
                }
              />
            ))}
          </View>
        </View>
      </FilterModal>

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
              {emptyMessage}
            </AnimoText>
          </View>
        ) : (
          <FlatList
            data={displayedListings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <FarmerMarketplaceCard
                listing={item}
                coverPhotoUrl={coverPhotos.get(item.id)}
                onPress={() =>
                  router.push({
                    pathname: '/(farmer)/listing-detail',
                    params: { id: item.id },
                  })
                }
              />
            )}
          />
        )}

        <View ref={fabRef} collapsable={false} style={styles.fabWrapper}>
          <Pressable
            onPress={() => router.push('/(farmer)/creation-listing')}
            style={[styles.fab, styles.fabShadow]}
            accessibilityLabel="Gumawa ng bagong listing">
            <Plus size={28} color={AnimoColors.white} />
          </Pressable>
        </View>
      </View>

      <SpotlightTour
        visible={showTutorial}
        steps={palengkeTourSteps}
        onClose={() => setShowTutorial(false)}
      />
    </SafeAreaView>
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

/**
 * Rich listing card formatted to match the Buyer Marketplace card style.
 */
function FarmerMarketplaceCard({
  listing,
  coverPhotoUrl,
  onPress,
}: {
  listing: CropListing;
  coverPhotoUrl: string | undefined;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, styles.shadow]}>
      <View style={styles.photoArea}>
        {coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <ImageIcon size={32} color={AnimoColors.objectLowEmphasis} />
        )}
        <View style={styles.statusBadgeWrap}>
          <StatusBadge
            label={STATUS_LABELS[listing.status]}
            tone={STATUS_TONES[listing.status]}
          />
        </View>
      </View>

      <View style={styles.body}>
        <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
          {varietyLabel(listing)}
        </AnimoText>

        <View style={styles.priceRow}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
            {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg) : '—'}
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {' '}
            bawat kilo
          </AnimoText>
        </View>

        <View style={styles.specs}>
          <Spec icon={<Scale size={14} color={AnimoColors.accentPrimary} />}>
            {listing.remainingQuantityKg} kg natitira
          </Spec>
          <Spec icon={<Droplets size={14} color={AnimoColors.textMediumEmphasis} />}>
            {moistureLabel(listing.declaredMoisture)}
          </Spec>
          <Spec icon={<ShieldCheck size={14} color={AnimoColors.textMediumEmphasis} />}>
            {purityLabel(listing.declaredPurityGrade)}
          </Spec>
        </View>

        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          Pinakamaliit na order: {listing.minimumRequestKg} kg · Kabuuang ani: {listing.netWeightKg} kg
        </AnimoText>
      </View>
    </TouchableOpacity>
  );
}

function Spec({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.spec}>
      {icon}
      <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
        {children}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  filterSection: {
    gap: AnimoSpacing.sm,
  },
  filterPriceRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  filterPriceField: {
    flex: 1,
  },
  chipsWrap: {
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
  listContainer: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
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
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    marginBottom: AnimoSpacing.md,
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  photoArea: {
    width: '100%',
    aspectRatio: 2.5,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadgeWrap: {
    position: 'absolute',
    top: AnimoSpacing.sm,
    right: AnimoSpacing.sm,
  },
  body: {
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  specs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.md,
    marginTop: AnimoSpacing.xs,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: AnimoSpacing.xl,
    right: AnimoSpacing.xl,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabShadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
});

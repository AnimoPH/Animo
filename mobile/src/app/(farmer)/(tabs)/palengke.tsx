import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import {
  Droplets,
  ImageIcon,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { LabeledInput } from '@/components/animo/labeled-input';
import { StatusBadge, type BadgeTone } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
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

function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Aking Ani (Farmer Palengke) — matches Buyer Palengke's visual design, search, and filtering.
 */
export default function FarmerPalengkeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<StatusFilterKey>('Lahat');
  const [modalOpen, setModalOpen] = useState(false);

  // Draft filter modal state
  const [minPriceText, setMinPriceText] = useState('');
  const [maxPriceText, setMaxPriceText] = useState('');
  const [minQtyText, setMinQtyText] = useState('');
  const [varietyFilter, setVarietyFilter] = useState<VarietyChoice>('Lahat');
  const [moistureFilter, setMoistureFilter] = useState<MoistureChoice>('Lahat');

  // Applied advanced filters
  const [appliedFilters, setAppliedFilters] = useState<{
    minPrice?: number;
    maxPrice?: number;
    minQty?: number;
    variety?: DeclaredVariety;
    moisture?: MoistureType;
  }>({});

  const [listings, setListings] = useState<CropListing[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

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
        // Fallback to placeholder
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

  const applyModalFilters = () => {
    setAppliedFilters({
      minPrice: parseNumber(minPriceText),
      maxPrice: parseNumber(maxPriceText),
      minQty: parseNumber(minQtyText),
      variety: varietyFilter === 'Lahat' ? undefined : varietyFilter,
      moisture: moistureFilter === 'Lahat' ? undefined : moistureFilter,
    });
    setModalOpen(false);
  };

  const resetModalFilters = () => {
    setMinPriceText('');
    setMaxPriceText('');
    setMinQtyText('');
    setVarietyFilter('Lahat');
    setMoistureFilter('Lahat');
    setAppliedFilters({});
    setModalOpen(false);
  };

  const activeAdvancedFilterCount = useMemo(
    () =>
      [
        appliedFilters.minPrice,
        appliedFilters.maxPrice,
        appliedFilters.minQty,
        appliedFilters.variety,
        appliedFilters.moisture,
      ].filter((v) => v !== undefined).length,
    [appliedFilters],
  );

  // Compute filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // 1. Status Chip filter
      if (activeStatus !== 'Lahat' && item.status !== activeStatus) {
        return false;
      }

      // 2. Search Query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.trim().toLowerCase();
        const terms = query
          .split(/\s+/)
          .filter((t) => t.length > 0 && !['ng', 'ang', 'mga', 'sa'].includes(t));

        if (terms.length > 0) {
          const vLabel = varietyLabel(item).toLowerCase();
          const rawVariety = item.declaredVariety.toLowerCase();
          const custom = item.declaredVarietyCustom?.toLowerCase() || '';
          const moisture = item.declaredMoisture.toLowerCase(); // 'dry' or 'wet'
          const mLabel = moistureLabel(item.declaredMoisture).toLowerCase(); // 'tuyo (dry)' or 'basa (wet)'
          const purity = purityLabel(item.declaredPurityGrade).toLowerCase();

          const allMatched = terms.every((term) => {
            if (term === 'palay') return true;
            if (term === 'dry' || term === 'tuyo' || term === 'tuyong') {
              return item.declaredMoisture === 'Dry';
            }
            if (term === 'wet' || term === 'basa' || term === 'basang') {
              return item.declaredMoisture === 'Wet';
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

          if (!allMatched) return false;
        }
      }

      // 3. Variety filter
      if (appliedFilters.variety && item.declaredVariety !== appliedFilters.variety) {
        return false;
      }

      // 4. Moisture filter
      if (appliedFilters.moisture && item.declaredMoisture !== appliedFilters.moisture) {
        return false;
      }

      // 5. Min Quantity filter
      if (appliedFilters.minQty && item.remainingQuantityKg < appliedFilters.minQty) {
        return false;
      }

      // 6. Price filters
      if (appliedFilters.minPrice && (item.pricePerKg ?? 0) < appliedFilters.minPrice) {
        return false;
      }
      if (appliedFilters.maxPrice && (item.pricePerKg ?? 0) > appliedFilters.maxPrice) {
        return false;
      }

      return true;
    });
  }, [listings, activeStatus, searchQuery, appliedFilters]);

  // Count items per status
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilterKey, number> = {
      Lahat: listings.length,
      Available: 0,
      Sold_Out: 0,
      Cancelled: 0,
    };
    listings.forEach((l) => {
      if (l.status in counts) {
        counts[l.status as StatusFilterKey]++;
      }
    });
    return counts;
  }, [listings]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader onPressBell={() => router.push('/(farmer)/notipikasyon')} />

      {/* Top Search Bar & Filter Button Row */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchBar}>
          <Search size={18} color={AnimoColors.objectMediumEmphasis} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Maghanap ng sariling ani, uri..."
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
            activeAdvancedFilterCount > 0 && styles.filterIconButtonActive,
          ]}>
          <SlidersHorizontal
            size={18}
            color={activeAdvancedFilterCount > 0 ? AnimoColors.white : AnimoColors.accentPrimary}
          />
          {activeAdvancedFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <AnimoText variant="tag" color={AnimoColors.white} style={styles.filterBadgeText}>
                {activeAdvancedFilterCount}
              </AnimoText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Status Filter Chips Row */}
      <View style={styles.statusChipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChipsContainer}>
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const isSelected = activeStatus === opt.value;
            const count = statusCounts[opt.value];
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="tab"
                onPress={() => setActiveStatus(opt.value)}
                style={[styles.statusChip, isSelected && styles.statusChipActive]}>
                <AnimoText
                  variant="bodyEmphasis"
                  color={isSelected ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
                  style={styles.statusChipText}>
                  {opt.label} ({count})
                </AnimoText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
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
        ) : filteredListings.length === 0 ? (
          <View style={styles.centerState}>
            <AnimoText
              variant="body"
              color={AnimoColors.textMediumEmphasis}
              style={styles.centerText}>
              {searchQuery.trim().length > 0
                ? `Walang nakitang listing para sa "${searchQuery}".`
                : activeAdvancedFilterCount > 0
                  ? 'Walang listing na tumutugma sa mga napiling filter.'
                  : listings.length === 0
                    ? 'Wala ka pang listing. Gumawa ng una mong listing ng palay.'
                    : 'Walang listing sa filter na ito.'}
            </AnimoText>
          </View>
        ) : (
          <FlatList
            data={filteredListings}
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

        {/* Floating Action Button (Create Listing) */}
        <Pressable
          onPress={() => router.push('/(farmer)/creation-listing')}
          style={[styles.fab, styles.fabShadow]}
          accessibilityLabel="Gumawa ng bagong listing">
          <Plus size={28} color={AnimoColors.white} />
        </Pressable>
      </View>

      {/* Floating Filter Modal */}
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
                  Mga Filter ng Ani
                </AnimoText>
                {activeAdvancedFilterCount > 0 ? (
                  <View style={styles.modalActiveBadge}>
                    <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                      {activeAdvancedFilterCount} aktibo
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
              {/* Minimum Available Quantity */}
              <View style={styles.inputCard}>
                <LabeledInput
                  label="Pinakamababang Dami (kg)"
                  hint="Ipakita lamang ang mga listing na may natitirang timbang na ito."
                  keyboardType="numeric"
                  suffixText="kg"
                  placeholder="Halimbawa: 100"
                  value={minQtyText}
                  onChangeText={setMinQtyText}
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
                    const active = varietyFilter === choice.value;
                    return (
                      <Pressable
                        key={choice.value}
                        onPress={() => setVarietyFilter(choice.value)}
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
                    const active = moistureFilter === choice.value;
                    return (
                      <Pressable
                        key={choice.value}
                        onPress={() => setMoistureFilter(choice.value)}
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
            </ScrollView>

            {/* Modal actions */}
            <View style={styles.modalFooter}>
              <Pressable onPress={resetModalFilters} style={styles.resetButton}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  I-reset
                </AnimoText>
              </Pressable>
              <Pressable onPress={applyModalFilters} style={styles.applyButton}>
                <AnimoText variant="button" color={AnimoColors.white}>
                  Ilapat ang Filter
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
      {/* Cover Photo */}
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

      {/* Card Body */}
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

function Spec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
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
  statusChipsWrapper: {
    paddingBottom: AnimoSpacing.xs,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.xs,
  },
  statusChip: {
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 8,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  statusChipActive: {
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  statusChipText: {
    fontSize: 13.5,
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
  fab: {
    position: 'absolute',
    bottom: AnimoSpacing.xl,
    right: AnimoSpacing.xl,
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
});

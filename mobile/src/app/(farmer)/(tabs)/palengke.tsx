import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { ImageIcon, Plus, Scale } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimoText } from "@/components/animo/animo-text";
import { AppHeader } from "@/components/animo/app-header";
import { FilterModal } from "@/components/animo/filter-modal";
import { LabeledInput } from "@/components/animo/labeled-input";
import { SearchFilterBar } from "@/components/animo/search-filter-bar";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import { formatPeso } from "@/constants/marketplace";
import { fetchCoverPhotos, fetchMyCropListings } from "@/services/crop-listing-service";
import {
  MOISTURE_OPTIONS,
  STATUS_LABELS,
  VARIETY_OPTIONS,
  varietyLabel,
  type CropListing,
  type DeclaredVariety,
  type ListingStatus,
  type MoistureType,
} from "@/types/crop-listing";

type FilterKey = "Lahat" | Extract<ListingStatus, "Available" | "Sold_Out" | "Cancelled">;
type VarietyChoice = "Lahat" | DeclaredVariety;
type MoistureChoice = "Lahat" | MoistureType;

type PalengkeFilterDraft = {
  status: FilterKey;
  quantityText: string;
  minPriceText: string;
  maxPriceText: string;
  variety: VarietyChoice;
  moisture: MoistureChoice;
};

const EMPTY_FILTERS: PalengkeFilterDraft = {
  status: "Lahat",
  quantityText: "",
  minPriceText: "",
  maxPriceText: "",
  variety: "Lahat",
  moisture: "Lahat",
};

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "Lahat", label: "Lahat" },
  { value: "Available", label: STATUS_LABELS.Available },
  { value: "Sold_Out", label: STATUS_LABELS.Sold_Out },
  { value: "Cancelled", label: STATUS_LABELS.Cancelled },
];

const VARIETY_CHOICES: { value: VarietyChoice; label: string }[] = [
  { value: "Lahat", label: "Lahat" },
  ...VARIETY_OPTIONS,
];

const MOISTURE_CHOICES: { value: MoistureChoice; label: string }[] = [
  { value: "Lahat", label: "Lahat" },
  ...MOISTURE_OPTIONS,
];

/** Parses a filter text field, treating blank/garbage as "not set" rather than 0. */
function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

function countActiveFilters(filters: PalengkeFilterDraft): number {
  return [
    filters.status !== "Lahat" ? true : undefined,
    parseNumber(filters.quantityText),
    parseNumber(filters.minPriceText),
    parseNumber(filters.maxPriceText),
    filters.variety !== "Lahat" ? true : undefined,
    filters.moisture !== "Lahat" ? true : undefined,
  ].filter((value) => value !== undefined).length;
}

function listingMatchesFilters(
  listing: CropListing,
  filters: PalengkeFilterDraft,
): boolean {
  if (filters.status !== "Lahat" && listing.status !== filters.status) {
    return false;
  }

  const desiredQuantityKg = parseNumber(filters.quantityText);
  if (desiredQuantityKg !== undefined && desiredQuantityKg > 0) {
    if (
      listing.remainingQuantityKg < desiredQuantityKg ||
      listing.minimumRequestKg > desiredQuantityKg
    ) {
      return false;
    }
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

  if (filters.variety !== "Lahat" && listing.declaredVariety !== filters.variety) {
    return false;
  }
  if (filters.moisture !== "Lahat" && listing.declaredMoisture !== filters.moisture) {
    return false;
  }

  return true;
}

const STATUS_BADGE_COLORS: Record<ListingStatus, string> = {
  Draft: AnimoColors.objectLowEmphasis,
  Available: AnimoColors.accentPrimary,
  Sold_Out: AnimoColors.objectLowEmphasis,
  Cancelled: AnimoColors.caution,
};

/** Palengke — farmer's own listings, fetched live from `croplisting` (own rows only, per RLS). */
export default function FarmerPalengkeScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<PalengkeFilterDraft>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<PalengkeFilterDraft>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [listings, setListings] = useState<CropListing[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Guards against overlapping fetches (e.g. two focus events in quick
  // succession) applying their result out of order — only the response for
  // the most recently started load() is allowed to update state.
  const latestRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setErrorMessage(undefined);
    try {
      const result = await fetchMyCropListings();
      if (latestRequestId.current !== requestId) return;
      setListings(result);

      // Cover photos are a display nicety, not core data — a failure here
      // (or none uploaded yet) must not blank out an otherwise-successful
      // listings fetch, so it gets its own try/catch.
      try {
        const photos = await fetchCoverPhotos(result.map((l) => l.id));
        if (latestRequestId.current === requestId) setCoverPhotos(photos);
      } catch {
        // Cards just fall back to the placeholder icon.
      }
    } catch (err) {
      if (latestRequestId.current === requestId) {
        setErrorMessage(
          err instanceof Error ? err.message : "Hindi ma-load ang mga listing.",
        );
      }
    } finally {
      if (latestRequestId.current === requestId) setLoading(false);
    }
  }, []);

  // Re-fetch every time this tab gains focus so a listing just created
  // ("Tignan ang Palengke" from the result screen) shows up immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeFilterCount = countActiveFilters(appliedFilters);

  const displayedListings = useMemo(() => {
    const filtered = listings.filter((listing) =>
      listingMatchesFilters(listing, appliedFilters),
    );

    const query = searchQuery.trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter((listing) => {
      const vLabel = varietyLabel(listing).toLowerCase();
      const rawVariety = listing.declaredVariety.toLowerCase();
      const custom = listing.declaredVarietyCustom?.toLowerCase() || "";
      return (
        vLabel.includes(query) ||
        rawVariety.includes(query) ||
        custom.includes(query)
      );
    });
  }, [listings, appliedFilters, searchQuery]);

  const emptyMessage = searchQuery.trim().length > 0
    ? `Walang nakitang listing para sa "${searchQuery}".`
    : activeFilterCount > 0
      ? "Walang listing sa filter na ito."
      : "Wala ka pang listing. Gumawa ng una mong listing ng palay.";

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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AppHeader onPressBell={() => console.log("Bell pressed")} />

      <SearchFilterBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Maghanap ng palay, uri..."
        activeFilterCount={activeFilterCount}
        onFilterPress={openModal}
      />

      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={activeFilterCount}
      >
        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            Katayuan
          </AnimoText>
          <View style={styles.chipsWrap}>
            {FILTERS.map((choice) => (
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
            label="Gustong Dami"
            hint="Itatago ang mga listing na hindi kayang punan ang dami na ito."
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
            <AnimoText
              variant="body"
              color={AnimoColors.danger}
              style={styles.centerText}
            >
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
              style={styles.centerText}
            >
              {emptyMessage}
            </AnimoText>
          </View>
        ) : (
          <FlatList
            data={displayedListings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ListingCard listing={item} coverPhotoUrl={coverPhotos.get(item.id)} />
            )}
          />
        )}

        <Pressable
          onPress={() => router.push("/(farmer)/creation-listing")}
          style={[styles.fab, styles.fabShadow]}
          accessibilityLabel="Gumawa ng bagong listing"
        >
          <Plus size={28} color={AnimoColors.objectHighEmphasisInverse} />
        </Pressable>
      </View>
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
      style={[styles.chipItem, active && styles.chipItemActive]}
    >
      <AnimoText
        variant="body"
        color={active ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
        style={active ? styles.chipTextActive : undefined}
      >
        {label}
      </AnimoText>
    </Pressable>
  );
}

function ListingCard({
  listing,
  coverPhotoUrl,
}: {
  listing: CropListing;
  coverPhotoUrl: string | undefined;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/(farmer)/listing-detail",
          params: { id: listing.id },
        })
      }
      style={[styles.card, styles.shadow]}
    >
      <View style={styles.photoArea}>
        {coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <ImageIcon size={32} color={AnimoColors.objectLowEmphasis} />
        )}
        <View
          style={[
            styles.badge,
            { backgroundColor: STATUS_BADGE_COLORS[listing.status] },
          ]}
        >
          <AnimoText variant="tag" color={AnimoColors.textHighEmphasisInverse}>
            {STATUS_LABELS[listing.status]}
          </AnimoText>
        </View>
      </View>

      <View style={styles.cardBody}>
        <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
          {varietyLabel(listing)}
        </AnimoText>

        <View style={styles.priceRow}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
            {listing.pricePerKg !== null
              ? `${formatPeso(listing.pricePerKg)} bawat kilo`
              : "Kinakalkula ang presyo"}
          </AnimoText>
          <View style={styles.remaining}>
            <Scale size={12} color={AnimoColors.textLowEmphasis} />
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
              {" "}
              Remaining: {listing.remainingQuantityKg} kg
            </AnimoText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoSpacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  filterSection: {
    gap: AnimoSpacing.sm,
  },
  filterPriceRow: {
    flexDirection: "row",
    gap: AnimoSpacing.md,
  },
  filterPriceField: {
    flex: 1,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: AnimoColors.accentPrimary,
  },
  listContainer: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  listContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AnimoSpacing.xl,
    gap: AnimoSpacing.sm,
  },
  centerText: {
    textAlign: "center",
  },
  shadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginBottom: AnimoSpacing.md,
    overflow: "hidden",
  },
  photoArea: {
    width: "100%",
    aspectRatio: 2.5,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: "absolute",
    top: AnimoSpacing.sm,
    right: AnimoSpacing.sm,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.xs,
  },
  cardBody: {
    padding: AnimoSpacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: AnimoSpacing.xs,
  },
  remaining: {
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: AnimoSpacing.xl,
    right: AnimoSpacing.xl,
    width: 56,
    height: 56,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  fabShadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});

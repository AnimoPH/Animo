import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { MarketplaceListingCard } from '@/components/animo/buyer/marketplace-listing-card';
import { FilterChips } from '@/components/animo/filter-chips';
import { LabeledInput } from '@/components/animo/labeled-input';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { fetchCoverPhotos } from '@/services/crop-listing-service';
import { fetchMarketplaceListings } from '@/services/marketplace-service';
import {
  MOISTURE_OPTIONS,
  VARIETY_OPTIONS,
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
 * Quantity and price are hard filters applied in the query; variety and
 * moisture are WPM ranking preferences, so choosing one re-orders the list
 * rather than shrinking it (see `marketplace-service.ts`). There is no location
 * filter: no listing/farmer location column is readable by a buyer under RLS.
 */
export default function MarketplaceScreen() {
  // Draft controls, committed to `filters` by "Ilapat" so the list doesn't
  // refetch on every keystroke.
  const [panelOpen, setPanelOpen] = useState(false);
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

  // Guards against overlapping fetches (a focus event racing an "Ilapat")
  // applying out of order — only the newest request may update state.
  const latestRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setErrorMessage(undefined);
    try {
      const result = await fetchMarketplaceListings(filters);
      if (latestRequestId.current !== requestId) return;
      setRanked(result);

      // Cover photos are a display nicety — a failure here must not blank an
      // otherwise-successful fetch, so it gets its own try/catch.
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

  // Refetch on focus so a listing that sold out while the buyer was elsewhere
  // drops off the list.
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader />

      <View style={styles.filterBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPanelOpen((open) => !open)}
          style={styles.filterToggle}>
          <SlidersHorizontal size={16} color={AnimoColors.accentPrimary} />
          <AnimoText variant="bodyEmphasis" color={AnimoColors.accentPrimary}>
            {activeFilterCount > 0 ? `Mga Filter (${activeFilterCount})` : 'Mga Filter'}
          </AnimoText>
        </Pressable>
      </View>

      {panelOpen ? (
        <View style={styles.panel}>
          <LabeledInput
            label="Gustong dami"
            hint="Itatago ang mga listing na hindi kayang punan ang dami na ito."
            keyboardType="numeric"
            suffixText="kg"
            placeholder="Halimbawa: 100"
            value={quantityText}
            onChangeText={setQuantityText}
          />

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

          <View style={styles.chipGroup}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
              Uri ng palay
            </AnimoText>
            <FilterChips
              options={VARIETY_CHOICES}
              value={variety}
              onChange={setVariety}
              inset={false}
            />
          </View>

          <View style={styles.chipGroup}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
              Moisture
            </AnimoText>
            <FilterChips
              options={MOISTURE_CHOICES}
              value={moisture}
              onChange={setMoisture}
              inset={false}
            />
          </View>

          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
            Ang uri at moisture ay pang-ranggo lang — mas mataas ang tugma, pero hindi
            nawawala ang iba.
          </AnimoText>

          <AnimoButton label="Ilapat" onPress={applyFilters} />
        </View>
      ) : null}

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
        ) : ranked.length === 0 ? (
          <View style={styles.centerState}>
            <AnimoText
              variant="body"
              color={AnimoColors.textMediumEmphasis}
              style={styles.centerText}>
              {activeFilterCount > 0
                ? 'Walang listing na tumutugma sa hinahanap mo.'
                : 'Wala pang available na listing ng palay.'}
            </AnimoText>
          </View>
        ) : (
          <FlatList
            data={ranked}
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.sm,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  panel: {
    marginHorizontal: AnimoSpacing.lg,
    marginBottom: AnimoSpacing.md,
    padding: AnimoSpacing.lg,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    gap: AnimoSpacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  priceField: {
    flex: 1,
  },
  chipGroup: {
    gap: AnimoSpacing.sm,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.xs,
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

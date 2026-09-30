import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, ClipboardList, Filter, Search } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { FilterModal } from '@/components/animo/filter-modal';
import { ListingTransactionSummaryCard } from '@/components/animo/farmer/listing-transaction-summary-card';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SearchFilterBar } from '@/components/animo/search-filter-bar';
import {
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useLanguage } from '@/hooks/use-language';
import { fetchMyCropListings } from '@/services/crop-listing-service';
import { fetchPurchaseRequestRollupByListing } from '@/services/purchase-request-service';
import {
  fetchFarmerTransactions,
  listingLastActivityAt,
  sumCompletedEarnings,
  sumCompletedSoldKg,
} from '@/services/transaction-service';
import {
  VARIETY_OPTIONS,
  listingTitle,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
  type DeclaredVariety,
} from '@/types/crop-listing';
import type { TransactionWithPayment } from '@/types/transaction';

const SCREEN_PADDING = AnimoSpacing.lg;

type StatusFilter = 'Lahat' | 'Kasalukuyan' | 'Tapos na' | 'Kailangan';
type VarietyChoice = 'Lahat' | DeclaredVariety;

type TxnFilterDraft = {
  status: StatusFilter;
  minRemainingText: string;
  minEarningsText: string;
  maxEarningsText: string;
  variety: VarietyChoice;
};

const EMPTY_FILTERS: TxnFilterDraft = {
  status: 'Lahat',
  minRemainingText: '',
  minEarningsText: '',
  maxEarningsText: '',
  variety: 'Lahat',
};

const STATUS_FILTERS: { value: StatusFilter; tl: string; en: string }[] = [
  { value: 'Lahat', tl: 'Lahat', en: 'All' },
  { value: 'Kasalukuyan', tl: 'Kasalukuyan', en: 'Ongoing' },
  { value: 'Tapos na', tl: 'Tapos na', en: 'Completed' },
  { value: 'Kailangan', tl: 'Kailangan ng aksyon', en: 'Needs action' },
];

const VARIETY_CHOICES: { value: VarietyChoice; label: string }[] = [
  { value: 'Lahat', label: 'Lahat' },
  ...VARIETY_OPTIONS,
];

/** Parses a filter text field, treating blank or non-numeric text as unset. */
function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/** One count per section that is not left at its default. */
function countActiveFilters(filters: TxnFilterDraft): number {
  let count = 0;
  if (filters.status !== 'Lahat') count += 1;
  if (parseNumber(filters.minRemainingText) !== undefined) count += 1;
  if (
    parseNumber(filters.minEarningsText) !== undefined ||
    parseNumber(filters.maxEarningsText) !== undefined
  ) {
    count += 1;
  }
  if (filters.variety !== 'Lahat') count += 1;
  return count;
}

function rollupMatchesFilters(item: ListingRollup, filters: TxnFilterDraft): boolean {
  if (filters.status === 'Kasalukuyan' && item.listing.status !== 'Available') return false;
  if (filters.status === 'Tapos na' && item.listing.status !== 'Sold_Out') return false;
  if (filters.status === 'Kailangan' && item.pendingCount <= 0) return false;

  const minRemaining = parseNumber(filters.minRemainingText);
  if (minRemaining !== undefined && item.listing.remainingQuantityKg < minRemaining) return false;

  const minEarnings = parseNumber(filters.minEarningsText);
  const maxEarnings = parseNumber(filters.maxEarningsText);
  if (minEarnings !== undefined && item.earnings < minEarnings) return false;
  if (maxEarnings !== undefined && item.earnings > maxEarnings) return false;

  if (filters.variety !== 'Lahat' && item.listing.declaredVariety !== filters.variety) return false;
  return true;
}

function moneySearchText(amount: number): string {
  const formatted = formatPeso(amount).replace('₱', '').toLowerCase();
  return `${amount} ${formatted} ${formatted.replace(/,/g, '')}`;
}

function rollupMatchesSearch(item: ListingRollup, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;

  const statusWords = [
    item.listing.status === 'Available' ? 'kasalukuyan ongoing active available' : '',
    item.listing.status === 'Sold_Out' ? 'tapos na completed sold out naubos' : '',
    item.pendingCount > 0 ? 'kailangan ng aksyon action required needs action' : '',
  ].join(' ');

  const pricePerKg = item.listing.pricePerKg;
  const haystack = [
    listingTitle(item.listing),
    item.varietyLine,
    moneySearchText(item.earnings),
    pricePerKg !== null ? moneySearchText(pricePerKg) : '',
    statusWords,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

type ListingRollup = {
  listing: CropListing;
  soldKg: number;
  earnings: number;
  pendingCount: number;
  varietyLine: string;
  lastActivityAt: string;
};

/** Farmer Transaksyon — per-listing rollups (kg left / sold / Buong Kita). */
export default function FarmerTransactionsScreen() {
  const { t, language, isTagalog } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<TxnFilterDraft>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<TxnFilterDraft>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const [listings, setListings] = useState<CropListing[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithPayment[]>([]);
  const [pendingCounts, setPendingCounts] = useState<Map<string, number>>(new Map());
  const [prLatestUpdatedAt, setPrLatestUpdatedAt] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchBarRef = useRef<View>(null);
  const bellRef = useRef<View>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [myListings, txs, prRollup] = await Promise.all([
        fetchMyCropListings(),
        fetchFarmerTransactions(),
        fetchPurchaseRequestRollupByListing().catch(() => ({
          pendingCounts: new Map<string, number>(),
          latestUpdatedAt: new Map<string, string>(),
        })),
      ]);
      setListings(myListings);
      setTransactions(txs);
      setPendingCounts(prRollup.pendingCounts);
      setPrLatestUpdatedAt(prRollup.latestUpdatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : (isTagalog ? 'Hindi ma-load ang mga transaksyon.' : 'Could not load transactions.'));
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [isTagalog]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  useAutoRefresh(useCallback(() => load(true), [load]));

  const rollups = useMemo((): ListingRollup[] => {
    return listings
      .filter((listing) => listing.status !== 'Draft' && listing.status !== 'Cancelled' && listing.status !== 'Archived')
      .map((listing) => {
        const specific = specificVarietyDisplay(listing, language);
        const variety = varietyLabel(listing, language);
        return {
          listing,
          soldKg: sumCompletedSoldKg(transactions, listing.id),
          earnings: sumCompletedEarnings(transactions, listing.id),
          pendingCount: pendingCounts.get(listing.id) ?? 0,
          varietyLine: specific ? `${variety} (${specific})` : variety,
          lastActivityAt: listingLastActivityAt(
            listing.id,
            listing.dateListed,
            prLatestUpdatedAt,
            transactions,
          ),
        };
      })
      .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1));
  }, [listings, transactions, pendingCounts, prLatestUpdatedAt, language]);

  const activeFilterCount = countActiveFilters(appliedFilters);

  const filteredData = useMemo(() => {
    return rollups.filter(
      (item) => rollupMatchesFilters(item, appliedFilters) && rollupMatchesSearch(item, searchQuery),
    );
  }, [rollups, appliedFilters, searchQuery]);

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

  const farmerTxnTourSteps: SpotlightStep[] = [
    {
      id: 'farmer-txn-filter',
      title: t('spotlight.farmerTxn.step1Title'),
      description: t('spotlight.farmerTxn.step1Desc'),
      icon: Filter,
      targetRef: searchBarRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
    {
      id: 'farmer-txn-search',
      title: t('spotlight.farmerTxn.step2Title'),
      description: t('spotlight.farmerTxn.step2Desc'),
      icon: Search,
      targetRef: searchBarRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
    {
      id: 'farmer-txn-bell',
      title: t('spotlight.farmerTxn.step3Title'),
      description: t('spotlight.farmerTxn.step3Desc'),
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
        onPressBell={() => router.push('/(farmer)/notipikasyon')}
      />

      <View ref={searchBarRef} collapsable={false}>
        <SearchFilterBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            isTagalog ? 'Maghanap ng pangalan, presyo, katayuan...' : 'Search name, price, status...'
          }
          activeFilterCount={activeFilterCount}
          onFilterPress={openModal}
        />
      </View>

      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={countActiveFilters(draftFilters)}
      >
        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? 'Katayuan' : 'Status'}
          </AnimoText>
          <View style={styles.chipsWrap}>
            {STATUS_FILTERS.map((choice) => (
              <FilterChoiceChip
                key={choice.value}
                label={isTagalog ? choice.tl : choice.en}
                active={draftFilters.status === choice.value}
                onPress={() => setDraftFilters((prev) => ({ ...prev, status: choice.value }))}
              />
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <LabeledInput
            label={isTagalog ? 'Natitirang dami (kg)' : 'Remaining weight (kg)'}
            hint={
              isTagalog
                ? 'Ipakita lamang ang mga listing na may natitirang timbang na ito.'
                : 'Only show listings with at least this much left.'
            }
            keyboardType="numeric"
            suffixText="kg"
            placeholder={isTagalog ? 'Halimbawa: 100' : 'e.g. 100'}
            value={draftFilters.minRemainingText}
            onChangeText={(minRemainingText) =>
              setDraftFilters((prev) => ({ ...prev, minRemainingText }))
            }
          />
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? 'Buong Kita (₱)' : 'Total earnings (₱)'}
          </AnimoText>
          <View style={styles.filterPriceRow}>
            <View style={styles.filterPriceField}>
              <LabeledInput
                label={isTagalog ? 'Pinakamababa' : 'Minimum'}
                keyboardType="numeric"
                prefixText="₱"
                placeholder="1000"
                value={draftFilters.minEarningsText}
                onChangeText={(minEarningsText) =>
                  setDraftFilters((prev) => ({ ...prev, minEarningsText }))
                }
              />
            </View>
            <View style={styles.filterPriceField}>
              <LabeledInput
                label={isTagalog ? 'Pinakamataas' : 'Maximum'}
                keyboardType="numeric"
                prefixText="₱"
                placeholder="8000"
                value={draftFilters.maxEarningsText}
                onChangeText={(maxEarningsText) =>
                  setDraftFilters((prev) => ({ ...prev, maxEarningsText }))
                }
              />
            </View>
          </View>
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? 'Uri ng palay' : 'Rice variety'}
          </AnimoText>
          <View style={styles.chipsWrap}>
            {VARIETY_CHOICES.map((choice) => {
              const label =
                choice.value === 'Lahat'
                  ? isTagalog
                    ? 'Lahat'
                    : 'All'
                  : choice.value === 'Traditional_or_Heirloom'
                    ? isTagalog
                      ? 'Tradisyonal o Pamana'
                      : 'Traditional / Heirloom'
                    : choice.value === 'Mix_of_Varieties'
                      ? isTagalog
                        ? 'Halo-halong Uri'
                        : 'Mixed Varieties'
                      : choice.value === 'Others'
                        ? isTagalog
                          ? 'Iba pa'
                          : 'Others'
                        : choice.label;
              return (
                <FilterChoiceChip
                  key={choice.value}
                  label={label}
                  active={draftFilters.variety === choice.value}
                  onPress={() => setDraftFilters((prev) => ({ ...prev, variety: choice.value }))}
                />
              );
            })}
          </View>
        </View>
      </FilterModal>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <AnimoText variant="body" color={AnimoColors.danger}>
            {error}
          </AnimoText>
        </View>
      ) : (
        <FlatList
          style={styles.scroll}
          data={filteredData}
          keyExtractor={(item) => item.listing.id}
          renderItem={({ item }) => (
            <ListingTransactionSummaryCard
              title={listingTitle(item.listing)}
              varietyLine={item.varietyLine}
              remainingKg={item.listing.remainingQuantityKg}
              soldKg={item.soldKg}
              earnings={item.earnings}
              needsAction={item.pendingCount > 0}
              onPress={() =>
                router.push({
                  pathname: '/(farmer)/transaksyon/listing/[id]' as any,
                  params: { id: item.listing.id },
                })
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={
            searchQuery.trim() !== '' ? (
              <SearchEmptyState query={searchQuery} onClear={() => setSearchQuery('')} isTagalog={isTagalog} />
            ) : activeFilterCount > 0 ? (
              <FilterEmptyState isTagalog={isTagalog} onClear={resetFilters} />
            ) : (
              <EmptyState isTagalog={isTagalog} />
            )
          }
        />
      )}

      <SpotlightTour
        visible={showTutorial}
        steps={farmerTxnTourSteps}
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

function FilterEmptyState({ isTagalog, onClear }: { isTagalog: boolean; onClear: () => void }) {
  return (
    <View style={styles.empty}>
      <Filter size={48} color={AnimoColors.accentPrimaryLight} />
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
        {isTagalog ? 'Walang listing sa filter na ito.' : 'No listings match this filter.'}
      </AnimoText>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={onClear} style={styles.searchEmptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
          {isTagalog ? 'I-clear ang filter' : 'Clear filters'}
        </AnimoText>
      </TouchableOpacity>
    </View>
  );
}

function SearchEmptyState({ query, onClear, isTagalog }: { query: string; onClear: () => void; isTagalog: boolean }) {
  return (
    <View style={styles.empty}>
      <Search size={48} color={AnimoColors.accentPrimaryLight} />
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
        {isTagalog ? `Walang resulta para sa "${query}"` : `No results for "${query}"`}
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
        {isTagalog ? "Subukan ang ibang keyword o i-clear ang search." : "Try a different keyword or clear search."}
      </AnimoText>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={onClear} style={styles.searchEmptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
          {isTagalog ? "I-clear ang Search" : "Clear Search"}
        </AnimoText>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ isTagalog }: { isTagalog: boolean }) {
  return (
    <View style={styles.empty}>
      <ClipboardList size={64} color={AnimoColors.accentPrimaryLight} />
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
        {isTagalog ? "Wala pang listing" : "No listings yet"}
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
        {isTagalog ? "Maglista ng palay para magsimulang makatanggap ng mga kahilingan." : "List your harvest to start receiving purchase requests."}
      </AnimoText>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={() => router.push('/(farmer)/(tabs)/palengke')}
        style={styles.emptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
          {isTagalog ? "Maglista ng Palay" : "List Palay"}
        </AnimoText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.appBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, backgroundColor: AnimoColors.appBackground },
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
  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: AnimoSpacing.xxl,
  },
  empty: {
    alignItems: 'center',
    marginTop: AnimoSpacing.xxl,
  },
  emptyTitle: {
    textAlign: 'center',
    marginTop: AnimoSpacing.lg,
  },
  emptyBody: {
    textAlign: 'center',
    marginTop: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.xxl,
  },
  emptyCta: {
    backgroundColor: AnimoColors.accentPrimary,
    borderRadius: AnimoRadius.lg,
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.md,
    marginTop: AnimoSpacing.xl,
  },
  searchEmptyCta: {
    backgroundColor: AnimoColors.surfaceTertiary,
    borderRadius: AnimoRadius.lg,
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.md,
    marginTop: AnimoSpacing.xl,
  },
});

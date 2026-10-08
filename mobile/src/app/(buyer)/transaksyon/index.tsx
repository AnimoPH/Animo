import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, ChevronLeft, ChevronRight, ClipboardList, Filter, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SearchFilterBar } from '@/components/animo/search-filter-bar';
import {
  BuyerTransactionCard,
  type BuyerTransactionCardItem,
} from '@/components/animo/buyer/buyer-transaction-card';
import {
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useLanguage } from '@/hooks/use-language';
import { parseBuyerTransactionListFilter } from '@/lib/buyer-transactions-nav';
import { fetchCropListingsByIds } from '@/services/crop-listing-service';
import {
  fetchBuyerPurchaseOutcomes,
  fetchCounterpartNames,
  fetchFarmerNamesByListingIds,
  isListingTxnCompleted,
  isListingTxnOngoing,
} from '@/services/transaction-service';
import {
  listingTitle,
  specificVarietyDisplay,
  type CropListing,
} from '@/types/crop-listing';
import {
  deriveDisplayStage,
  formatDate,
  formatTime,
  getDisplayStageLabel,
  requestTotal,
  type PurchaseOutcome,
} from '@/types/transaction';

const SCREEN_PADDING = AnimoSpacing.lg;
const PAGE_SIZE = 5;

type FilterValue = 'Lahat' | 'Kasalukuyan' | 'Tapos na';

const FILTERS: FilterValue[] = ['Lahat', 'Kasalukuyan', 'Tapos na'];

function toCardItem(
  outcome: PurchaseOutcome,
  listing: CropListing | undefined,
  farmerName?: string,
  lang: 'tl' | 'en' = 'tl',
): BuyerTransactionCardItem {
  const stage = deriveDisplayStage(outcome);
  const quantityKg =
    outcome.kind === 'matched' ? outcome.transaction.quantityKg : outcome.request.requestedQuantityKg;
  const pricePerKg =
    outcome.kind === 'matched' ? outcome.transaction.agreedPricePerKg : (listing?.pricePerKg ?? 0);
  const total =
    outcome.kind === 'matched' ? requestTotal(outcome) : pricePerKg * quantityKg;

  return {
    id: outcome.request.id,
    stage,
    statusLabel: getDisplayStageLabel(stage, lang),
    listingName: listing ? listingTitle(listing) : (lang === 'en' ? 'Palay Harvest' : 'Palay'),
    specificVariety: listing ? specificVarietyDisplay(listing, lang) : null,
    price: formatPeso(total),
    weight: `${quantityKg} kg`,
    pricePerKg: `${formatPeso(pricePerKg)}/kg`,
    paymentMode: outcome.kind === 'matched' ? (outcome.transaction.payment?.paymentMode ?? null) : null,
    farmer: farmerName || (lang === 'en' ? 'Farmer' : 'Magsasaka'),
    date: formatDate(outcome.request.submittedAt),
    time: formatTime(outcome.request.submittedAt),
  };
}

/** Buyer Transaksyon — requests & matched transactions matching farmer transaksyon UI layout. */
export default function BuyerTransactionsScreen() {
  const { language, isTagalog, t } = useLanguage();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string | string[] }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilter, setAppliedFilter] = useState<FilterValue>('Lahat');
  const [draftFilter, setDraftFilter] = useState<FilterValue>('Lahat');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTutorial, setShowTutorial] = useState(true);

  const [outcomes, setOutcomes] = useState<PurchaseOutcome[]>([]);
  const [listingsById, setListingsById] = useState<Map<string, CropListing>>(new Map());
  const [farmerNamesByListing, setFarmerNamesByListing] = useState<Map<string, string>>(new Map());
  const [counterpartNamesById, setCounterpartNamesById] = useState<Map<string, string>>(new Map());
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
      const result = await fetchBuyerPurchaseOutcomes();
      setOutcomes(result);
      const listingIds = result.map((o) => o.request.listingId);
      const farmerIds = result
        .map((o) => (o.kind === 'matched' ? o.transaction.farmerId : null))
        .filter((id): id is string => Boolean(id));

      const [listings, farmerNames, counterparts] = await Promise.all([
        fetchCropListingsByIds(listingIds),
        fetchFarmerNamesByListingIds(listingIds),
        fetchCounterpartNames(farmerIds),
      ]);
      setListingsById(listings);
      setFarmerNamesByListing(farmerNames);
      setCounterpartNamesById(counterparts);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isTagalog
            ? 'Hindi ma-load ang mga transaksyon.'
            : 'Failed to load transactions.',
      );
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

  useEffect(() => {
    const next = parseBuyerTransactionListFilter(filterParam);
    if (!next) return;
    setAppliedFilter(next);
    setDraftFilter(next);
    setCurrentPage(1);
    router.setParams({ filter: '' });
  }, [filterParam]);

  useAutoRefresh(useCallback(() => load(true), [load]));

  const items = useMemo(
    () =>
      outcomes.map((outcome) => {
        const farmerName =
          (outcome.kind === 'matched' ? counterpartNamesById.get(outcome.transaction.farmerId) : null) ||
          farmerNamesByListing.get(outcome.request.listingId) ||
          (language === 'en' ? 'Farmer' : 'Magsasaka');
        return {
          outcome,
          card: toCardItem(outcome, listingsById.get(outcome.request.listingId), farmerName, language),
        };
      }),
    [outcomes, listingsById, counterpartNamesById, farmerNamesByListing, language],
  );

  const filteredData = useMemo(() => {
    return items.filter(({ outcome, card }) => {
      const matchesFilter = (() => {
        if (appliedFilter === 'Lahat') return true;
        if (appliedFilter === 'Kasalukuyan') return isListingTxnOngoing(outcome);
        if (appliedFilter === 'Tapos na') return isListingTxnCompleted(outcome);
        return true;
      })();

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        card.listingName.toLowerCase().includes(query) ||
        (card.specificVariety?.toLowerCase().includes(query) ?? false) ||
        card.statusLabel.toLowerCase().includes(query) ||
        card.farmer.toLowerCase().includes(query) ||
        card.price.toLowerCase().includes(query) ||
        card.weight.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [items, appliedFilter, searchQuery]);

  const activeFilterCount = appliedFilter === 'Lahat' ? 0 : 1;

  const openFilter = () => {
    setDraftFilter(appliedFilter);
    setModalOpen(true);
  };

  const applyFilters = () => {
    setAppliedFilter(draftFilter);
    setCurrentPage(1);
    setModalOpen(false);
  };

  const resetFilters = () => {
    setDraftFilter('Lahat');
    setAppliedFilter('Lahat');
    setCurrentPage(1);
    setModalOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE).map(({ card }) => card);
  }, [filteredData, validPage]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  const buyerTxnTourSteps: SpotlightStep[] = [
    {
      id: 'buyer-txn-filter',
      title: t('spotlight.buyerTxn.step1Title'),
      description: t('spotlight.buyerTxn.step1Desc'),
      icon: Filter,
      targetRef: searchBarRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
    {
      id: 'buyer-txn-search',
      title: t('spotlight.buyerTxn.step2Title'),
      description: t('spotlight.buyerTxn.step2Desc'),
      icon: Search,
      targetRef: searchBarRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
    {
      id: 'buyer-txn-bell',
      title: t('spotlight.buyerTxn.step3Title'),
      description: t('spotlight.buyerTxn.step3Desc'),
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

      <View ref={searchBarRef} collapsable={false}>
        <SearchFilterBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder={
            isTagalog ? 'Maghanap ng pangalan, presyo, katayuan...' : 'Search name, price, status...'
          }
          activeFilterCount={activeFilterCount}
          onFilterPress={openFilter}
        />
      </View>

      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={draftFilter === 'Lahat' ? 0 : 1}>
        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? 'Katayuan' : 'Status'}
          </AnimoText>
          <View style={styles.chipsWrap}>
            {FILTERS.map((filter) => {
              const label =
                filter === 'Lahat'
                  ? isTagalog
                    ? 'Lahat'
                    : 'All'
                  : filter === 'Kasalukuyan'
                    ? isTagalog
                      ? 'Kasalukuyan'
                      : 'Active'
                    : isTagalog
                      ? 'Tapos na'
                      : 'Completed';
              return (
                <FilterChoiceChip
                  key={filter}
                  label={label}
                  active={draftFilter === filter}
                  onPress={() => setDraftFilter(filter)}
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
          data={paginatedData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BuyerTransactionCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListFooterComponent={
            <PaginationControls
              currentPage={validPage}
              totalPages={totalPages}
              totalItems={filteredData.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              isTagalog={isTagalog}
            />
          }
          ListEmptyComponent={
            searchQuery.trim() !== '' ? (
              <SearchEmptyState
                query={searchQuery}
                onClear={() => handleSearchChange('')}
                isTagalog={isTagalog}
              />
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
        steps={buyerTxnTourSteps}
        onClose={() => setShowTutorial(false)}
      />
    </SafeAreaView>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isTagalog,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isTagalog: boolean;
}) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <View style={styles.paginationWrap}>
      <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.paginationSummary}>
        {isTagalog
          ? `Ipinapakita ang ${startItem}-${endItem} ng ${totalItems} na transaksyon`
          : `Showing ${startItem}-${endItem} of ${totalItems} transactions`}
      </AnimoText>

      <View style={styles.paginationRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isTagalog ? 'Nakaraang pahina' : 'Previous page'}
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          activeOpacity={0.8}
          style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavBtnDisabled]}>
          <ChevronLeft
            size={16}
            color={currentPage <= 1 ? AnimoColors.textDisabled : AnimoColors.textHighEmphasis}
          />
          <AnimoText
            variant="bodyEmphasis"
            color={currentPage <= 1 ? AnimoColors.textDisabled : AnimoColors.textHighEmphasis}>
            {isTagalog ? 'Nakaraan' : 'Prev'}
          </AnimoText>
        </TouchableOpacity>

        <View style={styles.pageNumbersRow}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const isActive = pageNum === currentPage;
            return (
              <TouchableOpacity
                key={pageNum}
                accessibilityRole="button"
                accessibilityLabel={isTagalog ? `Pahina ${pageNum}` : `Page ${pageNum}`}
                onPress={() => onPageChange(pageNum)}
                activeOpacity={0.8}
                style={[styles.pageNumberBtn, isActive && styles.pageNumberBtnActive]}>
                <AnimoText
                  variant="bodyEmphasis"
                  color={isActive ? AnimoColors.white : AnimoColors.textHighEmphasis}>
                  {pageNum}
                </AnimoText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isTagalog ? 'Susunod na pahina' : 'Next page'}
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          activeOpacity={0.8}
          style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavBtnDisabled]}>
          <AnimoText
            variant="bodyEmphasis"
            color={currentPage >= totalPages ? AnimoColors.textDisabled : AnimoColors.textHighEmphasis}>
            {isTagalog ? 'Susunod' : 'Next'}
          </AnimoText>
          <ChevronRight
            size={16}
            color={currentPage >= totalPages ? AnimoColors.textDisabled : AnimoColors.textHighEmphasis}
          />
        </TouchableOpacity>
      </View>
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

function FilterEmptyState({ isTagalog, onClear }: { isTagalog: boolean; onClear: () => void }) {
  return (
    <View style={styles.empty}>
      <Filter size={48} color={AnimoColors.accentPrimaryLight} />
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
        {isTagalog ? 'Walang transaksyon sa filter na ito.' : 'No transactions match this filter.'}
      </AnimoText>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={onClear}
        style={styles.searchEmptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
          {isTagalog ? 'I-clear ang filter' : 'Clear filters'}
        </AnimoText>
      </TouchableOpacity>
    </View>
  );
}

function SearchEmptyState({
  query,
  onClear,
  isTagalog,
}: {
  query: string;
  onClear: () => void;
  isTagalog: boolean;
}) {
  return (
    <View style={styles.empty}>
      <Search size={48} color={AnimoColors.accentPrimaryLight} />
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
        {isTagalog ? `Walang resulta para sa "${query}"` : `No results for "${query}"`}
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
        {isTagalog
          ? 'Subukan ang ibang keyword o i-clear ang search.'
          : 'Try another keyword or clear your search.'}
      </AnimoText>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={onClear}
        style={styles.searchEmptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
          {isTagalog ? 'I-clear ang Search' : 'Clear Search'}
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
        {isTagalog ? 'Wala pang transaksyon' : 'No transactions yet'}
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
        {isTagalog
          ? 'Mag-browse ng mga magsasaka at palay sa palengke upang makapag-order.'
          : 'Browse farmers and palay in the marketplace to place an order.'}
      </AnimoText>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={() => router.push('/(buyer)/palengke')}
        style={styles.emptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
          {isTagalog ? 'Pumunta sa Palengke' : 'Go to Marketplace'}
        </AnimoText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scroll: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  filterSection: {
    gap: AnimoSpacing.sm,
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
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  paginationWrap: {
    marginTop: AnimoSpacing.md,
    // marginBottom: AnimoSpacing.xl,
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  paginationSummary: {
    textAlign: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 8,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  pageNavBtnDisabled: {
    backgroundColor: AnimoColors.surfaceSecondary,
    opacity: 0.5,
  },
  pageNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNumberBtn: {
    width: 36,
    height: 36,
    borderRadius: AnimoRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  pageNumberBtnActive: {
    backgroundColor: AnimoColors.accentPrimary,
    borderColor: AnimoColors.accentPrimary,
  },
});

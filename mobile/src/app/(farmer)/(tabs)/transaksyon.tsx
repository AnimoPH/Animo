import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, ChevronLeft, ChevronRight, ClipboardList, Filter, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { TransactionCard, type FarmerTransactionCardItem } from '@/components/animo/farmer/transaction-card';
import {
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { fetchCropListingsByIds } from '@/services/crop-listing-service';
import { fetchCounterpartNames, fetchFarmerPurchaseOutcomes } from '@/services/transaction-service';
import { varietyLabel, type CropListing } from '@/types/crop-listing';
import {
  DISPLAY_STAGE_LABELS,
  getDisplayStageLabel,
  deriveDisplayStage,
  formatDate,
  formatReferenceId,
  formatTime,
  requestTotal,
  type DisplayStage,
  type PurchaseOutcome,
} from '@/types/transaction';

const SCREEN_PADDING = AnimoSpacing.lg;
const PAGE_SIZE = 5;

type FilterValue = 'Lahat' | 'Kailangan ng Aksyon' | 'Naghihintay' | 'Kumpleto' | 'Nabigo';

const FILTERS: FilterValue[] = ['Lahat', 'Kailangan ng Aksyon', 'Naghihintay', 'Kumpleto', 'Nabigo'];

const ACTION_STAGES: DisplayStage[] = ['request_pending', 'payment_sent', 'payment_confirmed'];
const WAITING_STAGES: DisplayStage[] = ['awaiting_payment'];
const COMPLETED_STAGES: DisplayStage[] = ['payment_confirmed', 'delivered', 'completed'];
const FAILED_STAGES: DisplayStage[] = ['transaction_cancelled', 'payment_failed', 'request_rejected', 'request_cancelled'];

function toCardItem(
  outcome: PurchaseOutcome,
  listing: CropListing | undefined,
  buyerName?: string,
  lang: 'tl' | 'en' = 'tl',
): FarmerTransactionCardItem {
  const stage = deriveDisplayStage(outcome);
  const quantityKg = outcome.kind === 'matched' ? outcome.transaction.quantityKg : outcome.request.requestedQuantityKg;
  const pricePerKg = outcome.kind === 'matched' ? outcome.transaction.agreedPricePerKg : (listing?.pricePerKg ?? 0);
  const total = outcome.kind === 'matched' ? requestTotal(outcome) : pricePerKg * quantityKg;

  return {
    id: outcome.kind === 'matched' ? outcome.transaction.id : outcome.request.listingId,
    referenceId: formatReferenceId(outcome.kind === 'matched' ? outcome.transaction.id : outcome.request.id, outcome.kind === 'matched' ? 'TXN' : 'PR'),
    stage,
    statusLabel: getDisplayStageLabel(stage, lang),
    variety: listing ? varietyLabel(listing) : 'Palay',
    moisture: listing?.declaredMoisture === 'Wet' ? (lang === 'en' ? 'Wet' : 'Basa') : (lang === 'en' ? 'Dry' : 'Tuyo'),
    price: formatPeso(total),
    weight: `${quantityKg} kg`,
    pricePerKg: `${formatPeso(pricePerKg)}/kg`,
    paymentMode: outcome.kind === 'matched' ? (outcome.transaction.payment?.paymentMode ?? null) : null,
    buyer: buyerName || (outcome.kind === 'matched' ? (lang === 'en' ? 'Buyer' : 'Mamimili') : (lang === 'en' ? 'New Buyer' : 'Bagong Mamimili')),
    date: formatDate(outcome.request.submittedAt),
    time: formatTime(outcome.request.submittedAt),
  };
}

/** Farmer Transaksyon — pending requests across every listing plus matched transactions, driven by real data. */
export default function FarmerTransactionsScreen() {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterValue>('Lahat');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTutorial, setShowTutorial] = useState(true);

  const [outcomes, setOutcomes] = useState<PurchaseOutcome[]>([]);
  const [listingsById, setListingsById] = useState<Map<string, CropListing>>(new Map());
  const [buyerNamesById, setBuyerNamesById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchBarRef = useRef<View>(null);
  const filterRowRef = useRef<View>(null);
  const bellRef = useRef<View>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await fetchFarmerPurchaseOutcomes();
      setOutcomes(result);
      const buyerIds = result
        .map((o) => (o.kind === 'matched' ? o.transaction.buyerId : o.request.buyerId))
        .filter((id): id is string => Boolean(id));

      const [listings, buyerNames] = await Promise.all([
        fetchCropListingsByIds(result.map((o) => o.request.listingId)),
        fetchCounterpartNames(buyerIds),
      ]);
      setListingsById(listings);
      setBuyerNamesById(buyerNames);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hindi ma-load ang mga transaksyon.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const items = useMemo(
    () =>
      outcomes.map((outcome) => {
        const buyerId = outcome.kind === 'matched' ? outcome.transaction.buyerId : outcome.request.buyerId;
        const buyerName = buyerNamesById.get(buyerId);
        return toCardItem(outcome, listingsById.get(outcome.request.listingId), buyerName, language);
      }),
    [outcomes, listingsById, buyerNamesById, language],
  );

  const filteredData = useMemo(() => {
    return items.filter((item) => {
      const matchesFilter = (() => {
        if (activeFilter === 'Lahat') return true;
        if (activeFilter === 'Kailangan ng Aksyon') return ACTION_STAGES.includes(item.stage);
        if (activeFilter === 'Naghihintay') return WAITING_STAGES.includes(item.stage);
        if (activeFilter === 'Kumpleto') return COMPLETED_STAGES.includes(item.stage);
        if (activeFilter === 'Nabigo') return FAILED_STAGES.includes(item.stage);
        return true;
      })();

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        item.variety.toLowerCase().includes(query) ||
        item.statusLabel.toLowerCase().includes(query) ||
        item.referenceId.toLowerCase().includes(query) ||
        item.buyer.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [items, activeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, validPage]);

  const handleFilterSelect = (filter: FilterValue) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  const farmerTxnTourSteps: SpotlightStep[] = [
    {
      id: 'farmer-txn-filter',
      title: t('spotlight.farmerTxn.step1Title'),
      description: t('spotlight.farmerTxn.step1Desc'),
      icon: Filter,
      targetRef: filterRowRef,
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

      <View ref={searchBarRef} collapsable={false} style={styles.searchBar}>
        <Search size={18} color={AnimoColors.objectLowEmphasis} />
        <TextInput
          style={styles.searchInput}
          placeholder="Maghanap ng transaksyon..."
          placeholderTextColor={AnimoColors.textDisabled}
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          underlineColorAndroid="transparent"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="I-clear ang search"
            onPress={() => handleSearchChange('')}
            activeOpacity={0.85}
            hitSlop={8}>
            <X size={18} color={AnimoColors.objectLowEmphasis} />
          </TouchableOpacity>
        ) : null}
      </View>

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
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <TransactionCard
              item={item}
              onPress={() =>
                item.stage === 'request_pending'
                  ? router.push({ pathname: '/(farmer)/listing-detail', params: { id: item.id, tab: 'orders' } })
                  : router.push({ pathname: '/(farmer)/transaksyon/[id]', params: { id: item.id } })
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListHeaderComponent={
            <View ref={filterRowRef} collapsable={false}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
                style={styles.filterScroll}>
                {FILTERS.map((filter) => {
                  const active = activeFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => handleFilterSelect(filter)}
                      activeOpacity={0.85}
                      style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
                      <AnimoText variant="bodyEmphasis" color={active ? AnimoColors.white : AnimoColors.textMediumEmphasis}>
                        {filter}
                      </AnimoText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListFooterComponent={
            <PaginationControls
              currentPage={validPage}
              totalPages={totalPages}
              totalItems={filteredData.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          }
          ListEmptyComponent={
            searchQuery.trim() !== '' ? (
              <SearchEmptyState query={searchQuery} onClear={() => handleSearchChange('')} />
            ) : (
              <EmptyState />
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

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <View style={styles.paginationWrap}>
      <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.paginationSummary}>
        Ipinapakita ang {startItem}-{endItem} ng {totalItems} na transaksyon
      </AnimoText>

      <View style={styles.paginationRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Nakaraang pahina"
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
            Nakaraan
          </AnimoText>
        </TouchableOpacity>

        <View style={styles.pageNumbersRow}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const isActive = pageNum === currentPage;
            return (
              <TouchableOpacity
                key={pageNum}
                accessibilityRole="button"
                accessibilityLabel={`Pahina ${pageNum}`}
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
          accessibilityLabel="Susunod na pahina"
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          activeOpacity={0.8}
          style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavBtnDisabled]}>
          <AnimoText
            variant="bodyEmphasis"
            color={currentPage >= totalPages ? AnimoColors.textDisabled : AnimoColors.textHighEmphasis}>
            Susunod
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

function SearchEmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <View style={styles.empty}>
      <Search size={48} color={AnimoColors.accentPrimaryLight} />
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
        Walang resulta para sa &quot;{query}&quot;
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
        Subukan ang ibang keyword o i-clear ang search.
      </AnimoText>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={onClear} style={styles.searchEmptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
          I-clear ang Search
        </AnimoText>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <ClipboardList size={64} color={AnimoColors.accentPrimaryLight} />
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
        Wala pang transaksyon
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
        Maglista ng palay para magsimulang makatanggap ng mga kahilingan.
      </AnimoText>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={() => router.push('/(farmer)/(tabs)/palengke')}
        style={styles.emptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
          Maglista ng Palay
        </AnimoText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.appBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, backgroundColor: AnimoColors.appBackground },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.md,
    marginBottom: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    height: 50,
    gap: AnimoSpacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...AnimoType.body,
    color: AnimoColors.textHighEmphasis,
    paddingVertical: 0,
  },
  filterScroll: {
    marginHorizontal: -SCREEN_PADDING,
    marginBottom: AnimoSpacing.md,
  },
  filters: {
    paddingHorizontal: SCREEN_PADDING,
  },
  pill: {
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.sm,
    marginRight: AnimoSpacing.sm,
  },
  pillActive: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  pillInactive: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1.5,
    borderColor: AnimoColors.borderLowEmphasis,
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
    marginTop: AnimoSpacing.sm,
    marginBottom: AnimoSpacing.xl,
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, ClipboardList, Filter, Search } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { FilterModal } from '@/components/animo/filter-modal';
import { ListingTransactionSummaryCard } from '@/components/animo/farmer/listing-transaction-summary-card';
import { TransactionCard, type FarmerTransactionCardItem } from '@/components/animo/farmer/transaction-card';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SearchFilterBar } from '@/components/animo/search-filter-bar';
import {
  FARMER_TXN_TUTORIAL_KEY,
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { Mascot } from '@/components/animo/ui/mascot';
import { IconButton } from '@/components/animo/ui/screen-bits';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useLanguage } from '@/hooks/use-language';
import { fetchMyCropListings } from '@/services/crop-listing-service';
import { fetchUnreadNotificationCount } from '@/services/notification-service';
import { fetchPurchaseRequestRollupByListing } from '@/services/purchase-request-service';
import {
  fetchCounterpartNames,
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
import {
  displayStageForMatch,
  formatDate,
  formatReferenceId,
  formatTime,
  getDisplayStageLabel,
  isFarmerNeedsActionStage,
  type TransactionWithPayment,
} from '@/types/transaction';
import type { TranslationKey } from '@/i18n/translations';

const SCREEN_PADDING = AnimoV2Spacing.lg;

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

const STATUS_FILTERS: { value: StatusFilter; labelKey: TranslationKey }[] = [
  { value: 'Lahat', labelKey: 'ftx.filterAll' },
  { value: 'Kasalukuyan', labelKey: 'ftx.filterOngoing' },
  { value: 'Tapos na', labelKey: 'ftx.filterDone' },
  { value: 'Kailangan', labelKey: 'ftx.filterAction' },
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
  /** Matched sales on this listing that wait on the farmer (payment to confirm, palay to hand over). */
  actionCount: number;
  varietyLine: string;
  lastActivityAt: string;
};

/** Farmer Transaksyon — per-listing rollups (kg left / sold / Buong Kita) then the order list. */
export default function FarmerTransactionsScreen() {
  const { t, language, isTagalog } = useLanguage();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<TxnFilterDraft>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<TxnFilterDraft>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const [listings, setListings] = useState<CropListing[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithPayment[]>([]);
  const [buyerNames, setBuyerNames] = useState<Map<string, string>>(new Map());
  const [pendingCounts, setPendingCounts] = useState<Map<string, number>>(new Map());
  const [prLatestUpdatedAt, setPrLatestUpdatedAt] = useState<Map<string, string>>(new Map());
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchBarRef = useRef<View>(null);
  const bellRef = useRef<View>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
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
        // Buyer names are a nice-to-have for the order rows: never fail the screen over them.
        setBuyerNames(
          await fetchCounterpartNames(txs.map((tx) => tx.buyerId)).catch(() => new Map<string, string>()),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : t('ftx.loadError'));
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
      fetchUnreadNotificationCount()
        .then(setUnread)
        .catch(() => {});
      let active = true;
      AsyncStorage.getItem(FARMER_TXN_TUTORIAL_KEY).then((seen) => {
        if (active) setShowTutorial(seen !== 'true');
      });
      return () => {
        active = false;
      };
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
          actionCount: transactions.filter(
            (tx) => tx.listingId === listing.id && isFarmerNeedsActionStage(displayStageForMatch(tx)),
          ).length,
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

  /** Matched sales across all listings, newest first (the "Mga Order" rows). */
  const orderItems = useMemo((): FarmerTransactionCardItem[] => {
    const titleByListing = new Map(listings.map((l) => [l.id, listingTitle(l)]));
    return [...transactions]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((tx) => {
        const stage = displayStageForMatch(tx);
        return {
          id: tx.id,
          referenceId: formatReferenceId(tx.id, 'TXN'),
          stage,
          statusLabel: getDisplayStageLabel(stage, language),
          variety: '',
          moisture: '',
          price: formatPeso(tx.totalAmount),
          weight: `${tx.quantityKg} kg`,
          pricePerKg: `${formatPeso(tx.agreedPricePerKg)}/kg`,
          paymentMode: tx.payment?.paymentMode ?? null,
          buyer: buyerNames.get(tx.buyerId) ?? t('ftx.buyerFallback'),
          date: formatDate(tx.createdAt, language),
          time: formatTime(tx.createdAt),
          listingTitle: titleByListing.get(tx.listingId),
        };
      });
  }, [transactions, listings, buyerNames, language, t]);

  const showOrders = searchQuery.trim() === '' && activeFilterCount === 0 && orderItems.length > 0;

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

  const varietyLabelFor = (value: VarietyChoice, fallback: string): string => {
    if (value === 'Lahat') return t('ftx.filterAll');
    if (value === 'Traditional_or_Heirloom') return t('ftx.varTrad');
    if (value === 'Mix_of_Varieties') return t('ftx.varMix');
    if (value === 'Others') return t('ftx.varOthers');
    return fallback;
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.titleRow, { paddingTop: insets.top + AnimoV2Spacing.md }]}>
        <View style={styles.flex}>
          <AnimoText variant="title" accessibilityRole="header">
            {t('ftx.title')}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
            {t('ftx.subtitle')}
          </AnimoText>
        </View>
        <View ref={bellRef} collapsable={false}>
          <IconButton
            icon={<Bell size={26} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />}
            label={unread > 0 ? t('ftx.bellUnread', { count: unread }) : t('ftx.bell')}
            onPress={() => router.push('/(farmer)/notipikasyon')}
            backgroundColor={AnimoV2Colors.surfaceCard}
          />
          {unread > 0 ? <View style={styles.bellDot} /> : null}
        </View>
      </View>

      <View ref={searchBarRef} collapsable={false}>
        <SearchFilterBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('ftx.searchPlaceholder')}
          activeFilterCount={activeFilterCount}
          onFilterPress={openModal}
        />
      </View>

      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={countActiveFilters(draftFilters)}>
        <View style={styles.filterSection}>
          <AnimoText variant="bodyStrong">{t('ftx.filterStatus')}</AnimoText>
          <View style={styles.chipsWrap}>
            {STATUS_FILTERS.map((choice) => (
              <FilterChip
                key={choice.value}
                label={t(choice.labelKey)}
                selected={draftFilters.status === choice.value}
                onPress={() => setDraftFilters((prev) => ({ ...prev, status: choice.value }))}
              />
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <LabeledInput
            label={t('ftx.filterRemaining')}
            hint={t('ftx.filterRemainingHint')}
            keyboardType="numeric"
            suffixText="kg"
            placeholder={t('ftx.filterRemainingPlaceholder')}
            value={draftFilters.minRemainingText}
            onChangeText={(minRemainingText) => setDraftFilters((prev) => ({ ...prev, minRemainingText }))}
          />
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyStrong">{t('ftx.filterEarnings')}</AnimoText>
          <View style={styles.filterPriceRow}>
            <View style={styles.flex}>
              <LabeledInput
                label={t('ftx.filterMin')}
                keyboardType="numeric"
                prefixText="₱"
                placeholder="1000"
                value={draftFilters.minEarningsText}
                onChangeText={(minEarningsText) => setDraftFilters((prev) => ({ ...prev, minEarningsText }))}
              />
            </View>
            <View style={styles.flex}>
              <LabeledInput
                label={t('ftx.filterMax')}
                keyboardType="numeric"
                prefixText="₱"
                placeholder="8000"
                value={draftFilters.maxEarningsText}
                onChangeText={(maxEarningsText) => setDraftFilters((prev) => ({ ...prev, maxEarningsText }))}
              />
            </View>
          </View>
        </View>

        <View style={styles.filterSection}>
          <AnimoText variant="bodyStrong">{t('ftx.filterVariety')}</AnimoText>
          <View style={styles.chipsWrap}>
            {VARIETY_CHOICES.map((choice) => (
              <FilterChip
                key={choice.value}
                label={varietyLabelFor(choice.value, choice.label)}
                selected={draftFilters.variety === choice.value}
                onPress={() => setDraftFilters((prev) => ({ ...prev, variety: choice.value }))}
              />
            ))}
          </View>
        </View>
      </FilterModal>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
            {error}
          </AnimoText>
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={filteredData}
          keyExtractor={(item) => item.listing.id}
          renderItem={({ item }) => (
            <ListingTransactionSummaryCard
              title={listingTitle(item.listing)}
              varietyLine={item.varietyLine}
              remainingKg={item.listing.remainingQuantityKg}
              soldKg={item.soldKg}
              earnings={item.earnings}
              soldOut={item.listing.status === 'Sold_Out'}
              needsAction={item.pendingCount > 0 || item.actionCount > 0}
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
              <MessageState
                icon={<Search size={48} color={AnimoV2Colors.borderStrong} strokeWidth={2.25} />}
                title={t('ftx.noResults', { query: searchQuery })}
                body={t('ftx.noResultsHint')}
                cta={t('ftx.clearSearch')}
                onCta={() => setSearchQuery('')}
              />
            ) : activeFilterCount > 0 ? (
              <MessageState
                icon={<Filter size={48} color={AnimoV2Colors.borderStrong} strokeWidth={2.25} />}
                title={t('ftx.noMatchFilter')}
                cta={t('ftx.clearFilter')}
                onCta={resetFilters}
              />
            ) : (
              <MessageState
                mascot
                title={t('ftx.emptyTitle')}
                body={t('ftx.emptyBody')}
                cta={t('ftx.emptyCta')}
                onCta={() => router.push('/(farmer)/(tabs)/palengke')}
              />
            )
          }
          ListFooterComponent={
            showOrders ? (
              <View style={styles.orders}>
                <AnimoText variant="heading" accessibilityRole="header" style={styles.ordersHeading}>
                  {t('ftx.ordersHeading')}
                </AnimoText>
                {orderItems.map((item) => (
                  <TransactionCard key={item.id} item={item} />
                ))}
              </View>
            ) : null
          }
        />
      )}

      <SpotlightTour
        visible={showTutorial}
        steps={farmerTxnTourSteps}
        role="magsasaka"
        storageKey={FARMER_TXN_TUTORIAL_KEY}
        onClose={() => {
          setShowTutorial(false);
          AsyncStorage.setItem(FARMER_TXN_TUTORIAL_KEY, 'true').catch(() => {});
        }}
      />
    </View>
  );
}

function MessageState({
  icon,
  mascot = false,
  title,
  body,
  cta,
  onCta,
}: {
  icon?: React.ReactNode;
  mascot?: boolean;
  title: string;
  body?: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <View style={styles.empty}>
      {mascot ? <Mascot size={112} /> : (icon ?? <ClipboardList size={64} color={AnimoV2Colors.borderStrong} />)}
      <AnimoText variant="title" style={styles.centerText}>
        {title}
      </AnimoText>
      {body ? (
        <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
          {body}
        </AnimoText>
      ) : null}
      <View style={styles.emptyCta}>
        <ChunkyButton label={cta} onPress={onCta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoV2Spacing.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: AnimoV2Spacing.sm,
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.dangerSolid,
    borderWidth: 2,
    borderColor: AnimoV2Colors.surfaceCard,
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SCREEN_PADDING },
  centerText: { textAlign: 'center' },
  filterSection: { gap: AnimoV2Spacing.sm },
  filterPriceRow: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
  list: { paddingHorizontal: SCREEN_PADDING, paddingTop: AnimoV2Spacing.sm, paddingBottom: AnimoV2Spacing.xxl },
  orders: { marginTop: AnimoV2Spacing.sm },
  ordersHeading: { marginBottom: AnimoV2Spacing.md },
  empty: {
    alignItems: 'center',
    gap: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xxl,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
  emptyCta: { alignSelf: 'stretch' },
});

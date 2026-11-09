import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import {
  BuyerTransactionCard,
  type BuyerTransactionCardItem,
} from '@/components/animo/buyer/buyer-transaction-card';
import {
  BUYER_TXN_TUTORIAL_KEY,
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { CollapsingHeader } from '@/components/animo/ui/collapsing-header';
import { Mascot } from '@/components/animo/ui/mascot';
import { IconButton } from '@/components/animo/ui/screen-bits';
import { V2SearchBar } from '@/components/animo/ui/search-bar';
import { SegmentedTabs } from '@/components/animo/ui/segmented-tabs';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useCollapsingHeader } from '@/hooks/use-collapsing-header';
import { useLanguage } from '@/hooks/use-language';
import { parseBuyerTransactionListFilter } from '@/lib/buyer-transactions-nav';
import { visiblePages } from '@/lib/visible-pages';
import { fetchCoverPhotos, fetchCropListingsByIds } from '@/services/crop-listing-service';
import { fetchUnreadNotificationCount } from '@/services/notification-service';
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

const SCREEN_PADDING = AnimoV2Spacing.lg;
const PAGE_SIZE = 5;

type FilterValue = 'Lahat' | 'Kasalukuyan' | 'Tapos na';

function toCardItem(
  outcome: PurchaseOutcome,
  listing: CropListing | undefined,
  farmerName?: string,
  lang: 'tl' | 'en' = 'tl',
  photoUrl?: string,
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
    photoUrl,
  };
}

/** Buyer Transaksyon: requests and matched transactions, split into Lahat / Aktibo / Kasaysayan. */
export default function BuyerTransactionsScreen() {
  const { language, isTagalog, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string | string[] }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilter, setAppliedFilter] = useState<FilterValue>('Lahat');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTutorial, setShowTutorial] = useState(false);

  const [outcomes, setOutcomes] = useState<PurchaseOutcome[]>([]);
  const [listingsById, setListingsById] = useState<Map<string, CropListing>>(new Map());
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [farmerNamesByListing, setFarmerNamesByListing] = useState<Map<string, string>>(new Map());
  const [counterpartNamesById, setCounterpartNamesById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  const searchBarRef = useRef<View>(null);
  const tabsRef = useRef<View>(null);
  const bellRef = useRef<View>(null);

  // Collapsing top block (title + bell, search, tabs): slides away on scroll down, and returns as
  // just the search and tabs on scroll up. Pinned open while the spotlight tutorial runs, since it
  // measures the tabs, search and bell by position. `followOverscroll` keeps the pull-to-refresh
  // spinner visible on iOS instead of letting it hide behind the block.
  const header = useCollapsingHeader({ locked: showTutorial, followOverscroll: true });
  const { headerHeight, showHeader } = header;

  // Loading / error replace the list, which then remounts at the top: start with the block shown.
  useEffect(() => {
    showHeader(true);
  }, [loading, error, showHeader]);

  const loadUnread = useCallback(() => {
    fetchUnreadNotificationCount()
      .then(setUnread)
      .catch(() => {});
  }, []);

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

      // Photos are decoration: a failure here must not hide the transactions.
      fetchCoverPhotos(listingIds)
        .then(setCoverPhotos)
        .catch(() => {});

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
      loadUnread();
      let active = true;
      AsyncStorage.getItem(BUYER_TXN_TUTORIAL_KEY).then((seen) => {
        if (active) setShowTutorial(seen !== 'true');
      });
      return () => {
        active = false;
      };
    }, [load, loadUnread]),
  );

  useEffect(() => {
    const next = parseBuyerTransactionListFilter(filterParam);
    if (!next) return;
    setAppliedFilter(next);
    setCurrentPage(1);
    router.setParams({ filter: '' });
  }, [filterParam]);

  useAutoRefresh(useCallback(() => load(true), [load]));
  useAutoRefresh(loadUnread);

  const items = useMemo(
    () =>
      outcomes.map((outcome) => {
        const farmerName =
          (outcome.kind === 'matched' ? counterpartNamesById.get(outcome.transaction.farmerId) : null) ||
          farmerNamesByListing.get(outcome.request.listingId) ||
          (language === 'en' ? 'Farmer' : 'Magsasaka');
        return {
          outcome,
          card: toCardItem(
            outcome,
            listingsById.get(outcome.request.listingId),
            farmerName,
            language,
            coverPhotos.get(outcome.request.listingId),
          ),
        };
      }),
    [outcomes, listingsById, counterpartNamesById, farmerNamesByListing, coverPhotos, language],
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

  const resetFilters = () => {
    setAppliedFilter('Lahat');
    setCurrentPage(1);
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

  const handleTabChange = (next: FilterValue) => {
    setAppliedFilter(next);
    setCurrentPage(1);
  };

  const buyerTxnTourSteps: SpotlightStep[] = [
    {
      id: 'buyer-txn-filter',
      title: t('spotlight.buyerTxn.step1Title'),
      description: t('spotlight.buyerTxn.step1Desc'),
      icon: Filter,
      targetRef: tabsRef,
      shape: 'rectangle',
      borderRadius: AnimoV2Radius.md,
      padding: 6,
    },
    {
      id: 'buyer-txn-search',
      title: t('spotlight.buyerTxn.step2Title'),
      description: t('spotlight.buyerTxn.step2Desc'),
      icon: Search,
      targetRef: searchBarRef,
      shape: 'rectangle',
      borderRadius: AnimoV2Radius.md,
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
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {loading ? (
        <View style={[styles.centerFill, { paddingTop: headerHeight + SCREEN_PADDING }]}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      ) : error ? (
        <View style={[styles.centerFill, { paddingTop: headerHeight + SCREEN_PADDING }]}>
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
            {error}
          </AnimoText>
        </View>
      ) : (
        <Animated.FlatList
          style={styles.flex}
          data={paginatedData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BuyerTransactionCard item={item} />}
          onScroll={header.onScroll}
          scrollEventThrottle={16}
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.list, { paddingTop: headerHeight + AnimoV2Spacing.xs }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[AnimoV2Colors.actionPrimary]}
              progressViewOffset={headerHeight}
            />
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
              <EmptyState
                icon={<Search size={48} color={AnimoV2Colors.borderStrong} strokeWidth={2.25} />}
                title={t('buyTxV2.noResults', { q: searchQuery })}
                body={t('buyTxV2.noResultsHint')}
                actionLabel={t('buyTxV2.clearBtn')}
                onAction={() => handleSearchChange('')}
                secondary
              />
            ) : activeFilterCount > 0 ? (
              <EmptyState
                icon={<Filter size={48} color={AnimoV2Colors.borderStrong} strokeWidth={2.25} />}
                title={t('buyTxV2.noTabItems')}
                actionLabel={t('buyTxV2.showAll')}
                onAction={resetFilters}
                secondary
              />
            ) : (
              <EmptyState
                icon={<Mascot size={112} />}
                title={t('buyTxV2.emptyTitle')}
                body={t('buyTxV2.emptyBody')}
                actionLabel={t('buyTxV2.emptyCta')}
                onAction={() => router.push('/(buyer)/palengke')}
              />
            )
          }
        />
      )}

      {/* Collapsing top block: overlays the list, slides away on scroll down and returns on scroll up. */}
      <CollapsingHeader header={header}>
        <View
          onLayout={header.onTitleLayout}
          style={[styles.titleRow, { paddingTop: insets.top + AnimoV2Spacing.md }]}>
          <View style={styles.flex}>
            <AnimoText variant="title" accessibilityRole="header" style={styles.headerTitle}>
              {t('buyTxV2.title')}
            </AnimoText>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('buyTxV2.subtitle')}
            </AnimoText>
          </View>
          <View ref={bellRef} collapsable={false}>
            <IconButton
              icon={<Bell size={26} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />}
              label={unread > 0 ? t('buyTxV2.bellUnread', { count: unread }) : t('buyTxV2.bell')}
              onPress={() => router.push('/(buyer)/notipikasyon')}
              backgroundColor={AnimoV2Colors.surfaceCard}
            />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </View>
        </View>

        <View ref={searchBarRef} collapsable={false} style={styles.block}>
          <V2SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder={t('buyTxV2.searchPh')}
            clearLabel={t('buyTxV2.clearSearch')}
          />
        </View>

        <View ref={tabsRef} collapsable={false} style={styles.block}>
          <SegmentedTabs<FilterValue>
            tabs={[
              { key: 'Lahat', label: t('buyTxV2.tabAll') },
              { key: 'Kasalukuyan', label: t('buyTxV2.tabActive') },
              { key: 'Tapos na', label: t('buyTxV2.tabHistory') },
            ]}
            value={appliedFilter}
            onChange={handleTabChange}
          />
        </View>
      </CollapsingHeader>

      <SpotlightTour
        visible={showTutorial}
        steps={buyerTxnTourSteps}
        storageKey={BUYER_TXN_TUTORIAL_KEY}
        onClose={() => {
          setShowTutorial(false);
          AsyncStorage.setItem(BUYER_TXN_TUTORIAL_KEY, 'true').catch(() => {});
        }}
      />
    </View>
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
  const { t } = useLanguage();
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const atStart = currentPage <= 1;
  const atEnd = currentPage >= totalPages;
  const navColor = (disabled: boolean) => (disabled ? AnimoV2Colors.textDisabled : AnimoV2Colors.textPrimary);

  return (
    <View style={styles.paginationWrap}>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
        {t('buyTxV2.pageSummary', { from: startItem, to: endItem, total: totalItems })}
      </AnimoText>

      <View style={styles.paginationRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('buyTxV2.prevLabel')}
          accessibilityState={{ disabled: atStart }}
          disabled={atStart}
          onPress={() => onPageChange(currentPage - 1)}
          style={[styles.pageNav, atStart && styles.pageNavDisabled]}>
          <ChevronLeft size={24} color={navColor(atStart)} strokeWidth={2.75} />
        </Pressable>

        <View style={styles.pageNumbers}>
          {visiblePages(currentPage, totalPages).map((pageNum) => {
            const isActive = pageNum === currentPage;
            return (
              <Pressable
                key={pageNum}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t('buyTxV2.pageN', { n: pageNum })}
                onPress={() => onPageChange(pageNum)}
                style={[styles.pageNumber, isActive && styles.pageNumberActive]}>
                <AnimoText
                  variant="bodyStrong"
                  color={isActive ? AnimoV2Colors.textOnBrand : AnimoV2Colors.textPrimary}>
                  {pageNum}
                </AnimoText>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('buyTxV2.nextLabel')}
          accessibilityState={{ disabled: atEnd }}
          disabled={atEnd}
          onPress={() => onPageChange(currentPage + 1)}
          style={[styles.pageNav, atEnd && styles.pageNavDisabled]}>
          <ChevronRight size={24} color={navColor(atEnd)} strokeWidth={2.75} />
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  secondary = false,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  actionLabel: string;
  onAction: () => void;
  secondary?: boolean;
}) {
  return (
    <View style={styles.empty}>
      {icon}
      <AnimoText variant="heading" style={styles.centerText}>
        {title}
      </AnimoText>
      {body ? (
        <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
          {body}
        </AnimoText>
      ) : null}
      <ChunkyButton
        label={actionLabel}
        variant={secondary ? 'secondary' : 'primary'}
        onPress={onAction}
        style={styles.emptyBtn}
      />
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
  headerTitle: { fontSize: 24, lineHeight: 30 },
  block: { paddingHorizontal: SCREEN_PADDING, paddingBottom: AnimoV2Spacing.md },
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
  list: { paddingHorizontal: SCREEN_PADDING, paddingTop: AnimoV2Spacing.xs, paddingBottom: AnimoV2Spacing.xxl },
  empty: {
    alignItems: 'center',
    gap: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xl,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
  emptyBtn: { alignSelf: 'stretch' },
  paginationWrap: { marginTop: AnimoV2Spacing.md, alignItems: 'center', gap: AnimoV2Spacing.md },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoV2Spacing.sm,
    width: '100%',
  },
  pageNav: {
    width: AnimoV2Size.iconButton,
    height: AnimoV2Size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AnimoV2Radius.full,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderStrong,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  pageNavDisabled: { borderColor: AnimoV2Colors.borderDefault, backgroundColor: AnimoV2Colors.surfaceMuted },
  pageNumbers: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  pageNumber: {
    width: AnimoV2Size.iconButton,
    height: AnimoV2Size.iconButton,
    borderRadius: AnimoV2Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderDefault,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  pageNumberActive: {
    backgroundColor: AnimoV2Colors.actionPrimary,
    borderColor: AnimoV2Colors.actionPrimary,
  },
});

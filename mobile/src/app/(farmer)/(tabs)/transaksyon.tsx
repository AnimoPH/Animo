import { router, useFocusEffect, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, ClipboardList, Filter, Search, X } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { ListingTransactionSummaryCard } from '@/components/animo/farmer/listing-transaction-summary-card';
import {
  SpotlightTour,
  type SpotlightStep,
} from '@/components/animo/spotlight-tour';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';
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
  listingTitle,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
} from '@/types/crop-listing';
import type { TransactionWithPayment } from '@/types/transaction';

const SCREEN_PADDING = AnimoSpacing.lg;

type FilterValue = 'Lahat' | 'Kasalukuyan' | 'Tapos na';

const FILTERS: FilterValue[] = ['Lahat', 'Kasalukuyan', 'Tapos na'];

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
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterValue>('Lahat');
  const [showTutorial, setShowTutorial] = useState(true);

  const [listings, setListings] = useState<CropListing[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithPayment[]>([]);
  const [pendingCounts, setPendingCounts] = useState<Map<string, number>>(new Map());
  const [prLatestUpdatedAt, setPrLatestUpdatedAt] = useState<Map<string, string>>(new Map());
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
      setError(e instanceof Error ? e.message : 'Hindi ma-load ang mga transaksyon.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

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
        const specific = specificVarietyDisplay(listing);
        const variety = varietyLabel(listing);
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
  }, [listings, transactions, pendingCounts, prLatestUpdatedAt]);

  const filteredData = useMemo(() => {
    return rollups.filter((item) => {
      const matchesFilter = (() => {
        if (activeFilter === 'Lahat') return true;
        if (activeFilter === 'Kasalukuyan') return item.listing.status === 'Available';
        if (activeFilter === 'Tapos na') return item.listing.status === 'Sold_Out';
        return true;
      })();

      const query = searchQuery.toLowerCase().trim();
      const title = listingTitle(item.listing).toLowerCase();
      const matchesSearch =
        query === '' ||
        title.includes(query) ||
        item.varietyLine.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [rollups, activeFilter, searchQuery]);

  const handleFilterSelect = (filter: FilterValue) => {
    setActiveFilter(filter);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
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
          placeholder="Maghanap ng listing..."
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
                      <AnimoText
                        variant="bodyEmphasis"
                        color={active ? AnimoColors.white : AnimoColors.textMediumEmphasis}>
                        {filter}
                      </AnimoText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
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
        Wala pang listing
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
});

import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, ChevronRight, ClipboardList, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import {
  BuyerTransactionCard,
  type BuyerTransactionCardItem,
  type BuyerTransactionStatus,
} from '@/components/animo/buyer/buyer-transaction-card';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';
import {
  PURCHASE_REQUESTS,
  TRANSACTIONS,
  formatPeso,
  requestTotal,
  type PurchaseRequest,
  type RequestStage,
  type Transaction,
} from '@/constants/marketplace';

const SCREEN_PADDING = AnimoSpacing.lg;
const PAGE_SIZE = 5;

type FilterValue = 'Lahat' | 'Kailangan ng Aksyon' | 'Naghihintay' | 'Kumpleto' | 'Nabigo';

const FILTERS: FilterValue[] = [
  'Lahat',
  'Kailangan ng Aksyon',
  'Naghihintay',
  'Kumpleto',
  'Nabigo',
];

const ACTION_STATUSES: BuyerTransactionStatus[] = [
  'Mag-iskedyul ng Pickup',
  'Naghihintay ng Bayad',
];

const WAITING_STATUSES: BuyerTransactionStatus[] = [
  'Bagong Kahilingan',
  'Naghihintay ng Inspeksyon',
];

const FAILED_STATUSES: BuyerTransactionStatus[] = ['Nakansela', 'Hindi Natuloy'];

function stageToStatus(stage: RequestStage): BuyerTransactionStatus {
  switch (stage) {
    case 'pending':
      return 'Bagong Kahilingan';
    case 'accepted':
      return 'Mag-iskedyul ng Pickup';
    case 'scheduled':
      return 'Naghihintay ng Inspeksyon';
    case 'inspected':
      return 'Naghihintay ng Bayad';
    case 'completed':
    case 'reviewed':
      return 'Transaction Done';
    case 'cancelled':
      return 'Nakansela';
    default:
      return 'Bagong Kahilingan';
  }
}

function parsePurchaseRequestToCard(pr: PurchaseRequest): BuyerTransactionCardItem {
  const parts = pr.sentAt.split('·').map((p) => p.trim());
  const date = parts[0] || pr.sentAt;
  const time = parts[1] || '';
  const total = requestTotal(pr);
  const paymentMethod = pr.payments[0]?.method === 'cash' ? 'Cash' : 'GCash';

  return {
    id: pr.id,
    txnId: pr.reference,
    variety: pr.variety,
    moisture: 'Tuyo',
    status: stageToStatus(pr.stage),
    stage: pr.stage,
    price: formatPeso(total),
    weight: `${pr.quantityKg} kg`,
    pricePerKg: `₱${pr.pricePerKg.toFixed(2)}/kg`,
    paymentMode: paymentMethod,
    farmer: pr.farmer.name,
    location: pr.farmer.addressLine,
    date,
    time,
  };
}

function parseTransactionHistoryToCard(tx: Transaction): BuyerTransactionCardItem {
  const pricePerKg = tx.quantityKg > 0 ? (tx.total / tx.quantityKg).toFixed(2) : '16.00';
  const stage: RequestStage = tx.status === 'tapos' ? 'completed' : tx.status === 'cancelled' ? 'cancelled' : 'scheduled';
  const status: BuyerTransactionStatus =
    tx.status === 'tapos'
      ? 'Transaction Done'
      : tx.status === 'cancelled'
        ? 'Nakansela'
        : 'Naghihintay ng Inspeksyon';

  return {
    id: tx.id,
    txnId: tx.reference || tx.id,
    variety: tx.variety,
    moisture: 'Tuyo',
    status,
    stage,
    price: formatPeso(tx.total),
    weight: `${tx.quantityKg} kg`,
    pricePerKg: `₱${pricePerKg}/kg`,
    paymentMode: 'GCash',
    farmer: tx.farmerName || 'Magsasaka',
    location: `${tx.municipality}, ${tx.province}`,
    date: tx.date,
  };
}

/** Buyer Transaksyon — filterable and paginated list of purchases matching farmer transaksyon layout. */
export default function BuyerTransactionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterValue>('Lahat');
  const [currentPage, setCurrentPage] = useState(1);

  // Aggregate all mock purchase requests and past history into uniform cards
  const allTransactions: BuyerTransactionCardItem[] = useMemo(() => {
    const fromRequests = PURCHASE_REQUESTS.map(parsePurchaseRequestToCard);
    const fromHistory = TRANSACTIONS.map(parseTransactionHistoryToCard);

    // Dedup by txnId / id
    const seen = new Set<string>();
    const combined: BuyerTransactionCardItem[] = [];

    for (const item of [...fromRequests, ...fromHistory]) {
      if (!seen.has(item.txnId)) {
        seen.add(item.txnId);
        combined.push(item);
      }
    }
    return combined;
  }, []);

  const filteredData = useMemo(() => {
    return allTransactions.filter((item) => {
      const matchesFilter = (() => {
        if (activeFilter === 'Lahat') return true;
        if (activeFilter === 'Kailangan ng Aksyon') return ACTION_STATUSES.includes(item.status);
        if (activeFilter === 'Naghihintay') return WAITING_STATUSES.includes(item.status);
        if (activeFilter === 'Kumpleto') return item.status === 'Transaction Done';
        if (activeFilter === 'Nabigo') return FAILED_STATUSES.includes(item.status);
        return true;
      })();

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        item.txnId.toLowerCase().includes(query) ||
        item.variety.toLowerCase().includes(query) ||
        item.farmer.toLowerCase().includes(query) ||
        (item.location && item.location.toLowerCase().includes(query)) ||
        item.status.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [allTransactions, activeFilter, searchQuery]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader onPressBell={() => router.push('/(buyer)/notipikasyon')} />

      <View style={styles.searchBar}>
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

      <FlatList
        style={styles.scroll}
        data={paginatedData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BuyerTransactionCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
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
        }
        ListFooterComponent={
          filteredData.length > 0 ? (
            <PaginationControls
              currentPage={validPage}
              totalPages={totalPages}
              totalItems={filteredData.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          ) : null
        }
        ListEmptyComponent={
          searchQuery.trim() !== '' ? (
            <SearchEmptyState query={searchQuery} onClear={() => handleSearchChange('')} />
          ) : (
            <EmptyState />
          )
        }
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
        Walang resulta para sa "{query}"
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
        Subukan ang ibang keyword o i-clear ang search.
      </AnimoText>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={onClear}
        style={styles.searchEmptyCta}>
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
        Mag-browse ng mga magsasaka at palay sa palengke upang makapag-order.
      </AnimoText>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={() => router.push('/(buyer)/palengke')}
        style={styles.emptyCta}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
          Pumunta sa Palengke
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

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
  TransactionCard,
  type FarmerTransactionCardItem,
} from '@/components/animo/farmer/transaction-card';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';

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

const ACTION_STATUSES = [
  'Bagong Kahilingan',
  'I-approve ang Schedule',
  'Naghihintay ng Bayad',
  'Naghihintay ng Kumpirmasyon',
];

const FAILED_STATUSES = ['Nakansela', 'Hindi Natuloy'];

const TRANSACTIONS: FarmerTransactionCardItem[] = [
  {
    id: 'ft-pending',
    txnId: 'TXN-2026-0071',
    variety: 'Rc218',
    moisture: 'Tuyo',
    status: 'Bagong Kahilingan',
    price: '₱6,300.00',
    weight: '300 kg',
    pricePerKg: '₱21.00/kg',
    paymentMode: 'GCash',
    buyer: 'Mateo Santos',
    date: 'Jul 30, 2026',
    time: '9:15 AM',
  },
  {
    id: 'ft-schedule',
    txnId: 'TXN-2026-0077',
    variety: 'Rc222',
    moisture: 'Basa',
    status: 'I-approve ang Schedule',
    price: '₱4,500.00',
    weight: '300 kg',
    pricePerKg: '₱15.00/kg',
    paymentMode: 'GCash',
    buyer: 'Tres Rice Mill Corp',
    date: 'Jul 29, 2026',
    time: '2:40 PM',
  },
  {
    id: 'ft-pickup',
    txnId: 'TXN-2026-0073',
    variety: 'Rc 638 SR',
    moisture: 'Basa',
    status: 'Naghihintay ng Inspeksyon',
    price: '₱3,875.00',
    weight: '250 kg',
    pricePerKg: '₱15.50/kg',
    paymentMode: 'Cash',
    buyer: 'Tres Rice Mill Corp',
    date: 'Jul 28, 2026',
    time: '2:40 PM',
  },
  {
    id: 'ft-payment',
    txnId: 'TXN-2026-0072',
    variety: 'Rc218',
    moisture: 'Tuyo',
    status: 'Naghihintay ng Bayad',
    price: '₱3,000.00',
    weight: '200 kg',
    pricePerKg: '₱15.00/kg',
    paymentMode: 'GCash',
    buyer: 'Aling Coring Rice Mill',
    date: 'Jul 30, 2026',
    time: '9:15 AM',
  },
  {
    id: 'ft-pending-riri',
    txnId: 'TXN-2026-0075',
    variety: 'Rc218',
    moisture: 'Tuyo',
    status: 'Naghihintay ng Kumpirmasyon',
    price: '₱3,000.00',
    weight: '300 kg',
    pricePerKg: '₱10.00/kg',
    paymentMode: 'GCash',
    buyer: 'Riri Circulado Rice Corp',
    date: 'Jul 30, 2026',
    time: '9:15 AM',
  },
  {
    id: 'ft-completed',
    txnId: 'TXN-2026-0074',
    variety: 'Rc218',
    moisture: 'Tuyo',
    status: 'Transaction Done',
    price: '₱3,000.00',
    weight: '300 kg',
    pricePerKg: '₱10.00/kg',
    paymentMode: 'GCash',
    buyer: 'Mateo Santos',
    date: 'Jul 30, 2026',
    time: '9:15 AM',
  },
  {
    id: 'ft-cancelled',
    txnId: 'TXN-2026-0061',
    variety: 'Dinorado',
    moisture: 'Basa',
    status: 'Nakansela',
    price: '₱2,400.00',
    weight: '150 kg',
    pricePerKg: '₱16.00/kg',
    paymentMode: 'Cash',
    buyer: 'Aling Nena Rice Mill',
    date: 'Jul 18, 2026',
    time: '3:10 PM',
  },
  {
    id: 'ft-failed',
    txnId: 'TXN-2026-0055',
    variety: 'Rc222',
    moisture: 'Tuyo',
    status: 'Hindi Natuloy',
    price: '₱3,750.00',
    weight: '250 kg',
    pricePerKg: '₱15.00/kg',
    paymentMode: 'GCash',
    buyer: 'Bulacan Rice Traders',
    date: 'Jul 12, 2026',
    time: '1:45 PM',
  },
];

/** Farmer Transaksyon — filterable and paginated list of purchase requests and completed sales. */
export default function FarmerTransactionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterValue>('Lahat');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    return TRANSACTIONS.filter((item) => {
      const matchesFilter = (() => {
        if (activeFilter === 'Lahat') return true;
        if (activeFilter === 'Kailangan ng Aksyon') return ACTION_STATUSES.includes(item.status);
        if (activeFilter === 'Naghihintay') return item.status === 'Naghihintay ng Inspeksyon';
        if (activeFilter === 'Kumpleto') return item.status === 'Transaction Done';
        if (activeFilter === 'Nabigo') return FAILED_STATUSES.includes(item.status);
        return true;
      })();

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        item.txnId.toLowerCase().includes(query) ||
        item.variety.toLowerCase().includes(query) ||
        item.buyer.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

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
      <AppHeader onPressBell={() => router.push('/(farmer)/notipikasyon')} />

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
        renderItem={({ item }) => <TransactionCard item={item} />}
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

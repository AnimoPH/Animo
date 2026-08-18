import { router, useFocusEffect, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { FilterChips } from '@/components/animo/filter-chips';
import { StatusBadge, type BadgeTone } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  FARMER_TRANSACTIONS,
  ONGOING_FARMER_STAGES,
  farmerListingLine,
  farmerStageBadge,
  formatPeso,
  paymentMethodLabel,
  type FarmerTransaction,
} from '@/constants/marketplace';

type Filter = 'lahat' | 'aktibo' | 'tapos' | 'cancelled';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'lahat', label: 'Lahat' },
  { value: 'aktibo', label: 'Aktibo' },
  { value: 'tapos', label: 'Tapos' },
  { value: 'cancelled', label: 'Nakansela' },
];

type FarmerHistoryItem = {
  id: string;
  reference: string;
  variety: string;
  buyerName: string;
  quantityKg: number;
  total: number;
  date: string;
  status: 'tapos' | 'cancelled';
};

const FARMER_HISTORY: FarmerHistoryItem[] = [
  {
    id: 'fh-1',
    reference: 'TXN-2026-0045',
    variety: 'Palay RC 160 (Tuyo)',
    buyerName: 'Tres Rice Mill Corp',
    quantityKg: 500,
    total: 8000,
    date: 'Hulyo 20, 2026',
    status: 'tapos',
  },
  {
    id: 'fh-2',
    reference: 'TXN-2026-0038',
    variety: 'Palay NSIC Rc222 (Basa)',
    buyerName: 'Aling Coring Rice Mill',
    quantityKg: 350,
    total: 5320,
    date: 'Hulyo 12, 2026',
    status: 'tapos',
  },
  {
    id: 'fh-3',
    reference: 'TXN-2026-0029',
    variety: 'Palay Dinorado',
    buyerName: 'Bulacan Rice Traders',
    quantityKg: 200,
    total: 5000,
    date: 'Hunyo 28, 2026',
    status: 'cancelled',
  },
];

const HISTORY_STATUS_META: Record<'tapos' | 'cancelled', { label: string; tone: BadgeTone }> = {
  tapos: { label: 'Kumpleto', tone: 'success' },
  cancelled: { label: 'Nakansela', tone: 'neutral' },
};

/**
 * Farmer Transactions Screen (Mga Transaksyon).
 *
 * Formatted identically to the Buyer Module transaction screen, separated
 * properly into:
 * 1. Kasalukuyang Request (Active ongoing requests in flight)
 * 2. Mga Natapos (Settled completed/cancelled transactions)
 * 3. Kasaysayan (Historical past sales)
 */
export default function FarmerTransactionsScreen() {
  const [filter, setFilter] = useState<Filter>('lahat');
  const [items, setItems] = useState<FarmerTransaction[]>(FARMER_TRANSACTIONS);

  useFocusEffect(
    useCallback(() => {
      setItems([...FARMER_TRANSACTIONS]);
    }, []),
  );

  // Active / Ongoing requests
  const ongoingRequests = useMemo(() => {
    if (filter === 'tapos' || filter === 'cancelled') return [];
    return items.filter((tx) => ONGOING_FARMER_STAGES.includes(tx.stage));
  }, [filter, items]);

  // Settled requests from the current active roster
  const settledRequests = useMemo(() => {
    if (filter === 'aktibo') return [];
    return items.filter((tx) => {
      if (filter === 'tapos') return tx.stage === 'completed';
      if (filter === 'cancelled') return tx.stage === 'cancelled' || tx.stage === 'failed';
      return tx.stage === 'completed' || tx.stage === 'cancelled' || tx.stage === 'failed';
    });
  }, [filter, items]);

  // Historical past records
  const historyRecords = useMemo(() => {
    if (filter === 'aktibo') return [];
    if (filter === 'tapos') return FARMER_HISTORY.filter((h) => h.status === 'tapos');
    if (filter === 'cancelled') return FARMER_HISTORY.filter((h) => h.status === 'cancelled');
    return FARMER_HISTORY;
  }, [filter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader
        title="Mga Transaksyon"
        onPressBell={() => router.push('/(farmer)/notipikasyon')}
      />

      <View style={styles.filters}>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: Kasalukuyang Request */}
        {ongoingRequests.length > 0 ? (
          <>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
              Kasalukuyang Request
            </AnimoText>
            {ongoingRequests.map((tx) => (
              <FarmerRequestRow
                key={tx.id}
                transaction={tx}
                onPress={() => router.push(`/(farmer)/transaksyon/${tx.id}` as Href)}
              />
            ))}
          </>
        ) : null}

        {/* SECTION 2: Mga Natapos */}
        {settledRequests.length > 0 ? (
          <>
            <AnimoText
              variant="h3"
              color={AnimoColors.textHighEmphasis}
              style={ongoingRequests.length > 0 ? styles.sectionGap : undefined}>
              Mga Natapos
            </AnimoText>
            {settledRequests.map((tx) => (
              <FarmerRequestRow
                key={tx.id}
                transaction={tx}
                onPress={() => router.push(`/(farmer)/transaksyon/${tx.id}` as Href)}
              />
            ))}
          </>
        ) : null}

        {/* SECTION 3: Kasaysayan */}
        {historyRecords.length > 0 ? (
          <>
            <AnimoText
              variant="h3"
              color={AnimoColors.textHighEmphasis}
              style={
                ongoingRequests.length > 0 || settledRequests.length > 0
                  ? styles.sectionGap
                  : undefined
              }>
              Kasaysayan
            </AnimoText>
            {historyRecords.map((history) => (
              <FarmerHistoryRow key={history.id} item={history} />
            ))}
          </>
        ) : null}

        {ongoingRequests.length === 0 &&
        settledRequests.length === 0 &&
        historyRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
              Walang transaksyon sa filter na ito.
            </AnimoText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Uniform transaction row for active & settled farmer requests */
function FarmerRequestRow({
  transaction,
  onPress,
}: {
  transaction: FarmerTransaction;
  onPress: () => void;
}) {
  const badge = farmerStageBadge(transaction.stage);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {transaction.variety} ({transaction.moisture})
          </AnimoText>
          <StatusBadge label={badge.label} tone={badge.tone} />
        </View>

        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          {transaction.reference} · {transaction.quantityKg} kg · {formatPeso(transaction.total)} · {paymentMethodLabel(transaction.paymentMethod)}
        </AnimoText>

        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
          Mamimili: {transaction.buyer.name} · {transaction.sentAt}
        </AnimoText>
      </View>
      <ChevronRight size={20} color={AnimoColors.objectLowEmphasis} />
    </Pressable>
  );
}

/** Uniform transaction row for historical sales */
function FarmerHistoryRow({ item }: { item: FarmerHistoryItem }) {
  const meta = HISTORY_STATUS_META[item.status];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/(farmer)/resibo' as Href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {item.variety}
          </AnimoText>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </View>

        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          {item.reference} · {item.quantityKg} kg · {formatPeso(item.total)}
        </AnimoText>

        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
          Mamimili: {item.buyerName} ({item.date})
        </AnimoText>
      </View>
      <ChevronRight size={20} color={AnimoColors.objectLowEmphasis} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  filters: {
    paddingVertical: AnimoSpacing.md,
  },
  list: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.md,
  },
  sectionGap: {
    marginTop: AnimoSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    shadowColor: AnimoColors.darkBackground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  emptyState: {
    paddingVertical: AnimoSpacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
});

import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { FilterChips } from '@/components/animo/filter-chips';
import { StatusBadge, type BadgeTone } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  PURCHASE_REQUESTS,
  TRANSACTIONS,
  formatPeso,
  requestTotal,
  type PurchaseRequest,
  type RequestStage,
  type Transaction,
  type TransactionStatus,
} from '@/constants/marketplace';

type Filter = 'lahat' | TransactionStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'lahat', label: 'Lahat' },
  { value: 'aktibo', label: 'Aktibo' },
  { value: 'tapos', label: 'Tapos' },
  { value: 'cancelled', label: 'Nakansela' },
];

/** Stage → Tagalog badge label & tone */
const STAGE_META: Record<RequestStage, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Naghihintay', tone: 'warning' },
  accepted: { label: 'Tinanggap', tone: 'info' },
  scheduled: { label: 'Nakaiskedyul', tone: 'info' },
  inspected: { label: 'Tapos ang Inspeksyon', tone: 'warning' },
  completed: { label: 'Kumpleto', tone: 'success' },
  reviewed: { label: 'Nasuri Na', tone: 'success' },
  cancelled: { label: 'Nakansela', tone: 'neutral' },
};

const TRANSACTION_STATUS_META: Record<TransactionStatus, { label: string; tone: BadgeTone }> = {
  aktibo: { label: 'Aktibo', tone: 'info' },
  tapos: { label: 'Kumpleto', tone: 'success' },
  cancelled: { label: 'Nakansela', tone: 'neutral' },
};

/** Requests still in flight, shown above the settled history. */
const ONGOING_STAGES: RequestStage[] = [
  'pending',
  'accepted',
  'scheduled',
  'inspected',
];

/** Mga Transaksyon — ongoing purchase requests plus past transactions in uniform card style. */
export default function TransactionsScreen() {
  const [filter, setFilter] = useState<Filter>('lahat');

  const items = useMemo(
    () => (filter === 'lahat' ? TRANSACTIONS : TRANSACTIONS.filter((t) => t.status === filter)),
    [filter],
  );

  // Ongoing requests are only meaningful under "Lahat" and "Aktibo".
  const showRequests = filter === 'lahat' || filter === 'aktibo';
  const requests = useMemo(
    () =>
      showRequests
        ? PURCHASE_REQUESTS.filter((r) => ONGOING_STAGES.includes(r.stage))
        : [],
    [showRequests],
  );

  const settled = useMemo(
    () =>
      filter === 'lahat' || filter === 'tapos' || filter === 'cancelled'
        ? PURCHASE_REQUESTS.filter((r) => {
            if (filter === 'tapos') return r.stage === 'completed' || r.stage === 'reviewed';
            if (filter === 'cancelled') return r.stage === 'cancelled';
            return r.stage === 'completed' || r.stage === 'reviewed' || r.stage === 'cancelled';
          })
        : [],
    [filter],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader title="Mga Transaksyon" />

      <View style={styles.filters}>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {requests.length > 0 ? (
          <>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Kasalukuyang Request
            </AnimoText>
            {requests.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </>
        ) : null}

        {settled.length > 0 ? (
          <>
            <AnimoText variant="h3" color={AnimoColors.black} style={styles.sectionGap}>
              Mga Natapos
            </AnimoText>
            {settled.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </>
        ) : null}

        {items.length > 0 ? (
          <>
            <AnimoText variant="h3" color={AnimoColors.black} style={styles.sectionGap}>
              Kasaysayan
            </AnimoText>
            {items.map((t) => (
              <HistoryRow key={t.id} transaction={t} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Purchase-request row that opens the status / pickup screen. */
function RequestRow({ request }: { request: PurchaseRequest }) {
  const meta = STAGE_META[request.stage];

  const handlePress = () => {
    if (request.stage === 'accepted' || request.stage === 'scheduled') {
      router.push(`/(buyer)/transaksyon/${request.id}/pickup`);
    } else if (request.stage === 'inspected') {
      router.push(`/(buyer)/transaksyon/${request.id}/bayad`);
    } else if (request.stage === 'completed' || request.stage === 'reviewed') {
      router.push(`/(buyer)/transaksyon/${request.id}/resibo`);
    } else {
      router.push(`/(buyer)/transaksyon/${request.id}`);
    }
  };

  return (
    <Pressable style={styles.row} onPress={handlePress}>
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            {request.variety}
          </AnimoText>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </View>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {request.reference} · {request.quantityKg} kg ·{' '}
          {formatPeso(requestTotal(request))}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {request.farmer.name} · {request.farmer.addressDetail}
        </AnimoText>
      </View>
      <ChevronRight size={20} color={AnimoColors.muted} />
    </Pressable>
  );
}

/** Past history card in identical uniform layout. */
function HistoryRow({ transaction }: { transaction: Transaction }) {
  const meta = TRANSACTION_STATUS_META[transaction.status];

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push('/(buyer)/transaksyon/pr-completed/resibo')}>
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            {transaction.variety}
          </AnimoText>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </View>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {transaction.reference || transaction.id} · {transaction.quantityKg} kg ·{' '}
          {formatPeso(transaction.total)}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {transaction.farmerName || 'Magsasaka'} · {transaction.municipality},{' '}
          {transaction.province} ({transaction.date})
        </AnimoText>
      </View>
      <ChevronRight size={20} color={AnimoColors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
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
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.white,
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
});

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
import { TransactionCard } from '@/components/animo/transaction-card';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  PURCHASE_REQUESTS,
  TRANSACTIONS,
  formatPeso,
  requestTotal,
  type PurchaseRequest,
  type RequestStage,
  type TransactionStatus,
} from '@/constants/marketplace';

type Filter = 'lahat' | TransactionStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'lahat', label: 'Lahat' },
  { value: 'aktibo', label: 'Aktibo' },
  { value: 'tapos', label: 'Tapos' },
  { value: 'disputed', label: 'Disputed' },
];

/** Stage → pill shown on the ongoing-request rows. */
const STAGE_META: Record<RequestStage, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  accepted: { label: 'Awaiting Down Payment', tone: 'warning' },
  downpaid: { label: 'Downpaid', tone: 'info' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  inspected: { label: 'Awaiting Final Payment', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

/** Requests still in flight, shown above the settled history. */
const ONGOING_STAGES: RequestStage[] = [
  'pending',
  'accepted',
  'downpaid',
  'scheduled',
  'inspected',
];

/** Mga Transaksyon — ongoing purchase requests plus past transactions. */
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
      filter === 'lahat' || filter === 'tapos'
        ? PURCHASE_REQUESTS.filter(
            (r) => r.stage === 'completed' || r.stage === 'cancelled',
          )
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

        <AnimoText variant="h3" color={AnimoColors.black} style={styles.sectionGap}>
          Kasaysayan
        </AnimoText>
        {items.map((t) => (
          <TransactionCard key={t.id} transaction={t} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/** A tappable purchase-request row that opens the status screen. */
function RequestRow({ request }: { request: PurchaseRequest }) {
  const meta = STAGE_META[request.stage];

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/(buyer)/transaksyon/${request.id}`)}>
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

import { router, useFocusEffect, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/animo/app-header';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { FilterChips } from '@/components/animo/filter-chips';
import { TransactionCard } from '@/components/animo/farmer/transaction-card';
import { AnimoColors, AnimoLayout, AnimoSpacing } from '@/constants/animo';
import {
  FARMER_TRANSACTIONS,
  ONGOING_FARMER_STAGES,
  updateFarmerTransactionStage,
  type FarmerTransaction,
  type FarmerTransactionStage,
} from '@/constants/marketplace';

type Filter = 'lahat' | 'kasalukuyan' | 'tapos';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'lahat', label: 'Lahat' },
  { value: 'kasalukuyan', label: 'Kasalukuyan' },
  { value: 'tapos', label: 'Tapos na' },
];

function matchesFilter(tx: FarmerTransaction, filter: Filter): boolean {
  if (filter === 'lahat') return true;
  if (filter === 'kasalukuyan') return ONGOING_FARMER_STAGES.includes(tx.stage);
  return tx.stage === 'completed';
}

/** Mga Transaksyon — farmer's incoming purchase requests and sales. */
export default function FarmerTransactionsScreen() {
  const [filter, setFilter] = useState<Filter>('lahat');
  const [items, setItems] = useState(FARMER_TRANSACTIONS);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [acceptedVisible, setAcceptedVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setItems([...FARMER_TRANSACTIONS]);
    }, []),
  );

  const visible = useMemo(
    () => items.filter((tx) => matchesFilter(tx, filter)),
    [filter, items],
  );

  const setStage = (id: string, stage: FarmerTransactionStage) => {
    updateFarmerTransactionStage(id, stage);
    setItems([...FARMER_TRANSACTIONS]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader inset={false} />

      <View style={styles.filters}>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} inset={false} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {visible.map((tx) => (
          <TransactionCard
            key={tx.id}
            transaction={tx}
            onPress={() =>
              router.push(`/(farmer)/transaksyon/${tx.id}` as Href)
            }
            onAccept={() => {
              setStage(tx.id, 'awaiting_payment');
              setAcceptedVisible(true);
            }}
            onDecline={() => setDeclineId(tx.id)}
          />
        ))}
      </ScrollView>

      <CancelRequestModal
        visible={declineId !== null}
        title="Tanggihan ang kahilingan?"
        body="Hindi pa nagsisimula ang transaksyon. Walang bayad na kailangang isauli."
        consequences={[
          'Aabisuhan ang mamimili sa iyong sagot.',
          'Maaaring magpadala muli ng kahilingan ang mamimili.',
        ]}
        confirmLabel="Tanggihan"
        onDismiss={() => setDeclineId(null)}
        onConfirm={() => {
          if (declineId) setStage(declineId, 'cancelled');
          setDeclineId(null);
        }}
      />

      <FeedbackModal
        visible={acceptedVisible}
        tone="success"
        title="Tinanggap ang kahilingan"
        message="Makikita na ang numero ng mamimili. Hintayin at kumpirmahin ang bayad kapag natanggap mo na ito."
        confirmLabel="Sige"
        onConfirm={() => setAcceptedVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
    paddingHorizontal: AnimoLayout.screenGutter,
  },
  filters: {
    paddingBottom: AnimoSpacing.md,
  },
  list: {
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoLayout.cardGap,
  },
});

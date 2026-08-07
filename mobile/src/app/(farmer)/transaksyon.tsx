import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/animo/app-header';
import { FilterChips } from '@/components/animo/filter-chips';
import { TransactionCard } from '@/components/animo/transaction-card';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { TRANSACTIONS, type TransactionStatus } from '@/constants/marketplace';

type Filter = 'lahat' | TransactionStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'lahat', label: 'Lahat' },
  { value: 'aktibo', label: 'Aktibo' },
  { value: 'tapos', label: 'Tapos' },
  { value: 'disputed', label: 'Disputed' },
];

/** Mga Transaksyon — farmer's sales history (shares the marketplace model). */
export default function FarmerTransactionsScreen() {
  const [filter, setFilter] = useState<Filter>('lahat');

  const items = useMemo(
    () => (filter === 'lahat' ? TRANSACTIONS : TRANSACTIONS.filter((t) => t.status === filter)),
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
        {items.map((t) => (
          <TransactionCard key={t.id} transaction={t} />
        ))}
      </ScrollView>
    </SafeAreaView>
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
});

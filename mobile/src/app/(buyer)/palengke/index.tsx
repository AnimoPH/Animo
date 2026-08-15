import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/animo/app-header';
import { FilterChips } from '@/components/animo/filter-chips';
import { ListingCard } from '@/components/animo/listing-card';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { LISTINGS, type MunicipalityName } from '@/constants/marketplace';

type Filter = 'lahat' | MunicipalityName;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'lahat', label: 'Lahat' },
  { value: 'Antipolo', label: 'Antipolo' },
  { value: 'Teresa', label: 'Teresa' },
  { value: 'Tanay', label: 'Tanay' },
  { value: 'Baras', label: 'Baras' },
];

/** Palengke — the buyer's marketplace list of available palay listings in Antipolo and Rizal. */
export default function MarketplaceScreen() {
  const [filter, setFilter] = useState<Filter>('lahat');

  const listings = useMemo(
    () => (filter === 'lahat' ? LISTINGS : LISTINGS.filter((l) => l.municipality === filter)),
    [filter],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader />

      <View style={styles.filters}>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onPress={() => router.push(`/(buyer)/palengke/${listing.id}`)}
          />
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
    gap: AnimoSpacing.lg,
  },
});

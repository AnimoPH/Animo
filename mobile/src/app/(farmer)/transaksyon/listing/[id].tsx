import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Scale,
  Search,
  ShieldCheck,
  Sprout,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { BackHeader } from '@/components/animo/back-header';
import { TransactionCard, type FarmerTransactionCardItem } from '@/components/animo/farmer/transaction-card';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { fetchCropListing } from '@/services/crop-listing-service';
import {
  fetchCounterpartNames,
  fetchListingPurchaseOutcomes,
  getFarmerListingTxnStageLabel,
  isListingTxnCompleted,
  isListingTxnOngoing,
} from '@/services/transaction-service';
import {
  listingTitle,
  moistureLabel,
  purityLabel,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
} from '@/types/crop-listing';
import {
  deriveDisplayStage,
  formatDate,
  formatReferenceId,
  formatTime,
  requestTotal,
  type PurchaseOutcome,
} from '@/types/transaction';

const SCREEN_PADDING = AnimoSpacing.lg;

function toCardItem(
  outcome: PurchaseOutcome,
  listing: CropListing | undefined,
  buyerName?: string,
  lang: 'tl' | 'en' = 'tl',
): FarmerTransactionCardItem {
  const stage = deriveDisplayStage(outcome);
  const quantityKg =
    outcome.kind === 'matched' ? outcome.transaction.quantityKg : outcome.request.requestedQuantityKg;
  const pricePerKg =
    outcome.kind === 'matched' ? outcome.transaction.agreedPricePerKg : (listing?.pricePerKg ?? 0);
  const total = outcome.kind === 'matched' ? requestTotal(outcome) : pricePerKg * quantityKg;

  return {
    id: outcome.kind === 'matched' ? outcome.transaction.id : outcome.request.listingId,
    referenceId: formatReferenceId(
      outcome.kind === 'matched' ? outcome.transaction.id : outcome.request.id,
      outcome.kind === 'matched' ? 'TXN' : 'PR',
    ),
    stage,
    statusLabel: getFarmerListingTxnStageLabel(stage, lang),
    variety: listing ? varietyLabel(listing, lang) : 'Palay',
    moisture: listing ? moistureLabel(listing.declaredMoisture, lang) : '—',
    price: formatPeso(total),
    weight: `${quantityKg} kg`,
    pricePerKg: `${formatPeso(pricePerKg)}/kg`,
    paymentMode: outcome.kind === 'matched' ? (outcome.transaction.payment?.paymentMode ?? null) : null,
    buyer: buyerName || (lang === 'en' ? 'Buyer' : 'Mamimili'),
    date: formatDate(outcome.request.submittedAt, lang),
    time: formatTime(outcome.request.submittedAt),
  };
}

/** Per-listing merged list: pending PRs + matched transactions. */
export default function FarmerListingTransactionsScreen() {
  const { t, language, isTagalog } = useLanguage();
  const params = useLocalSearchParams<{ id: string }>();
  const listingId = Array.isArray(params.id) ? params.id[0] : params.id;

  type FilterKey = 'all' | 'ongoing' | 'completed';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [infoExpanded, setInfoExpanded] = useState(true);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: isTagalog ? 'Lahat' : 'All' },
    { key: 'ongoing', label: isTagalog ? 'Kasalukuyan' : 'Ongoing' },
    { key: 'completed', label: isTagalog ? 'Tapos na' : 'Completed' },
  ];

  const [listing, setListing] = useState<CropListing | null>(null);
  const [outcomes, setOutcomes] = useState<PurchaseOutcome[]>([]);
  const [buyerNamesById, setBuyerNamesById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!listingId) {
        setError(isTagalog ? 'Walang listing ID.' : 'Missing listing ID.');
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [listingResult, outcomeResult] = await Promise.all([
          fetchCropListing(listingId),
          fetchListingPurchaseOutcomes(listingId),
        ]);
        if (!listingResult) {
          setError(isTagalog ? 'Hindi makita ang listing.' : 'Listing not found.');
          setListing(null);
          setOutcomes([]);
          return;
        }
        setListing(listingResult);
        setOutcomes(outcomeResult);

        const buyerIds = outcomeResult
          .map((o) => (o.kind === 'matched' ? o.transaction.buyerId : o.request.buyerId))
          .filter((id): id is string => Boolean(id));
        const names = await fetchCounterpartNames(buyerIds);
        setBuyerNamesById(names);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : isTagalog
              ? 'Hindi ma-load ang listahan ng transaksyon.'
              : 'Could not load transaction list.',
        );
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [listingId, isTagalog],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const items = useMemo(() => {
    return outcomes.map((outcome) => {
      const buyerId = outcome.kind === 'matched' ? outcome.transaction.buyerId : outcome.request.buyerId;
      return {
        outcome,
        card: toCardItem(outcome, listing ?? undefined, buyerNamesById.get(buyerId), language),
      };
    });
  }, [outcomes, listing, buyerNamesById, language]);

  const filteredData = useMemo(() => {
    return items.filter(({ outcome, card }) => {
      const matchesFilter = (() => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'ongoing') return isListingTxnOngoing(outcome);
        if (activeFilter === 'completed') return isListingTxnCompleted(outcome);
        return true;
      })();

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        card.buyer.toLowerCase().includes(query) ||
        card.price.toLowerCase().includes(query) ||
        card.statusLabel.toLowerCase().includes(query) ||
        card.referenceId.toLowerCase().includes(query) ||
        card.weight.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [items, activeFilter, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <BackHeader title={isTagalog ? 'Listahan ng Transaksyon' : 'Transaction List'} />

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
          keyExtractor={({ card }, index) => `${card.referenceId}-${index}`}
          renderItem={({ item: { outcome, card } }) => (
            <TransactionCard
              item={card}
              onPress={() =>
                deriveDisplayStage(outcome) === 'request_pending'
                  ? router.push({
                      pathname: '/(farmer)/listing-detail',
                      params: { id: listingId, tab: 'orders' },
                    })
                  : router.push({
                      pathname: '/(farmer)/transaksyon/[id]',
                      params: { id: card.id },
                    })
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListHeaderComponent={
            <View>
              {listing ? (
                <PalayInformationCard
                  listing={listing}
                  expanded={infoExpanded}
                  onToggle={() => setInfoExpanded((v) => !v)}
                  lang={language}
                  isTagalog={isTagalog}
                />
              ) : null}

              <View style={styles.searchBar}>
                <Search size={18} color={AnimoColors.objectLowEmphasis} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={
                    isTagalog
                      ? 'Maghanap ng pangalan, presyo, katayuan...'
                      : 'Search name, price, status...'
                  }
                  placeholderTextColor={AnimoColors.textDisabled}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  underlineColorAndroid="transparent"
                />
                {searchQuery.length > 0 ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={isTagalog ? 'I-clear ang search' : 'Clear search'}
                    onPress={() => setSearchQuery('')}
                    activeOpacity={0.85}
                    hitSlop={8}>
                    <X size={18} color={AnimoColors.objectLowEmphasis} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
                style={styles.filterScroll}>
                {filters.map((filter) => {
                  const active = activeFilter === filter.key;
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setActiveFilter(filter.key)}
                      activeOpacity={0.85}
                      style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
                      <AnimoText
                        variant="bodyEmphasis"
                        color={active ? AnimoColors.white : AnimoColors.textMediumEmphasis}>
                        {filter.label}
                      </AnimoText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
                {searchQuery.trim()
                  ? isTagalog
                    ? `Walang resulta para sa "${searchQuery}"`
                    : `No results for "${searchQuery}"`
                  : isTagalog
                    ? 'Wala pang transaksyon sa listing na ito'
                    : 'No transactions for this listing yet'}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
                {searchQuery.trim()
                  ? isTagalog
                    ? 'Subukan ang ibang keyword o i-clear ang search.'
                    : 'Try another keyword or clear search.'
                  : isTagalog
                    ? 'Kapag may bumili, lalabas dito ang kanilang mga kahilingan at bayad.'
                    : 'When buyers place requests, their orders and payments will appear here.'}
              </AnimoText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function PalayInformationCard({
  listing,
  expanded,
  onToggle,
  lang = 'tl',
  isTagalog = true,
}: {
  listing: CropListing;
  expanded: boolean;
  onToggle: () => void;
  lang?: 'tl' | 'en';
  isTagalog?: boolean;
}) {
  const specificVariety = specificVarietyDisplay(listing);
  const rows: { key: string; icon: ReactNode; label: string; value: string }[] = [
    {
      key: 'variety',
      icon: <Sprout size={16} color={AnimoColors.textMediumEmphasis} />,
      label: isTagalog ? 'Uri ng palay' : 'Palay variety',
      value: varietyLabel(listing, lang),
    },
    ...(specificVariety
      ? [
          {
            key: 'specificVariety',
            icon: <Sprout size={16} color={AnimoColors.textMediumEmphasis} />,
            label: isTagalog ? 'Tiyak na uri ng palay' : 'Specific variety',
            value: specificVariety,
          },
        ]
      : []),
    {
      key: 'moisture',
      icon: <Droplets size={16} color={AnimoColors.textMediumEmphasis} />,
      label: 'Moisture',
      value: moistureLabel(listing.declaredMoisture, lang),
    },
    {
      key: 'purity',
      icon: <ShieldCheck size={16} color={AnimoColors.textMediumEmphasis} />,
      label: isTagalog ? 'Kalidad' : 'Quality grade',
      value: purityLabel(listing.declaredPurityGrade, lang),
    },
    {
      key: 'weight',
      icon: <Scale size={16} color={AnimoColors.textMediumEmphasis} />,
      label: isTagalog ? 'Aktwal na timbang' : 'Actual weight',
      value: `${listing.netWeightKg} kg`,
    },
  ];

  return (
    <View style={styles.infoCard}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.infoHeader}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
          {isTagalog ? 'Impormasyon ng Palay' : 'Palay Information'}
        </AnimoText>
        {expanded ? (
          <ChevronUp size={20} color={AnimoColors.textMediumEmphasis} />
        ) : (
          <ChevronDown size={20} color={AnimoColors.textMediumEmphasis} />
        )}
      </Pressable>

      {expanded ? (
        <>
          <AnimoText variant="h3" color={AnimoColors.accentPrimary} style={styles.infoTitle}>
            {listingTitle(listing)}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.infoSectionLabel}>
            {isTagalog ? 'Ibang Impormasyon:' : 'Other Information:'}
          </AnimoText>
          {rows.map((row) => (
            <View key={row.key} style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                {row.icon}
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  {row.label}
                </AnimoText>
              </View>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                {row.value}
              </AnimoText>
            </View>
          ))}
          <View style={styles.priceFooter}>
            <AnimoText variant="body" color={AnimoColors.textHighEmphasisInverse}>
              {isTagalog ? 'Patas na presyo:' : 'Fair price:'}
            </AnimoText>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasisInverse}>
              {listing.pricePerKg !== null ? `${formatPeso(listing.pricePerKg)}/kg` : '—'}
            </AnimoText>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.appBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SCREEN_PADDING },
  scroll: { flex: 1 },
  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: AnimoSpacing.xxl,
  },
  infoCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    padding: AnimoSpacing.lg,
    marginBottom: AnimoSpacing.md,
    overflow: 'hidden',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // marginBottom: AnimoSpacing.sm,
  },
  infoTitle: {
    marginTop: AnimoSpacing.md,
    marginBottom: AnimoSpacing.md,
  },
  infoSectionLabel: {
    marginBottom: AnimoSpacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AnimoSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.borderLowEmphasis,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    flex: 1,
    paddingRight: AnimoSpacing.md,
  },
  priceFooter: {
    marginTop: AnimoSpacing.md,
    marginHorizontal: -AnimoSpacing.lg,
    marginBottom: -AnimoSpacing.lg,
    backgroundColor: AnimoColors.accentPrimary,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  empty: {
    alignItems: 'center',
    marginTop: AnimoSpacing.xl,
    paddingHorizontal: AnimoSpacing.lg,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    marginTop: AnimoSpacing.sm,
  },
});

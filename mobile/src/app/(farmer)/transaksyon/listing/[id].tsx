import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Scale,
  ShieldCheck,
  Sprout,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { BackHeader } from '@/components/animo/back-header';
import { FilterModal } from '@/components/animo/filter-modal';
import { TransactionCard, type FarmerTransactionCardItem } from '@/components/animo/farmer/transaction-card';
import { SearchFilterBar } from '@/components/animo/search-filter-bar';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { fetchCropListing } from '@/services/crop-listing-service';
import {
  fetchCounterpartNames,
  fetchListingPurchaseOutcomes,
  getFarmerListingTxnStageLabel,
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
  type DisplayStage,
  type PurchaseOutcome,
} from '@/types/transaction';

type StatusFilter = 'all' | 'response' | 'payment' | 'pickup' | 'completed';

const STATUS_FILTERS: { value: StatusFilter; tl: string; en: string }[] = [
  { value: 'all', tl: 'Lahat', en: 'All' },
  { value: 'response', tl: 'Naghihintay ng sagot', en: 'Awaiting response' },
  { value: 'payment', tl: 'Naghihintay ng bayad', en: 'Awaiting payment' },
  { value: 'pickup', tl: 'Naghihintay ng pickup', en: 'Awaiting pickup' },
  { value: 'completed', tl: 'Tapos na', en: 'Completed' },
];

function stageMatchesFilter(stage: DisplayStage, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'response') return stage === 'request_pending';
  if (filter === 'payment') return stage === 'awaiting_payment' || stage === 'payment_sent';
  if (filter === 'pickup') return stage === 'payment_confirmed' || stage === 'delivered';
  return stage === 'completed';
}

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

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilter, setAppliedFilter] = useState<StatusFilter>('all');
  const [draftFilter, setDraftFilter] = useState<StatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(true);

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

  const activeFilterCount = appliedFilter === 'all' ? 0 : 1;

  const filteredData = useMemo(() => {
    return items.filter(({ outcome, card }) => {
      const matchesFilter = stageMatchesFilter(deriveDisplayStage(outcome), appliedFilter);

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
  }, [items, appliedFilter, searchQuery]);

  const openModal = () => {
    setDraftFilter(appliedFilter);
    setModalOpen(true);
  };

  const applyFilters = () => {
    setAppliedFilter(draftFilter);
    setModalOpen(false);
  };

  const resetFilters = () => {
    setDraftFilter('all');
    setAppliedFilter('all');
    setModalOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <BackHeader title={isTagalog ? 'Listahan ng Transaksyon' : 'Transaction List'} />

      <SearchFilterBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={
          isTagalog ? 'Maghanap ng pangalan, presyo, katayuan...' : 'Search name, price, status...'
        }
        activeFilterCount={activeFilterCount}
        onFilterPress={openModal}
      />

      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={draftFilter === 'all' ? 0 : 1}
      >
        <View style={styles.filterSection}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? 'Katayuan' : 'Status'}
          </AnimoText>
          <View style={styles.chipsWrap}>
            {STATUS_FILTERS.map((choice) => (
              <FilterChoiceChip
                key={choice.value}
                label={isTagalog ? choice.tl : choice.en}
                active={draftFilter === choice.value}
                onPress={() => setDraftFilter(choice.value)}
              />
            ))}
          </View>
        </View>
      </FilterModal>

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
            listing ? (
              <PalayInformationCard
                listing={listing}
                expanded={infoExpanded}
                onToggle={() => setInfoExpanded((v) => !v)}
                lang={language}
                isTagalog={isTagalog}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
                {searchQuery.trim()
                  ? isTagalog
                    ? `Walang resulta para sa "${searchQuery}"`
                    : `No results for "${searchQuery}"`
                  : activeFilterCount > 0
                    ? isTagalog
                      ? 'Walang transaksyon sa filter na ito.'
                      : 'No transactions match this filter.'
                    : isTagalog
                      ? 'Wala pang transaksyon sa listing na ito'
                      : 'No transactions for this listing yet'}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
                {searchQuery.trim()
                  ? isTagalog
                    ? 'Subukan ang ibang keyword o i-clear ang search.'
                    : 'Try another keyword or clear search.'
                  : activeFilterCount > 0
                    ? isTagalog
                      ? 'Subukan ang ibang katayuan o i-clear ang filter.'
                      : 'Try another status or clear the filter.'
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

function FilterChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chipItem, active && styles.chipItemActive]}>
      <AnimoText
        variant="body"
        color={active ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
        style={active ? styles.chipTextActive : undefined}>
        {label}
      </AnimoText>
    </Pressable>
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
  filterSection: {
    gap: AnimoSpacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.sm,
    marginTop: 2,
  },
  chipItem: {
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 10,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  chipItemActive: {
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  chipTextActive: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: AnimoColors.accentPrimary,
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

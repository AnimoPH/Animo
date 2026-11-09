import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronDown, ChevronUp, Droplets, Scale, ShieldCheck, Sprout } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimoText } from '@/components/animo/animo-text';
import { FilterModal } from '@/components/animo/filter-modal';
import { TransactionCard, type FarmerTransactionCardItem } from '@/components/animo/farmer/transaction-card';
import { SearchFilterBar } from '@/components/animo/search-filter-bar';
import { CollapsingHeader } from '@/components/animo/ui/collapsing-header';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { Mascot } from '@/components/animo/ui/mascot';
import { V2BackHeader } from '@/components/animo/ui/screen-bits';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useCollapsingHeader } from '@/hooks/use-collapsing-header';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/translations';
import { fetchCropListing } from '@/services/crop-listing-service';
import { fetchCounterpartNames, fetchListingPurchaseOutcomes } from '@/services/transaction-service';
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
  getDisplayStageLabel,
  requestTotal,
  type DisplayStage,
  type PurchaseOutcome,
} from '@/types/transaction';

type StatusFilter = 'all' | 'response' | 'payment' | 'pickup' | 'completed';

const STATUS_FILTERS: { value: StatusFilter; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'ftx.filterAll' },
  { value: 'response', labelKey: 'ftx.statusResponse' },
  { value: 'payment', labelKey: 'ftx.statusPayment' },
  { value: 'pickup', labelKey: 'ftx.statusPickup' },
  { value: 'completed', labelKey: 'ftx.filterDone' },
];

function stageMatchesFilter(stage: DisplayStage, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'response') return stage === 'request_pending';
  if (filter === 'payment') return stage === 'awaiting_payment' || stage === 'payment_sent';
  if (filter === 'pickup') return stage === 'payment_confirmed' || stage === 'delivered';
  return stage === 'completed';
}

const SCREEN_PADDING = AnimoV2Spacing.lg;

function toCardItem(
  outcome: PurchaseOutcome,
  listing: CropListing | undefined,
  buyerName?: string,
  lang: 'tl' | 'en' = 'tl',
  buyerFallback = 'Mamimili',
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
    statusLabel: getDisplayStageLabel(stage, lang),
    variety: listing ? varietyLabel(listing, lang) : 'Palay',
    moisture: listing ? moistureLabel(listing.declaredMoisture, lang) : '—',
    price: formatPeso(total),
    weight: `${quantityKg} kg`,
    pricePerKg: `${formatPeso(pricePerKg)}/kg`,
    paymentMode: outcome.kind === 'matched' ? (outcome.transaction.payment?.paymentMode ?? null) : null,
    buyer: buyerName || buyerFallback,
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

  // Collapsing top block (back header + search/filter): slides away on scroll down, and returns as
  // just the search bar on scroll up. `followOverscroll` keeps the pull-to-refresh spinner visible
  // on iOS instead of letting it hide behind the block.
  const header = useCollapsingHeader({ followOverscroll: true });
  const { headerHeight, showHeader } = header;

  // Loading / error replace the list, which then remounts at the top: start with the block shown.
  useEffect(() => {
    showHeader(true);
  }, [loading, error, showHeader]);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!listingId) {
        setError(t('ftx.missingId'));
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
          setError(t('ftx.listingNotFound'));
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
        setError(e instanceof Error ? e.message : t('ftx.listLoadError'));
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [listingId, t],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const items = useMemo(() => {
    return outcomes.map((outcome) => {
      const buyerId = outcome.kind === 'matched' ? outcome.transaction.buyerId : outcome.request.buyerId;
      return {
        outcome,
        card: toCardItem(
          outcome,
          listing ?? undefined,
          buyerNamesById.get(buyerId),
          language,
          t('ftx.buyerFallback'),
        ),
      };
    });
  }, [outcomes, listing, buyerNamesById, language, t]);

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

  const hasSearch = searchQuery.trim() !== '';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        activeCount={draftFilter === 'all' ? 0 : 1}>
        <View style={styles.filterSection}>
          <AnimoText variant="bodyStrong">{t('ftx.filterStatus')}</AnimoText>
          <View style={styles.chipsWrap}>
            {STATUS_FILTERS.map((choice) => (
              <FilterChip
                key={choice.value}
                label={t(choice.labelKey)}
                selected={draftFilter === choice.value}
                onPress={() => setDraftFilter(choice.value)}
              />
            ))}
          </View>
        </View>
      </FilterModal>

      {loading ? (
        <View style={[styles.centerFill, { paddingTop: headerHeight }]}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      ) : error ? (
        <View style={[styles.centerFill, { paddingTop: headerHeight }]}>
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
            {error}
          </AnimoText>
        </View>
      ) : (
        <Animated.FlatList
          style={styles.flex}
          data={filteredData}
          keyExtractor={({ card }, index) => `${card.referenceId}-${index}`}
          onScroll={header.onScroll}
          scrollEventThrottle={16}
          keyboardDismissMode="on-drag"
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
          contentContainerStyle={[styles.list, { paddingTop: headerHeight + AnimoV2Spacing.sm }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              progressViewOffset={headerHeight}
            />
          }
          ListHeaderComponent={
            listing ? (
              <PalayInformationCard
                listing={listing}
                expanded={infoExpanded}
                onToggle={() => setInfoExpanded((v) => !v)}
                lang={language}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Mascot size={96} />
              <AnimoText variant="heading" style={styles.centerText}>
                {hasSearch
                  ? t('ftx.noResults', { query: searchQuery })
                  : activeFilterCount > 0
                    ? t('ftx.noTxFilter')
                    : t('ftx.noTx')}
              </AnimoText>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {hasSearch
                  ? t('ftx.noResultsHint')
                  : activeFilterCount > 0
                    ? t('ftx.noTxFilterHint')
                    : t('ftx.noTxHint')}
              </AnimoText>
            </View>
          }
        />
      )}

      {/* Collapsing top block: overlays the list, slides away on scroll down and returns on scroll up. */}
      <CollapsingHeader header={header}>
        <View onLayout={header.onTitleLayout}>
          <V2BackHeader title={t('ftx.listTitle')} backLabel={t('ftx.back')} onBack={() => router.back()} />
        </View>

        <SearchFilterBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('ftx.searchPlaceholder')}
          activeFilterCount={activeFilterCount}
          onFilterPress={openModal}
        />
      </CollapsingHeader>
    </View>
  );
}

function PalayInformationCard({
  listing,
  expanded,
  onToggle,
  lang = 'tl',
}: {
  listing: CropListing;
  expanded: boolean;
  onToggle: () => void;
  lang?: 'tl' | 'en';
}) {
  const { t } = useLanguage();
  const specificVariety = specificVarietyDisplay(listing);
  const iconProps = { size: 22, color: AnimoV2Colors.textBrand, strokeWidth: 2.25 } as const;
  const rows: { key: string; icon: ReactNode; label: string; value: string }[] = [
    {
      key: 'variety',
      icon: <Sprout {...iconProps} />,
      label: t('ftx.infoVariety'),
      value: varietyLabel(listing, lang),
    },
    ...(specificVariety
      ? [
          {
            key: 'specificVariety',
            icon: <Sprout {...iconProps} />,
            label: t('ftx.infoSpecific'),
            value: specificVariety,
          },
        ]
      : []),
    {
      key: 'moisture',
      icon: <Droplets {...iconProps} />,
      label: t('ftx.infoMoisture'),
      value: moistureLabel(listing.declaredMoisture, lang),
    },
    {
      key: 'purity',
      icon: <ShieldCheck {...iconProps} />,
      label: t('ftx.infoGrade'),
      value: purityLabel(listing.declaredPurityGrade, lang),
    },
    {
      key: 'weight',
      icon: <Scale {...iconProps} />,
      label: t('ftx.infoWeight'),
      value: `${listing.netWeightKg} kg`,
    },
  ];
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <View style={styles.infoWrap}>
      <DepthCard depth="flat">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={t('ftx.palayInfo')}
          onPress={onToggle}
          style={styles.infoHeader}>
          <AnimoText variant="subheading">{t('ftx.palayInfo')}</AnimoText>
          <Chevron size={24} color={AnimoV2Colors.textSecondary} strokeWidth={2.75} />
        </Pressable>

        {expanded ? (
          <View style={styles.infoBody}>
            <AnimoText variant="heading" color={AnimoV2Colors.textBrand}>
              {listingTitle(listing)}
            </AnimoText>
            {rows.map((row) => (
              <View key={row.key}>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  {row.icon}
                  <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
                    {row.label}
                  </AnimoText>
                  <AnimoText variant="bodyStrong" style={styles.infoValue}>
                    {row.value}
                  </AnimoText>
                </View>
              </View>
            ))}
            <View style={styles.priceBar}>
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand}>
                {t('ftx.fairPrice')}
              </AnimoText>
              <AnimoText variant="priceV2" color={AnimoV2Colors.textOnBrand}>
                {listing.pricePerKg !== null ? `${formatPeso(listing.pricePerKg)}/kg` : '—'}
              </AnimoText>
            </View>
          </View>
        ) : null}
      </DepthCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1, minWidth: 0 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SCREEN_PADDING },
  centerText: { textAlign: 'center' },
  list: { paddingHorizontal: SCREEN_PADDING, paddingTop: AnimoV2Spacing.sm, paddingBottom: AnimoV2Spacing.xxl },
  infoWrap: { marginBottom: AnimoV2Spacing.lg },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
  infoBody: { paddingHorizontal: AnimoV2Spacing.lg, paddingBottom: AnimoV2Spacing.lg, gap: AnimoV2Spacing.sm },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.borderDefault, marginBottom: AnimoV2Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  infoValue: { flexShrink: 1, textAlign: 'right' },
  priceBar: {
    marginTop: AnimoV2Spacing.sm,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.actionPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterSection: { gap: AnimoV2Spacing.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
  empty: {
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    paddingTop: AnimoV2Spacing.xl,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
});

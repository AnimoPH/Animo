import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { FilterChips } from '@/components/animo/filter-chips';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { fetchCropListingsByIds } from '@/services/crop-listing-service';
import { fetchBuyerPurchaseOutcomes } from '@/services/transaction-service';
import { varietyLabel, type CropListing } from '@/types/crop-listing';
import {
  DISPLAY_STAGE_LABELS,
  DISPLAY_STAGE_TONE,
  deriveDisplayStage,
  requestTotal,
  type DisplayStage,
  type PurchaseOutcome,
} from '@/types/transaction';

type Filter = 'lahat' | 'aktibo' | 'tapos' | 'cancelled';

type FilterValue = 'Lahat' | 'Kailangan ng Aksyon' | 'Naghihintay' | 'Kumpleto' | 'Nabigo';

const FILTERS: FilterValue[] = [
  'Lahat',
  'Kailangan ng Aksyon',
  'Naghihintay',
  'Kumpleto',
  'Nabigo',
];

const ONGOING_STAGES: DisplayStage[] = [
  'request_pending',
  'awaiting_payment',
  'payment_sent',
  'payment_confirmed',
  'delivered',
];
const DEAD_STAGES: DisplayStage[] = [
  'request_rejected',
  'request_cancelled',
  'transaction_cancelled',
  'payment_failed',
];

function matchesFilter(stage: DisplayStage, filter: Filter): boolean {
  if (filter === 'lahat') return true;
  if (filter === 'aktibo') return ONGOING_STAGES.includes(stage);
  if (filter === 'tapos') return stage === 'completed';
  return DEAD_STAGES.includes(stage);
}

/** Where a tap on a row should land, based on its current display stage. */
function routeFor(outcome: PurchaseOutcome, stage: DisplayStage): string {
  const id = outcome.request.id;
  if (stage === 'awaiting_payment') return `/(buyer)/transaksyon/${id}/pickup`;
  if (stage === 'payment_sent' || stage === 'payment_confirmed' || stage === 'delivered' || stage === 'completed') {
    return `/(buyer)/transaksyon/${id}/resibo`;
  }
  return `/(buyer)/transaksyon/${id}`;
}

/** Mga Transaksyon — pending requests plus settled/completed transactions, driven by real data. */
export default function TransactionsScreen() {
  const [filter, setFilter] = useState<Filter>('lahat');
  const [outcomes, setOutcomes] = useState<PurchaseOutcome[]>([]);
  const [listingsById, setListingsById] = useState<Map<string, CropListing>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await fetchBuyerPurchaseOutcomes();
      setOutcomes(result);
      const listings = await fetchCropListingsByIds(result.map((o) => o.request.listingId));
      setListingsById(listings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hindi ma-load ang mga transaksyon.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const filtered = useMemo(
    () => outcomes.filter((o) => matchesFilter(deriveDisplayStage(o), filter)),
    [outcomes, filter],
  );
  const ongoing = filtered.filter((o) => ONGOING_STAGES.includes(deriveDisplayStage(o)));
  const settled = filtered.filter((o) => !ONGOING_STAGES.includes(deriveDisplayStage(o)));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader onPressBell={() => router.push('/(buyer)/notipikasyon')} />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={AnimoColors.green} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <AnimoText variant="body" color={AnimoColors.danger}>
            {error}
          </AnimoText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
          {ongoing.length > 0 ? (
            <>
              <AnimoText variant="h3" color={AnimoColors.black}>
                Kasalukuyang Request
              </AnimoText>
              {ongoing.map((outcome) => (
                <OutcomeRow
                  key={outcome.request.id}
                  outcome={outcome}
                  listing={listingsById.get(outcome.request.listingId)}
                />
              ))}
            </>
          ) : null}

          {settled.length > 0 ? (
            <>
              <AnimoText variant="h3" color={AnimoColors.black} style={styles.sectionGap}>
                Kasaysayan
              </AnimoText>
              {settled.map((outcome) => (
                <OutcomeRow
                  key={outcome.request.id}
                  outcome={outcome}
                  listing={listingsById.get(outcome.request.listingId)}
                />
              ))}
            </>
          ) : null}

          {ongoing.length === 0 && settled.length === 0 ? (
            <AnimoText variant="body" color={AnimoColors.muted} style={styles.emptyText}>
              Wala ka pang transaksyon.
            </AnimoText>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function OutcomeRow({ outcome, listing }: { outcome: PurchaseOutcome; listing: CropListing | undefined }) {
  const stage = deriveDisplayStage(outcome);
  const quantityKg =
    outcome.kind === 'matched' ? outcome.transaction.quantityKg : outcome.request.requestedQuantityKg;
  const total =
    outcome.kind === 'matched' ? requestTotal(outcome) : (listing?.pricePerKg ?? 0) * quantityKg;

  return (
    <Pressable style={styles.row} onPress={() => router.push(routeFor(outcome, stage) as never)}>
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            {listing ? varietyLabel(listing) : 'Palay'}
          </AnimoText>
          <StatusBadge label={DISPLAY_STAGE_LABELS[stage]} tone={DISPLAY_STAGE_TONE[stage]} />
        </View>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {quantityKg} kg · {formatPeso(total)}
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
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyText: {
    textAlign: 'center',
    marginTop: AnimoSpacing.xxl,
  },
  row: {
    flexDirection: 'row',
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

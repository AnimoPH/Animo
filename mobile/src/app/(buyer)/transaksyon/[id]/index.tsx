import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Clock, Info, XCircle } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FarmerCard, LockedFarmerCard } from '@/components/animo/farmer-card';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { TransactionStatusRow, TransactionSummaryCard } from '@/components/animo/transaction-cycle-cards';
import { BackHeader } from '@/components/animo/back-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { fetchCropListing } from '@/services/crop-listing-service';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import {
  fetchTransactionByRequestId,
  fetchTransactionCounterpart,
} from '@/services/transaction-service';
import type { CropListing } from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';
import { useLanguage } from '@/hooks/use-language';
import {
  DISPLAY_STAGE_TONE,
  buildProgressSteps,
  deriveDisplayStage,
  formatReferenceId,
  getDisplayStageLabel,
  requestTotal,
  type PurchaseOutcome,
  type TransactionCounterpart,
} from '@/types/transaction';

/**
 * Katayuan ng Transaksyon.
 *
 * Automatically forwards to the active step in the flow once matched:
 * - awaiting_payment / payment_sent -> bayad
 * - payment_confirmed / delivered / completed -> resibo
 * - request_pending / dead states -> shows the status screen in place
 */
export default function TransactionStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, isTagalog } = useLanguage();

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [counterpart, setCounterpart] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const request = await fetchPurchaseRequest(id);
      if (!request) {
        setOutcome(null);
        return;
      }
      const transaction = await fetchTransactionByRequestId(id);
      const nextOutcome: PurchaseOutcome = transaction ? { kind: 'matched', request, transaction } : { kind: 'unmatched', request };
      setOutcome(nextOutcome);

      const [listingResult, counterpartResult] = await Promise.all([
        fetchCropListing(request.listingId),
        transaction ? fetchTransactionCounterpart(transaction.farmerId) : Promise.resolve(null),
      ]);
      setListing(listingResult);
      setCounterpart(counterpartResult);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isTagalog
            ? 'Hindi ma-load ang transaksyon.'
            : 'Failed to load transaction.',
      );
    } finally {
      setLoading(false);
    }
  }, [id, isTagalog]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <BackHeader title={isTagalog ? 'Katayuan ng Transaksyon' : 'Transaction Status'} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <BackHeader title={isTagalog ? 'Katayuan ng Transaksyon' : 'Transaction Status'} />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {error ?? (isTagalog ? 'Hindi nahanap ang transaksyon na ito.' : 'Transaction could not be found.')}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const stage = deriveDisplayStage(outcome);

  if (stage === 'awaiting_payment') {
    return <Redirect href={`/(buyer)/transaksyon/${outcome.request.id}/pickup`} />;
  }
  if (stage === 'payment_sent' || stage === 'payment_confirmed' || stage === 'delivered' || stage === 'completed') {
    return <Redirect href={`/(buyer)/transaksyon/${outcome.request.id}/resibo`} />;
  }

  const isDead = stage === 'request_rejected' || stage === 'request_cancelled';
  const quantityKg = outcome.kind === 'matched' ? outcome.transaction.quantityKg : outcome.request.requestedQuantityKg;
  const total = outcome.kind === 'matched' ? requestTotal(outcome) : (listing?.pricePerKg ?? 0) * quantityKg;
  const pricePerKg = outcome.kind === 'matched' ? outcome.transaction.agreedPricePerKg : (listing?.pricePerKg ?? 0);
  const referenceId = formatReferenceId(outcome.request.id, 'PR');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackHeader title={isTagalog ? 'Katayuan ng Transaksyon' : 'Transaction Status'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TransactionStatusRow label={getDisplayStageLabel(stage, language)} tone={DISPLAY_STAGE_TONE[stage]} />
        <StageBanner request={outcome.request} isDead={isDead} isTagalog={isTagalog} />
        {listing ? (
          <TransactionSummaryCard
            listing={listing}
            quantityKg={quantityKg}
            pricePerKg={pricePerKg}
            totalAmount={total}
            referenceId={referenceId}
            language={language}
          />
        ) : null}
        {counterpart ? <FarmerCard farmer={counterpart} /> : <LockedFarmerCard />}
        <ProgressTracker
          title={isTagalog ? 'Progreso ng Transaksyon' : 'Transaction Progress'}
          steps={buildProgressSteps(outcome, 'buyer', language)}
        />

        {isDead ? (
          <NoticeBanner tone="neutral" icon={<Info size={16} color={AnimoColors.muted} />}>
            {isTagalog
              ? 'Walang parusa sa pagkansela nito. Muling nakalista ang palay para sa ibang mamimili.'
              : 'No penalty for this cancellation. The palay has been relisted for other buyers.'}
          </NoticeBanner>
        ) : null}
      </ScrollView>

      {isDead ? <StageFooter isTagalog={isTagalog} /> : null}
    </SafeAreaView>
  );
}

/** Top status card. The stage pill lives in TransactionStatusRow above this card. */
function StageBanner({
  request,
  isDead,
  isTagalog,
}: {
  request: PurchaseRequest;
  isDead: boolean;
  isTagalog: boolean;
}) {
  if (isDead) {
    return (
      <View style={styles.bannerCard}>
        <View style={styles.bannerRow}>
          <View style={[styles.bannerIcon, styles.bannerIconMuted]}>
            <XCircle size={20} color={AnimoColors.blackSecondary} />
          </View>
          <View style={styles.bannerText}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              {request.status === 'Rejected'
                ? isTagalog
                  ? 'Tinanggihan ang Request'
                  : 'Request Rejected'
                : isTagalog
                  ? 'Nakansela ang Transaksyon'
                  : 'Transaction Cancelled'}
            </AnimoText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bannerCard}>
      <View style={styles.bannerRow}>
        <View style={[styles.bannerIcon, styles.bannerIconWarning]}>
          <Clock size={20} color="#B4791A" />
        </View>
        <View style={styles.bannerText}>
          <AnimoText variant="h3" color={AnimoColors.black}>
            {isTagalog ? 'Naipadala ang Purchase Request' : 'Purchase Request Sent'}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {isTagalog ? 'Naghihintay ng pag-accept ng magsasaka' : 'Waiting for farmer to accept'}
          </AnimoText>
        </View>
      </View>
    </View>
  );
}

/** Footer for a rejected or cancelled request. A pending request has no action here. */
function StageFooter({ isTagalog }: { isTagalog: boolean }) {
  return (
    <View style={styles.footerStack}>
      <AnimoButton
        label={isTagalog ? 'Mag-browse ng Ibang Listing' : 'Browse Other Listings'}
        icon={Check}
        onPress={() => router.replace('/(buyer)/palengke')}
      />
      <AnimoButton
        label={isTagalog ? 'Tingnan ang Kasaysayan' : 'View History'}
        variant="secondary"
        onPress={() => router.replace('/(buyer)/transaksyon')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  referenceCaption: {
    marginTop: -AnimoSpacing.md,
  },
  bannerCard: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconWarning: {
    backgroundColor: '#FBF0D9',
  },
  bannerIconMuted: {
    backgroundColor: AnimoColors.surface,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  metaLabel: {
    flexShrink: 0,
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    flexShrink: 1,
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
  },
});

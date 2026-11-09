import NetInfo from '@react-native-community/netinfo';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Clock, Info, X, XCircle } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { FarmerCard, LockedFarmerCard } from '@/components/animo/farmer-card';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { TransactionStatusRow, TransactionSummaryCard } from '@/components/animo/transaction-cycle-cards';
import { BuyerCancelDialog, InfoNote, TxnHeader } from '@/components/animo/buyer/txn-v2';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StickyFooter } from '@/components/animo/ui/screen-bits';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { fetchCropListing } from '@/services/crop-listing-service';
import {
  cancelPurchaseRequest,
  cancelPurchaseRequestFailureMessage,
  fetchPurchaseRequest,
} from '@/services/purchase-request-service';
import {
  fetchTransactionByRequestId,
  fetchTransactionCounterpart,
} from '@/services/transaction-service';
import type { CropListing } from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';
import { useLanguage } from '@/hooks/use-language';
import {
  buildProgressSteps,
  cancelPolicy,
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
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancelBusy = useRef(false);

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
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title={isTagalog ? 'Katayuan ng Transaksyon' : 'Transaction Status'} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title={isTagalog ? 'Katayuan ng Transaksyon' : 'Transaction Status'} />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoV2Colors.textSecondary}>
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
  const isPending = stage === 'request_pending';
  const policy = cancelPolicy(outcome);

  const handleConfirmCancel = async () => {
    if (!id || cancelBusy.current) return;
    const net = await NetInfo.fetch();
    if (net.isConnected === false || net.isInternetReachable === false) {
      setCancelError('Kailangan ng internet para kanselahin ang request.');
      setConfirmingCancel(false);
      return;
    }
    cancelBusy.current = true;
    setCancelError(null);
    try {
      await cancelPurchaseRequest(id);
      setConfirmingCancel(false);
      await load();
    } catch (error) {
      setCancelError(cancelPurchaseRequestFailureMessage(error));
      setConfirmingCancel(false);
      await load();
    } finally {
      cancelBusy.current = false;
    }
  };
  const quantityKg = outcome.kind === 'matched' ? outcome.transaction.quantityKg : outcome.request.requestedQuantityKg;
  const total = outcome.kind === 'matched' ? requestTotal(outcome) : (listing?.pricePerKg ?? 0) * quantityKg;
  const pricePerKg = outcome.kind === 'matched' ? outcome.transaction.agreedPricePerKg : (listing?.pricePerKg ?? 0);
  const referenceId = formatReferenceId(outcome.request.id, 'PR');

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <TxnHeader title={isTagalog ? 'Katayuan ng Transaksyon' : 'Transaction Status'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TransactionStatusRow stage={stage} label={getDisplayStageLabel(stage, language)} />
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
          <InfoNote tone="neutral" icon={Info}>
            {isTagalog
              ? 'Walang parusa sa pagkansela nito. Muling nakalista ang palay para sa ibang mamimili.'
              : 'No penalty for this cancellation. The palay has been relisted for other buyers.'}
          </InfoNote>
        ) : null}
      </ScrollView>

      {isPending ? (
        <StickyFooter>
          {cancelError ? (
            <AnimoText variant="captionV2" color={AnimoV2Colors.dangerFg}>
              {cancelError}
            </AnimoText>
          ) : null}
          <ChunkyButton
            label="Kanselahin ang Request"
            variant="secondary"
            icon={X}
            textColor={AnimoV2Colors.dangerFg}
            borderColor={AnimoV2Colors.dangerSolid}
            onPress={() => {
              setCancelError(null);
              setConfirmingCancel(true);
            }}
          />
        </StickyFooter>
      ) : null}

      {isDead ? (
        <StageFooter
          isTagalog={isTagalog}
          listingId={outcome.request.listingId}
          showOrderAgain={outcome.request.status === 'Cancelled'}
        />
      ) : null}

      <BuyerCancelDialog
        visible={confirmingCancel}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        dismissLabel="Huwag ituloy"
        onDismiss={() => setConfirmingCancel(false)}
        onConfirm={handleConfirmCancel}
      />
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
      <DepthCard depth="flat" radius="xl" style={styles.banner}>
        <IconTile icon={XCircle} tone="neutral" />
        <View style={styles.bannerText}>
          <AnimoText variant="subheading">
            {request.status === 'Rejected'
              ? isTagalog
                ? 'Tinanggihan ang Kahilingan'
                : 'Request Rejected'
              : isTagalog
                ? 'Nakansela ang Transaksyon'
                : 'Transaction Cancelled'}
          </AnimoText>
        </View>
      </DepthCard>
    );
  }

  return (
    <DepthCard depth="flat" radius="xl" style={styles.banner}>
      <IconTile icon={Clock} tone="warning" />
      <View style={styles.bannerText}>
        <AnimoText variant="subheading">
          {isTagalog ? 'Naipadala ang Kahilingan sa Pagbili' : 'Purchase Request Sent'}
        </AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {isTagalog ? 'Naghihintay ng sagot ng magsasaka' : 'Waiting for the farmer to answer'}
        </AnimoText>
      </View>
    </DepthCard>
  );
}

/** Footer for a rejected or cancelled request. Pending cancel lives on the screen footer. */
function StageFooter({
  isTagalog,
  listingId,
  showOrderAgain,
}: {
  isTagalog: boolean;
  listingId: string;
  showOrderAgain: boolean;
}) {
  return (
    <StickyFooter>
      {showOrderAgain ? (
        <ChunkyButton
          label="Mag-order muli"
          onPress={() =>
            router.push({
              pathname: '/(buyer)/palengke/buy',
              params: { id: listingId },
            })
          }
        />
      ) : null}
      <ChunkyButton
        label={isTagalog ? 'Mag-browse ng Ibang Listing' : 'Browse Other Listings'}
        icon={showOrderAgain ? undefined : Check}
        variant={showOrderAgain ? 'secondary' : 'primary'}
        onPress={() => router.replace('/(buyer)/palengke')}
      />
      <ChunkyButton
        label={isTagalog ? 'Tingnan ang Kasaysayan' : 'View History'}
        variant="secondary"
        onPress={() => router.replace('/(buyer)/transaksyon')}
      />
    </StickyFooter>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoV2Colors.surfaceApp,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoV2Spacing.xl,
  },
  content: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.lg,
  },
  bannerText: { flex: 1, minWidth: 0, gap: 2 },
});

import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Clock, Info, X, XCircle } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { FarmerCard, LockedFarmerCard } from '@/components/animo/farmer-card';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { PaymentSummary } from '@/components/animo/payment-summary';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { RequestListingCard } from '@/components/animo/request-listing-card';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { fetchCropListing } from '@/services/crop-listing-service';
import {
  cancelPurchaseRequest as cancelPurchaseRequestRpc,
  fetchPurchaseRequest,
} from '@/services/purchase-request-service';
import {
  cancelTransaction as cancelTransactionRpc,
  fetchTransactionByRequestId,
  fetchTransactionCounterpart,
} from '@/services/transaction-service';
import type { CropListing } from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';
import {
  DISPLAY_STAGE_LABELS,
  buildProgressSteps,
  cancelPolicy,
  deriveDisplayStage,
  requestTotal,
  type CancelPolicy,
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

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [counterpart, setCounterpart] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelledSuccessModal, setShowCancelledSuccessModal] = useState(false);

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
      setError(e instanceof Error ? e.message : 'Hindi ma-load ang transaksyon.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Katayuan ng Transaksyon" />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Katayuan ng Transaksyon" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {error ?? 'Hindi nahanap ang transaksyon na ito.'}
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
  const policy = cancelPolicy(outcome);
  const quantityKg = outcome.kind === 'matched' ? outcome.transaction.quantityKg : outcome.request.requestedQuantityKg;
  const total = outcome.kind === 'matched' ? requestTotal(outcome) : (listing?.pricePerKg ?? 0) * quantityKg;
  const pricePerKg = outcome.kind === 'matched' ? outcome.transaction.agreedPricePerKg : (listing?.pricePerKg ?? 0);

  const handleConfirmCancel = async () => {
    setCancelError(null);
    try {
      if (outcome.kind === 'matched') {
        await cancelTransactionRpc(outcome.transaction.id);
      } else {
        await cancelPurchaseRequestRpc(outcome.request.id);
      }
      setCancelling(false);
      setShowCancelledSuccessModal(true);
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Hindi makansela ang transaksyon.');
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Katayuan ng Transaksyon" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StageBanner request={outcome.request} isDead={isDead} label={DISPLAY_STAGE_LABELS[stage]} />
        {listing ? (
          <RequestListingCard listing={listing} quantityKg={quantityKg} totalAmount={total} muted={isDead} />
        ) : null}
        <ProgressTracker steps={buildProgressSteps(outcome, 'buyer')} />
        <PaymentSummary
          rows={[
            { label: 'Dami ng Palay', amount: quantityKg },
            { label: 'Presyo bawat kilo', amount: pricePerKg },
          ]}
          total={{ label: 'Kabuuang babayaran', amount: total }}
        />

        {counterpart ? <FarmerCard farmer={counterpart} /> : <LockedFarmerCard />}

        {cancelError ? (
          <AnimoText variant="caption" color={AnimoColors.danger}>
            {cancelError}
          </AnimoText>
        ) : null}

        {isDead ? (
          <NoticeBanner tone="neutral" icon={<Info size={16} color={AnimoColors.muted} />}>
            Walang parusa sa pagkansela nito. Muling nakalista ang palay para sa ibang mamimili.
          </NoticeBanner>
        ) : null}
      </ScrollView>

      <StageFooter isDead={isDead} policy={policy} onCancel={() => setCancelling(true)} />

      <CancelRequestModal
        visible={cancelling}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        onDismiss={() => setCancelling(false)}
        onConfirm={handleConfirmCancel}
      />

      <FeedbackModal
        visible={showCancelledSuccessModal}
        tone="danger"
        title="Matagumpay na Nakansela"
        message="Nakansela na ang transaksyong ito. Muling nakalista ang palay para sa ibang mamimili."
        confirmLabel="OK"
        onConfirm={() => {
          setShowCancelledSuccessModal(false);
          router.replace('/(buyer)/transaksyon');
        }}
      />
    </SafeAreaView>
  );
}

/** Top status card — icon, headline and the stage pill. */
function StageBanner({ request, isDead, label }: { request: PurchaseRequest; isDead: boolean; label: string }) {
  if (isDead) {
    return (
      <View style={styles.bannerCard}>
        <View style={styles.bannerRow}>
          <View style={[styles.bannerIcon, styles.bannerIconMuted]}>
            <XCircle size={20} color={AnimoColors.blackSecondary} />
          </View>
          <View style={styles.bannerText}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              {request.status === 'Rejected' ? 'Tinanggihan ang Request' : 'Nakansela ang Transaksyon'}
            </AnimoText>
          </View>
        </View>
        <View style={styles.bannerMeta}>
          <StatusBadge label={label} tone="neutral" />
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
            Naipadala ang Purchase Request
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.muted}>
            Naghihintay ng pag-accept ng magsasaka
          </AnimoText>
        </View>
      </View>
      <View style={styles.bannerMeta}>
        <StatusBadge label={label} tone="warning" />
      </View>
      <View style={styles.divider} />
      <MetaRow label="Naipadala" value={request.submittedAt} />
    </View>
  );
}

/** Footer action(s). */
function StageFooter({
  isDead,
  policy,
  onCancel,
}: {
  isDead: boolean;
  policy: CancelPolicy;
  onCancel: () => void;
}) {
  if (isDead) {
    return (
      <View style={styles.footerStack}>
        <AnimoButton label="Mag-browse ng Ibang Listing" icon={Check} onPress={() => router.replace('/(buyer)/palengke')} />
        <AnimoButton
          label="Tingnan ang Kasaysayan"
          variant="secondary"
          onPress={() => router.replace('/(buyer)/transaksyon')}
        />
      </View>
    );
  }

  return (
    <View style={styles.footerStack}>
      {policy.triggerLabel ? (
        <AnimoButton label={policy.triggerLabel} variant="dangerOutline" icon={X} onPress={onCancel} />
      ) : null}
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <AnimoText variant="body" color={AnimoColors.blackSecondary}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
        {value}
      </AnimoText>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
  },
});

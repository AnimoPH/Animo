import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, CheckCircle2, Info, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { FarmerCard, LockedFarmerCard } from '@/components/animo/farmer-card';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import {
  BuyerCancelDialog,
  BuyerFeedbackDialog,
  InfoNote,
  TxnHeader,
} from '@/components/animo/buyer/txn-v2';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StickyFooter } from '@/components/animo/ui/screen-bits';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { fetchCropListing } from '@/services/crop-listing-service';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import {
  cancelTransaction as cancelTransactionRpc,
  fetchTransactionByRequestId,
  fetchTransactionCounterpart,
} from '@/services/transaction-service';
import { useLanguage } from '@/hooks/use-language';
import type { CropListing } from '@/types/crop-listing';
import {
  buildProgressSteps,
  cancelPolicy,
  deriveDisplayStage,
  formatReferenceId,
  getDisplayStageLabel,
  type PurchaseOutcome,
  type TransactionCounterpart,
} from '@/types/transaction';
import { TransactionStatusRow, TransactionSummaryCard } from '@/components/animo/transaction-cycle-cards';

/**
 * Pickup coordination — there is no pickup/scheduling table in this schema,
 * so this screen makes NO Supabase write of its own. It's a purely
 * informational stop between acceptance and payment: it surfaces the
 * farmer's real contact details (revealed by RLS now that a match exists)
 * so the buyer can arrange pickup directly, then hands off to Bayad.
 */
export default function PickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, isTagalog, t } = useLanguage();

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
      const transaction = request ? await fetchTransactionByRequestId(id) : null;
      if (!request || !transaction) {
        setOutcome(null);
        return;
      }
      setOutcome({ kind: 'matched', request, transaction });
      const [listingResult, counterpartResult] = await Promise.all([
        fetchCropListing(request.listingId),
        fetchTransactionCounterpart(transaction.farmerId),
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
        <TxnHeader title="Pickup" />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || outcome.kind !== 'matched' || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title="Pickup" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoV2Colors.textSecondary}>
            {error ?? (isTagalog ? 'Hindi nahanap ang transaksyon na ito.' : 'Transaction could not be found.')}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const policy = cancelPolicy(outcome, undefined, language);

  const handleConfirmCancel = async () => {
    setCancelError(null);
    try {
      await cancelTransactionRpc(outcome.transaction.id);
      setCancelling(false);
      setShowCancelledSuccessModal(true);
    } catch (e) {
      setCancelError(
        e instanceof Error
          ? e.message
          : isTagalog
            ? 'Hindi makansela ang transaksyon.'
            : 'Could not cancel transaction.',
      );
      setCancelling(false);
    }
  };

  const stage = deriveDisplayStage(outcome);
  const requestedKg = outcome.request.requestedQuantityKg;
  const acceptedKg = outcome.transaction.quantityKg;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <TxnHeader title="Pickup" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TransactionStatusRow stage={stage} label={getDisplayStageLabel(stage, language)} />
        <DepthCard depth="flat" radius="xl" style={styles.banner}>
          <IconTile icon={CheckCircle2} tone="success" />
          <View style={styles.bannerText}>
            <AnimoText variant="subheading">
              {isTagalog ? 'Tinanggap ang Iyong Kahilingan' : 'Your Request Was Accepted'}
            </AnimoText>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {isTagalog
                ? 'Makipag-ugnayan sa magsasaka para sa oras at lokasyon ng pickup. Walang naka-sistemang iskedyul — direktang usapan ito sa pagitan ninyo.'
                : 'Coordinate with the farmer regarding pickup time and location. There is no automated schedule — arrange directly with the farmer.'}
            </AnimoText>
          </View>
        </DepthCard>

        {acceptedKg < requestedKg ? (
          <InfoNote tone="warning" icon={Info}>
            {t('buyTxV2.partialNote', { accepted: acceptedKg, requested: requestedKg })}
          </InfoNote>
        ) : null}

        <InfoNote tone="neutral" icon={Info}>
          {isTagalog
            ? 'Kapag nakuha na ang palay, magpatuloy sa pagbabayad sa magsasaka.'
            : 'Once the palay has been picked up, proceed with paying the farmer.'}
        </InfoNote>

        {listing ? (
          <TransactionSummaryCard
            listing={listing}
            quantityKg={outcome.transaction.quantityKg}
            pricePerKg={outcome.transaction.agreedPricePerKg}
            totalAmount={outcome.transaction.totalAmount}
            referenceId={formatReferenceId(outcome.request.id, 'PR')}
            language={language}
          />
        ) : null}

        {counterpart ? <FarmerCard farmer={counterpart} /> : <LockedFarmerCard />}

        <ProgressTracker
          title={isTagalog ? 'Progreso ng Transaksyon' : 'Transaction Progress'}
          steps={buildProgressSteps(outcome, 'buyer', language)}
        />

        {cancelError ? (
          <AnimoText variant="captionV2" color={AnimoV2Colors.dangerFg}>
            {cancelError}
          </AnimoText>
        ) : null}
      </ScrollView>

      <StickyFooter>
        <ChunkyButton
          label={isTagalog ? 'Magpatuloy sa Bayad' : 'Proceed to Payment'}
          icon={Check}
          onPress={() => router.push(`/(buyer)/transaksyon/${outcome.request.id}/bayad`)}
        />
        {policy.triggerLabel ? (
          <ChunkyButton
            label={policy.triggerLabel}
            variant="secondary"
            icon={X}
            textColor={AnimoV2Colors.dangerFg}
            borderColor={AnimoV2Colors.dangerSolid}
            onPress={() => setCancelling(true)}
          />
        ) : null}
      </StickyFooter>

      <BuyerCancelDialog
        visible={cancelling}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        onDismiss={() => setCancelling(false)}
        onConfirm={handleConfirmCancel}
      />

      <BuyerFeedbackDialog
        visible={showCancelledSuccessModal}
        tone="danger"
        title={isTagalog ? 'Matagumpay na Nakansela' : 'Successfully Cancelled'}
        message={isTagalog ? 'Nakansela na ang transaksyong ito.' : 'This transaction has been cancelled.'}
        confirmLabel="OK"
        onConfirm={() => {
          setShowCancelledSuccessModal(false);
          router.replace('/(buyer)/transaksyon');
        }}
      />
    </SafeAreaView>
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
    alignItems: 'flex-start',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.lg,
  },
  bannerText: { flex: 1, minWidth: 0, gap: 2 },
});

import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Info, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { FarmerCard, LockedFarmerCard } from '@/components/animo/farmer-card';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { ScreenHeader } from '@/components/animo/screen-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import {
  cancelTransaction as cancelTransactionRpc,
  fetchTransactionByRequestId,
  fetchTransactionCounterpart,
} from '@/services/transaction-service';
import {
  buildProgressSteps,
  cancelPolicy,
  type PurchaseOutcome,
  type TransactionCounterpart,
} from '@/types/transaction';

/**
 * Pickup coordination — there is no pickup/scheduling table in this schema,
 * so this screen makes NO Supabase write of its own. It's a purely
 * informational stop between acceptance and payment: it surfaces the
 * farmer's real contact details (revealed by RLS now that a match exists)
 * so the buyer can arrange pickup directly, then hands off to Bayad.
 */
export default function PickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
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
      setCounterpart(await fetchTransactionCounterpart(transaction.farmerId));
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
        <ScreenHeader title="Pickup" />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || outcome.kind !== 'matched' || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Pickup" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {error ?? 'Hindi nahanap ang transaksyon na ito.'}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const policy = cancelPolicy(outcome);

  const handleConfirmCancel = async () => {
    setCancelError(null);
    try {
      await cancelTransactionRpc(outcome.transaction.id);
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
      <ScreenHeader title="Pickup" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <AnimoText variant="h3" color={AnimoColors.black}>
            Tinanggap ang Iyong Request
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Makipag-ugnayan sa magsasaka para sa oras at lokasyon ng pickup. Walang
            naka-sistemang iskedyul — direktang usapan ito sa pagitan ninyo.
          </AnimoText>
        </View>

        {counterpart ? <FarmerCard farmer={counterpart} /> : <LockedFarmerCard />}

        <ProgressTracker steps={buildProgressSteps(outcome, 'buyer')} />

        <NoticeBanner tone="info" icon={<Info size={16} color="#2563A8" />}>
          Kapag nakuha na ang palay, magpatuloy sa pagbabayad sa magsasaka.
        </NoticeBanner>

        {cancelError ? (
          <AnimoText variant="caption" color={AnimoColors.danger}>
            {cancelError}
          </AnimoText>
        ) : null}
      </ScrollView>

      <View style={styles.footerStack}>
        <AnimoButton
          label="Magpatuloy sa Bayad"
          icon={Check}
          onPress={() => router.push(`/(buyer)/transaksyon/${outcome.request.id}/bayad`)}
        />
        {policy.triggerLabel ? (
          <AnimoButton
            label={policy.triggerLabel}
            variant="dangerOutline"
            icon={X}
            onPress={() => setCancelling(true)}
          />
        ) : null}
      </View>

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
        message="Nakansela na ang transaksyong ito."
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
    backgroundColor: AnimoColors.background,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
});

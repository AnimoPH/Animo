import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { CancelLink } from '@/components/animo/cancel-link';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { PaymentMethodCard } from '@/components/animo/payment-method-card';
import { PaymentSummary } from '@/components/animo/payment-summary';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { RequestListingCard } from '@/components/animo/request-listing-card';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  DOWNPAYMENT_PCT,
  amountPaid,
  balanceDue,
  cancelPolicy,
  formatPeso,
  getPurchaseRequest,
  progressSteps,
  requestTotal,
} from '@/constants/marketplace';

/**
 * Huling Bayad — settle the remaining balance after a passed inspection.
 *
 * Payment releases to the farmer only once the buyer confirms handover, which
 * the escrow note below the summary spells out.
 */
export default function FinalPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);
  const [disputing, setDisputing] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Huling Bayad" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const balance = balanceDue(request);
  const policy = cancelPolicy(request);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Huling Bayad" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusBadge label="Awaiting Final Payment" tone="warning" />
          <AnimoText variant="caption" color={AnimoColors.muted}>
            Bayaran ngayong araw
          </AnimoText>
        </View>

        {request.inspection ? (
          <View style={styles.passCard}>
            <CheckCircle2 size={18} color={AnimoColors.green} />
            <AnimoText
              variant="caption"
              color={AnimoColors.blackSecondary}
              style={styles.flex}>
              {request.inspection.summary}
            </AnimoText>
          </View>
        ) : null}

        <RequestListingCard request={request} />

        <PaymentSummary
          rows={[
            { label: 'Kabuuang halaga', amount: requestTotal(request) },
            {
              label: `Downpayment (${DOWNPAYMENT_PCT}%)`,
              amount: amountPaid(request),
              negative: true,
              note: request.payments[0]?.paidAt,
            },
          ]}
          total={{ label: 'Natitirang balanse', amount: balance }}
        />

        <PaymentMethodCard account="0917 •••• 567" />

        <ProgressTracker steps={progressSteps(request)} />

        <NoticeBanner tone="info" icon={<Lock size={16} color="#2563A8" />}>
          Ililipat lamang ang bayad sa magsasaka kapag nakumpirma mo ang
          pagtanggap ng palay.
        </NoticeBanner>
      </ScrollView>

      <View style={styles.footer}>
        <AnimoButton
          label={`Bayaran ang Balanse — ${formatPeso(balance)}`}
          onPress={() => router.replace('/(buyer)/transaksyon/pr-completed/resibo')}
        />
        {/*
          Past inspection the buyer can no longer cancel outright — the palay has
          been checked on-site — so this opens the dispute path instead.
        */}
        <CancelLink
          label={policy.triggerLabel}
          onPress={() => setDisputing(true)}
        />
      </View>

      <CancelRequestModal
        visible={disputing}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        onDismiss={() => setDisputing(false)}
        onConfirm={() => setDisputing(false)}
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
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  passCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.greenTint,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
  },
  flex: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.xs,
  },
});

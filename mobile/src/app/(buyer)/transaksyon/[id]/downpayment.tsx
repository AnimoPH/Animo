import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { CancelLink } from '@/components/animo/cancel-link';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { CountdownCard } from '@/components/animo/countdown-card';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { PaymentMethodCard } from '@/components/animo/payment-method-card';
import { PaymentSummary } from '@/components/animo/payment-summary';
import { RequestListingCard } from '@/components/animo/request-listing-card';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import {
  DOWNPAYMENT_PCT,
  DOWNPAYMENT_WINDOW_DAYS,
  cancelPolicy,
  downpaymentAmount,
  formatPeso,
  getPurchaseRequest,
  requestTotal,
} from '@/constants/marketplace';

/**
 * Downpayment — pay the up-front share to hold the request.
 *
 * The request auto-cancels if this is not settled inside the window, so the
 * countdown and the consequence are both stated on this screen.
 */
export default function DownpaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);
  const [cancelling, setCancelling] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Downpayment" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const total = requestTotal(request);
  const down = downpaymentAmount(request);
  const policy = cancelPolicy(request);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Downpayment" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusBadge label="Awaiting Down Payment" tone="warning" />
          <AnimoText variant="caption" color={AnimoColors.muted}>
            Naghihintay ng downpayment
          </AnimoText>
        </View>

        <CountdownCard
          label="Bayaran sa loob ng"
          remaining={request.downpaymentCountdown ?? '—'}
          footnote={`Nag-accept: ${request.acceptedAt} · Deadline: ${request.downpaymentDeadline}`}
          elapsed={0.25}
        />

        <RequestListingCard request={request} />

        <PaymentSummary
          rows={[
            { label: 'Kabuuang halaga', amount: total },
            { label: 'Balanse sa pickup', amount: total - down },
            {
              label: `Downpayment (${DOWNPAYMENT_PCT}%)`,
              amount: down,
              emphasis: true,
            },
          ]}
        />

        <PaymentMethodCard account="0917 •••• 567" />

        <NoticeBanner tone="danger" icon={<TriangleAlert size={16} color={AnimoColors.danger} />}>
          Awtomatikong makakansela ang transaksyon kung hindi makumpleto ang
          downpayment sa loob ng {DOWNPAYMENT_WINDOW_DAYS} araw.
        </NoticeBanner>
      </ScrollView>

      <View style={styles.footer}>
        <AnimoButton
          label={`Bayaran Ngayon — ${formatPeso(down)}`}
          onPress={() => router.replace(`/(buyer)/transaksyon/pr-scheduled`)}
        />
        <CancelLink
          label={policy.triggerLabel}
          onPress={() => setCancelling(true)}
        />
      </View>

      <CancelRequestModal
        visible={cancelling}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        onDismiss={() => setCancelling(false)}
        onConfirm={() => {
          setCancelling(false);
          router.replace('/(buyer)/transaksyon/pr-cancelled');
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
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.xs,
  },
});

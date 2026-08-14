import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CheckCircle2,
  Clock,
  Info,
  TriangleAlert,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { CancelLink } from '@/components/animo/cancel-link';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { FarmerCard, LockedFarmerCard } from '@/components/animo/farmer-card';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { PaymentSummary } from '@/components/animo/payment-summary';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { RequestListingCard } from '@/components/animo/request-listing-card';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  DOWNPAYMENT_PCT,
  DOWNPAYMENT_WINDOW_DAYS,
  amountPaid,
  balanceDue,
  cancelPolicy,
  downpaymentAmount,
  getPurchaseRequest,
  progressSteps,
  requestTotal,
  type CancelPolicy,
  type PurchaseRequest,
} from '@/constants/marketplace';

/**
 * Katayuan ng Transaksyon — the buyer's view of one purchase request.
 *
 * The stage drives the whole screen: which banner shows at the top, whether the
 * farmer's contact details are unlocked, and what the footer action does.
 */
export default function TransactionStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);
  const [cancelling, setCancelling] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Katayuan ng Transaksyon" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const { stage } = request;
  const isCancelled = stage === 'cancelled';
  const policy = cancelPolicy(request);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Katayuan ng Transaksyon" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <StageBanner request={request} />
        <RequestListingCard request={request} muted={isCancelled} />
        <ProgressTracker steps={progressSteps(request)} />
        <PaymentBreakdown request={request} />

        {stage === 'pending' ? <LockedFarmerCard /> : <FarmerCard farmer={request.farmer} />}

        {stage === 'accepted' ? (
          <NoticeBanner
            tone="warning"
            icon={<TriangleAlert size={16} color="#B4791A" />}>
            May {DOWNPAYMENT_WINDOW_DAYS} araw kang bayaran ang downpayment.
            Deadline: {request.downpaymentDeadline}.
          </NoticeBanner>
        ) : null}

        {isCancelled ? (
          <NoticeBanner tone="neutral" icon={<Info size={16} color={AnimoColors.muted} />}>
            Walang parusa sa pagkansela nito. Muling nakalista ang palay para sa
            ibang mamimili.
          </NoticeBanner>
        ) : null}
      </ScrollView>

      <StageFooter
        request={request}
        policy={policy}
        onCancel={() => setCancelling(true)}
      />

      <CancelRequestModal
        visible={cancelling}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        onDismiss={() => setCancelling(false)}
        onConfirm={() => {
          setCancelling(false);
          // Only a real cancellation moves the request; disputes stay put.
          if (policy.allowed) {
            router.replace('/(buyer)/transaksyon/pr-cancelled');
          }
        }}
      />
    </SafeAreaView>
  );
}

/** Top status card — icon, headline and the stage pill. */
function StageBanner({ request }: { request: PurchaseRequest }) {
  const { stage } = request;

  if (stage === 'pending') {
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
          <StatusBadge label="Pending" tone="warning" />
          <AnimoText variant="caption" color={AnimoColors.muted}>
            Inaasahan sa loob ng 24 oras
          </AnimoText>
        </View>
        <View style={styles.divider} />
        <MetaRow label="Transaction ID" value={request.reference} />
        <MetaRow label="Naipadala" value={request.sentAt} />
      </View>
    );
  }

  if (stage === 'cancelled') {
    return (
      <View style={styles.bannerCard}>
        <View style={styles.bannerRow}>
          <View style={[styles.bannerIcon, styles.bannerIconMuted]}>
            <XCircle size={20} color={AnimoColors.blackSecondary} />
          </View>
          <View style={styles.bannerText}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Nakansela ang Transaksyon
            </AnimoText>
            <AnimoText variant="caption" color={AnimoColors.muted}>
              Hindi nabayaran ang downpayment sa loob ng {DOWNPAYMENT_WINDOW_DAYS} araw
            </AnimoText>
          </View>
        </View>
        <View style={styles.bannerMeta}>
          <StatusBadge label="Cancelled" tone="neutral" />
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {request.cancelledAt}
          </AnimoText>
        </View>
        <View style={styles.divider} />
        <MetaRow label="Transaction ID" value={request.reference} />
        <MetaRow label="Dahilan" value={request.cancelReason ?? ''} />
      </View>
    );
  }

  if (stage === 'completed') {
    return (
      <View style={styles.bannerCard}>
        <View style={styles.bannerRow}>
          <View style={[styles.bannerIcon, styles.bannerIconSuccess]}>
            <CheckCircle2 size={20} color={AnimoColors.green} />
          </View>
          <View style={styles.bannerText}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Kumpleto ang Transaksyon
            </AnimoText>
            <AnimoText variant="caption" color={AnimoColors.muted}>
              Nakumpleto ang buong bayad
            </AnimoText>
          </View>
        </View>
        <View style={styles.bannerMeta}>
          <StatusBadge label="Completed" tone="success" />
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {request.payments[1]?.paidAt}
          </AnimoText>
        </View>
      </View>
    );
  }

  // accepted / downpaid / scheduled / inspected all read as "in progress".
  return (
    <View style={styles.bannerCard}>
      <View style={styles.bannerRow}>
        <View style={[styles.bannerIcon, styles.bannerIconSuccess]}>
          <CheckCircle2 size={20} color={AnimoColors.green} />
        </View>
        <View style={styles.bannerText}>
          <AnimoText variant="h3" color={AnimoColors.black}>
            Tinanggap ng Magsasaka!
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.muted}>
            Nabuksan na ang contact at lokasyon
          </AnimoText>
        </View>
      </View>
      <View style={styles.bannerMeta}>
        <StatusBadge label="Accepted" tone="success" />
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {request.acceptedAt}
        </AnimoText>
      </View>
    </View>
  );
}

/** Money breakdown, shaped to the stage. */
function PaymentBreakdown({ request }: { request: PurchaseRequest }) {
  const total = requestTotal(request);
  const down = downpaymentAmount(request);
  const paid = amountPaid(request);

  if (request.stage === 'cancelled') {
    return (
      <PaymentSummary
        rows={[
          { label: 'Kabuuang halaga', amount: total },
          { label: 'Nabayaran', amount: paid },
          { label: 'Ibabalik sa iyo', amount: paid },
        ]}
      />
    );
  }

  if (request.stage === 'completed') {
    return (
      <PaymentSummary
        rows={request.payments.map((p) => ({
          label: p.label,
          amount: p.amount,
          note: `${p.paidAt} · GCash ${p.reference}`,
        }))}
        total={{ label: 'Kabuuang binayaran', amount: paid }}
      />
    );
  }

  // Before the downpayment is settled, show what is due up front.
  if (request.stage === 'pending' || request.stage === 'accepted') {
    return (
      <PaymentSummary
        rows={[
          { label: 'Kabuuang halaga', amount: total },
          { label: 'Balanse sa pickup', amount: total - down },
          { label: `Downpayment (${DOWNPAYMENT_PCT}%)`, amount: down, emphasis: true },
        ]}
      />
    );
  }

  // Downpayment settled — show what remains.
  return (
    <PaymentSummary
      rows={[
        { label: 'Kabuuang halaga', amount: total },
        {
          label: `Downpayment (${DOWNPAYMENT_PCT}%)`,
          amount: paid,
          negative: true,
          note: request.payments[0]?.paidAt,
        },
      ]}
      total={{ label: 'Natitirang balanse', amount: balanceDue(request) }}
    />
  );
}

/** Footer action(s), depending on where the request stands. */
function StageFooter({
  request,
  policy,
  onCancel,
}: {
  request: PurchaseRequest;
  policy: CancelPolicy;
  onCancel: () => void;
}) {
  switch (request.stage) {
    case 'pending':
      return (
        <View style={styles.footer}>
          <AnimoButton
            label={policy.triggerLabel}
            variant="secondary"
            onPress={onCancel}
          />
        </View>
      );

    case 'accepted':
      return (
        <View style={styles.footer}>
          <AnimoButton
            label="Magpatuloy sa Downpayment"
            onPress={() => router.push(`/(buyer)/transaksyon/${request.id}/downpayment`)}
          />
          <CancelLink label={policy.triggerLabel} onPress={onCancel} />
        </View>
      );

    case 'downpaid':
    case 'scheduled':
      return (
        <View style={styles.footer}>
          <AnimoButton
            label="Tingnan ang Pickup"
            onPress={() => router.push(`/(buyer)/transaksyon/${request.id}/pickup`)}
          />
          <CancelLink label={policy.triggerLabel} onPress={onCancel} />
        </View>
      );

    case 'inspected':
      return (
        <View style={styles.footer}>
          <AnimoButton
            label="Magbayad ng Balanse"
            onPress={() => router.push(`/(buyer)/transaksyon/${request.id}/huling-bayad`)}
          />
          <CancelLink label={policy.triggerLabel} onPress={onCancel} />
        </View>
      );

    case 'completed':
      return (
        <View style={styles.footer}>
          <AnimoButton
            label="Tingnan ang Resibo"
            onPress={() => router.push(`/(buyer)/transaksyon/${request.id}/resibo`)}
          />
          <CancelLink label={policy.triggerLabel} onPress={onCancel} />
        </View>
      );

    case 'cancelled':
      return (
        <View style={styles.footerStack}>
          <AnimoButton
            label="Mag-browse ng Ibang Listing"
            onPress={() => router.replace('/(buyer)/palengke')}
          />
          <AnimoButton
            label="Tingnan ang Kasaysayan"
            variant="secondary"
            onPress={() => router.replace('/(buyer)/transaksyon')}
          />
        </View>
      );
  }
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
  bannerIconSuccess: {
    backgroundColor: AnimoColors.greenTint,
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
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.xs,
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
});

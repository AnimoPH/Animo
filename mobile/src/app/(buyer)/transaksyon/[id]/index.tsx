import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Check,
  Clock,
  Info,
  X,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { LockedFarmerCard } from '@/components/animo/farmer-card';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { PaymentSummary } from '@/components/animo/payment-summary';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { RequestListingCard } from '@/components/animo/request-listing-card';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  cancelPolicy,
  getPurchaseRequest,
  progressSteps,
  requestTotal,
  type CancelPolicy,
  type PurchaseRequest,
} from '@/constants/marketplace';

/**
 * Katayuan ng Transaksyon.
 *
 * Automatically forwards to the active step in the flow:
 * - accepted / scheduled -> pickup screen
 * - inspected -> bayad screen
 * - completed / reviewed -> resibo screen
 * - pending / cancelled -> shows status screen
 */
export default function TransactionStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelledSuccessModal, setShowCancelledSuccessModal] = useState(false);

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

  // Directly proceed to pickup when farmer has accepted
  if (request.stage === 'accepted' || request.stage === 'scheduled') {
    return <Redirect href={`/(buyer)/transaksyon/${request.id}/pickup`} />;
  }

  if (request.stage === 'inspected') {
    return <Redirect href={`/(buyer)/transaksyon/${request.id}/bayad`} />;
  }

  if (request.stage === 'completed' || request.stage === 'reviewed') {
    return <Redirect href={`/(buyer)/transaksyon/${request.id}/resibo`} />;
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

        <LockedFarmerCard />

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

      {/* Confirmation sheet before cancellation */}
      <CancelRequestModal
        visible={cancelling}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        onDismiss={() => setCancelling(false)}
        onConfirm={() => {
          setCancelling(false);
          setShowCancelledSuccessModal(true);
        }}
      />

      {/* Successfully Cancelled Notification Modal */}
      <FeedbackModal
        visible={showCancelledSuccessModal}
        tone="danger"
        title="Matagumpay na Nakansela"
        message="Nakansela na ang transaksyong ito. Muling nakalista ang palay para sa ibang mamimili."
        confirmLabel="OK"
        onConfirm={() => {
          setShowCancelledSuccessModal(false);
          router.replace('/(buyer)/transaksyon/pr-cancelled');
        }}
      />
    </SafeAreaView>
  );
}

/** Top status card — icon, headline and the stage pill. */
function StageBanner({ request }: { request: PurchaseRequest }) {
  const { stage } = request;

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
              {request.cancelReason ?? 'Kinansela ang transaksyon'}
            </AnimoText>
          </View>
        </View>
        <View style={styles.bannerMeta}>
          <StatusBadge label="Nakansela" tone="neutral" />
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {request.cancelledAt}
          </AnimoText>
        </View>
        <View style={styles.divider} />
        <MetaRow label="Transaction ID" value={request.reference} />
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
        <StatusBadge label="Naghihintay" tone="warning" />
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

/** Money breakdown. */
function PaymentBreakdown({ request }: { request: PurchaseRequest }) {
  const total = requestTotal(request);

  return (
    <PaymentSummary
      rows={[
        { label: 'Dami ng Palay', amount: request.quantityKg },
        { label: 'Presyo bawat kilo', amount: request.pricePerKg },
      ]}
      total={{ label: 'Kabuuang babayaran sa pickup', amount: total }}
    />
  );
}

/** Footer action(s). */
function StageFooter({
  request,
  policy,
  onCancel,
}: {
  request: PurchaseRequest;
  policy: CancelPolicy;
  onCancel: () => void;
}) {
  if (request.stage === 'cancelled') {
    return (
      <View style={styles.footerStack}>
        <AnimoButton
          label="Mag-browse ng Ibang Listing"
          icon={Check}
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

  return (
    <View style={styles.footerStack}>
      {policy.triggerLabel ? (
        <AnimoButton
          label={policy.triggerLabel}
          variant="dangerOutline"
          icon={X}
          onPress={onCancel}
        />
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

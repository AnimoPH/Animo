import { AlertTriangle, CheckCircle2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { V2Dialog } from '@/components/animo/ui/dialog';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useCountdownTo } from '@/hooks/use-countdown-to';
import { useLanguage } from '@/hooks/use-language';
import { cancelPurchaseRequestFailureMessage } from '@/services/purchase-request-service';

const SUCCESS_HOLD_MS = 1600; // how long the success message shows before redirect

const RING_SIZE = 148;
const RING_STROKE = 12;

type Phase = 'counting' | 'cancelling' | 'success';

export type BidConfirmationModalProps = {
  visible: boolean;
  summary: string; // e.g. "Palay RC160 · 200 kg"
  total: number;
  /** Server-set cancel_deadline (submitted_at + 30s) — never a hardcoded window. */
  cancelDeadline: string | null;
  /** Buyer cancelled within the window — calls the real RPC, then dismisses. */
  onCancel: () => Promise<void>;
  /** Window elapsed — the request stands, proceed to Transaksyon. */
  onComplete: () => void;
};

/** Countdown ring that drains from 30 seconds, with the seconds in the middle. */
function CountdownRing({ progress, seconds, unit }: { progress: number; seconds: number; unit: string }) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={styles.ringWrap} accessible accessibilityLabel={`${seconds} ${unit}`}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={AnimoV2Colors.borderDefault}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={AnimoV2Colors.actionPrimary}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <AnimoText variant="priceHero">{seconds}</AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {unit}
        </AnimoText>
      </View>
    </View>
  );
}

/**
 * Post-submit confirmation. The purchase request already exists in the DB the
 * instant this modal opens — this is a real cancellation window (backed by
 * `purchaserequest.cancel_deadline`), not a delay before the request "really"
 * commits. Once the countdown hits zero the request simply stands: a success
 * message shows briefly, then `onComplete` fires.
 */
export function BidConfirmationModal({
  visible,
  summary,
  total,
  cancelDeadline,
  onCancel,
  onComplete,
}: BidConfirmationModalProps) {
  const { t } = useLanguage();
  const secondsLeft = useCountdownTo(visible ? cancelDeadline : null);
  const [phase, setPhase] = useState<Phase>('counting');
  const [cancelError, setCancelError] = useState<string | null>(null);
  /** Presentation only: shows "are you sure?" in place of the countdown. The countdown keeps running. */
  const [confirming, setConfirming] = useState(false);

  // Reset state whenever the modal opens.
  useEffect(() => {
    if (visible) {
      setPhase('counting');
      setCancelError(null);
      setConfirming(false);
    }
  }, [visible]);

  // Deadline elapsed — commit and switch to the success phase.
  useEffect(() => {
    if (!visible || phase !== 'counting') return;
    if (secondsLeft <= 0) setPhase('success');
  }, [visible, phase, secondsLeft]);

  // Hold the success message, then hand off to the redirect.
  useEffect(() => {
    if (!visible || phase !== 'success') return;
    const id = setTimeout(onComplete, SUCCESS_HOLD_MS);
    return () => clearTimeout(id);
  }, [visible, phase, onComplete]);

  const handleCancel = async () => {
    setConfirming(false);
    setPhase('cancelling');
    setCancelError(null);
    try {
      await onCancel();
    } catch (error) {
      setCancelError(cancelPurchaseRequestFailureMessage(error));
      setPhase('counting');
    }
  };

  const windowSeconds = 30; // display-only reference for the ring; the real gate is cancelDeadline itself
  const progress = Math.min(1, secondsLeft / windowSeconds);
  const unit = secondsLeft === 1 ? t('buyReqV2.secondOne') : t('buyReqV2.secondMany');

  const summaryBox = (
    <View style={styles.summaryBox}>
      <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.center}>
        {summary}
      </AnimoText>
      <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand} style={styles.center}>
        {formatPeso(total)}
      </AnimoText>
    </View>
  );

  if (phase === 'success') {
    return (
      <V2Dialog
        visible={visible}
        onClose={() => {}}
        dismissable={false}
        icon={CheckCircle2}
        iconTone="success"
        title={t('buyReqV2.sentSuccess')}
        message={t('buyReqV2.redirecting')}>
        {summaryBox}
      </V2Dialog>
    );
  }

  // Asking "are you sure?" while the window is still open.
  if (confirming && phase === 'counting') {
    return (
      <V2Dialog
        visible={visible}
        onClose={() => {}}
        dismissable={false}
        icon={AlertTriangle}
        iconTone="danger"
        title={t('buyReqV2.cancelConfirmTitle')}
        message={t('buyReqV2.cancelConfirmBody', { s: secondsLeft })}
        actions={
          <>
            <ChunkyButton variant="danger" icon={X} label={t('buyReqV2.cancelConfirmYes')} onPress={handleCancel} />
            <ChunkyButton variant="secondary" label={t('buyReqV2.cancelConfirmNo')} onPress={() => setConfirming(false)} />
          </>
        }
      />
    );
  }

  return (
    <V2Dialog
      visible={visible}
      onClose={() => {}}
      dismissable={false}
      title={t('buyReqV2.sentTitle')}
      message={t('buyReqV2.sentBody')}
      actions={
        <ChunkyButton
          variant="secondary"
          icon={X}
          label={phase === 'cancelling' ? t('buyReqV2.cancelling') : t('buyReqV2.cancelButton')}
          textColor={AnimoV2Colors.dangerFg}
          borderColor={AnimoV2Colors.dangerSolid}
          disabled={phase === 'cancelling'}
          onPress={() => setConfirming(true)}
        />
      }>
      <View style={styles.ringRow}>
        <CountdownRing progress={progress} seconds={secondsLeft} unit={unit} />
      </View>
      {summaryBox}
      {cancelError ? (
        <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.center}>
          {cancelError}
        </AnimoText>
      ) : null}
    </V2Dialog>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  ringRow: { alignItems: 'center' },
  ringWrap: { width: RING_SIZE, height: RING_SIZE },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBox: {
    backgroundColor: AnimoV2Colors.surfaceMuted,
    borderRadius: AnimoV2Radius.lg,
    padding: AnimoV2Spacing.md,
    gap: 2,
  },
});

import { CheckCircle2, Timer, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useCountdownTo } from '@/hooks/use-countdown-to';

const SUCCESS_HOLD_MS = 1600; // how long the success message shows before redirect

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
  const secondsLeft = useCountdownTo(visible ? cancelDeadline : null);
  const [phase, setPhase] = useState<Phase>('counting');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Reset state whenever the modal opens.
  useEffect(() => {
    if (visible) {
      setPhase('counting');
      setCancelError(null);
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
    setPhase('cancelling');
    setCancelError(null);
    try {
      await onCancel();
    } catch (error) {
      // The deadline may have lapsed server-side between the last tick and
      // this tap — surface it and let the countdown's own effect take over.
      setCancelError(error instanceof Error ? error.message : 'Hindi makansela ang request.');
      setPhase('counting');
    }
  };

  const windowSeconds = 30; // display-only reference for the progress bar; the real gate is cancelDeadline itself
  const progress = Math.min(1, secondsLeft / windowSeconds);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {phase === 'success' ? (
            <>
              <View style={styles.iconCircle}>
                <CheckCircle2 size={32} color={AnimoColors.green} />
              </View>
              <AnimoText variant="h2" color={AnimoColors.black} style={styles.center}>
                Naipadala ang iyong request!
              </AnimoText>

              <View style={styles.summaryBox}>
                <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.center}>
                  {summary}
                </AnimoText>
                <AnimoText variant="price" color={AnimoColors.green} style={styles.center}>
                  {formatPeso(total)}
                </AnimoText>
              </View>

              <AnimoText variant="caption" color={AnimoColors.muted} style={styles.center}>
                Inililipat kayo sa mga transaksyon…
              </AnimoText>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Timer size={28} color={AnimoColors.green} />
              </View>

              <AnimoText variant="h2" color={AnimoColors.black} style={styles.center}>
                Naipadala ang iyong request
              </AnimoText>

              <View style={styles.countdown}>
                <AnimoText variant="display" color={AnimoColors.green}>
                  {secondsLeft}
                </AnimoText>
                <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                  {' '}
                  segundo
                </AnimoText>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>

              <View style={styles.summaryBox}>
                <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.center}>
                  {summary}
                </AnimoText>
                <AnimoText variant="price" color={AnimoColors.black} style={styles.center}>
                  {formatPeso(total)}
                </AnimoText>
              </View>

              {cancelError ? (
                <AnimoText variant="caption" color={AnimoColors.danger} style={styles.center}>
                  {cancelError}
                </AnimoText>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={phase === 'cancelling'}
                onPress={handleCancel}
                style={({ pressed }) => [
                  styles.cancelButton,
                  (pressed || phase === 'cancelling') && styles.pressed,
                ]}>
                <X size={20} color={AnimoColors.danger} />
                <AnimoText variant="button" color={AnimoColors.danger}>
                  {phase === 'cancelling' ? 'Kinakansela…' : 'Kanselahin'}
                </AnimoText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
  },
  sheet: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: AnimoSpacing.xs,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: AnimoColors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: AnimoColors.green,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: AnimoColors.surface,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: 2,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    width: '100%',
    height: 56,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1.5,
    borderColor: AnimoColors.danger,
  },
  pressed: {
    opacity: 0.85,
  },
});

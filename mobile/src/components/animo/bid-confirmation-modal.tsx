import { CheckCircle2, Timer, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';

const CANCEL_WINDOW = 30; // seconds the buyer can still cancel
const SUCCESS_HOLD_MS = 1600; // how long the success message shows before redirect

type Phase = 'counting' | 'success';

export type BidConfirmationModalProps = {
  visible: boolean;
  summary: string; // e.g. "Palay RC160 · 200 kg · Baliwag"
  total: number;
  /** Cancel within the window — dismisses and returns to the bid screen. */
  onCancel: () => void;
  /** Window elapsed (or auto-continue) — proceed to the transaction. */
  onComplete: () => void;
};

/**
 * Post-bid confirmation. The escrow contract is "locked"; the buyer has a
 * 30-second window to cancel before a dispute is required. When the countdown
 * hits zero the bid is committed: a success message shows briefly, then
 * `onComplete` fires (the bid screen redirects to Transaksyon).
 */
export function BidConfirmationModal({
  visible,
  summary,
  total,
  onCancel,
  onComplete,
}: BidConfirmationModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(CANCEL_WINDOW);
  const [phase, setPhase] = useState<Phase>('counting');

  // Reset state whenever the modal opens.
  useEffect(() => {
    if (visible) {
      setSecondsLeft(CANCEL_WINDOW);
      setPhase('counting');
    }
  }, [visible]);

  // Countdown tick — on reaching zero, commit and switch to the success phase.
  useEffect(() => {
    if (!visible || phase !== 'counting') return;
    if (secondsLeft <= 0) {
      setPhase('success');
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [visible, phase, secondsLeft]);

  // Hold the success message, then hand off to the redirect.
  useEffect(() => {
    if (!visible || phase !== 'success') return;
    const id = setTimeout(onComplete, SUCCESS_HOLD_MS);
    return () => clearTimeout(id);
  }, [visible, phase, onComplete]);

  const progress = secondsLeft / CANCEL_WINDOW;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {phase === 'success' ? (
            <>
              <View style={styles.iconCircle}>
                <CheckCircle2 size={32} color={AnimoColors.green} />
              </View>
              <AnimoText variant="h2" color={AnimoColors.black} style={styles.center}>
                Matagumpay na naisagawa ang bid!
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.center}>
                Na-lock na ang escrow smart contract. Makikita ninyo ito sa inyong mga transaksyon.
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
                Naipasa ang inyong bid
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.center}>
                Ginawa na ang escrow smart contract sa Polygon PoS. Maaari mo pang kanselahin ang
                bid sa loob ng 30 segundo.
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

              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                <X size={20} color={AnimoColors.danger} />
                <AnimoText variant="button" color={AnimoColors.danger}>
                  Kanselahin
                </AnimoText>
              </Pressable>

              <AnimoText variant="caption" color={AnimoColors.muted} style={styles.center}>
                Pagkatapos ng 30 segundo, kailangan ng dispute para makansela ang transaksyon.
              </AnimoText>
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

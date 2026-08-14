import { TriangleAlert, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type CancelRequestModalProps = {
  visible: boolean;
  /** Headline, e.g. "Kanselahin ang request?" */
  title: string;
  /** What cancelling does at this stage. */
  body: string;
  /** Consequence lines — refunds, forfeits, re-listing. */
  consequences: string[];
  /** Label for the destructive action. */
  confirmLabel: string;
  /** Dismiss without cancelling. */
  onDismiss: () => void;
  /** Confirm the cancellation. */
  onConfirm: () => void;
};

/**
 * Confirmation sheet for cancelling a purchase request.
 *
 * The consequences differ by stage — before the downpayment nothing is at
 * stake, after it money is already in escrow — so the caller supplies them
 * rather than this component assuming.
 */
export function CancelRequestModal({
  visible,
  title,
  body,
  consequences,
  confirmLabel,
  onDismiss,
  onConfirm,
}: CancelRequestModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.iconCircle}>
            <TriangleAlert size={28} color={AnimoColors.danger} />
          </View>

          <AnimoText variant="h2" color={AnimoColors.black} style={styles.center}>
            {title}
          </AnimoText>

          <AnimoText
            variant="body"
            color={AnimoColors.blackSecondary}
            style={styles.center}>
            {body}
          </AnimoText>

          {consequences.length > 0 ? (
            <ScrollView
              style={styles.consequenceBox}
              contentContainerStyle={styles.consequenceInner}
              showsVerticalScrollIndicator={false}>
              {consequences.map((line) => (
                <View key={line} style={styles.consequenceRow}>
                  <View style={styles.bullet} />
                  <AnimoText
                    variant="caption"
                    color={AnimoColors.blackSecondary}
                    style={styles.flex}>
                    {line}
                  </AnimoText>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
            <X size={20} color={AnimoColors.white} />
            <AnimoText variant="button" color={AnimoColors.white}>
              {confirmLabel}
            </AnimoText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [styles.dismissButton, pressed && styles.pressed]}>
            <AnimoText variant="button" color={AnimoColors.black}>
              Huwag ituloy
            </AnimoText>
          </Pressable>
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
    backgroundColor: AnimoColors.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  consequenceBox: {
    width: '100%',
    maxHeight: 168,
    backgroundColor: AnimoColors.surface,
    borderRadius: AnimoRadius.md,
  },
  consequenceInner: {
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: AnimoColors.muted,
    marginTop: 6,
  },
  flex: {
    flex: 1,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    width: '100%',
    height: 56,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.danger,
  },
  dismissButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1.5,
    borderColor: AnimoColors.border,
  },
  pressed: {
    opacity: 0.85,
  },
});

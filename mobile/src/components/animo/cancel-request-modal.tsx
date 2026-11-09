import { AlertTriangle, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { V2Dialog } from '@/components/animo/ui/dialog';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';

export type CancelRequestModalProps = {
  visible: boolean;
  /** Headline, e.g. "Kanselahin ang kahilingan?" */
  title: string;
  /** What cancelling does at this stage. */
  body: string;
  /** Consequence lines — refunds, forfeits, re-listing. */
  consequences: string[];
  /** Label for the destructive action. */
  confirmLabel: string;
  /** Dismiss without cancelling. Defaults to the app-language label. */
  dismissLabel?: string;
  /** Dismiss without cancelling. */
  onDismiss: () => void;
  /** Confirm the cancellation. */
  onConfirm: () => void;
};

/**
 * Confirmation dialog for cancelling a purchase request.
 *
 * The consequences differ by stage, so the caller supplies them
 * rather than this component assuming.
 */
export function CancelRequestModal({
  visible,
  title,
  body,
  consequences,
  confirmLabel,
  dismissLabel,
  onDismiss,
  onConfirm,
}: CancelRequestModalProps) {
  const { t } = useLanguage();

  return (
    <V2Dialog
      visible={visible}
      onClose={onDismiss}
      icon={AlertTriangle}
      iconTone="danger"
      title={title}
      message={body}
      actions={
        <>
          <ChunkyButton variant="danger" icon={X} label={confirmLabel} onPress={onConfirm} />
          <ChunkyButton variant="secondary" label={dismissLabel ?? t('modal.dontProceed')} onPress={onDismiss} />
        </>
      }>
      {consequences.length > 0 ? (
        <View style={styles.consequenceBox}>
          {consequences.map((line) => (
            <View key={line} style={styles.consequenceRow}>
              <View style={styles.bullet} />
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
                {line}
              </AnimoText>
            </View>
          ))}
        </View>
      ) : null}
    </V2Dialog>
  );
}

const styles = StyleSheet.create({
  consequenceBox: {
    backgroundColor: AnimoV2Colors.surfaceMuted,
    borderRadius: AnimoV2Radius.lg,
    padding: AnimoV2Spacing.md,
    gap: AnimoV2Spacing.sm,
  },
  consequenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: AnimoV2Spacing.sm },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AnimoV2Colors.dangerSolid,
    marginTop: 6,
  },
  flex: { flex: 1 },
});

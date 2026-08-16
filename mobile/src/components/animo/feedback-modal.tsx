import {
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react-native';
import { Modal, StyleSheet, View } from 'react-native';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type FeedbackTone = 'success' | 'danger' | 'warning' | 'info';

export type FeedbackModalProps = {
  visible: boolean;
  tone?: FeedbackTone;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/**
 * Reusable modal for success, error, warning, and info notifications across the app.
 */
export function FeedbackModal({
  visible,
  tone = 'success',
  title,
  message,
  confirmLabel = 'Magpatuloy',
  onConfirm,
  secondaryLabel,
  onSecondary,
}: FeedbackModalProps) {
  const getToneDetails = () => {
    switch (tone) {
      case 'success':
        return {
          icon: <CheckCircle2 size={36} color={AnimoColors.green} />,
          bg: AnimoColors.greenTint,
          buttonVariant: 'primary' as const,
        };
      case 'danger':
        return {
          icon: <XCircle size={36} color={AnimoColors.danger} />,
          bg: AnimoColors.dangerTint,
          buttonVariant: 'danger' as const,
        };
      case 'warning':
        return {
          icon: <AlertCircle size={36} color="#B4791A" />,
          bg: '#FDF6E4',
          buttonVariant: 'primary' as const,
        };
      case 'info':
        return {
          icon: <Info size={36} color="#2563A8" />,
          bg: '#EAF2FB',
          buttonVariant: 'primary' as const,
        };
    }
  };

  const { icon, bg, buttonVariant } = getToneDetails();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: bg }]}>
            {icon}
          </View>

          <View style={styles.textContainer}>
            <AnimoText variant="h2" color={AnimoColors.black} style={styles.textCenter}>
              {title}
            </AnimoText>
            <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.textCenter}>
              {message}
            </AnimoText>
          </View>

          <View style={styles.actions}>
            <AnimoButton
              label={confirmLabel}
              variant={buttonVariant}
              onPress={onConfirm}
            />
            {secondaryLabel && onSecondary ? (
              <AnimoButton
                label={secondaryLabel}
                variant="secondary"
                onPress={onSecondary}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: AnimoSpacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    alignItems: 'center',
    gap: AnimoSpacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  textCenter: {
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: AnimoSpacing.sm,
  },
});

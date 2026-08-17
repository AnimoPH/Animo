import { LogOut } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AnimoColors,
  AnimoType,
  AnimoSpacing,
  AnimoRadius,
} from '../constants/animo';

interface SignOutModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Branded sign-out confirmation modal. Tapping the overlay or Huwag na cancels;
 * Mag-sign Out confirms. Logout is left to the caller.
 */
export default function SignOutModal({
  visible,
  onConfirm,
  onCancel,
}: SignOutModalProps) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(40);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onCancel}
        />
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
            },
          ]}>
          <View style={styles.iconContainer}>
            <LogOut size={32} color={AnimoColors.caution} />
          </View>

          <Text style={styles.title}>Mag-sign Out?</Text>
          <Text style={styles.body}>
            Sigurado ka bang nais mong mag-logout sa iyong account?
          </Text>

          {/* <View style={styles.divider} /> */}

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
              <Text style={styles.confirmLabel}>Confirm</Text>
              <LogOut size={16} color={AnimoColors.white} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.6)',
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: AnimoSpacing.xxl,
    padding: AnimoSpacing.xl,
    alignItems: 'center',
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    width: 320,
    zIndex: 1,
  },
  iconContainer: {
    width: 72,
    height: 72,
    backgroundColor: AnimoColors.cautionLight,
    borderRadius: AnimoRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AnimoSpacing.lg,
  },
  title: {
    ...AnimoType.h2,
    color: AnimoColors.textHighEmphasis,
    textAlign: 'center',
  },
  body: {
    ...AnimoType.body,
    color: AnimoColors.textMediumEmphasis,
    textAlign: 'center',
    marginTop: AnimoSpacing.sm,
    // lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
    width: '100%',
    marginTop: AnimoSpacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
    marginTop: AnimoSpacing.xl,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: AnimoColors.surfaceSecondary,
    borderRadius: AnimoRadius.md,
    paddingVertical: AnimoSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: AnimoColors.caution,
    borderRadius: AnimoRadius.md,
    paddingVertical: AnimoSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: AnimoSpacing.xs,
  },
  confirmLabel: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});

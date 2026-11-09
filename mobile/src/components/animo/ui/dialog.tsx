import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing, type StatusTone } from '@/constants/animo';

export type V2DialogProps = {
  visible: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  iconTone?: StatusTone;
  title: string;
  message?: string;
  /** Extra body content between the text and the buttons. */
  children?: ReactNode;
  /** Stacked buttons (use ChunkyButton). */
  actions?: ReactNode;
  /** When false the scrim tap does not dismiss (e.g. while submitting). */
  dismissable?: boolean;
  /**
   * Set when the body holds a text input: the dialog moves up out of the keyboard's way, and taps
   * on its buttons work while the keyboard is open instead of first just closing it.
   */
  avoidKeyboard?: boolean;
};

/** Centered dialog: 28 radius, big icon circle, title, text, stacked buttons. Scrim is dark green 55%. */
export function V2Dialog({
  visible,
  onClose,
  icon,
  iconTone = 'success',
  title,
  message,
  children,
  actions,
  dismissable = true,
  avoidKeyboard = false,
}: V2DialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissable ? onClose : undefined}
      statusBarTranslucent>
      <KeyboardAvoidingView
        enabled={avoidKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.scrimMid}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onClose : undefined}
          accessibilityLabel="Isara"
        />
        <View style={styles.dialog} accessibilityViewIsModal>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps={avoidKeyboard ? 'handled' : 'never'}
            contentContainerStyle={{ gap: AnimoV2Spacing.lg }}>
            <View style={styles.top}>
              {icon ? <IconTile icon={icon} tone={iconTone} size={72} solid /> : null}
              <AnimoText variant="heading" style={{ textAlign: 'center' }}>
                {title}
              </AnimoText>
              {message ? (
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={{ textAlign: 'center' }}>
                  {message}
                </AnimoText>
              ) : null}
            </View>
            {children}
            {actions ? <View style={{ gap: AnimoV2Spacing.md }}>{actions}</View> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type V2SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Bottom sheet with top radius 28 and the dark green scrim. */
export function V2Sheet({ visible, onClose, title, children }: V2SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrimBottom}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Isara" />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, AnimoV2Spacing.lg) + AnimoV2Spacing.md }]}
          accessibilityViewIsModal>
          <ScrollView bounces={false} contentContainerStyle={{ gap: AnimoV2Spacing.lg }}>
            {title ? <AnimoText variant="heading">{title}</AnimoText> : null}
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrimMid: { flex: 1, backgroundColor: AnimoV2Colors.scrim, justifyContent: 'center', padding: AnimoV2Spacing.xl },
  scrimBottom: { flex: 1, backgroundColor: AnimoV2Colors.scrim, justifyContent: 'flex-end' },
  dialog: {
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderRadius: AnimoV2Radius.xl,
    padding: AnimoV2Spacing.lg,
    paddingTop: 20,
    maxHeight: '90%',
  },
  top: { alignItems: 'center', gap: AnimoV2Spacing.md },
  sheet: {
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderTopLeftRadius: AnimoV2Radius.xl,
    borderTopRightRadius: AnimoV2Radius.xl,
    padding: AnimoV2Spacing.lg,
    paddingTop: 20,
    maxHeight: '92%',
  },
});

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { LoginPhoneInput } from '@/components/animo/login-phone-input';
import {
  AnimoColors,
  AnimoLoginColors,
  AnimoRadius,
  AnimoSpacing,
} from '@/constants/animo';

export type LoginFormSectionProps = {
  phone: string;
  onChangePhone: (value: string) => void;
  errorMessage?: string;
  onClearAccount: () => void;
  primaryLabel: string;
  primaryDisabled: boolean;
  submitting: boolean;
  onPrimary: () => void;
  onRegister: () => void;
  footer: ReactNode;
  devSlot?: ReactNode;
};

/** Dark-green form card with white inner surface for the login phone step. */
export function LoginFormSection({
  phone,
  onChangePhone,
  errorMessage,
  onClearAccount,
  primaryLabel,
  primaryDisabled,
  submitting,
  onPrimary,
  onRegister,
  footer,
  devSlot,
}: LoginFormSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.whiteCard}>
        <View style={styles.labelRow}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            Numero ng Telepono
          </AnimoText>
          <Pressable
            accessibilityRole="link"
            onPress={onClearAccount}
            style={styles.linkTouch}>
            <AnimoText
              variant="tag"
              color={AnimoLoginColors.linkOnWhite}
              style={styles.link}>
              Ibang account?
            </AnimoText>
          </Pressable>
        </View>

        <LoginPhoneInput
          value={phone}
          onChangeText={onChangePhone}
          hint="Padadalhan namin ng OTP sa numerong ito."
          error={Boolean(errorMessage)}
        />

        {errorMessage ? (
          <AnimoText variant="body" color={AnimoColors.danger}>
            {errorMessage}
          </AnimoText>
        ) : null}

        <AnimoButton
          label={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
          loading={submitting}
          style={styles.primaryButton}
        />

        <View style={styles.registerRow}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Wala pang account?{' '}
          </AnimoText>
          <Pressable accessibilityRole="link" onPress={onRegister} style={styles.linkTouch}>
            <AnimoText
              variant="bodyEmphasis"
              color={AnimoLoginColors.linkOnWhite}
              style={styles.link}>
              Mag-register
            </AnimoText>
          </Pressable>
        </View>
      </View>

      {footer}
      {devSlot}
    </View>
  );
}

const CARD_TOP_RADIUS = 32;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: AnimoLoginColors.brandGreen,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    paddingTop: AnimoSpacing.lg,
    paddingHorizontal: AnimoSpacing.lg,
  },
  whiteCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  link: {
    textDecorationLine: 'underline',
  },
  linkTouch: {
    minWidth: 56,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoLoginColors.brandGreen,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

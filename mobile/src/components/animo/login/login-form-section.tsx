import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AnimoButton } from "@/components/animo/animo-button";
import { AnimoText } from "@/components/animo/animo-text";
import { LoginPhoneInput } from "@/components/animo/login-phone-input";
import { NoticeBanner } from "@/components/animo/notice-banner";
import {
  AnimoColors,
  AnimoLoginColors,
  AnimoRadius,
  AnimoSpacing,
} from "@/constants/animo";

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

/** Dark-green form card for the login phone step — fields sit directly on the green surface. */
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
      <View style={styles.contentGroup}>
        {/* Header title */}
        <View style={styles.headingBlock}>
          <AnimoText variant="h1" color={AnimoLoginColors.textOnGreen}>
            Welcome to Animo
          </AnimoText>
          <AnimoText variant="body" color={AnimoLoginColors.textOnGreen}>
            Sign in now and start exploring our app.
          </AnimoText>
        </View>

        {/* Form */}
        <View style={styles.formBlock}>
          {/* Upper Section */}
          <View style={styles.upperSection}>
            {/* Input Form */}
            <View style={styles.labelRow}>
              <AnimoText variant="button" color={AnimoColors.surfacePrimary}>
                Numero ng Telepono
              </AnimoText>
              <Pressable
                accessibilityRole="link"
                onPress={onClearAccount}
                hitSlop={LINK_HIT_SLOP}
                style={styles.linkTouch}
              >
                <AnimoText
                  variant="tag"
                  color={AnimoLoginColors.linkOnGreen}
                  style={styles.link}
                >
                  Ibang account?
                </AnimoText>
              </Pressable>
            </View>

            <LoginPhoneInput
              value={phone}
              onChangeText={onChangePhone}
              // hint="Padadalhan namin ng OTP sa numerong ito."
              hintColor={AnimoLoginColors.textOnGreen}
              error={Boolean(errorMessage)}
            />
          </View>
          {errorMessage ? (
            <NoticeBanner tone="danger">{errorMessage}</NoticeBanner>
          ) : null}

          {/* Bottom Section */}
          <View style={styles.lowerSection}>
            {/* Button Section */}
            <AnimoButton
              label={primaryLabel}
              onPress={onPrimary}
              disabled={primaryDisabled}
              loading={submitting}
              variant="primary"
              style={styles.primaryButton}
              textColor={AnimoColors.accentPrimary}
            />

            <View style={styles.registerRow}>
              <AnimoText variant="body" color={AnimoLoginColors.textOnGreen}>
                Wala pang account?{" "}
              </AnimoText>
              <Pressable
                accessibilityRole="link"
                onPress={onRegister}
                hitSlop={LINK_HIT_SLOP}
                style={styles.linkTouch}
              >
                <AnimoText
                  variant="bodyEmphasis"
                  color={AnimoLoginColors.linkOnGreen}
                  style={styles.link}
                >
                  Mag-register
                </AnimoText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footerGroup}>
        {/* Terms & Policy */}
        {/* {footer} */}

        {/* Dev Mode */}
        {devSlot}
      </View>
    </View>
  );
}

const CARD_TOP_RADIUS = 32;
const LINK_HIT_SLOP = { top: 16, bottom: 16, left: 8, right: 8 };

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexShrink: 0,
    marginTop: AnimoSpacing.lg,
    backgroundColor: AnimoLoginColors.brandGreen,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    paddingTop: AnimoSpacing.xl,
    paddingHorizontal: AnimoSpacing.xl,
  },
  contentGroup: {
    flexGrow: 0,
    flexShrink: 0,
    gap: AnimoSpacing.xl,
  },
  headingBlock: {
    gap: AnimoSpacing.xs,
  },
  formBlock: {
    gap: AnimoSpacing.xl,
  },
  footerGroup: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: AnimoSpacing.xl,
  },
  upperSection: {
    gap: AnimoSpacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AnimoSpacing.sm,
  },
  link: {
    textDecorationLine: "underline",
  },
  linkTouch: {
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    // minHeight: 56,
    backgroundColor: AnimoColors.accentSecondaryLight,
    paddingVertical: AnimoSpacing.lg,
    borderRadius: AnimoRadius.md,
  },
  lowerSection: {
    gap: AnimoSpacing.lg,
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});

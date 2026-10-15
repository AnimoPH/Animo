import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

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
import { useLanguage } from "@/hooks/use-language";

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
  const { t } = useLanguage();
  // Short screens tighten the card so the sign-in button stays above the fold.
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < SHORT_SCREEN_DP;

  // The card rises to meet the hero once, on mount.
  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(22);

  useEffect(() => {
    cardOpacity.value = withDelay(
      140,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    cardTranslate.value = withDelay(
      140,
      withTiming(0, { duration: 680, easing: Easing.out(Easing.cubic) }),
    );
  }, [cardOpacity, cardTranslate]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  return (
    <Animated.View style={[styles.container, compact && styles.containerCompact, cardStyle]}>
      {/* Warm highlight along the card's top lip, so the green reads as lit
          from the hero above rather than as a flat slab. */}
      <View style={styles.topHighlight} pointerEvents="none" />

      <View style={[styles.contentGroup, compact && styles.contentGroupCompact]}>
        {/* Header title */}
        <View style={styles.headingBlock}>
          <AnimoText
            variant={compact ? 'h2' : 'h1'}
            color={AnimoLoginColors.textOnGreen}>
            {t('login.welcomeTitle')}
          </AnimoText>
          <AnimoText
            variant={compact ? 'caption' : 'body'}
            color={AnimoLoginColors.textOnGreen}
            style={styles.subtitle}>
            {t('login.welcomeWarmSubtitle')}
          </AnimoText>
        </View>

        {/* Form */}
        <View style={[styles.formBlock, compact && styles.formBlockCompact]}>
          {/* Upper Section */}
          <View style={styles.upperSection}>
            {/* Input Form */}
            <View style={styles.labelRow}>
              <AnimoText variant="button" color={AnimoColors.surfacePrimary}>
                {t('login.phoneLabel')}
              </AnimoText>
              <Pressable
                accessibilityRole="link"
                onPress={onClearAccount}
                hitSlop={LINK_HIT_SLOP}
                style={({ pressed }) => [styles.linkTouch, pressed && styles.linkPressed]}
              >
                <AnimoText
                  variant="tag"
                  color={AnimoLoginColors.linkOnGreen}
                  style={styles.link}
                >
                  {t('login.differentAccount')}
                </AnimoText>
              </Pressable>
            </View>

            <LoginPhoneInput
              value={phone}
              onChangeText={onChangePhone}
              hint={t('login.phoneHint')}
              hintColor={AnimoLoginColors.hintOnGreen}
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
                {t('login.noAccount')}{" "}
              </AnimoText>
              <Pressable
                accessibilityRole="link"
                onPress={onRegister}
                hitSlop={LINK_HIT_SLOP}
                style={({ pressed }) => [styles.linkTouch, pressed && styles.linkPressed]}
              >
                <AnimoText
                  variant="bodyEmphasis"
                  color={AnimoLoginColors.linkOnGreen}
                  style={styles.link}
                >
                  {t('login.register')}
                </AnimoText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footerGroup}>
        {/* Terms & Policy */}
        {footer}

        {/* Dev Mode */}
        {devSlot}
      </View>
    </Animated.View>
  );
}

const CARD_TOP_RADIUS = 32;
const SHORT_SCREEN_DP = 700;
const LINK_HIT_SLOP = { top: 16, bottom: 16, left: 8, right: 8 };

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexShrink: 0,
    marginTop: -AnimoSpacing.lg,
    backgroundColor: AnimoLoginColors.brandGreen,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    paddingTop: AnimoSpacing.xl,
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.lg,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 236, 179, 0.34)',
  },
  contentGroup: {
    flexGrow: 0,
    flexShrink: 0,
    gap: AnimoSpacing.xl,
  },
  containerCompact: {
    paddingTop: AnimoSpacing.lg,
    paddingHorizontal: AnimoSpacing.lg,
  },
  contentGroupCompact: {
    gap: AnimoSpacing.lg,
  },
  formBlockCompact: {
    gap: AnimoSpacing.lg,
  },
  headingBlock: {
    gap: AnimoSpacing.xs,
  },
  subtitle: {
    opacity: 0.88,
  },
  formBlock: {
    gap: AnimoSpacing.xl,
  },
  footerGroup: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: AnimoSpacing.lg,
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
  linkPressed: {
    opacity: 0.6,
  },
  primaryButton: {
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

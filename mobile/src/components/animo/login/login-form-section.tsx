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
import { SHORT_SCREEN_DP } from "@/components/animo/login/login-hero-section";
import { LoginPhoneInput } from "@/components/animo/login-phone-input";
import { NoticeBanner } from "@/components/animo/notice-banner";
import { AnimoColors, AnimoRadius, AnimoSpacing } from "@/constants/animo";
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

/** White form area for the login phone step, sitting below the arch hero. */
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
  // Short screens tighten the spacing so the sign-in button stays above the fold.
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < SHORT_SCREEN_DP;

  // The form settles in once, just after the arch.
  const opacity = useSharedValue(0);
  const translate = useSharedValue(14);

  useEffect(() => {
    opacity.value = withDelay(
      220,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    translate.value = withDelay(
      220,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, [opacity, translate]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return (
    <Animated.View style={[styles.container, compact && styles.containerCompact, animStyle]}>
      <View style={[styles.contentGroup, compact && styles.contentGroupCompact]}>
        <View style={styles.headingBlock}>
          <AnimoText variant={compact ? "h2" : "h1"} color={AnimoColors.black}>
            {t("login.welcomeTitle")}
          </AnimoText>
          <AnimoText
            variant={compact ? "caption" : "body"}
            color={AnimoColors.blackSecondary}
          >
            {t("login.welcomeWarmSubtitle")}
          </AnimoText>
        </View>

        <View style={[styles.upperSection, compact && styles.upperSectionCompact]}>
          <View style={styles.labelRow}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
              {t("login.phoneLabel")}
            </AnimoText>
            <Pressable
              accessibilityRole="link"
              onPress={onClearAccount}
              hitSlop={LINK_HIT_SLOP}
              style={({ pressed }) => pressed && styles.linkPressed}
            >
              <AnimoText variant="tag" color={AnimoColors.green} style={styles.link}>
                {t("login.differentAccount")}
              </AnimoText>
            </Pressable>
          </View>

          <LoginPhoneInput
            value={phone}
            onChangeText={onChangePhone}
            hint={t("login.phoneHint")}
            error={Boolean(errorMessage)}
          />
          {errorMessage ? <NoticeBanner tone="danger">{errorMessage}</NoticeBanner> : null}
        </View>

        <View style={[styles.lowerSection, compact && styles.lowerSectionCompact]}>
          <AnimoButton
            label={primaryLabel}
            onPress={onPrimary}
            disabled={primaryDisabled}
            loading={submitting}
            variant="primary"
            style={styles.primaryButton}
          />

          <View style={styles.registerRow}>
            <AnimoText variant="body" color={AnimoColors.blackSecondary}>
              {t("login.noAccount")}{" "}
            </AnimoText>
            <Pressable
              accessibilityRole="link"
              onPress={onRegister}
              hitSlop={LINK_HIT_SLOP}
              style={({ pressed }) => pressed && styles.linkPressed}
            >
              <AnimoText variant="bodyEmphasis" color={AnimoColors.green} style={styles.link}>
                {t("login.register")}
              </AnimoText>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.footerGroup, compact && styles.footerGroupCompact]}>
        {footer}
        {devSlot}
      </View>
    </Animated.View>
  );
}

const LINK_HIT_SLOP = { top: 16, bottom: 16, left: 8, right: 8 };

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexShrink: 0,
    backgroundColor: AnimoColors.background,
    paddingTop: AnimoSpacing.xl,
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.lg,
  },
  // Compact (short screens): gaps shrink, text sizes and the 56dp button do not.
  containerCompact: {
    paddingTop: AnimoSpacing.md,
  },
  contentGroup: {
    flexGrow: 0,
    flexShrink: 0,
    gap: AnimoSpacing.xl,
  },
  contentGroupCompact: {
    gap: AnimoSpacing.md,
  },
  headingBlock: {
    gap: AnimoSpacing.xs,
  },
  upperSection: {
    gap: AnimoSpacing.md,
  },
  upperSectionCompact: {
    gap: AnimoSpacing.sm,
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
  linkPressed: {
    opacity: 0.6,
  },
  primaryButton: {
    borderRadius: AnimoRadius.md,
  },
  lowerSection: {
    gap: AnimoSpacing.lg,
  },
  lowerSectionCompact: {
    gap: AnimoSpacing.md,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerGroup: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: AnimoSpacing.lg,
  },
  footerGroupCompact: {
    marginTop: AnimoSpacing.sm,
  },
});

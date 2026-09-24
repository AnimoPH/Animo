import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Globe } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Ellipse, Line } from 'react-native-svg';

import { AnimoText } from '@/components/animo/animo-text';
import { DevLoginBar } from '@/components/animo/dev-login-bar';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { SHOW_DEV_TOOLS } from '@/constants/dev-tools';
import { homeRouteForRole, type RoleId } from '@/constants/roles';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { signInDevAccount } from '@/services/auth-service';

// Animation duration for the entrance .
const ENTRANCE_EASE = { duration: 700 };

/**
 * Landing / Splash Screen.
 *
 * Branded first screen: logo, tagline, subtitle, and sign-in CTA.
 * Dev role bypass is gated by SHOW_DEV_TOOLS.
 */
export default function LandingScreen() {
  const { refresh } = useSession();
  const { language, setLanguage, t, isTagalog } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [devRole, setDevRole] = useState<RoleId | null>(null);
  const [devError, setDevError] = useState<string | undefined>();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(14);

  useEffect(() => {
    logoOpacity.value = withTiming(1, ENTRANCE_EASE);
    logoScale.value = withTiming(1, ENTRANCE_EASE);
    textOpacity.value = withDelay(140, withTiming(1, ENTRANCE_EASE));
    buttonOpacity.value = withDelay(300, withTiming(1, ENTRANCE_EASE));
    buttonTranslateY.value = withDelay(300, withTiming(0, ENTRANCE_EASE));
  }, [buttonOpacity, buttonTranslateY, logoOpacity, logoScale, textOpacity]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const handleGetStarted = () => {
    router.replace('/login');
  };

  const handleRegister = () => {
    router.push('/onboarding/role');
  };

  const handleDevLogin = async (role: RoleId) => {
    setSubmitting(true);
    setDevRole(role);
    setDevError(undefined);
    try {
      const profile = await signInDevAccount(role);
      await refresh();
      router.replace(homeRouteForRole(profile.role));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Dev login failed.';
      setDevError(message);
      setSubmitting(false);
      setDevRole(null);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'tl' ? 'en' : 'tl');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />
      <View style={styles.textureClip} pointerEvents="none">
        <FieldTexture />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch language to ${isTagalog ? 'English' : 'Tagalog'}`}
            onPress={toggleLanguage}
            style={({ pressed }) => [styles.langToggle, pressed && styles.pressed]}>
            <Globe size={15} color={AnimoColors.white} />
            <AnimoText variant="tag" color={AnimoColors.white} style={styles.langText}>
              {isTagalog ? 'Tagalog' : 'English'}
            </AnimoText>
          </Pressable>
        </View>

        <View style={styles.centerHero}>
          <Animated.View style={[styles.logoGlowRing, logoAnimStyle]}>
            <View style={styles.logoBadge}>
              <Image
                source={require('@/assets/images/animo/icon-green.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
          </Animated.View>

          <Animated.View style={[styles.textBlock, textAnimStyle]}>
            <AnimoText variant="display" color={AnimoColors.white} style={styles.title}>
              {t('app.name')}
            </AnimoText>

            <AnimoText variant="h3" color={AnimoColors.white} style={styles.tagline}>
              {t('landing.tagline')}
            </AnimoText>

            <AnimoText variant="body" color="rgba(255,255,255,0.85)" style={styles.subtitle}>
              {t('landing.subtitle')}
            </AnimoText>
          </Animated.View>
        </View>

        <View style={styles.bottomArea}>
          <Animated.View style={[styles.ctaGroup, buttonAnimStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('landing.signIn')}
              onPress={handleGetStarted}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <AnimoText variant="button" color={AnimoColors.green}>
                {t('landing.getStarted')} / {t('landing.signIn')}
              </AnimoText>
              <ArrowRight size={18} color={AnimoColors.green} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('role.title')}
              onPress={handleRegister}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
                {t('landing.roleSelect')}
              </AnimoText>
            </Pressable>
          </Animated.View>

          {SHOW_DEV_TOOLS ? (
            <View style={styles.devBarContainer}>
              <DevLoginBar
                onSelect={handleDevLogin}
                submitting={submitting}
                activeRole={devRole}
                error={devError}
              />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Low-contrast field-row + grain overlay — texture only, not a competing image.
 * Sized via percentage + viewBox so it never contributes a fixed pixel width
 * to layout (useWindowDimensions pixel width was overflowing on web preview).
 */
function FieldTexture() {
  const { width, height } = useWindowDimensions();
  // Guard against 0 during first layout; viewBox still needs positive dims.
  const vbW = Math.max(width, 1);
  const vbH = Math.max(height, 1);
  const rowCount = 18;
  const rowGap = vbH / (rowCount - 1);
  const grainPositions = [
    [0.12, 0.18],
    [0.28, 0.42],
    [0.45, 0.22],
    [0.62, 0.55],
    [0.78, 0.3],
    [0.18, 0.68],
    [0.55, 0.75],
    [0.88, 0.62],
    [0.35, 0.88],
    [0.72, 0.12],
    [0.95, 0.45],
    [0.25, 0.95],
    [0.55, 0.25],
    [0.85, 0.55],
    [0.15, 0.85],
    [0.45, 0.15],
    [0.75, 0.45],
    [0.05, 0.75],
    [0.35, 0.05],
    [0.95, 0.65],
    [0.25, 0.95],
    [0.15, 0.30],
    [0.15, 0.05],
    [0.15, 0.60],
    [0.45, 0.65],
    [0.60, 0.60],
  ] as const;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {Array.from({ length: rowCount }, (_, i) => (
        <Line
          key={`row-${i}`}
          x1={0}
          y1={i * rowGap}
          x2={vbW}
          y2={i * rowGap + vbW * 0.05}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={2}
        />
      ))}
      {/* Palay Grain */}
      {grainPositions.map(([nx, ny], i) => (
        <Ellipse
          key={`grain-${i}`}
          cx={nx * vbW}
          cy={ny * vbH}
          // Grain sizes
          rx={9}
          ry={3}
          fill="rgba(255,255,255,0.06)"
          rotation={-18 + (i % 5) * 8}
          origin={`${nx * vbW}, ${ny * vbH}`}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#145319',
    // Clip glow circles (positioned with negative offsets) and any texture overflow
    // so they cannot widen the layout past the screen — especially on web preview.
    overflow: 'hidden',
  },
  textureClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(46, 125, 50, 0.4)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: AnimoSpacing.sm,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 6,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  langText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  centerHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.sm,
    gap: AnimoSpacing.md,
  },
  logoGlowRing: {
    width: 148,
    height: 148,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 124,
    height: 124,
    borderRadius: 32,
    backgroundColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: {
    width: 86,
    height: 86,
  },
  textBlock: {
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    opacity: 0.95,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
  },
  bottomArea: {
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.xs,
  },
  ctaGroup: {
    gap: AnimoSpacing.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    paddingVertical: 14,
    gap: AnimoSpacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AnimoSpacing.xs,
  },
  devBarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.sm,
    marginTop: AnimoSpacing.xs,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});

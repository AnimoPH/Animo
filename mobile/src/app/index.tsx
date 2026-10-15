import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AnimoColors } from '@/constants/animo';
import { homeRouteForRole } from '@/constants/roles';
import { useSession } from '@/hooks/use-session';

const MINIMUM_SPLASH_MS = 1800;

/**
 * Splash screen.
 *
 * Deliberately plain: the Animo wordmark on a clean white field, lifted by a
 * soft brand-green glow and a slim progress line. The logo is the whole of it —
 * everything else exists only to make the logo feel welcoming.
 */
export default function SplashScreen() {
  const { status, account } = useSession();
  const hasNavigated = useRef(false);

  const logoOpacity = useSharedValue(0);
  const logoTranslate = useSharedValue(14);
  const logoScale = useSharedValue(0.94);
  const glowOpacity = useSharedValue(0);
  const progress = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const navigateToDestination = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    screenOpacity.value = withTiming(0, { duration: 280 }, () => {
      if (status === 'authenticated' && account) {
        router.replace(homeRouteForRole(account.role));
      } else {
        router.replace('/login');
      }
    });
  }, [account, screenOpacity, status]);

  // Entrance: the mark fades up into place, the glow breathes in behind it.
  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    logoTranslate.value = withTiming(0, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    logoScale.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });

    glowOpacity.value = withDelay(
      120,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) }),
    );

    progress.value = withDelay(
      260,
      withTiming(1, {
        duration: MINIMUM_SPLASH_MS - 400,
        easing: Easing.inOut(Easing.ease),
      }),
    );
  }, [glowOpacity, logoOpacity, logoScale, logoTranslate, progress]);

  // Leave once the minimum dwell has passed and the session has hydrated.
  useEffect(() => {
    if (status === 'loading') return;

    const timer = setTimeout(navigateToDestination, MINIMUM_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [status, navigateToDestination]);

  const screenAnimStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslate.value }, { scale: logoScale.value }],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Pressable
      style={styles.container}
      onPress={() => {
        if (status !== 'loading') navigateToDestination();
      }}
      accessibilityLabel="Animo">
      <Animated.View style={[StyleSheet.absoluteFill, styles.content, screenAnimStyle]}>
        <StatusBar style="dark" />

        <View style={styles.hero}>
          {/* Soft brand halo so the mark sits on light rather than floating. */}
          <Animated.View style={[styles.glowOuter, glowAnimStyle]} pointerEvents="none" />
          <Animated.View style={[styles.glowInner, glowAnimStyle]} pointerEvents="none" />

          <Animated.View style={logoAnimStyle}>
            <Image
              source={require('@/assets/images/animo/Animo-Logo.png')}
              style={styles.logoImage}
              contentFit="contain"
              priority="high"
              accessibilityLabel="Animo"
            />
          </Animated.View>
        </View>

        {/* Slim determinate line — a quiet sign the app is on its way. */}
        <View style={styles.progressTrack} pointerEvents="none">
          <Animated.View style={[styles.progressFill, progressAnimStyle]} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AnimoColors.white,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
  },
  glowInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(46, 125, 50, 0.07)',
  },
  logoImage: {
    width: 232,
    height: 68,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 72,
    width: 104,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.14)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: AnimoColors.accentPrimary,
  },
});
